// ══════════════════════════════════════════════════════════════════
// 同步说明（改本文件前必读）
// ──
// 1) 价格：按 model id 匹配（USD/CNY，每 1M tokens）。DEFAULT_PRICES 内置
//    官方 DeepSeek V4 系列（2026-08-14 官方价格页）：
//    · deepseek-v4-flash：输入（缓存未命中）1 / 缓存命中 0.02 / 输出 2（元）
//    · deepseek-v4-pro：输入（缓存未命中）3 / 缓存命中 0.025 / 输出 6（元）
//    · deepseek-chat / deepseek-reasoner 已随官方下架移除（2026-08-14）。
//    · 缓存写无官方价，flash/pro 均按缓存命中同价内置（设置页可改/清空=
//      无此桶按输入价计费）。
//    ⚠️ 官方 2026-08-17 00:00 起改为峰谷定价（空闲时段为高峰一半），
//    暂未实现，后续再看。
//    其他模型在设置页按需添加（新增填输入价，输出/缓存读/缓存写按
//    5×/0.1×/1.25× 自动派生）。用户覆盖存于配置文件 prices 字段（version
//    4），estimate-cost 实时使用合并结果。缓存桶可缺省（undefined=该模型
//    无此桶，计费回退输入价）；⚠️ RPC 线路上用 null 编码缺省桶（undefined
//    不是合法 JSON，会被线上协议拒绝：'must be lossless JSON data'）。
// 2) 组装配置（2026-08-14）：{mode, tooltip, precision, segments, prices}。
//    settings 服务注册需要 zod schema（动态插件无 zod），故配置以 JSON
//    持久化到 settings 文档同目录的 cost-estimate.composition.json。
// 3) 明细字段（pkg-51 起，点击底栏分段的明细面板用）：estimateOf 对每个
//    有价模型输出 priceIn/priceCacheRead/priceCacheWrite/priceOut（单价，
//    缺省桶=null）与 inCost/cacheReadCost/cacheWriteCost/outCost（分桶金额）。
// 4) lastSample（pkg-55 起）：estimateOf 额外返回折叠时看到的最后一个用量
//    样本 {model, uncachedInput, output, cacheRead, cacheWrite}（null=无用量），
//    作为客户端「折叠底账 + 当前轮投影增量」的锚点：展示 =
//    foldTotal + max(0, cost(投影) − cost(lastSample))。
// 5) 预估缓存：内存缓存（pkg-57 起，TTL 5s）+ 持久化磁盘缓存（pkg-58 起，
//    TTL 5min，写盘节流 30s）。磁盘缓存存于 settings 文档同目录的
//    cost-estimate.estimates.json（{version, updatedAt, entries:{sessionId:
//    {foldedAt, result}}}），页面刷新/切会话/插件重启后直接读盘秒出，不再
//    全量重算。
// 6) 修订 18（大会话性能）：内存 TTL 30s；磁盘 TTL 30min + stale-while-
//    revalidate（命中磁盘秒回旧值，后台异步重折）；折叠分块让出事件循环
//    （每 4000 事件 ctx.timeout(0)）——实测本会话 11.5MB / ~9.8 万事件，
//    全量折叠同步执行会堵死服务器事件循环，设置页等其他 RPC 排队十几秒。
//    ⚠️ Host 半体必须声明 inject: ['timer']——ctx.timeout 是属性访问，受
//    注入门控（未声明会被 Host guard 拒绝：'service "timer" is not injected'）。
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

    const fresh = () => ({ models: new Map(), lastModel: null, lastUsage: null })

    const applyUsage = (state, usage, turn, step) => {
      const model = state.lastModel === null ? '?' : state.lastModel
      const buckets = {
        uncachedInput: usage.inputTokens || 0,
        output: usage.outputTokens || 0,
        cacheRead: usage.cacheReadTokens || 0,
        cacheWrite: usage.cacheWriteTokens || 0,
      }
      const prev = state.lastUsage !== null && state.lastUsage.turn === turn && state.lastUsage.step === step
        ? state.lastUsage
        : null
      const key = prev !== null ? prev.model : model
      if (prev !== null) {
        const oldRow = state.models.get(prev.model)
        if (oldRow !== undefined) {
          oldRow.uncachedInput -= prev.uncachedInput
          oldRow.output -= prev.output
          oldRow.cacheRead -= prev.cacheRead
          oldRow.cacheWrite -= prev.cacheWrite
        }
      }
      state.lastUsage = { turn, step, model: key, ...buckets }
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
        state.lastModel = event.data.model
      } else if (event.type === 'request/header') {
        state.lastModel = event.data.header.config.model
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

    // 合并价格：用户覆盖优先；缓存桶缺省保持 undefined（无此桶），计费时回退输入价
    const priceOf = (model) => {
      const user = configPrices[model]
      const base = DEFAULT_PRICES[model]
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
        // 分桶金额与单价（明细面板用；缺省桶=无此桶，计费回退输入价）
        const inCost = u.uncachedInput / 1e6 * price.in
        const cacheReadCost = u.cacheRead / 1e6 * (price.cacheRead ?? price.in)
        const cacheWriteCost = u.cacheWrite / 1e6 * (price.cacheWrite ?? price.in)
        const outCost = u.output / 1e6 * price.out
        const cost = inCost + cacheReadCost + cacheWriteCost + outCost
        totals[currency] = (totals[currency] || 0) + cost
        priced.push({
          model, cost, currency,
          uncachedInput: u.uncachedInput, output: u.output, cacheRead: u.cacheRead, cacheWrite: u.cacheWrite,
          // ⚠️ 缺省桶线上用 null 编码（undefined 不是合法 JSON）
          priceIn: price.in,
          priceCacheRead: price.cacheRead === undefined ? null : price.cacheRead,
          priceCacheWrite: price.cacheWrite === undefined ? null : price.cacheWrite,
          priceOut: price.out,
          inCost, cacheReadCost, cacheWriteCost, outCost,
        })
      }
      // 折叠时看到的最后一个用量样本（客户端实时增量锚点；null=无用量）
      const lastSample = state.lastUsage === null ? null : {
        model: state.lastUsage.model,
        uncachedInput: state.lastUsage.uncachedInput,
        output: state.lastUsage.output,
        cacheRead: state.lastUsage.cacheRead,
        cacheWrite: state.lastUsage.cacheWrite,
      }
      return { totals, priced, unpriced, hasUsage: anyTokens, lastSample }
    }

    // ── 预估缓存（修订 15 + 修订 18）：内存 30s + 磁盘 30min（写盘节流 30s） ──
    // 磁盘文件：settings 文档同目录 cost-estimate.estimates.json
    const ESTIMATE_MEM_TTL = 30000
    const ESTIMATE_DISK_TTL = 1800000
    const FOLD_CHUNK = 4000
    const estimateMem = new Map()
    const folding = new Map()
    let diskEntries = null
    let diskDirty = false
    let lastDiskWrite = 0
    let estimateFile = null
    const loadDiskCache = async () => {
      if (diskEntries !== null) return
      diskEntries = {}
      if (estimateFile === null) return
      const fsSvc = ctx.get('fs')
      if (fsSvc === undefined) return
      try {
        const target = await fsSvc.resolve(estimateFile)
        const info = await fsSvc.stat(target)
        if (info !== undefined) {
          const text = await fsSvc.readText(target)
          const parsed = JSON.parse(text)
          if (parsed !== null && typeof parsed === 'object' && parsed.entries !== null && typeof parsed.entries === 'object') {
            diskEntries = parsed.entries
          }
        }
      } catch (err) {
        // 首次无文件/损坏：保持空缓存
      }
    }
    // 折叠（修订 18）：全量 readSession + 分块让出事件循环（大会话不堵其他 RPC）
    const refold = async (sessionId) => {
      if (folding.has(sessionId)) return folding.get(sessionId)
      const promise = (async () => {
        try {
          const query = ctx.get('sessionQuery')
          if (query === undefined) return null
          const t0 = Date.now()
          const snapshot = await query.readSession(sessionId)
          const t1 = Date.now()
          if (snapshot === undefined || snapshot.events === undefined) return null
          const state = fresh()
          const events = snapshot.events
          for (let i = 0; i < events.length; i++) {
            foldEvent(state, events[i])
            if (i % FOLD_CHUNK === FOLD_CHUNK - 1) {
              await new Promise((resolve) => ctx.timeout(resolve, 0))
            }
          }
          const result = estimateOf(state)
          const t2 = Date.now()
          console.error('[dsh-bottom-bar] refold ' + String(sessionId).slice(0, 8) + ': readSession=' + (t1 - t0) + 'ms fold=' + (t2 - t1) + 'ms events=' + events.length)
          await estimateSet(sessionId, result)
          return result
        } catch (err) {
          console.error('cost-estimate failed:', err)
          return null
        } finally {
          folding.delete(sessionId)
        }
      })()
      folding.set(sessionId, promise)
      return promise
    }
    const kickRefold = (sessionId) => {
      refold(sessionId).catch(() => {})
    }

    harness.handle('estimate-cost', async (args) => {
      const sessionId = args === null || args === undefined ? undefined : args.sessionId
      if (typeof sessionId !== 'string') {
        return { totals: {}, priced: [], unpriced: [], hasUsage: false, lastSample: null }
      }
      const now = Date.now()
      // 1) 内存缓存（流式期间主要命中；TTL 30s）
      const mem = estimateMem.get(sessionId)
      if (mem !== undefined && now - mem.foldedAt <= ESTIMATE_MEM_TTL) return mem.result
      // 2) 磁盘缓存（30min TTL）：秒回 + 后台异步重折（stale-while-revalidate）
      if (diskEntries === null) await loadDiskCache()
      const disk = diskEntries[sessionId]
      if (disk !== undefined && disk !== null && now - disk.foldedAt <= ESTIMATE_DISK_TTL) {
        estimateMem.set(sessionId, disk)
        kickRefold(sessionId)
        return disk.result
      }
      // 3) 无缓存：同步重折（分块让出，不堵事件循环）
      const result = await refold(sessionId)
      if (result === null) {
        return { totals: {}, priced: [], unpriced: [], hasUsage: false, lastSample: null }
      }
      return result
    })
    const maybeWriteDisk = async (now) => {
      if (!diskDirty || estimateFile === null) return
      if (now - lastDiskWrite < 30000) return
      const fsSvc = ctx.get('fs')
      if (fsSvc === undefined) return
      try {
        const target = await fsSvc.resolve(estimateFile)
        await fsSvc.writeText(target, JSON.stringify({
          version: 1,
          updatedAt: new Date(now).toISOString(),
          entries: diskEntries,
        }, null, 2))
        lastDiskWrite = now
        diskDirty = false
      } catch (err) {
        console.error('estimate disk cache write failed:', err)
      }
    }
    const estimateSet = async (sessionId, result) => {
      const now = Date.now()
      const entry = { result, foldedAt: now }
      estimateMem.set(sessionId, entry)
      if (diskEntries === null) diskEntries = {}
      diskEntries[sessionId] = entry
      diskDirty = true
      // 上限 200 条，删最旧
      const keys = Object.keys(diskEntries)
      if (keys.length > 200) {
        let oldestKey = keys[0]
        let oldestAt = diskEntries[oldestKey].foldedAt
        for (const key of keys) {
          const at = diskEntries[key].foldedAt
          if (at < oldestAt) {
            oldestAt = at
            oldestKey = key
          }
        }
        delete diskEntries[oldestKey]
        estimateMem.delete(oldestKey)
      }
      await maybeWriteDisk(now)
    }
    // 折叠（修订 18）：全量 readSession + 分块让出事件循环（大会话不堵其他 RPC）

    // ── 组装配置 + 价格：持久化到 settings 文档同目录的 JSON（version 4） ──
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
    let configFile = null
    const settingsSvc = ctx.get('settings')
    if (settingsSvc !== undefined) {
      try {
        const doc = await settingsSvc.prepareDocument()
        if (typeof doc === 'string' && doc.length > 0) {
          configFile = doc.replace(/[\\/][^\\/]*$/, '') + '/cost-estimate.composition.json'
          estimateFile = doc.replace(/[\\/][^\\/]*$/, '') + '/cost-estimate.estimates.json'
        }
      } catch (err) {
        console.error('composition config path failed:', err)
      }
    }
    const normalizeSegments = (raw) => {
      if (!Array.isArray(raw)) return null
      const seen = new Set()
      const out = []
      for (const item of raw) {
        if (typeof item !== 'object' || item === null) continue
        const id = item.id
        if (SEGMENT_IDS.indexOf(id) === -1 || seen.has(id)) continue
        seen.add(id)
        let enabled = item.enabled
        if (typeof enabled !== 'boolean') {
          enabled = item.placement !== 'off'
        }
        out.push({ id, enabled })
      }
      for (const id of SEGMENT_IDS) {
        if (!seen.has(id)) {
          seen.add(id)
          out.push({ id, enabled: true })
        }
      }
      return out
    }
    // null（线上缺省桶编码）与 undefined（内部缺省）统一处理
    const bucketNum = (v) => (v === undefined || v === null ? undefined : Number(v) || 0)
    const normalizePrices = (raw) => {
      if (typeof raw !== 'object' || raw === null) return {}
      const out = {}
      for (const key of Object.keys(raw)) {
        const p = raw[key]
        if (typeof p !== 'object' || p === null) continue
        out[key] = {
          currency: p.currency === 'CNY' ? 'CNY' : 'USD',
          in: Number(p.in) || 0,
          cacheRead: bucketNum(p.cacheRead),
          cacheWrite: bucketNum(p.cacheWrite),
          out: Number(p.out) || 0,
        }
      }
      return out
    }
    const loadConfig = async () => {
      if (compositionCache !== null) return
      if (configFile !== null) {
        const fsSvc = ctx.get('fs')
        if (fsSvc !== undefined) {
          try {
            const target = await fsSvc.resolve(configFile)
            const info = await fsSvc.stat(target)
            if (info !== undefined) {
              const text = await fsSvc.readText(target)
              const parsed = JSON.parse(text)
              const normalized = normalizeSegments(parsed.segments)
              if (normalized !== null) compositionCache = normalized
              compositionMode = MODES.indexOf(parsed.mode) !== -1 ? parsed.mode : DEFAULT_MODE
              tooltipMode = parsed.tooltip === 'always' ? 'always' : 'auto'
              precisionMode = parsed.precision === 'full' ? 'full' : 'compact'
              configPrices = normalizePrices(parsed.prices)
              compositionPersisted = true
            }
          } catch (err) {
            console.error('composition load failed:', err)
          }
        }
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
      const fsSvc = ctx.get('fs')
      if (fsSvc === undefined) return false
      try {
        const target = await fsSvc.resolve(configFile)
        await fsSvc.writeText(target, JSON.stringify({
          version: 4,
          updatedAt: new Date().toISOString(),
          mode: compositionMode,
          tooltip: tooltipMode,
          precision: precisionMode,
          segments: compositionCache,
          prices: configPrices,
        }, null, 2))
        compositionPersisted = true
        return true
      } catch (err) {
        console.error('composition save failed:', err)
        return false
      }
    }
    const snapshot = () => ({
      segments: compositionCache,
      mode: compositionMode,
      tooltip: tooltipMode,
      precision: precisionMode,
      persisted: compositionPersisted,
    })
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
          // ⚠️ 线上用 null 编码『无此桶』（undefined 不是合法 JSON）
          cacheRead: p.cacheRead === undefined ? null : p.cacheRead,
          cacheWrite: p.cacheWrite === undefined ? null : p.cacheWrite,
          out: p.out,
          builtin: DEFAULT_PRICES[model] !== undefined,
        })
      }
      return rows
    }
    harness.handle('get-composition', async () => {
      await loadConfig()
      return snapshot()
    })
    harness.handle('set-composition', async (args) => {
      await loadConfig()
      const a = args === null || args === undefined ? {} : args
      const normalized = normalizeSegments(a.segments)
      await saveConfig(
        normalized !== null ? normalized : undefined,
        a.mode,
        a.tooltip,
        a.precision,
        undefined,
      )
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
