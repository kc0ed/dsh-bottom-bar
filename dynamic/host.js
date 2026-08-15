// ══════════════════════════════════════════════════════════════════
// dsh-bottom-bar · 动态 Host 半体（与线上运行版本同步，修订 27）
// ──
// 由动态插件 cost-1 的 host 半体固化（harness.handle / ctx.get 服务）。
// 关键事实（2026-08-15 实测）：
// · 动态 Host 的 fs 是会话沙箱（workspace-write），写 ~/.dsh 被拒
//   （FS_SANDBOX_DENIED）；沙箱 workspaceRoot 是 telegram-saver（非会话
//   工作区）——账本/配置实际写在 <workspaceRoot>/.dsh-bottom-bar/。
//   诊断 handler 暴露 defaultMode/workspaceRoot/resolve 与逐策略写入探测。
// · request/context 事件仅「模型变更时」追加，订阅前可能从未收到 →
//   lastModel 不能只靠事件流；改用实时会话 session.contextFold（懒折叠
//   getter，含 provider/model）取当前渠道+模型，并就地愈合历史归因。
// · 归因键 = 「渠道@模型」（如 opencode-go@deepseek-v4-flash）；价格按
//   模型 id 查（先试完整键，支持未来按渠道覆盖）。
// · 账本：首次建账用投影冷快照做基线（baseApplied 一次），之后
//   session/event 每事件 O(1) 追加，session/flush（parallel 检查点）落盘
//   + 60s 兜底；重启从账本恢复继续追加，永不全量重算（用户设计）。
// ══════════════════════════════════════════════════════════════════
return {
  inject: ['timer'],
  async apply(ctx) {
    const DEFAULT_PRICES = {
      // 官方 DeepSeek V4（2026-08-14 官方价格页，CNY / 1M tokens）：
      // 输入（缓存未命中）1 / 缓存命中 0.02 / 输出 2
      'deepseek-v4-flash': { currency: 'CNY', in: 1, cacheRead: 0.02, cacheWrite: 0.02, out: 2 },
      // 输入（缓存未命中）3 / 缓存命中 0.025 / 输出 6；缓存写无官方价，与缓存命中同价
      'deepseek-v4-pro': { currency: 'CNY', in: 3, cacheRead: 0.025, cacheWrite: 0.025, out: 6 },
      // deepseek-chat / deepseek-reasoner 已下架（2026-08-14），不再内置
    }
    const fresh = () => ({ models: new Map(), lastModel: null, lastProvider: null, lastUsage: null })
    // 归因键：渠道@模型（渠道可缺省）。价格按模型 id 查（先查完整键，再查模型部分）
    const rowKeyOf = (provider, model) => {
      const m = model === null || model === undefined || model === '?' ? '?' : model
      const p = provider === null || provider === undefined || provider === '' || provider === '?' ? null : provider
      return p === null ? m : p + '@' + m
    }
    const modelPartOf = (key) => {
      const at = typeof key === 'string' ? key.indexOf('@') : -1
      return at === -1 ? key : key.slice(at + 1)
    }
    const applyUsage = (state, usage, turn, step) => {
      const rowKey = rowKeyOf(state.lastProvider, state.lastModel)
      const buckets = {
        uncachedInput: usage.inputTokens || 0,
        output: usage.outputTokens || 0,
        cacheRead: usage.cacheReadTokens || 0,
        cacheWrite: usage.cacheWriteTokens || 0,
      }
      const prev = state.lastUsage !== null && state.lastUsage.turn === turn && state.lastUsage.step === step ? state.lastUsage : null
      const key = prev !== null ? prev.model : rowKey
      if (prev !== null) {
        const oldRow = state.models.get(prev.model)
        if (oldRow !== undefined) {
          oldRow.uncachedInput -= prev.uncachedInput
          oldRow.output -= prev.output
          oldRow.cacheRead -= prev.cacheRead
          oldRow.cacheWrite -= prev.cacheWrite
        }
      }
      state.lastUsage = { turn, step, model: key, provider: state.lastProvider, ...buckets }
      let row = state.models.get(key)
      if (row === undefined) {
        row = { uncachedInput: 0, output: 0, cacheRead: 0, cacheWrite: 0 }
        state.models.set(key, row)
      }
      row.uncachedInput += buckets.uncachedInput
      row.output += buckets.output
      row.cacheRead += buckets.cacheRead
      row.cacheWrite += buckets.cacheWrite
    }
    const foldEvent = (state, event) => {
      if (event.type === 'request/context') {
        state.lastProvider = event.data.provider === undefined ? null : event.data.provider
        state.lastModel = event.data.model
      } else if (event.type === 'request/header') {
        const cfg = event.data.header.config
        if (cfg !== null && cfg !== undefined) {
          if (cfg.provider !== undefined) state.lastProvider = cfg.provider
          if (cfg.model !== undefined) state.lastModel = cfg.model
        }
      }
      let usage
      let turn
      let step
      if (event.type === 'assistant/chunk' && event.data.chunk.type === 'usage') {
        usage = event.data.chunk.usage
        turn = event.data.turn
        step = event.data.step
      } else if (event.type === 'assistant/message' && event.data.usage !== undefined) {
        usage = event.data.usage
        turn = event.data.turn
        step = event.data.step
      }
      if (usage !== undefined) applyUsage(state, usage, turn, step)
    }
    // 修订 27：从实时会话取当前渠道+模型（request/context 仅变更时追加）
    const currentRouteOf = (session) => {
      try {
        if (session === null || session === undefined) return null
        const cf = session.contextFold
        if (cf === null || cf === undefined) return null
        const model = typeof cf.model === 'string' && cf.model.length > 0 ? cf.model : null
        if (model === null) return null
        const provider = typeof cf.provider === 'string' && cf.provider.length > 0 ? cf.provider : null
        return { provider, model }
      } catch (err) { /* ignore */ }
      return null
    }
    // 修订 26/27：愈合历史归因（"?" 行 + 裸模型行迁到 渠道@模型）
    const healAttribution = (state, provider, model) => {
      if (model === null || model === '?' || model === undefined) return
      const key = rowKeyOf(provider, model)
      if (state.lastModel === null || state.lastModel === '?') state.lastModel = model
      if (state.lastProvider === null || state.lastProvider === '?') state.lastProvider = provider === null ? null : provider
      const q = state.models.get('?')
      if (q !== undefined) {
        const row = state.models.get(key)
        if (row === undefined) {
          state.models.set(key, { uncachedInput: q.uncachedInput, output: q.output, cacheRead: q.cacheRead, cacheWrite: q.cacheWrite })
        } else {
          row.uncachedInput += q.uncachedInput
          row.output += q.output
          row.cacheRead += q.cacheRead
          row.cacheWrite += q.cacheWrite
        }
        state.models.delete('?')
      }
      if (key !== model) {
        const bare = state.models.get(model)
        if (bare !== undefined && !state.models.has(key)) {
          state.models.set(key, bare)
          state.models.delete(model)
        }
      }
      if (state.lastUsage !== null) {
        const lu = state.lastUsage
        if (lu.model === '?' || (lu.model === model && key !== model)) {
          state.lastUsage = { ...lu, model: key, provider: state.lastUsage.provider === null || state.lastUsage.provider === undefined ? provider : state.lastUsage.provider }
        }
      }
    }
    // ── 存储路径 + 诊断（修订 21/22） ──
    let workspaceRoot = null
    let sandboxDefaultMode = null
    let sandboxResolvedMode = null
    let sandboxResolvedRoot = null
    let fsAvailability = 'unknown'
    try {
      const policy = ctx.get('sandboxPolicy')
      if (policy !== undefined) {
        sandboxDefaultMode = typeof policy.defaultMode === 'string' ? policy.defaultMode : null
        if (typeof policy.workspaceRoot === 'string' && policy.workspaceRoot.length > 0) {
          workspaceRoot = policy.workspaceRoot.replace(/[\\/]+$/, '')
        }
        try {
          const resolved = policy.resolve()
          if (resolved !== null && resolved !== undefined) {
            sandboxResolvedMode = typeof resolved.mode === 'string' ? resolved.mode : null
            sandboxResolvedRoot = typeof resolved.workspaceRoot === 'string' ? resolved.workspaceRoot : null
          }
        } catch (err) { /* ignore */ }
      }
    } catch (err) { /* ignore */ }
    let storeDir = null
    let ledgerFile = null
    let configFile = null
    const storeAttempts = []
    const recordAttempt = (label, outcome) => {
      storeAttempts.push({ label, ok: outcome.ok, error: outcome.error === undefined ? null : outcome.error, code: outcome.code === null ? null : outcome.code })
      if (storeAttempts.length > 12) storeAttempts.shift()
    }
    const tryWrite = async (dir, relativeName, content, policy) => {
      const fsSvc = ctx.get('fs')
      if (fsSvc === undefined) return { ok: false, error: 'fs service unavailable via ctx.get', code: null }
      try {
        const target = await fsSvc.resolve(dir + '/' + relativeName)
        await fsSvc.writeText(target, content, undefined, undefined, policy)
        return { ok: true, error: null, code: null }
      } catch (err) {
        const code = err !== null && err !== undefined && typeof err.code === 'string' ? err.code : null
        const message = err !== null && err !== undefined && typeof err.message === 'string' ? err.message : String(err)
        return { ok: false, error: message, code }
      }
    }
    const probePolicy = (mode) => ({ mode, workspaceRoot: workspaceRoot === null ? undefined : workspaceRoot })
    // 写入统一走这里：多级降级（子目录→根目录，默认策略→显式策略）并记录诊断
    const writeStoreFile = async (relativeName, content) => {
      fsAvailability = ctx.get('fs') === undefined ? 'missing' : 'available'
      if (fsAvailability === 'missing' || workspaceRoot === null) {
        recordAttempt(relativeName + '@no-fs-or-root', { ok: false, error: 'fs missing or workspaceRoot null', code: null })
        return false
      }
      const dirs = storeDir !== null && storeDir !== workspaceRoot ? [storeDir, workspaceRoot] : [workspaceRoot]
      const policies = [
        { label: 'default', policy: undefined },
        { label: 'ws-write', policy: probePolicy('workspace-write') },
        { label: 'danger', policy: probePolicy('danger-full-access') },
      ]
      for (const dir of dirs) {
        for (const p of policies) {
          const outcome = await tryWrite(dir, relativeName, content, p.policy)
          recordAttempt(relativeName + '@' + dir.replace(/^.*[\\/]/, '') + '/' + p.label, outcome)
          if (outcome.ok) {
            if (storeDir !== dir && dirs.length > 1) {
              storeDir = dir
              ledgerFile = storeDir + '/ledger.json'
              configFile = storeDir + '/composition.json'
            }
            return true
          }
        }
      }
      return false
    }
    const ensureStorePaths = async () => {
      if (workspaceRoot === null || storeDir !== null) return
      const fsSvc = ctx.get('fs')
      storeDir = workspaceRoot + '/.dsh-bottom-bar'
      if (fsSvc !== undefined) {
        try {
          const dirTarget = await fsSvc.resolve(storeDir)
          const info = await fsSvc.stat(dirTarget)
          if (info === undefined) storeDir = workspaceRoot
        } catch (err) { storeDir = workspaceRoot }
      }
      ledgerFile = storeDir + '/ledger.json'
      configFile = storeDir + '/composition.json'
    }
    // 修订 27：价格按模型 id 查（支持未来 渠道@模型 覆盖）
    const priceOf = (model) => {
      const modelPart = modelPartOf(model)
      const user = configPrices === null || configPrices === undefined ? undefined
        : (configPrices[model] !== undefined ? configPrices[model] : configPrices[modelPart])
      const base = DEFAULT_PRICES[modelPart]
      if (user === undefined) return base
      if (base === undefined) return user
      return {
        currency: user.currency !== undefined ? user.currency : base.currency,
        in: user.in !== undefined ? user.in : base.in,
        cacheRead: user.cacheRead !== undefined ? user.cacheRead : base.cacheRead,
        cacheWrite: user.cacheWrite !== undefined ? user.cacheWrite : base.cacheWrite,
        out: user.out !== undefined ? user.out : base.out,
      }
    }
    const estimateOf = (state) => {
      const priced = []
      const unpriced = []
      const totals = {}
      let anyTokens = false
      for (const [model, u] of state.models) {
        const tokens = u.uncachedInput + u.output + u.cacheRead + u.cacheWrite
        if (tokens > 0) anyTokens = true
        const price = priceOf(model)
        if (price === undefined) {
          unpriced.push({ model, uncachedInput: u.uncachedInput, output: u.output, cacheRead: u.cacheRead, cacheWrite: u.cacheWrite })
          continue
        }
        const currency = price.currency || 'USD'
        const inCost = u.uncachedInput / 1e6 * price.in
        const cacheReadCost = u.cacheRead / 1e6 * (price.cacheRead ?? price.in)
        const cacheWriteCost = u.cacheWrite / 1e6 * (price.cacheWrite ?? price.in)
        const outCost = u.output / 1e6 * price.out
        const cost = inCost + cacheReadCost + cacheWriteCost + outCost
        totals[currency] = (totals[currency] || 0) + cost
        priced.push({
          model, cost, currency,
          uncachedInput: u.uncachedInput, output: u.output, cacheRead: u.cacheRead, cacheWrite: u.cacheWrite,
          priceIn: price.in,
          priceCacheRead: price.cacheRead === undefined ? null : price.cacheRead,
          priceCacheWrite: price.cacheWrite === undefined ? null : price.cacheWrite,
          priceOut: price.out,
          inCost, cacheReadCost, cacheWriteCost, outCost,
        })
      }
      const lastSample = state.lastUsage === null ? null : {
        model: state.lastUsage.model,
        provider: state.lastUsage.provider === undefined ? null : state.lastUsage.provider,
        uncachedInput: state.lastUsage.uncachedInput,
        output: state.lastUsage.output,
        cacheRead: state.lastUsage.cacheRead,
        cacheWrite: state.lastUsage.cacheWrite,
      }
      return { totals, priced, unpriced, hasUsage: anyTokens, lastSample }
    }
    // ── 修订 20：自研持久化账本（工作区 .dsh-bottom-bar/ledger.json） ──
    let ledger = null
    let dirtySessions = new Set()
    const loadLedger = async () => {
      if (ledger !== null) return
      ledger = { version: 1, sessions: {} }
      if (ledgerFile === null) return
      const fsSvc = ctx.get('fs')
      if (fsSvc === undefined) return
      try {
        const target = await fsSvc.resolve(ledgerFile)
        const info = await fsSvc.stat(target)
        if (info === undefined) return
        const text = await fsSvc.readText(target)
        const parsed = JSON.parse(text)
        if (parsed !== null && typeof parsed === 'object' && parsed.sessions !== null && typeof parsed.sessions === 'object') {
          ledger = parsed
        }
      } catch (err) { /* 首次无文件/损坏：保持空账本 */ }
    }
    const serializeState = (state) => {
      const models = {}
      for (const [model, b] of state.models) {
        models[model] = { uncachedInput: b.uncachedInput, output: b.output, cacheRead: b.cacheRead, cacheWrite: b.cacheWrite }
      }
      return { lastModel: state.lastModel, lastProvider: state.lastProvider, lastUsage: state.lastUsage, baseApplied: state.baseApplied === true, models }
    }
    const writeLedger = async () => {
      if (ledger === null) return
      await writeStoreFile('ledger.json', JSON.stringify({ version: 1, updatedAt: new Date().toISOString(), sessions: ledger.sessions }, null, 2))
    }
    const persistSession = (sessionId) => {
      const st = liveStates.get(sessionId)
      if (st === undefined || ledger === null) return
      ledger.sessions[sessionId] = serializeState(st)
      dirtySessions.add(sessionId)
    }
    // 启动时先读账本，再订阅事件（避免漏事件/重复）
    await ensureStorePaths()
    await loadLedger()
    const liveStates = new Map()
    if (ledger !== null) {
      for (const [sid, entry] of Object.entries(ledger.sessions)) {
        if (typeof entry !== 'object' || entry === null) continue
        const models = new Map()
        if (typeof entry.models === 'object' && entry.models !== null) {
          for (const [model, b] of Object.entries(entry.models)) {
            models.set(model, {
              uncachedInput: Number(b.uncachedInput) || 0,
              output: Number(b.output) || 0,
              cacheRead: Number(b.cacheRead) || 0,
              cacheWrite: Number(b.cacheWrite) || 0,
            })
          }
        }
        liveStates.set(sid, {
          models,
          lastModel: typeof entry.lastModel === 'string' ? entry.lastModel : null,
          lastProvider: typeof entry.lastProvider === 'string' ? entry.lastProvider : null,
          lastUsage: typeof entry.lastUsage === 'object' && entry.lastUsage !== null ? entry.lastUsage : null,
          baseApplied: entry.baseApplied === true,
        })
      }
    }
    // 订阅会话事件实时流（追加进账本状态）
    try {
      ctx.effect(() => ctx.on('session/event', (session, event) => {
        try {
          const sid = session && typeof session.id === 'string' ? session.id : null
          if (sid === null) return
          const st = liveStateOf(sid)
          // 修订 26/27：实时会话补渠道+模型（request/context 仅变更追加）
          const route = currentRouteOf(session)
          if (route !== null && (st.lastModel === null || st.lastModel === '?')) {
            st.lastModel = route.model
            if (route.provider !== null) st.lastProvider = route.provider
          }
          foldEvent(st, event)
          persistSession(sid)
        } catch (err) { /* 单事件失败不影响订阅 */ }
      }), 'dsh-bottom-bar: session/event')
    } catch (err) { console.error('dsh-bottom-bar: session/event subscribe failed', err) }
    // 官方持久化检查点：同步落盘（parallel 模式：调用方 await 所有监听器）
    try {
      ctx.effect(() => ctx.on('session/flush', async (session) => {
        try {
          const sid = session && typeof session.id === 'string' ? session.id : null
          if (sid === null) return
          if (liveStates.has(sid)) {
            persistSession(sid)
            await writeLedger()
          }
        } catch (err) { /* 落盘失败不影响 flush */ }
      }), 'dsh-bottom-bar: session/flush')
    } catch (err) { console.error('dsh-bottom-bar: session/flush subscribe failed', err) }
    // 60s 兜底落盘（idle 会话）
    try {
      ctx.effect(() => ctx.interval(() => {
        if (dirtySessions.size === 0) return
        writeLedger()
        dirtySessions.clear()
      }, 60000), 'dsh-bottom-bar: ledger interval')
    } catch (err) { /* ignore */ }
    const liveStateOf = (sessionId) => {
      let st = liveStates.get(sessionId)
      if (st === undefined) {
        st = fresh()
        st.baseApplied = false
        liveStates.set(sessionId, st)
        if (liveStates.size > 100) {
          const oldest = liveStates.keys().next().value
          liveStates.delete(oldest)
        }
      }
      return st
    }
    // 投影历史引导（仅首次建账用一次）：coldSnapshot → tokenUsage 总量
    const projectionTotals = async (sessionId) => {
      try {
        const svc = ctx.get('sessionProjectionCache')
        if (svc === undefined) return null
        const snap = await svc.coldSnapshot(sessionId)
        if (snap === null || snap === undefined) return null
        const u = (snap.data && snap.data.tokenUsage) || snap.tokenUsage
        if (typeof u !== 'object' || u === null) return null
        const cacheRead = typeof u.cacheReadTokens === 'number' ? u.cacheReadTokens : 0
        const cacheWrite = typeof u.cacheWriteTokens === 'number' ? u.cacheWriteTokens : 0
        const input = typeof u.inputTokens === 'number' ? u.inputTokens : 0
        const uncached = typeof u.uncachedInputTokens === 'number' ? u.uncachedInputTokens : Math.max(0, input - cacheRead - cacheWrite)
        const output = typeof u.outputTokens === 'number' ? u.outputTokens : 0
        return { uncachedInput: uncached, output, cacheRead, cacheWrite }
      } catch (err) { return null }
    }
    const fallbackRoute = () => {
      try {
        const svc = ctx.get('agentDefaultModel')
        const sel = svc === undefined ? undefined : svc.currentSelection()
        if (sel && typeof sel.model === 'string') {
          return { provider: typeof sel.provider === 'string' && sel.provider.length > 0 ? sel.provider : null, model: sel.model }
        }
      } catch (err) { /* ignore */ }
      return { provider: null, model: '?' }
    }
    // 首次建账：把「投影总量 − 实时累计」并入为历史基线（只做一次）
    const applyBaseOnce = async (sessionId, state) => {
      if (state.baseApplied) return
      state.baseApplied = true
      const proj = await projectionTotals(sessionId)
      if (proj === null) return
      const liveSum = { uncachedInput: 0, output: 0, cacheRead: 0, cacheWrite: 0 }
      for (const b of state.models.values()) {
        liveSum.uncachedInput += b.uncachedInput
        liveSum.output += b.output
        liveSum.cacheRead += b.cacheRead
        liveSum.cacheWrite += b.cacheWrite
      }
      const history = {
        uncachedInput: Math.max(0, proj.uncachedInput - liveSum.uncachedInput),
        output: Math.max(0, proj.output - liveSum.output),
        cacheRead: Math.max(0, proj.cacheRead - liveSum.cacheRead),
        cacheWrite: Math.max(0, proj.cacheWrite - liveSum.cacheWrite),
      }
      const hasHistory = history.uncachedInput + history.output + history.cacheRead + history.cacheWrite > 0
      if (!hasHistory) return
      const route = state.lastModel !== null ? { provider: state.lastProvider, model: state.lastModel } : fallbackRoute()
      const key = rowKeyOf(route.provider, route.model)
      const row = state.models.get(key)
      if (row === undefined) {
        state.models.set(key, { ...history })
      } else {
        state.models.set(key, {
          uncachedInput: row.uncachedInput + history.uncachedInput,
          output: row.output + history.output,
          cacheRead: row.cacheRead + history.cacheRead,
          cacheWrite: row.cacheWrite + history.cacheWrite,
        })
      }
      persistSession(sessionId)
    }
    harness.handle('estimate-cost', async (args) => {
      const sessionId = args === null || args === undefined ? undefined : args.sessionId
      if (typeof sessionId !== 'string') return { totals: {}, priced: [], unpriced: [], hasUsage: false, lastSample: null }
      try {
        await loadConfig()
        const st = liveStateOf(sessionId)
        // 修订 26/27：实时会话取渠道+模型 + 愈合历史归因
        try {
          const sessionsSvc = ctx.get('sessions')
          const live = sessionsSvc === undefined ? undefined : sessionsSvc.get(sessionId)
          const route = currentRouteOf(live)
          if (route !== null) healAttribution(st, route.provider, route.model)
        } catch (err) { /* ignore */ }
        await applyBaseOnce(sessionId, st)
        return estimateOf(st)
      } catch (err) {
        console.error('cost-estimate failed:', err)
        return { totals: {}, priced: [], unpriced: [], hasUsage: false, lastSample: null }
      }
    })
    // 修订 22：诊断（fs 沙箱真相 + 写入探测记录）
    harness.handle('diagnostics', async () => {
      const sb = ctx.get('sandboxPolicy')
      let resolved = null
      if (sb !== undefined) {
        try {
          const r = sb.resolve()
          resolved = {
            mode: r !== null && r !== undefined && typeof r.mode === 'string' ? r.mode : null,
            workspaceRoot: r !== null && r !== undefined && typeof r.workspaceRoot === 'string' ? r.workspaceRoot : null,
          }
        } catch (err) { resolved = { error: String(err && err.message || err) } }
      }
      return {
        fs: fsAvailability,
        sandbox: { defaultMode: sandboxDefaultMode, workspaceRoot, resolved },
        storeDir,
        ledgerSessions: ledger === null ? 0 : Object.keys(ledger.sessions).length,
        attempts: storeAttempts.slice(),
      }
    })
    // ── 组装配置 + 价格：持久化（工作区写入，兼容读 ~/.dsh） ──
    const SEGMENT_IDS = ['counts', 'llm', 'toolCall', 'ttft', 'throughput', 'cacheHit', 'tokens', 'cost']
    const MODES = ['separate', 'combined']
    const DEFAULT_MODE = 'separate'
    const DEFAULT_COMPOSITION = SEGMENT_IDS.map((id) => ({ id, enabled: true }))
    let compositionCache = null
    let compositionMode = null
    let tooltipMode = null
    let precisionMode = null
    let configPrices = null
    let compositionPersisted = false
    let legacyConfigFile = null
    const settingsSvc = ctx.get('settings')
    if (settingsSvc !== undefined) {
      try {
        const doc = await settingsSvc.prepareDocument()
        if (typeof doc === 'string' && doc.length > 0) {
          legacyConfigFile = doc.replace(/[\\/][^\\/]*$/, '') + '/cost-estimate.composition.json'
        }
      } catch (err) { /* ignore */ }
    }
    const bucketNum = (v) => {
      if (v === null || v === undefined || v === '') return undefined
      const n = Number(v)
      return Number.isFinite(n) ? n : undefined
    }
    const normalizePrices = (input) => {
      if (typeof input !== 'object' || input === null) return {}
      const out = {}
      for (const model of Object.keys(input)) {
        const p = input[model]
        if (typeof p !== 'object' || p === null) continue
        out[model] = {
          currency: p.currency === 'CNY' ? 'CNY' : 'USD',
          in: Number(p.in) || 0,
          cacheRead: bucketNum(p.cacheRead),
          cacheWrite: bucketNum(p.cacheWrite),
          out: Number(p.out) || 0,
        }
      }
      return out
    }
    const normalizeSegments = (input) => {
      if (!Array.isArray(input) || input.length === 0) return null
      const out = []
      for (const item of input) {
        if (typeof item !== 'object' || item === null) continue
        if (SEGMENT_IDS.indexOf(item.id) === -1) continue
        out.push({ id: item.id, enabled: item.enabled !== false })
      }
      if (out.length === 0) return null
      return out
    }
    const readConfigFrom = async (path) => {
      if (path === null) return null
      const fsSvc = ctx.get('fs')
      if (fsSvc === undefined) return null
      try {
        const target = await fsSvc.resolve(path)
        const info = await fsSvc.stat(target)
        if (info === undefined) return null
        const text = await fsSvc.readText(target)
        const parsed = JSON.parse(text)
        const normalized = normalizeSegments(parsed.segments)
        if (normalized === null) return null
        return {
          segments: normalized,
          mode: MODES.indexOf(parsed.mode) !== -1 ? parsed.mode : DEFAULT_MODE,
          tooltip: parsed.tooltip === 'always' ? 'always' : 'auto',
          precision: parsed.precision === 'full' ? 'full' : 'compact',
          prices: normalizePrices(parsed.prices),
        }
      } catch (err) { return null }
    }
    const loadConfig = async () => {
      if (compositionCache !== null) return
      const fromWorkspace = await readConfigFrom(configFile)
      const loaded = fromWorkspace !== null ? fromWorkspace : await readConfigFrom(legacyConfigFile)
      if (loaded !== null) {
        compositionCache = loaded.segments
        compositionMode = loaded.mode
        tooltipMode = loaded.tooltip
        precisionMode = loaded.precision
        configPrices = loaded.prices
        compositionPersisted = true
      }
      if (compositionCache === null) compositionCache = DEFAULT_COMPOSITION
      if (compositionMode === null) compositionMode = DEFAULT_MODE
      if (tooltipMode === null) tooltipMode = 'auto'
      if (precisionMode === null) precisionMode = 'compact'
      if (configPrices === null) configPrices = {}
    }
    const saveConfig = async (segments, mode, tooltip, precision, prices) => {
      if (segments !== undefined) compositionCache = segments
      if (mode !== undefined) compositionMode = MODES.indexOf(mode) !== -1 ? mode : DEFAULT_MODE
      if (tooltip !== undefined) tooltipMode = tooltip === 'always' ? 'always' : 'auto'
      if (precision !== undefined) precisionMode = precision === 'full' ? 'full' : 'compact'
      if (prices !== undefined) configPrices = prices
      if (configFile === null) return false
      const ok = await writeStoreFile('composition.json', JSON.stringify({
        version: 4,
        updatedAt: new Date().toISOString(),
        mode: compositionMode,
        tooltip: tooltipMode,
        precision: precisionMode,
        segments: compositionCache,
        prices: configPrices,
      }, null, 2))
      if (ok) compositionPersisted = true
      return ok
    }
    const snapshot = () => ({ segments: compositionCache, mode: compositionMode, tooltip: tooltipMode, precision: precisionMode, persisted: compositionPersisted })
    const priceList = () => {
      const map = {}
      for (const key of Object.keys(DEFAULT_PRICES)) map[key] = true
      for (const key of Object.keys(configPrices)) map[key] = true
      const builtin = Object.keys(DEFAULT_PRICES)
      const extra = Object.keys(configPrices).filter((k) => DEFAULT_PRICES[k] === undefined).sort()
      const rows = []
      for (const model of builtin.concat(extra)) {
        const p = priceOf(model)
        if (p === undefined) continue
        rows.push({
          model,
          currency: p.currency || 'USD',
          in: p.in,
          cacheRead: p.cacheRead === undefined ? null : p.cacheRead,
          cacheWrite: p.cacheWrite === undefined ? null : p.cacheWrite,
          out: p.out,
          builtin: DEFAULT_PRICES[model] !== undefined,
        })
      }
      return rows
    }
    harness.handle('get-composition', async () => { await loadConfig(); return snapshot() })
    harness.handle('set-composition', async (args) => {
      await loadConfig()
      const a = args === null || args === undefined ? {} : args
      const normalized = normalizeSegments(a.segments)
      await saveConfig(normalized !== null ? normalized : undefined, a.mode, a.tooltip, a.precision, undefined)
      return snapshot()
    })
    harness.handle('reset-composition', async () => {
      await loadConfig()
      await saveConfig(DEFAULT_COMPOSITION, DEFAULT_MODE, 'auto', 'compact', undefined)
      return snapshot()
    })
    harness.handle('get-prices', async () => {
      await loadConfig()
      return { prices: priceList(), persisted: compositionPersisted }
    })
    harness.handle('set-price', async (args) => {
      await loadConfig()
      const a = args === null || args === undefined ? {} : args
      if (typeof a.model !== 'string' || a.model === '') return { prices: priceList() }
      const p = a.price
      if (typeof p !== 'object' || p === null) return { prices: priceList() }
      configPrices[a.model] = {
        currency: p.currency === 'CNY' ? 'CNY' : 'USD',
        in: Number(p.in) || 0,
        cacheRead: bucketNum(p.cacheRead),
        cacheWrite: bucketNum(p.cacheWrite),
        out: Number(p.out) || 0,
      }
      await saveConfig(undefined, undefined, undefined, undefined, configPrices)
      return { prices: priceList() }
    })
    harness.handle('remove-price', async (args) => {
      await loadConfig()
      const a = args === null || args === undefined ? {} : args
      if (typeof a.model === 'string') delete configPrices[a.model]
      await saveConfig(undefined, undefined, undefined, undefined, configPrices)
      return { prices: priceList() }
    })
    harness.handle('reset-prices', async () => {
      await loadConfig()
      configPrices = {}
      await saveConfig(undefined, undefined, undefined, undefined, configPrices)
      return { prices: priceList() }
    })
  },
}
