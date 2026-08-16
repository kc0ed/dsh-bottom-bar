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
import {
  DEFAULT_PRICES,
  resolvePrice,
  buildPriceList,
  normalizeModelKey,
  modelPartOf,
  isPeakTime,
} from './pricing.js'

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

const SEGMENT_IDS = ['counts', 'llm', 'toolCall', 'ttft', 'throughput', 'cacheHit', 'tokens', 'cost', 'peak']
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
    // ── 峰谷定价开关（DeepSeek 2026-08-17 起;默认开启,仅官方 deepseek 渠道） ──
    this.peakEnabled = true
    this.peakRemind = true
    this.peakProviders = ['deepseek']
    // 峰谷时区:'system'=跟随系统时区,或 'UTC±N' 固定偏移
    this.peakTimezone = 'system'
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

  // ── 价格与归因 ──
  normalizeModelKey(key) {
    return normalizeModelKey(key)
  }

  priceOf(model) {
    return resolvePrice(model, this.configPrices, { peakEnabled: this.peakEnabled, peakProviders: this.peakProviders, tz: this.peakTimezone, when: new Date() })
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
    const out = []
    if (Array.isArray(raw)) {
      for (const item of raw) {
        if (typeof item !== 'object' || item === null) continue
        if (SEGMENT_IDS.indexOf(item.id) === -1) continue
        out.push({ id: item.id, enabled: item.enabled !== false })
      }
    }
    // 修订 81：自动补全新分段（如「峰谷时段」）——旧配置没有的分段按默认启用追加,
    // 新功能无需重置配置即可出现;peak 分段不适用时自隐藏,不会打扰
    for (const id of SEGMENT_IDS) {
      if (!out.some((s) => s.id === id)) out.push({ id, enabled: true })
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
        if (typeof parsed.peakEnabled === 'boolean') this.peakEnabled = parsed.peakEnabled
        if (typeof parsed.peakRemind === 'boolean') this.peakRemind = parsed.peakRemind
        if (Array.isArray(parsed.peakProviders) && parsed.peakProviders.length > 0) this.peakProviders = parsed.peakProviders.filter((p) => typeof p === 'string')
        if (typeof parsed.peakTimezone === 'string') this.peakTimezone = parsed.peakTimezone
        this.compositionPersisted = true
      }
    }
    if (this.compositionCache === null) this.compositionCache = DEFAULT_COMPOSITION
    if (this.compositionMode === null) this.compositionMode = DEFAULT_MODE
    if (this.tooltipMode === null) this.tooltipMode = 'auto'
    if (this.precisionMode === null) this.precisionMode = 'compact'
    if (this.configPrices === null) this.configPrices = {}
  }

  async saveConfig(segments, mode, tooltip, precision, prices, peakEnabled, peakProviders, peakTimezone, peakRemind) {
    if (segments !== undefined) this.compositionCache = segments
    if (mode !== undefined) this.compositionMode = MODES.indexOf(mode) !== -1 ? mode : DEFAULT_MODE
    if (tooltip !== undefined) this.tooltipMode = tooltip === 'always' ? 'always' : 'auto'
    if (precision !== undefined) this.precisionMode = precision === 'full' ? 'full' : 'compact'
    if (prices !== undefined) this.configPrices = prices
    if (peakEnabled !== undefined) this.peakEnabled = peakEnabled === true
    if (peakRemind !== undefined) this.peakRemind = peakRemind === true
    if (peakProviders !== undefined) this.peakProviders = Array.isArray(peakProviders) ? peakProviders.filter((p) => typeof p === 'string') : this.peakProviders
    if (peakTimezone !== undefined) this.peakTimezone = typeof peakTimezone === 'string' ? peakTimezone : this.peakTimezone
    if (this.officialStoreDir === null && this.storeDir === null) return false
    const ok = await this.writeJsonFile(this.configPath(), {
      version: 8,
      updatedAt: new Date().toISOString(),
      mode: this.compositionMode,
      tooltip: this.tooltipMode,
      precision: this.precisionMode,
      peakEnabled: this.peakEnabled,
      peakRemind: this.peakRemind,
      peakProviders: this.peakProviders,
      peakTimezone: this.peakTimezone,
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
      peakEnabled: this.peakEnabled,
      peakRemind: this.peakRemind,
      peakProviders: this.peakProviders,
      peakTimezone: this.peakTimezone,
      peakNow: isPeakTime(new Date(), this.peakTimezone) ? 'peak' : 'offpeak',
      persisted: this.compositionPersisted,
    }
  }

  priceList() {
    return buildPriceList(this.configPrices)
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
    const peakNow = isPeakTime(new Date(), this.peakTimezone) ? 'peak' : 'offpeak'
    if (typeof sessionId !== 'string') {
      return { totals: {}, priced: [], unpriced: [], hasUsage: false, lastSample: null, peak: { enabled: this.peakEnabled, window: peakNow } }
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
      const est = this.estimateOf(st)
      // 修订 76：峰谷仅适用于官方 deepseek 渠道——会话没有白名单渠道的模型则不标注
      const officialIn = (p) => { const i = p.model.indexOf('/'); return i !== -1 && this.peakProviders.indexOf(p.model.slice(0, i)) !== -1 }
      const anyOfficial = est.priced.some(officialIn) || est.unpriced.some(officialIn)
      // 修订 82/83：取第一个官方渠道模型的高峰/空闲价展示;会话无官方渠道模型时
      // 回退到第一个解析出 peak 价组的模型（如 opencode-go/deepseek-v4-flash）,
      // 按官方价作参考展示（计价仍按渠道白名单规则,不受影响）
      let priceModel = est.priced.find(officialIn) || est.unpriced.find(officialIn)
      if (priceModel === undefined) {
        for (const list of [est.priced, est.unpriced]) {
          for (const p of list) {
            const bp = resolvePrice(p.model, this.configPrices, { peakEnabled: false })
            if (bp !== undefined && bp.peak !== undefined) { priceModel = p; break }
          }
          if (priceModel !== undefined) break
        }
      }
      let baseIn = null, baseOut = null, peakIn = null, peakOut = null
      if (priceModel !== undefined) {
        const baseP = resolvePrice(priceModel.model, this.configPrices, { peakEnabled: false })
        if (baseP !== undefined) {
          baseIn = baseP.in
          baseOut = baseP.out
          const pk = baseP.peak
          if (pk !== undefined) {
            peakIn = pk.in !== undefined ? pk.in : baseIn
            peakOut = pk.out !== undefined ? pk.out : baseOut
          }
        }
      }
      est.peak = { enabled: this.peakRemind, priced: this.peakEnabled && anyOfficial, window: peakNow, tz: this.peakTimezone, baseIn, baseOut, peakIn, peakOut }
      return est
    } catch (err) {
      console.error('dsh-bottom-bar: estimate failed:', err)
      return { totals: {}, priced: [], unpriced: [], hasUsage: false, lastSample: null, peak: { enabled: this.peakEnabled, window: peakNow } }
    }
  }

  async getClientUsage() {
    await this.loadConfig()
    if (this.lastClientUsage === null) return { usage: null }
    const modelKey = this.rowKeyOf(this.lastClientUsage.provider, this.lastClientUsage.model)
    const price = this.priceOf(modelKey)
    const peakNow = isPeakTime(new Date(), this.peakTimezone) ? 'peak' : 'offpeak'
    const officialProvider = typeof this.lastClientUsage.provider === 'string' && this.peakProviders.indexOf(this.lastClientUsage.provider) !== -1
    const peakInfo = { enabled: this.peakRemind, priced: this.peakEnabled && officialProvider, window: peakNow, tz: this.peakTimezone }
    if (price === undefined) {
      return { usage: { at: this.lastClientUsage.at, model: modelKey, provider: this.lastClientUsage.provider, currency: 'USD', uncachedInput: this.lastClientUsage.uncachedInput, cacheRead: this.lastClientUsage.cacheRead, cacheWrite: this.lastClientUsage.cacheWrite, output: this.lastClientUsage.output, inCost: null, cacheReadCost: null, cacheWriteCost: null, outCost: null, total: null, peak: peakInfo } }
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
        peak: peakInfo,
      },
    }
  }

  async diagnostics() {
    return {
      officialStoreDir: this.officialStoreDir,
      storeDir: this.storeDir,
      ledgerSessions: this.ledger === null ? 0 : Object.keys(this.ledger.sessions).length,
      liveStates: this.liveStates.size,
      peakEnabled: this.peakEnabled,
      peakRemind: this.peakRemind,
      peakProviders: this.peakProviders,
      peakTimezone: this.peakTimezone,
      peakWindow: isPeakTime(new Date(), this.peakTimezone) ? 'peak' : 'offpeak',
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
    await this.saveConfig(normalized !== null ? normalized : undefined, a.mode, a.tooltip, a.precision, undefined, a.peakEnabled, a.peakProviders, a.peakTimezone, a.peakRemind)
    return this.snapshot()
  }

  async resetConfig() {
    await this.loadConfig()
    await this.saveConfig(DEFAULT_COMPOSITION, DEFAULT_MODE, 'auto', 'compact', undefined, true)
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
