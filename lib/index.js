// ══════════════════════════════════════════════════════════════════
// dsh-bottom-bar · Host 半体（静态固化版，修订 35，2026-08-15）
// ──
// 与动态版（dynamic/host.js）逻辑一致：增量账本（session/event O(1) 追加 +
// session/flush 落盘 + 60s 兜底）、客户端捎带全量对账（reconcileWithProjection）、
// 渠道/模型归因（healAttribution）、配置/价格持久化、get-client-usage。
// 差异：① 类插件模式（官方带 Remote 的插件均 Service 子类 default export，
// 修复旧版"对象插件 + 手动 new Service + ctx.provide 二次注册"导致的
// `service "bottomBar" has been registered` boot 硬伤）；② 存储用 node:fs/promises
// 直写官方 ~/.dsh（主进程无会话沙箱，无需 danger stamp）；③ Remote 方法 wire 名
// = 方法名（host SRC 发现用 exportName ?? method，client 代理方法名 = descriptor.method，
// 两端必须一致）。
// ══════════════════════════════════════════════════════════════════
import { TypertRemoteService, Remote } from '@deepseek-ai/dsh-typert-protocol'
import { Service } from '@deepseek-ai/cordis'
import { readFile, writeFile, stat, mkdir } from 'node:fs/promises'
import { homedir } from 'node:os'
import { dirname } from 'node:path'

// ── Remote 装饰器的手工等效（无装饰器语法，plain JS 可用） ──
// Remote(name) 返回标准方法装饰器，内部走 context.addInitializer 在实例上
// 标记原型（dsh-typert-protocol 的 marker 表）。这里构造等价的 decoratorContext，
// 收集 initializer 后在构造器里执行。exportName 省略 = 方法名即 wire 名。
function remoteMarks(methodName) {
  const initializers = []
  Remote(methodName)(null, {
    kind: 'method',
    name: methodName,
    static: false,
    private: false,
    addInitializer(fn) {
      initializers.push(fn)
    },
  })
  return initializers
}
const REMOTE_METHODS = [
  'estimateCost',
  'getConfig',
  'setConfig',
  'resetConfig',
  'getPrices',
  'setPrice',
  'removePrice',
  'resetPrices',
  'getClientUsage',
  'diagnostics',
]

const DEFAULT_PRICES = {
  // 官方 DeepSeek 系列（CNY / 1M tokens）
  'deepseek-v4-flash': { currency: 'CNY', in: 1, cacheRead: 0.02, cacheWrite: 0.02, out: 2 },
  'deepseek-v4-pro': { currency: 'CNY', in: 3, cacheRead: 0.025, cacheWrite: 0.025, out: 6 },
  'deepseek-chat': { currency: 'CNY', in: 2, cacheRead: 0.5, cacheWrite: 2, out: 8 },
  'deepseek-reasoner': { currency: 'CNY', in: 4, cacheRead: 1, cacheWrite: 4, out: 16 },
  'deepseek-v3': { currency: 'CNY', in: 2, cacheRead: 0.5, cacheWrite: 2, out: 8 },
  'deepseek-v3-flash': { currency: 'CNY', in: 1, cacheRead: 0.02, cacheWrite: 0.02, out: 2 },
  'deepseek-r1': { currency: 'CNY', in: 4, cacheRead: 1, cacheWrite: 4, out: 16 },

  // Claude 系列（USD / 1M tokens）
  'claude-3-5-sonnet': { currency: 'USD', in: 3, cacheRead: 0.3, cacheWrite: 3.75, out: 15 },
  'claude-3-7-sonnet': { currency: 'USD', in: 3, cacheRead: 0.3, cacheWrite: 3.75, out: 15 },
  'claude-sonnet-4': { currency: 'USD', in: 3, cacheRead: 0.3, cacheWrite: 3.75, out: 15 },
  'claude-3-5-haiku': { currency: 'USD', in: 0.8, cacheRead: 0.08, cacheWrite: 1, out: 4 },
  'claude-3-opus': { currency: 'USD', in: 15, cacheRead: 1.5, cacheWrite: 18.75, out: 75 },

  // OpenAI 系列（USD / 1M tokens）
  'gpt-4o': { currency: 'USD', in: 2.5, cacheRead: 1.25, cacheWrite: 2.5, out: 10 },
  'gpt-4o-mini': { currency: 'USD', in: 0.15, cacheRead: 0.075, cacheWrite: 0.15, out: 0.6 },
  'o1': { currency: 'USD', in: 15, cacheRead: 7.5, cacheWrite: 15, out: 60 },
  'o3-mini': { currency: 'USD', in: 1.1, cacheRead: 0.55, cacheWrite: 1.1, out: 4.4 },

  // Gemini 系列（USD / 1M tokens）
  'gemini-2.0-flash': { currency: 'USD', in: 0.1, cacheRead: 0.025, cacheWrite: 0.1, out: 0.4 },
  'gemini-2.0-pro': { currency: 'USD', in: 1.25, cacheRead: 0.3125, cacheWrite: 1.25, out: 5 },

  // Qwen 系列（CNY / 1M tokens）
  'qwen-plus': { currency: 'CNY', in: 0.8, cacheRead: 0.2, cacheWrite: 0.8, out: 2 },
  'qwen-max': { currency: 'CNY', in: 20, cacheRead: 5, cacheWrite: 20, out: 60 },
  'qwen-turbo': { currency: 'CNY', in: 0.3, cacheRead: 0.05, cacheWrite: 0.3, out: 0.6 },
}

const SEGMENT_IDS = ['counts', 'llm', 'toolCall', 'ttft', 'throughput', 'cacheHit', 'tokens', 'cost']
const MODES = ['separate', 'combined']
const DEFAULT_MODE = 'separate'
const DEFAULT_COMPOSITION = SEGMENT_IDS.map((id) => ({ id, enabled: true }))

class BottomBarService extends TypertRemoteService {
  constructor(ctx, config) {
    super(ctx, 'bottomBar')
    for (const name of REMOTE_METHODS) {
      for (const fn of remoteMarks(name)) fn.call(this)
    }
    // ── 存储（官方 ~/.dsh，settings 文档同目录） ──
    this.officialStoreDir = null
    this.storeDir = null
    // ── 账本 ──
    this.ledger = null
    this.dirtySessions = new Set()
    this.liveStates = new Map()
    this.lastReconcile = new Map()
    this.lastClientUsage = null
    this.storeAttempts = []
    // ── 配置 ──
    this.compositionCache = null
    this.compositionMode = null
    this.tooltipMode = null
    this.precisionMode = null
    this.configPrices = null
    this.compositionPersisted = false
  }

  // ── 归因键：渠道/模型 ──
  rowKeyOf(provider, model) {
    const m = model === null || model === undefined || model === '?' ? '?' : model
    const p = provider === null || provider === undefined || provider === '' || provider === '?' ? null : provider
    return p === null ? m : p + '/' + m
  }

  modelPartOf(key) {
    if (typeof key !== 'string') return key
    const at = Math.max(key.lastIndexOf('@'), key.lastIndexOf('/'))
    return at === -1 ? key : key.slice(at + 1)
  }

  normalizeKey(key) {
    return typeof key === 'string' ? key.split('@').join('/') : key
  }

  fresh() {
    return { models: new Map(), lastModel: null, lastProvider: null, lastUsage: null }
  }

  applyUsage(state, usage, turn, step) {
    const rowKey = this.rowKeyOf(state.lastProvider, state.lastModel)
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

  foldEvent(state, event) {
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
    if (usage !== undefined) this.applyUsage(state, usage, turn, step)
  }

  currentRouteOf(session) {
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

  healAttribution(state, provider, model) {
    if (model === null || model === '?' || model === undefined) return
    const key = this.rowKeyOf(provider, model)
    if (state.lastModel === null || state.lastModel === '?') state.lastModel = model
    if (state.lastProvider === null || state.lastProvider === '?') state.lastProvider = provider === null ? null : provider
    for (const k of Array.from(state.models.keys())) {
      if (typeof k === 'string' && k.indexOf('@') !== -1) {
        const nk = k.split('@').join('/')
        const row = state.models.get(k)
        if (!state.models.has(nk)) state.models.set(nk, row)
        state.models.delete(k)
      }
    }
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
      if (typeof lu.model === 'string' && lu.model.indexOf('@') !== -1) {
        state.lastUsage = { ...lu, model: lu.model.split('@').join('/') }
      } else if (lu.model === '?' || (lu.model === model && key !== model)) {
        state.lastUsage = { ...lu, model: key, provider: state.lastUsage.provider === null || state.lastUsage.provider === undefined ? provider : state.lastUsage.provider }
      }
    }
  }

  // ── 存储（主进程 node:fs 直写，无会话沙箱） ──
  ledgerPath() {
    return (this.storeDir !== null ? this.storeDir : this.officialStoreDir) + '/cost-estimate.ledger.json'
  }

  configPath() {
    return (this.storeDir !== null ? this.storeDir : this.officialStoreDir) + '/cost-estimate.composition.json'
  }

  async readJsonFile(path) {
    try {
      const info = await stat(path)
      if (info === undefined) return null
      const text = await readFile(path, 'utf8')
      return JSON.parse(text)
    } catch (err) { return null }
  }

  async writeJsonFile(path, value) {
    try {
      await mkdir(dirname(path), { recursive: true })
      await writeFile(path, JSON.stringify(value, null, 2), 'utf8')
      return true
    } catch (err) {
      console.error('dsh-bottom-bar: write failed', path, err)
      return false
    }
  }

  // 官方存储目录三源兜底：DSH_HOME 环境变量 → settings 文档目录 → ~/.dsh
  // （[Service.init] 时序里 settings 服务可能尚未提供，不能只依赖它）
  async resolveOfficialStoreDir() {
    if (typeof process !== 'undefined' && process.env && typeof process.env.DSH_HOME === 'string' && process.env.DSH_HOME.length > 0) {
      return process.env.DSH_HOME.replace(/[\\/]+$/, '')
    }
    try {
      const settingsSvc = this.ctx.get('settings')
      if (settingsSvc !== undefined) {
        const doc = await settingsSvc.prepareDocument()
        if (typeof doc === 'string' && doc.length > 0) {
          const dir = doc.replace(/[\\/][^\\/]*$/, '')
          if (dir.length > 0) return dir
        }
      }
    } catch (err) { /* ignore */ }
    try {
      return homedir() + '/.dsh'
    } catch (err) { return null }
  }

  async loadLedger() {
    if (this.ledger !== null) return
    this.ledger = { version: 1, sessions: {} }
    const parsed = await this.readJsonFile(this.ledgerPath())
    if (parsed !== null && typeof parsed === 'object' && parsed.sessions !== null && typeof parsed.sessions === 'object') {
      this.ledger = parsed
    }
    for (const [sid, entry] of Object.entries(this.ledger.sessions)) {
      if (typeof entry !== 'object' || entry === null) continue
      const models = new Map()
      if (typeof entry.models === 'object' && entry.models !== null) {
        for (const [model, b] of Object.entries(entry.models)) {
          models.set(this.normalizeKey(model), {
            uncachedInput: Number(b.uncachedInput) || 0,
            output: Number(b.output) || 0,
            cacheRead: Number(b.cacheRead) || 0,
            cacheWrite: Number(b.cacheWrite) || 0,
          })
        }
      }
      this.liveStates.set(sid, {
        models,
        lastModel: typeof entry.lastModel === 'string' ? entry.lastModel : null,
        lastProvider: typeof entry.lastProvider === 'string' ? entry.lastProvider : null,
        lastUsage: typeof entry.lastUsage === 'object' && entry.lastUsage !== null ? entry.lastUsage : null,
        baseApplied: entry.baseApplied === true,
      })
    }
  }

  async writeLedger() {
    if (this.ledger === null) return
    await this.writeJsonFile(this.ledgerPath(), {
      version: 1,
      updatedAt: new Date().toISOString(),
      sessions: this.ledger.sessions,
    })
  }

  persistSession(sessionId) {
    const st = this.liveStates.get(sessionId)
    if (st === undefined || this.ledger === null) return
    const models = {}
    for (const [model, b] of st.models) {
      models[model] = { uncachedInput: b.uncachedInput, output: b.output, cacheRead: b.cacheRead, cacheWrite: b.cacheWrite }
    }
    this.ledger.sessions[sessionId] = {
      lastModel: st.lastModel,
      lastProvider: st.lastProvider,
      lastUsage: st.lastUsage,
      baseApplied: st.baseApplied === true,
      models,
    }
    this.dirtySessions.add(sessionId)
  }

  liveStateOf(sessionId) {
    let st = this.liveStates.get(sessionId)
    if (st === undefined) {
      st = this.fresh()
      st.baseApplied = false
      this.liveStates.set(sessionId, st)
      if (this.liveStates.size > 100) {
        const oldest = this.liveStates.keys().next().value
        this.liveStates.delete(oldest)
      }
    }
    return st
  }

  // ── 价格 ──
  normalizeModelKey(key) {
    if (typeof key !== 'string') return ''
    const lastSlash = Math.max(key.lastIndexOf('@'), key.lastIndexOf('/'))
    let name = lastSlash === -1 ? key : key.slice(lastSlash + 1)
    name = name.toLowerCase().trim()
    name = name.replace(/-\d{8}$/, '')
    name = name.replace(/\./g, '-')
    name = name.replace(/:(free|preview|latest|default)$/i, '')
    return name
  }

  priceOf(model) {
    if (typeof model !== 'string' || model === '' || model === '?') return undefined
    const modelPart = this.modelPartOf(model)
    const norm = this.normalizeModelKey(model)
    const normPart = this.normalizeModelKey(modelPart)

    // 1. 用户自定义价格优先（支持 精确渠道键 > 纯模型名 > 标准化键）
    let user = undefined
    if (this.configPrices !== null && this.configPrices !== undefined) {
      user = this.configPrices[model] ?? this.configPrices[modelPart] ?? this.configPrices[norm] ?? this.configPrices[normPart]
    }

    // 2. 默认内置价格表匹配
    let base = DEFAULT_PRICES[model] ?? DEFAULT_PRICES[modelPart] ?? DEFAULT_PRICES[norm] ?? DEFAULT_PRICES[normPart]
    if (base === undefined) {
      for (const [k, p] of Object.entries(DEFAULT_PRICES)) {
        if (norm.includes(k) || k.includes(norm) || normPart.includes(k) || k.includes(normPart)) {
          base = p
          break
        }
      }
    }

    // 3. 通用兜底价格（渠道模型若无内置价格，自动按 DeepSeek 官方标准 CNY 1/2 计费，绝不显示“无价”）
    if (user === undefined && base === undefined) {
      base = { currency: 'CNY', in: 1, cacheRead: 0.1, cacheWrite: 1, out: 2 }
    }

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

  estimateOf(state) {
    const priced = []
    const unpriced = []
    const totals = {}
    let anyTokens = false
    for (const [model, u] of state.models) {
      const tokens = u.uncachedInput + u.output + u.cacheRead + u.cacheWrite
      if (tokens > 0) anyTokens = true
      const price = this.priceOf(model)
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

  // ── 投影总量 / 对账 ──
  bucketsFromSnap(snap) {
    if (snap === null || snap === undefined) return null
    const u = (snap.data && snap.data.tokenUsage) || snap.tokenUsage
    if (typeof u !== 'object' || u === null) return null
    const cacheRead = typeof u.cacheReadTokens === 'number' ? u.cacheReadTokens : 0
    const cacheWrite = typeof u.cacheWriteTokens === 'number' ? u.cacheWriteTokens : 0
    const input = typeof u.inputTokens === 'number' ? u.inputTokens : 0
    const uncached = typeof u.uncachedInputTokens === 'number' ? u.uncachedInputTokens : Math.max(0, input - cacheRead - cacheWrite)
    const output = typeof u.outputTokens === 'number' ? u.outputTokens : 0
    return { uncachedInput: uncached, output, cacheRead, cacheWrite }
  }

  clientUsageOf(args) {
    const u = args === null || args === undefined ? undefined : args.usage
    if (typeof u !== 'object' || u === null) return null
    const cacheRead = typeof u.cacheReadTokens === 'number' ? u.cacheReadTokens : 0
    const cacheWrite = typeof u.cacheWriteTokens === 'number' ? u.cacheWriteTokens : 0
    const uncached = typeof u.uncachedInputTokens === 'number' ? u.uncachedInputTokens : 0
    const output = typeof u.outputTokens === 'number' ? u.outputTokens : 0
    if (uncached + output + cacheRead + cacheWrite <= 0) return null
    return { uncachedInput: uncached, output, cacheRead, cacheWrite }
  }

  async projectionTotals(sessionId, liveSession) {
    try {
      if (liveSession !== null && liveSession !== undefined) {
        const svc = this.ctx.get('sessionProjections')
        if (svc !== undefined) {
          const snap = svc.snapshot(liveSession)
          const b = this.bucketsFromSnap(snap)
          if (b !== null) return b
        }
      }
    } catch (err) { /* ignore */ }
    try {
      const svc = this.ctx.get('sessionProjectionCache')
      if (svc === undefined) return null
      const snap = await svc.coldSnapshot(sessionId)
      return this.bucketsFromSnap(snap)
    } catch (err) { return null }
  }

  fallbackRoute() {
    try {
      const svc = this.ctx.get('agentDefaultModel')
      const sel = svc === undefined ? undefined : svc.currentSelection()
      if (sel && typeof sel.model === 'string') {
        return { provider: typeof sel.provider === 'string' && sel.provider.length > 0 ? sel.provider : null, model: sel.model }
      }
    } catch (err) { /* ignore */ }
    return { provider: null, model: '?' }
  }

  async reconcileWithProjection(sessionId, state, liveSession, clientUsage) {
    const now = Date.now()
    const last = this.lastReconcile.get(sessionId)
    if (last !== undefined && now - last < 15000) return
    this.lastReconcile.set(sessionId, now)
    let proj = clientUsage
    if (proj === null || proj === undefined) proj = await this.projectionTotals(sessionId, liveSession)
    if (proj === null || proj === undefined) return
    const total = { uncachedInput: 0, output: 0, cacheRead: 0, cacheWrite: 0 }
    for (const b of state.models.values()) {
      total.uncachedInput += b.uncachedInput
      total.output += b.output
      total.cacheRead += b.cacheRead
      total.cacheWrite += b.cacheWrite
    }
    const gap = {
      uncachedInput: Math.max(0, proj.uncachedInput - total.uncachedInput),
      output: Math.max(0, proj.output - total.output),
      cacheRead: Math.max(0, proj.cacheRead - total.cacheRead),
      cacheWrite: Math.max(0, proj.cacheWrite - total.cacheWrite),
    }
    const gapTotal = gap.uncachedInput + gap.output + gap.cacheRead + gap.cacheWrite
    if (gapTotal <= 0) return
    const projTotal = proj.uncachedInput + proj.output + proj.cacheRead + proj.cacheWrite
    if (gapTotal < Math.max(projTotal * 0.01, 100000)) return
    const route = state.lastModel !== null ? { provider: state.lastProvider, model: state.lastModel } : this.fallbackRoute()
    const key = this.rowKeyOf(route.provider, route.model)
    const row = state.models.get(key)
    if (row === undefined) {
      state.models.set(key, { ...gap })
    } else {
      state.models.set(key, {
        uncachedInput: row.uncachedInput + gap.uncachedInput,
        output: row.output + gap.output,
        cacheRead: row.cacheRead + gap.cacheRead,
        cacheWrite: row.cacheWrite + gap.cacheWrite,
      })
    }
    this.persistSession(sessionId)
  }

  // ── 配置（version 4：{mode, tooltip, precision, segments, prices}） ──
  normalizeSegments(raw) {
    if (!Array.isArray(raw)) return null
    const out = []
    for (const item of raw) {
      if (typeof item !== 'object' || item === null) continue
      if (SEGMENT_IDS.indexOf(item.id) === -1) continue
      out.push({ id: item.id, enabled: item.enabled !== false })
    }
    if (out.length === 0) return null
    return out
  }

  bucketNum(v) {
    if (v === null || v === undefined || v === '') return undefined
    const n = Number(v)
    return Number.isFinite(n) ? n : undefined
  }

  normalizePrices(raw) {
    if (typeof raw !== 'object' || raw === null) return {}
    const out = {}
    for (const model of Object.keys(raw)) {
      const p = raw[model]
      if (typeof p !== 'object' || p === null) continue
      out[model] = {
        currency: p.currency === 'CNY' ? 'CNY' : 'USD',
        in: Number(p.in) || 0,
        cacheRead: this.bucketNum(p.cacheRead),
        cacheWrite: this.bucketNum(p.cacheWrite),
        out: Number(p.out) || 0,
      }
    }
    return out
  }

  async loadConfig() {
    if (this.compositionCache !== null) return
    const parsed = await this.readJsonFile(this.configPath())
    if (parsed !== null && typeof parsed === 'object') {
      const normalized = this.normalizeSegments(parsed.segments)
      if (normalized !== null) {
        this.compositionCache = normalized
        this.compositionMode = MODES.indexOf(parsed.mode) !== -1 ? parsed.mode : DEFAULT_MODE
        this.tooltipMode = parsed.tooltip === 'always' ? 'always' : 'auto'
        this.precisionMode = parsed.precision === 'full' ? 'full' : 'compact'
        this.configPrices = this.normalizePrices(parsed.prices)
        this.compositionPersisted = true
      }
    }
    if (this.compositionCache === null) this.compositionCache = DEFAULT_COMPOSITION
    if (this.compositionMode === null) this.compositionMode = DEFAULT_MODE
    if (this.tooltipMode === null) this.tooltipMode = 'auto'
    if (this.precisionMode === null) this.precisionMode = 'compact'
    if (this.configPrices === null) this.configPrices = {}
  }

  async saveConfig(segments, mode, tooltip, precision, prices) {
    if (segments !== undefined) this.compositionCache = segments
    if (mode !== undefined) this.compositionMode = MODES.indexOf(mode) !== -1 ? mode : DEFAULT_MODE
    if (tooltip !== undefined) this.tooltipMode = tooltip === 'always' ? 'always' : 'auto'
    if (precision !== undefined) this.precisionMode = precision === 'full' ? 'full' : 'compact'
    if (prices !== undefined) this.configPrices = prices
    if (this.officialStoreDir === null && this.storeDir === null) return false
    const ok = await this.writeJsonFile(this.configPath(), {
      version: 4,
      updatedAt: new Date().toISOString(),
      mode: this.compositionMode,
      tooltip: this.tooltipMode,
      precision: this.precisionMode,
      segments: this.compositionCache,
      prices: this.configPrices,
    })
    if (ok) this.compositionPersisted = true
    return ok
  }

  snapshot() {
    return {
      segments: this.compositionCache,
      mode: this.compositionMode,
      tooltip: this.tooltipMode,
      precision: this.precisionMode,
      persisted: this.compositionPersisted,
    }
  }

  priceList() {
    const map = {}
    for (const key of Object.keys(DEFAULT_PRICES)) map[key] = true
    for (const key of Object.keys(this.configPrices)) map[key] = true
    const builtin = Object.keys(DEFAULT_PRICES)
    const extra = Object.keys(this.configPrices).filter((k) => DEFAULT_PRICES[k] === undefined).sort()
    const rows = []
    for (const model of builtin.concat(extra)) {
      const p = this.priceOf(model)
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

  // ── 生命周期：目录探测 → 读账本/配置 → 订阅事件流 ──
  async [Service.init]() {
    const storeDir = await this.resolveOfficialStoreDir()
    if (storeDir !== null) {
      this.officialStoreDir = storeDir
      this.storeDir = storeDir
    }
    await this.loadLedger()
    await this.loadConfig()
    try {
      this.ctx.effect(() => this.ctx.on('session/event', (session, event) => {
        try {
          const sid = session && typeof session.id === 'string' ? session.id : null
          if (sid === null) return
          const st = this.liveStateOf(sid)
          const route = this.currentRouteOf(session)
          if (route !== null && (st.lastModel === null || st.lastModel === '?')) {
            st.lastModel = route.model
            if (route.provider !== null) st.lastProvider = route.provider
          }
          this.foldEvent(st, event)
          this.persistSession(sid)
        } catch (err) { /* 单事件失败不影响订阅 */ }
      }), 'dsh-bottom-bar: session/event')
    } catch (err) { console.error('dsh-bottom-bar: session/event subscribe failed', err) }
    try {
      this.ctx.effect(() => this.ctx.on('session/flush', async (session) => {
        try {
          const sid = session && typeof session.id === 'string' ? session.id : null
          if (sid === null) return
          if (this.liveStates.has(sid)) {
            this.persistSession(sid)
            await this.writeLedger()
          }
        } catch (err) { /* 落盘失败不影响 flush */ }
      }), 'dsh-bottom-bar: session/flush')
    } catch (err) { console.error('dsh-bottom-bar: session/flush subscribe failed', err) }
    try {
      this.ctx.effect(() => this.ctx.interval(() => {
        if (this.dirtySessions.size === 0) return
        this.writeLedger()
        this.dirtySessions.clear()
      }, 60000), 'dsh-bottom-bar: ledger interval')
    } catch (err) { /* ignore */ }
  }

  // ── Remote 方法（wire 名 = 方法名；host SRC 发现 + client descriptor 一致） ──
  async estimateCost(args) {
    const sessionId = args === null || args === undefined ? undefined : args.sessionId
    if (typeof sessionId !== 'string') {
      return { totals: {}, priced: [], unpriced: [], hasUsage: false, lastSample: null }
    }
    try {
      await this.loadConfig()
      const st = this.liveStateOf(sessionId)
      const clientUsage = this.clientUsageOf(args)
      if (clientUsage !== null && clientUsage !== undefined) {
        this.lastClientUsage = {
          at: Date.now(),
          ...clientUsage,
          model: typeof st.lastModel === 'string' && st.lastModel !== '?' ? st.lastModel : this.fallbackRoute().model,
          provider: typeof st.lastProvider === 'string' ? st.lastProvider : null,
        }
      }
      let live = undefined
      try {
        const sessionsSvc = this.ctx.get('sessions')
        live = sessionsSvc === undefined ? undefined : sessionsSvc.get(sessionId)
        const route = this.currentRouteOf(live)
        if (route !== null) this.healAttribution(st, route.provider, route.model)
      } catch (err) { /* ignore */ }
      await this.reconcileWithProjection(sessionId, st, live, clientUsage)
      return this.estimateOf(st)
    } catch (err) {
      console.error('dsh-bottom-bar: estimate failed:', err)
      return { totals: {}, priced: [], unpriced: [], hasUsage: false, lastSample: null }
    }
  }

  async getClientUsage() {
    await this.loadConfig()
    if (this.lastClientUsage === null) return { usage: null }
    const modelKey = this.rowKeyOf(this.lastClientUsage.provider, this.lastClientUsage.model)
    const price = this.priceOf(modelKey)
    if (price === undefined) {
      return { usage: { at: this.lastClientUsage.at, model: modelKey, provider: this.lastClientUsage.provider, currency: 'USD', uncachedInput: this.lastClientUsage.uncachedInput, cacheRead: this.lastClientUsage.cacheRead, cacheWrite: this.lastClientUsage.cacheWrite, output: this.lastClientUsage.output, inCost: null, cacheReadCost: null, cacheWriteCost: null, outCost: null, total: null } }
    }
    const inCost = this.lastClientUsage.uncachedInput / 1e6 * price.in
    const cacheReadCost = this.lastClientUsage.cacheRead / 1e6 * (price.cacheRead ?? price.in)
    const cacheWriteCost = this.lastClientUsage.cacheWrite / 1e6 * (price.cacheWrite ?? price.in)
    const outCost = this.lastClientUsage.output / 1e6 * price.out
    return {
      usage: {
        at: this.lastClientUsage.at,
        model: modelKey,
        provider: this.lastClientUsage.provider,
        currency: price.currency || 'USD',
        uncachedInput: this.lastClientUsage.uncachedInput,
        cacheRead: this.lastClientUsage.cacheRead,
        cacheWrite: this.lastClientUsage.cacheWrite,
        output: this.lastClientUsage.output,
        inCost, cacheReadCost, cacheWriteCost, outCost,
        total: inCost + cacheReadCost + cacheWriteCost + outCost,
      },
    }
  }

  async diagnostics() {
    return {
      officialStoreDir: this.officialStoreDir,
      storeDir: this.storeDir,
      ledgerSessions: this.ledger === null ? 0 : Object.keys(this.ledger.sessions).length,
      liveStates: this.liveStates.size,
    }
  }

  async getConfig() {
    await this.loadConfig()
    return this.snapshot()
  }

  async setConfig(args) {
    await this.loadConfig()
    const a = args === null || args === undefined ? {} : args
    const normalized = this.normalizeSegments(a.segments)
    await this.saveConfig(normalized !== null ? normalized : undefined, a.mode, a.tooltip, a.precision, undefined)
    return this.snapshot()
  }

  async resetConfig() {
    await this.loadConfig()
    await this.saveConfig(DEFAULT_COMPOSITION, DEFAULT_MODE, 'auto', 'compact', undefined)
    return this.snapshot()
  }

  async getPrices() {
    await this.loadConfig()
    return { prices: this.priceList(), persisted: this.compositionPersisted }
  }

  async setPrice(args) {
    await this.loadConfig()
    const a = args === null || args === undefined ? {} : args
    if (typeof a.model !== 'string' || a.model === '') return { prices: this.priceList() }
    const p = a.price
    if (typeof p !== 'object' || p === null) return { prices: this.priceList() }
    this.configPrices[a.model] = {
      currency: p.currency === 'CNY' ? 'CNY' : 'USD',
      in: Number(p.in) || 0,
      cacheRead: this.bucketNum(p.cacheRead),
      cacheWrite: this.bucketNum(p.cacheWrite),
      out: Number(p.out) || 0,
    }
    await this.saveConfig(undefined, undefined, undefined, undefined, this.configPrices)
    return { prices: this.priceList() }
  }

  async removePrice(args) {
    await this.loadConfig()
    const a = args === null || args === undefined ? {} : args
    if (typeof a.model === 'string') delete this.configPrices[a.model]
    await this.saveConfig(undefined, undefined, undefined, undefined, this.configPrices)
    return { prices: this.priceList() }
  }

  async resetPrices() {
    await this.loadConfig()
    this.configPrices = {}
    await this.saveConfig(undefined, undefined, undefined, undefined, this.configPrices)
    return { prices: this.priceList() }
  }
}

export default BottomBarService
