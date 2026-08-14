// ══════════════════════════════════════════════════════════════════
// dsh-bottom-bar · Host 半体（固化版，2026-08-14）
// ──
// 由动态插件 cost-2（pkg-47）固化而来：提供 bottomBar Remote 服务
// （TypertRemoteService + Remote 标记），客户端经 ctx.remote.bottomBar
// 调用。配置/价格持久化到 settings 文档同目录的 cost-estimate.composition.json。
// 同步说明：价格 DEFAULT_PRICES 为内置基准（官方 list price），用户可在
// 设置页覆盖；deepseek-v4-flash 定价由用户提供（2026-08-14：
// 输入 ¥1 / 缓存 ¥0.02 / 输出 ¥2）。config version 4：
// {mode, tooltip, precision, segments, prices}。
// 修订 10（pkg-53）：estimateOf 增补分桶明细字段（单价 priceIn/priceCacheRead/
// priceCacheWrite/priceOut，缺省桶 null 编码；分桶金额 inCost/cacheReadCost/
// cacheWriteCost/outCost），供底栏点击分段弹出的明细面板使用。
// 修订 12（pkg-55）：estimateOf 增补 lastSample（折叠时最后一个用量样本，
// null=无用量），作为客户端「折叠底账 + 当前轮投影增量」的实时锚点。
// 修订 14（pkg-57）：estimate-cost 结果按 session 缓存（内存 TTL 5s）。
// 客户端流式期间 1.5s 轮询反复请求，命中缓存直接返回（零 readSession/折叠）；
// 改价格后最多 5s 内被新折叠覆盖；客户端展示层有当前轮投影增量兜底。
// 修订 15（pkg-58）：预估结果持久化 —— 磁盘缓存存于 settings 文档同目录的
// cost-estimate.estimates.json（{version, updatedAt, entries:{sessionId:
// {foldedAt, result}}}，磁盘 TTL 5min、写盘节流 30s、上限 200 条）。页面刷新/
// 切会话/插件重启后直接读盘秒出，不再全量重算；客户端无改动。
// 经验教训见用户技能 dsh-dynamic-plugin-lessons。
// ══════════════════════════════════════════════════════════════════
import { TypertRemoteService, Remote } from '@deepseek-ai/dsh-typert-protocol'
import { Service } from '@deepseek-ai/cordis'

// ── Remote 装饰器的手工等效（无装饰器语法，plain JS 可用） ──
// Remote(name) 返回标准方法装饰器，内部走 context.addInitializer 在实例上
// 标记原型。这里构造等价的 decoratorContext，收集 initializer 后在构造器里执行。
function remoteMarks(methodName, exportName) {
  const initializers = []
  Remote(exportName)(null, {
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
const MARKS = {
  estimateCost: remoteMarks('estimateCost', 'estimate-cost'),
  getConfig: remoteMarks('getConfig', 'get-config'),
  setConfig: remoteMarks('setConfig', 'set-config'),
  resetConfig: remoteMarks('resetConfig', 'reset-config'),
  getPrices: remoteMarks('getPrices', 'get-prices'),
  setPrice: remoteMarks('setPrice', 'set-price'),
  removePrice: remoteMarks('removePrice', 'remove-price'),
  resetPrices: remoteMarks('resetPrices', 'reset-prices'),
}

const DEFAULT_PRICES = {
  // 本部署代理模型：用户提供的定价（CNY / 1M tokens，2026-08-14 确认）
  'deepseek-v4-flash': { currency: 'CNY', in: 1, cacheRead: 0.02, cacheWrite: 0.02, out: 2 },
  // DeepSeek 官方 API（api-docs.deepseek.com，2025-09 起）
  'deepseek-chat': { in: 0.27, cacheRead: 0.07, out: 1.10 },
  'deepseek-reasoner': { in: 0.55, cacheRead: 0.14, out: 2.19 },
}

const SEGMENT_IDS = ['counts', 'llm', 'toolCall', 'ttft', 'throughput', 'cacheHit', 'tokens', 'cost']
const MODES = ['separate', 'combined']
const DEFAULT_MODE = 'separate'
const DEFAULT_COMPOSITION = SEGMENT_IDS.map((id) => ({ id, enabled: true }))

class BottomBarService extends TypertRemoteService {
  constructor(ctx, config) {
    super(ctx, 'bottomBar')
    for (const key of Object.keys(MARKS)) {
      for (const fn of MARKS[key]) fn.call(this)
    }
    this.configFile = null
    this.compositionCache = null
    this.compositionMode = null
    this.tooltipMode = null
    this.precisionMode = null
    this.configPrices = null
    this.compositionPersisted = false
    // 预估缓存（修订 15）：内存 5s + 磁盘 5min（写盘节流 30s）
    this.estimateMem = new Map()
    this.diskEntries = null
    this.diskDirty = false
    this.lastDiskWrite = 0
    this.estimateFile = null
  }

  async [Service.init]() {
    const settingsSvc = this.ctx.get('settings')
    if (settingsSvc !== undefined) {
      try {
        const doc = await settingsSvc.prepareDocument()
        if (typeof doc === 'string' && doc.length > 0) {
          const dir = doc.replace(/[\\/][^\\/]*$/, '')
          this.configFile = dir + '/cost-estimate.composition.json'
          this.estimateFile = dir + '/cost-estimate.estimates.json'
        }
      } catch (err) {
        console.error('bottom-bar config path failed:', err)
      }
    }
  }

  // ── 用量折叠（与动态版一致：同 turn+step 替换语义） ──
  fresh() {
    return { models: new Map(), lastModel: null, lastUsage: null }
  }

  applyUsage(state, usage, turn, step) {
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

  foldEvent(state, event) {
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
    if (usage !== undefined) this.applyUsage(state, usage, turn, step)
  }

  priceOf(model) {
    const user = this.configPrices[model]
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

  // ── 配置读写（version 4：{mode, tooltip, precision, segments, prices}） ──
  normalizeSegments(raw) {
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
  bucketNum(v) {
    return v === undefined || v === null ? undefined : Number(v) || 0
  }

  normalizePrices(raw) {
    if (typeof raw !== 'object' || raw === null) return {}
    const out = {}
    for (const key of Object.keys(raw)) {
      const p = raw[key]
      if (typeof p !== 'object' || p === null) continue
      out[key] = {
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
    if (this.configFile !== null) {
      const fsSvc = this.ctx.get('fs')
      if (fsSvc !== undefined) {
        try {
          const target = await fsSvc.resolve(this.configFile)
          const info = await fsSvc.stat(target)
          if (info !== undefined) {
            const text = await fsSvc.readText(target)
            const parsed = JSON.parse(text)
            const normalized = this.normalizeSegments(parsed.segments)
            if (normalized !== null) this.compositionCache = normalized
            this.compositionMode = MODES.indexOf(parsed.mode) !== -1 ? parsed.mode : DEFAULT_MODE
            this.tooltipMode = parsed.tooltip === 'always' ? 'always' : 'auto'
            this.precisionMode = parsed.precision === 'full' ? 'full' : 'compact'
            this.configPrices = this.normalizePrices(parsed.prices)
            this.compositionPersisted = true
          }
        } catch (err) {
          console.error('bottom-bar config load failed:', err)
        }
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
    if (this.configFile === null) return false
    const fsSvc = this.ctx.get('fs')
    if (fsSvc === undefined) return false
    try {
      const target = await fsSvc.resolve(this.configFile)
      await fsSvc.writeText(target, JSON.stringify({
        version: 4,
        updatedAt: new Date().toISOString(),
        mode: this.compositionMode,
        tooltip: this.tooltipMode,
        precision: this.precisionMode,
        segments: this.compositionCache,
        prices: this.configPrices,
      }, null, 2))
      this.compositionPersisted = true
      return true
    } catch (err) {
      console.error('bottom-bar config save failed:', err)
      return false
    }
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
        // ⚠️ 线上用 null 编码『无此桶』（undefined 不是合法 JSON）
        cacheRead: p.cacheRead === undefined ? null : p.cacheRead,
        cacheWrite: p.cacheWrite === undefined ? null : p.cacheWrite,
        out: p.out,
        builtin: DEFAULT_PRICES[model] !== undefined,
      })
    }
    return rows
  }

  // ── 预估缓存（修订 15，pkg-58）：内存 5s + 磁盘 5min（写盘节流 30s） ──
  async loadDiskCache() {
    if (this.diskEntries !== null) return
    this.diskEntries = {}
    if (this.estimateFile === null) return
    const fsSvc = this.ctx.get('fs')
    if (fsSvc === undefined) return
    try {
      const target = await fsSvc.resolve(this.estimateFile)
      const info = await fsSvc.stat(target)
      if (info !== undefined) {
        const text = await fsSvc.readText(target)
        const parsed = JSON.parse(text)
        if (parsed !== null && typeof parsed === 'object' && parsed.entries !== null && typeof parsed.entries === 'object') {
          this.diskEntries = parsed.entries
        }
      }
    } catch (err) {
      // 首次无文件/损坏：保持空缓存
    }
  }

  async estimateGet(sessionId, now) {
    // 1) 内存缓存（流式期间 1.5s 轮询主要走这里）
    const mem = this.estimateMem.get(sessionId)
    if (mem !== undefined && now - mem.foldedAt <= 5000) return mem.result
    // 2) 磁盘缓存（页面刷新/切会话/插件重启后秒出）
    if (this.diskEntries === null) await this.loadDiskCache()
    const disk = this.diskEntries[sessionId]
    if (disk !== undefined && disk !== null && now - disk.foldedAt <= 300000) {
      this.estimateMem.set(sessionId, disk)
      return disk.result
    }
    return null
  }

  async maybeWriteDisk(now) {
    if (!this.diskDirty || this.estimateFile === null) return
    if (now - this.lastDiskWrite < 30000) return
    const fsSvc = this.ctx.get('fs')
    if (fsSvc === undefined) return
    try {
      const target = await fsSvc.resolve(this.estimateFile)
      await fsSvc.writeText(target, JSON.stringify({
        version: 1,
        updatedAt: new Date(now).toISOString(),
        entries: this.diskEntries,
      }, null, 2))
      this.lastDiskWrite = now
      this.diskDirty = false
    } catch (err) {
      console.error('estimate disk cache write failed:', err)
    }
  }

  async estimateSet(sessionId, result) {
    const now = Date.now()
    const entry = { result, foldedAt: now }
    this.estimateMem.set(sessionId, entry)
    if (this.diskEntries === null) this.diskEntries = {}
    this.diskEntries[sessionId] = entry
    this.diskDirty = true
    // 上限 200 条，删最旧
    const keys = Object.keys(this.diskEntries)
    if (keys.length > 200) {
      let oldestKey = keys[0]
      let oldestAt = this.diskEntries[oldestKey].foldedAt
      for (const key of keys) {
        const at = this.diskEntries[key].foldedAt
        if (at < oldestAt) {
          oldestAt = at
          oldestKey = key
        }
      }
      delete this.diskEntries[oldestKey]
      this.estimateMem.delete(oldestKey)
    }
    await this.maybeWriteDisk(now)
  }

  // ── Remote 方法（wire 名见 MARKS） ──
  async estimateCost(request) {
    const sessionId = request === null || request === undefined ? undefined : request.sessionId
    if (typeof sessionId !== 'string') {
      return { totals: {}, priced: [], unpriced: [], hasUsage: false, lastSample: null }
    }
    const now = Date.now()
    const cached = await this.estimateGet(sessionId, now)
    if (cached !== null) return cached
    const query = this.ctx.get('sessionQuery')
    if (query === undefined) {
      return { totals: {}, priced: [], unpriced: [], hasUsage: false, lastSample: null }
    }
    try {
      const snapshot = await query.readSession(sessionId)
      if (snapshot === undefined || snapshot.events === undefined) {
        return { totals: {}, priced: [], unpriced: [], hasUsage: false, lastSample: null }
      }
      const state = this.fresh()
      for (const event of snapshot.events) this.foldEvent(state, event)
      const result = this.estimateOf(state)
      await this.estimateSet(sessionId, result)
      return result
    } catch (err) {
      console.error('bottom-bar estimate failed:', err)
      return { totals: {}, priced: [], unpriced: [], hasUsage: false, lastSample: null }
    }
  }

  async getConfig() {
    await this.loadConfig()
    return this.snapshot()
  }

  async setConfig(request) {
    await this.loadConfig()
    const a = request === null || request === undefined ? {} : request
    const normalized = this.normalizeSegments(a.segments)
    await this.saveConfig(
      normalized !== null ? normalized : undefined,
      a.mode,
      a.tooltip,
      a.precision,
      undefined,
    )
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

  async setPrice(request) {
    await this.loadConfig()
    const a = request === null || request === undefined ? {} : request
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

  async removePrice(request) {
    await this.loadConfig()
    const a = request === null || request === undefined ? {} : request
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

export default {
  name: 'dsh-bottom-bar',
  inject: ['fs', 'settings', 'sessionQuery'],
  async apply(ctx) {
    ctx.provide('bottomBar', new BottomBarService(ctx, {}), true)
  },
}
