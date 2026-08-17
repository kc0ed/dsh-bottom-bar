// ══════════════════════════════════════════════════════════════════
// dsh-bottom-bar · 大模型定价与成本核算引擎 (Pricing Engine)
// ──
// 独立维护：2026 前沿旗舰基准库 + Models.dev 3300+ 全库模型 +
// 智能厂商黄金比例推导（Claude / OpenAI / DeepSeek / Gemini / Kimi / GLM 等）+
// 多级智能解析（自定义覆盖 → 核心旗舰 → Models.dev 全库 → 模糊匹配 → 厂商公式兜底）。
// ══════════════════════════════════════════════════════════════════
import { readFileSync, existsSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))

// ── 峰谷默认时段(修订 120：通用峰谷——任何价格条目可带自己的 peakWindow,
// 缺省用这里;常量前置因为 DEFAULT_PRICES 顶层引用)
export const PEAK_RANGES = [
  { start: 9 * 60, end: 12 * 60 },
  { start: 14 * 60, end: 18 * 60 },
]
export const PEAK_RANGE_LABELS = ['9:00-12:00', '14:00-18:00']

export let MODELS_DEV_PRICES = {}
try {
  const jsonPath = resolve(__dirname, 'models_dev_prices.json')
  if (existsSync(jsonPath)) {
    MODELS_DEV_PRICES = JSON.parse(readFileSync(jsonPath, 'utf8'))
  }
} catch (e) {
  MODELS_DEV_PRICES = {}
}

export const DEFAULT_PRICES = {
  // ── Kimi / 月之暗面系列（CNY / 1M tokens） ──
  'kimi-k3': { currency: 'CNY', in: 8, cacheRead: 1.6, cacheWrite: 8, out: 32 },
  'kimi-k3-code': { currency: 'CNY', in: 8, cacheRead: 1.6, cacheWrite: 8, out: 32 },
  'kimi-k2.7-code': { currency: 'CNY', in: 6, cacheRead: 1.2, cacheWrite: 6, out: 25 },
  'kimi-k2.5': { currency: 'CNY', in: 4, cacheRead: 0.8, cacheWrite: 4, out: 16 },
  'kimi-k2': { currency: 'CNY', in: 4, cacheRead: 0.8, cacheWrite: 4, out: 16 },

  // ── Claude 系列（USD / 1M tokens） ──
  'claude-opus-4.7': { currency: 'USD', in: 5, cacheRead: 0.5, cacheWrite: 6.25, out: 25 },
  'claude-4.5-opus': { currency: 'USD', in: 15, cacheRead: 1.5, cacheWrite: 18.75, out: 75 },
  'claude-4.0-opus': { currency: 'USD', in: 15, cacheRead: 1.5, cacheWrite: 18.75, out: 75 },
  'claude-3-opus': { currency: 'USD', in: 15, cacheRead: 1.5, cacheWrite: 18.75, out: 75 },
  'claude-4.5-sonnet': { currency: 'USD', in: 3, cacheRead: 0.3, cacheWrite: 3.75, out: 15 },
  'claude-4.0-sonnet': { currency: 'USD', in: 3, cacheRead: 0.3, cacheWrite: 3.75, out: 15 },
  'claude-3.7-sonnet': { currency: 'USD', in: 3, cacheRead: 0.3, cacheWrite: 3.75, out: 15 },
  'claude-3.5-sonnet': { currency: 'USD', in: 3, cacheRead: 0.3, cacheWrite: 3.75, out: 15 },
  'claude-4.5-haiku': { currency: 'USD', in: 0.8, cacheRead: 0.08, cacheWrite: 1.0, out: 4 },
  'claude-3.5-haiku': { currency: 'USD', in: 0.8, cacheRead: 0.08, cacheWrite: 1.0, out: 4 },

  // ── OpenAI 系列（USD / 1M tokens） ──
  'gpt-5.6-sol': { currency: 'USD', in: 5, cacheRead: 0.5, cacheWrite: 6.25, out: 30 },
  'gpt-5.6-luna': { currency: 'USD', in: 1, cacheRead: 0.1, cacheWrite: 1.25, out: 6 },
  'gpt-5.6-terra': { currency: 'USD', in: 2.5, cacheRead: 0.25, cacheWrite: 3.125, out: 15 },
  'gpt-5.5': { currency: 'USD', in: 5, cacheRead: 0.5, cacheWrite: 6.25, out: 30 },
  'gpt-5.4': { currency: 'USD', in: 2.5, cacheRead: 0.25, cacheWrite: 3.125, out: 15 },
  'gpt-4o': { currency: 'USD', in: 2.5, cacheRead: 1.25, cacheWrite: 2.5, out: 10 },
  'gpt-4o-mini': { currency: 'USD', in: 0.15, cacheRead: 0.075, cacheWrite: 0.15, out: 0.6 },
  'o1': { currency: 'USD', in: 15, cacheRead: 7.5, cacheWrite: 15, out: 60 },
  'o3-mini': { currency: 'USD', in: 1.1, cacheRead: 0.55, cacheWrite: 1.1, out: 4.4 },

  // ── DeepSeek 系列（USD / 1M tokens;v4 为上调后新计费） ──
  // 修订 109：V4 正式版 2026-08-17 00:00(北京) 起全面上调并执行峰谷定价——
  // 高峰 9:00-12:00 / 14:00-18:00(北京),闲时 = 高峰一半。以下为上调后的
  // USD 计费(用户确认来源:opencode 渠道价格表);缓存写官方无收费项 → 0。
  // 修订 110：官方两套货币定价并存——USD(国际) + alt.CNY(中国区),均为官方价
  // (用户确认);峰值时段两套各自用 alt.peak 高峰组。
  // 修订 120：通用峰谷机制示例——条目可带 peakWindow(自己的高峰时段),
  // 缺省用 PEAK_RANGES;deepseek-v4 显式声明默认窗口(9-12/14-18)。
  // 旧 CNY 计费(修订 75):flash 1.5/4.5/0.05、pro 4.5/13.5/0.15(闲时)。
  'deepseek-v4-flash': {
    currency: 'USD', in: 0.22, cacheRead: 0.007, cacheWrite: 0, out: 0.66,
    peakWindow: PEAK_RANGES,
    peak: { currency: 'USD', in: 0.44, cacheRead: 0.014, cacheWrite: 0, out: 1.32 },
    alt: { currency: 'CNY', in: 1.5, cacheRead: 0.05, cacheWrite: 0, out: 4.5, peak: { currency: 'CNY', in: 3.0, cacheRead: 0.10, cacheWrite: 0, out: 9.0 } },
  },
  'deepseek-v4-pro': {
    currency: 'USD', in: 0.66, cacheRead: 0.022, cacheWrite: 0, out: 1.98,
    peakWindow: PEAK_RANGES,
    peak: { currency: 'USD', in: 1.32, cacheRead: 0.044, cacheWrite: 0, out: 3.96 },
    alt: { currency: 'CNY', in: 4.5, cacheRead: 0.15, cacheWrite: 0, out: 13.5, peak: { currency: 'CNY', in: 9.0, cacheRead: 0.30, cacheWrite: 0, out: 27.0 } },
  },
  'deepseek-chat': { currency: 'CNY', in: 2, cacheRead: 0.5, cacheWrite: 2, out: 8 },
  'deepseek-reasoner': { currency: 'CNY', in: 4, cacheRead: 1, cacheWrite: 4, out: 16 },
  'deepseek-v3.2': { currency: 'CNY', in: 2, cacheRead: 0.5, cacheWrite: 2, out: 8 },
  'deepseek-v3.1': { currency: 'CNY', in: 2, cacheRead: 0.5, cacheWrite: 2, out: 8 },
  'deepseek-v3': { currency: 'CNY', in: 2, cacheRead: 0.5, cacheWrite: 2, out: 8 },
  'deepseek-r1': { currency: 'CNY', in: 4, cacheRead: 1, cacheWrite: 4, out: 16 },

  // ── Google Gemini 系列（USD / 1M tokens） ──
  'gemini-3.0-pro': { currency: 'USD', in: 1.25, cacheRead: 0.3125, cacheWrite: 1.25, out: 5 },
  'gemini-3.0-flash': { currency: 'USD', in: 0.15, cacheRead: 0.0375, cacheWrite: 0.15, out: 0.6 },
  'gemini-2.5-pro': { currency: 'USD', in: 1.25, cacheRead: 0.3125, cacheWrite: 1.25, out: 5 },
  'gemini-2.5-flash': { currency: 'USD', in: 0.15, cacheRead: 0.0375, cacheWrite: 0.15, out: 0.6 },
  'gemini-2.0-flash': { currency: 'USD', in: 0.1, cacheRead: 0.025, cacheWrite: 0.1, out: 0.4 },

  // ── 通义千问 Qwen 系列（CNY / 1M tokens） ──
  'qwen3.5-397b': { currency: 'CNY', in: 3.6, cacheRead: 0.6, cacheWrite: 3.6, out: 18 },
  'qwen3.5-122b': { currency: 'CNY', in: 2.4, cacheRead: 0.4, cacheWrite: 2.4, out: 12 },
  'qwen3.5-35b': { currency: 'CNY', in: 1.2, cacheRead: 0.25, cacheWrite: 1.2, out: 6 },
  'qwen3-max': { currency: 'CNY', in: 20, cacheRead: 5, cacheWrite: 20, out: 60 },
  'qwen3-coder-480b': { currency: 'CNY', in: 12, cacheRead: 2.5, cacheWrite: 12, out: 36 },
  'qwen-plus': { currency: 'CNY', in: 0.8, cacheRead: 0.2, cacheWrite: 0.8, out: 2 },
  'qwen-turbo': { currency: 'CNY', in: 0.3, cacheRead: 0.05, cacheWrite: 0.3, out: 0.6 },

  // ── 智谱 GLM 系列（CNY / 1M tokens） ──
  'glm-5.2': { currency: 'CNY', in: 8, cacheRead: 1.6, cacheWrite: 8, out: 28 },
  'glm-5.1': { currency: 'CNY', in: 6, cacheRead: 1.2, cacheWrite: 6, out: 22 },
  'glm-5': { currency: 'CNY', in: 6, cacheRead: 1.2, cacheWrite: 6, out: 22 },
  'glm-4.7': { currency: 'CNY', in: 5, cacheRead: 1, cacheWrite: 5, out: 18 },
  'glm-4.5': { currency: 'CNY', in: 4, cacheRead: 0.8, cacheWrite: 4, out: 14 },

  // ── MiniMax 系列（CNY / 1M tokens） ──
  'minimax-m3': { currency: 'CNY', in: 4, cacheRead: 0.4, cacheWrite: 4, out: 16 },
  'minimax-m2.7': { currency: 'CNY', in: 3, cacheRead: 0.3, cacheWrite: 3, out: 12 },
  'minimax-m2.5': { currency: 'CNY', in: 2, cacheRead: 0.2, cacheWrite: 2, out: 8 },

  // ── xAI Grok 系列（USD / 1M tokens） ──
  'grok-4.1-fast-reasoning': { currency: 'USD', in: 2, cacheRead: 0.2, cacheWrite: 2, out: 10 },
  'grok-4-fast': { currency: 'USD', in: 2, cacheRead: 0.2, cacheWrite: 2, out: 10 },
  'grok-code-fast-1': { currency: 'USD', in: 1.5, cacheRead: 0.15, cacheWrite: 1.5, out: 7.5 },

  // ── 字节 豆包 Doubao 系列（CNY / 1M tokens） ──
  'doubao-seed-2.0-pro': { currency: 'CNY', in: 3, cacheRead: 0.3, cacheWrite: 3, out: 12 },
  'doubao-seed-2.0-code': { currency: 'CNY', in: 3, cacheRead: 0.3, cacheWrite: 3, out: 12 },
  'doubao-seed-2.0-lite': { currency: 'CNY', in: 0.8, cacheRead: 0.08, cacheWrite: 0.8, out: 2.4 },
}

export function normalizeModelKey(key) {
  if (typeof key !== 'string') return ''
  const lastSlash = Math.max(key.lastIndexOf('@'), key.lastIndexOf('/'))
  let name = lastSlash === -1 ? key : key.slice(lastSlash + 1)
  name = name.toLowerCase().trim()
  name = name.replace(/-\d{8}$/, '')
  name = name.replace(/\./g, '-')
  name = name.replace(/:(free|preview|latest|default)$/i, '')
  return name
}

export function modelPartOf(model) {
  if (typeof model !== 'string') return ''
  const i = model.indexOf('/')
  return i === -1 ? model : model.slice(i + 1)
}

// ── 峰谷定价时段(默认:DeepSeek 2026-08-17 起 9:00-12:00 / 14:00-18:00;
// PEAK_RANGES 定义已前置到文件头,因 DEFAULT_PRICES 顶层引用)
// 修订 77：时区可配置——内部一律以 UTC 为基准计算,`tz` 取值：
//   'system'  = 跟随运行环境（DSH 主进程）的系统时区（默认）
//   'UTC±N'   = 固定偏移时区,如 'UTC'、'UTC+8'（北京）、'UTC-5'
// 修订 120：取价格条目的峰谷时段(默认 PEAK_RANGES)
export function peakWindowOf(price) {
  if (price === null || price === undefined) return PEAK_RANGES
  if (Array.isArray(price.peakWindow) && price.peakWindow.length > 0) return price.peakWindow
  if (price.peak !== undefined && price.peak !== null && Array.isArray(price.peak.window) && price.peak.window.length > 0) {
    return price.peak.window
  }
  return PEAK_RANGES
}
export function windowLabelsOf(ranges) {
  if (!Array.isArray(ranges)) return PEAK_RANGE_LABELS
  return ranges.map((r) => {
    const h1 = Math.floor(r.start / 60)
    const m1 = r.start % 60
    const h2 = Math.floor(r.end / 60)
    const m2 = r.end % 60
    return h1 + ':' + String(m1).padStart(2, '0') + '-' + h2 + ':' + String(m2).padStart(2, '0')
  })
}
export function zoneMinutes(date, tz) {
  const d = date === undefined || date === null ? new Date() : date
  if (tz === undefined || tz === null || tz === 'system') {
    return d.getHours() * 60 + d.getMinutes()
  }
  let offset = 0
  if (tz !== 'UTC') {
    const m = /^UTC([+-])(\d{1,2})$/.exec(String(tz))
    if (m === null) return d.getHours() * 60 + d.getMinutes()
    offset = (m[1] === '-' ? -1 : 1) * Number(m[2])
  }
  return (d.getUTCHours() * 60 + d.getUTCMinutes() + offset * 60 + 1440) % 1440
}
export function isPeakTime(date, tz, ranges) {
  const m = zoneMinutes(date, tz)
  const rs = Array.isArray(ranges) && ranges.length > 0 ? ranges : PEAK_RANGES
  return rs.some((r) => m >= r.start && m < r.end)
}
// 修订 92：当前所在的高峰窗口（标签或 null=空闲时段）
export function currentPeakRangeLabel(date, tz, ranges, labels) {
  const m = zoneMinutes(date, tz)
  const rs = Array.isArray(ranges) && ranges.length > 0 ? ranges : PEAK_RANGES
  const ls = Array.isArray(labels) && labels.length > 0 ? labels : windowLabelsOf(rs)
  const i = rs.findIndex((r) => m >= r.start && m < r.end)
  return i === -1 ? null : ls[i]
}

export function derivePriceByFamily(modelId, inPrice) {
  const m = modelId.toLowerCase()
  // DeepSeek 系: USD(修订 109 起 v4 为上调后 USD 计费),v4 空闲 out 3x / read ≈1/31 / write 0;v3 系 CNY out 4x / read 0.25x / write 1.0x
  if (m.includes('deepseek')) {
    const isV4 = m.includes('v4') || m.includes('flash')
    const outMult = isV4 ? 3 : 4
    const readMult = isV4 ? 0.0318 : 0.25
    return {
      currency: isV4 ? 'USD' : 'CNY',
      in: inPrice,
      cacheRead: Math.round(inPrice * readMult * 1000) / 1000,
      cacheWrite: isV4 ? 0 : Math.round(inPrice * 1.0 * 1000) / 1000,
      out: Math.round(inPrice * outMult * 1000) / 1000,
    }
  }
  // OpenAI 系: USD, GPT-5.x out 6x / read 0.1x / write 1.25x;4o/o 系 out 4x / read 0.5x / write 1.0x
  if (m.includes('gpt') || m.includes('openai') || m.includes('o1') || m.includes('o3') || m.includes('o4')) {
    const isGpt5 = m.includes('gpt-5') || m.includes('5.6') || m.includes('5.5') || m.includes('5.4')
    return {
      currency: 'USD',
      in: inPrice,
      cacheRead: Math.round(inPrice * (isGpt5 ? 0.1 : 0.5) * 1000) / 1000,
      cacheWrite: Math.round(inPrice * (isGpt5 ? 1.25 : 1.0) * 1000) / 1000,
      out: Math.round(inPrice * (isGpt5 ? 6 : 4) * 1000) / 1000,
    }
  }
  // Gemini 系: USD, out 4x, cacheRead 0.25x, cacheWrite 1.0x
  if (m.includes('gemini') || m.includes('google')) {
    return {
      currency: 'USD',
      in: inPrice,
      cacheRead: Math.round(inPrice * 0.25 * 1000) / 1000,
      cacheWrite: Math.round(inPrice * 1.0 * 1000) / 1000,
      out: Math.round(inPrice * 4 * 1000) / 1000,
    }
  }
  // Kimi / 月之暗面系: CNY, out 4x, cacheRead 0.2x
  if (m.includes('kimi') || m.includes('moonshot')) {
    return {
      currency: 'CNY',
      in: inPrice,
      cacheRead: Math.round(inPrice * 0.2 * 1000) / 1000,
      cacheWrite: Math.round(inPrice * 1.0 * 1000) / 1000,
      out: Math.round(inPrice * 4 * 1000) / 1000,
    }
  }
  // Qwen 系: CNY, 3.5 大模型 out 5x / read 1/6;经典 out 3x / read 0.25x
  if (m.includes('qwen')) {
    const is35 = m.includes('qwen3-5') || m.includes('qwen3.5')
    return {
      currency: 'CNY',
      in: inPrice,
      cacheRead: Math.round(inPrice * (is35 ? 0.1667 : 0.25) * 1000) / 1000,
      cacheWrite: Math.round(inPrice * 1.0 * 1000) / 1000,
      out: Math.round(inPrice * (is35 ? 5 : 3) * 1000) / 1000,
    }
  }
  // 智谱 GLM 系: CNY, out 3.5x, cacheRead 0.2x
  if (m.includes('glm')) {
    return {
      currency: 'CNY',
      in: inPrice,
      cacheRead: Math.round(inPrice * 0.2 * 1000) / 1000,
      cacheWrite: Math.round(inPrice * 1.0 * 1000) / 1000,
      out: Math.round(inPrice * 3.5 * 1000) / 1000,
    }
  }
  // MiniMax / 豆包: CNY, out 4x, cacheRead 0.1x
  if (m.includes('minimax') || m.includes('doubao')) {
    return {
      currency: 'CNY',
      in: inPrice,
      cacheRead: Math.round(inPrice * 0.1 * 1000) / 1000,
      cacheWrite: Math.round(inPrice * 1.0 * 1000) / 1000,
      out: Math.round(inPrice * 4 * 1000) / 1000,
    }
  }
  // xAI Grok 系: USD, out 5x, cacheRead 0.1x, cacheWrite 1.0x
  if (m.includes('grok')) {
    return {
      currency: 'USD',
      in: inPrice,
      cacheRead: Math.round(inPrice * 0.1 * 1000) / 1000,
      cacheWrite: Math.round(inPrice * 1.0 * 1000) / 1000,
      out: Math.round(inPrice * 5 * 1000) / 1000,
    }
  }
  // Claude 系与通用兜底 (1x : 5x : 0.1x : 1.25x)
  return {
    currency: 'USD',
    in: inPrice,
    cacheRead: Math.round(inPrice * 0.1 * 1000) / 1000,
    cacheWrite: Math.round(inPrice * 1.25 * 1000) / 1000,
    out: Math.round(inPrice * 5 * 1000) / 1000,
  }
}

export function resolvePrice(model, configPrices, opts) {
  if (typeof model !== 'string' || model === '' || model === '?') return undefined
  const modelPart = modelPartOf(model)
  const norm = normalizeModelKey(model)
  const normPart = normalizeModelKey(modelPart)

  // 1. 用户自定义价格优先（支持 精确渠道键 > 纯模型名 > 标准化键）
  let user = undefined
  if (configPrices !== null && configPrices !== undefined) {
    user = configPrices[model] ?? configPrices[modelPart] ?? configPrices[norm] ?? configPrices[normPart]
  }

  // 2. 默认内置权威价格表匹配
  let base = DEFAULT_PRICES[model] ?? DEFAULT_PRICES[modelPart] ?? DEFAULT_PRICES[norm] ?? DEFAULT_PRICES[normPart]

  // 3. Models.dev 全库 3300+ 模型精确匹配
  if (base === undefined) {
    base = MODELS_DEV_PRICES[model] ?? MODELS_DEV_PRICES[modelPart] ?? MODELS_DEV_PRICES[norm] ?? MODELS_DEV_PRICES[normPart]
  }

  // 4. 模糊匹配 (包含关系)
  if (base === undefined) {
    for (const [k, p] of Object.entries(DEFAULT_PRICES)) {
      if (norm.includes(k) || k.includes(norm) || normPart.includes(k) || k.includes(normPart)) {
        base = p
        break
      }
    }
  }
  if (base === undefined) {
    for (const [k, p] of Object.entries(MODELS_DEV_PRICES)) {
      if (norm.includes(k) || k.includes(norm) || normPart.includes(k) || k.includes(normPart)) {
        base = p
        break
      }
    }
  }

  // 5. 智能厂商黄金比例推导或保底（绝不显示“无价”）
  if (user === undefined && base === undefined) {
    const m = norm.toLowerCase()
    if (m.includes('kimi') || m.includes('moonshot')) {
      base = { currency: 'CNY', in: 4, cacheRead: 0.8, cacheWrite: 4, out: 16 }
    } else if (m.includes('claude') || m.includes('anthropic')) {
      base = { currency: 'USD', in: 3, cacheRead: 0.3, cacheWrite: 3.75, out: 15 }
    } else if (m.includes('gpt') || m.includes('openai') || m.includes('o1') || m.includes('o3') || m.includes('o4')) {
      base = { currency: 'USD', in: 2.5, cacheRead: 0.25, cacheWrite: 3.125, out: 15 }
    } else if (m.includes('gemini') || m.includes('google')) {
      base = { currency: 'USD', in: 0.15, cacheRead: 0.0375, cacheWrite: 0.15, out: 0.6 }
    } else if (m.includes('grok')) {
      base = { currency: 'USD', in: 2, cacheRead: 0.2, cacheWrite: 2, out: 10 }
    } else if (m.includes('deepseek')) {
      base = { currency: 'USD', in: 0.22, cacheRead: 0.007, cacheWrite: 0, out: 0.66 }
    } else if (m.includes('qwen')) {
      base = { currency: 'CNY', in: 3.6, cacheRead: 0.6, cacheWrite: 3.6, out: 18 }
    } else if (m.includes('glm')) {
      base = { currency: 'CNY', in: 8, cacheRead: 1.6, cacheWrite: 8, out: 28 }
    } else if (m.includes('minimax')) {
      base = { currency: 'CNY', in: 4, cacheRead: 0.4, cacheWrite: 4, out: 16 }
    } else if (m.includes('doubao')) {
      base = { currency: 'CNY', in: 3, cacheRead: 0.3, cacheWrite: 3, out: 12 }
    } else {
      base = { currency: 'USD', in: 1, cacheRead: 0.1, cacheWrite: 1, out: 5 }
    }
  }

  // 合并用户覆盖与内置基价（修订 75：peak 价组一并继承,用户改价不影响峰谷）
  let merged = user
  if (user === undefined) {
    merged = base
  } else if (base !== undefined) {
    merged = {
      currency: user.currency !== undefined ? user.currency : base.currency,
      in: user.in !== undefined ? user.in : base.in,
      cacheRead: user.cacheRead !== undefined ? user.cacheRead : base.cacheRead,
      cacheWrite: user.cacheWrite !== undefined ? user.cacheWrite : base.cacheWrite,
      out: user.out !== undefined ? user.out : base.out,
    }
  }
  if (merged === undefined) return undefined

  // 峰谷定价:开关开启、渠道在白名单、当前处于该价格条目自己的高峰时段 →
  // 用 peak 价组覆盖。修订 120：时段通用化——peakWindowOf(merged) 取该模型
  // 自己的窗口(内置/自定义价可带 peakWindow 或 peak.window),缺省用 PEAK_RANGES。
  const peakSet = merged.peak !== undefined ? merged.peak : (base !== undefined ? base.peak : undefined)
  const slashAt = model.indexOf('/')
  const providerPart = slashAt === -1 ? null : model.slice(0, slashAt)
  const providersOk = opts === undefined || opts.peakProviders === undefined ||
    (providerPart !== null && opts.peakProviders.indexOf(providerPart) !== -1)
  const peakWindow = peakWindowOf(merged)
  if (opts !== undefined && opts.peakEnabled === true && providersOk && peakSet !== undefined && isPeakTime(opts.when, opts.tz, peakWindow)) {
    // 修订 110：峰值时两套货币都要切到峰值——主币种用 peakSet,alt 用
    // merged.alt.peak(第二套货币的高峰价组,存于 alt.peak)
    const pkAlt = merged.alt !== undefined && merged.alt.peak !== undefined ? merged.alt.peak : merged.alt
    merged = {
      currency: peakSet.currency !== undefined ? peakSet.currency : merged.currency,
      in: peakSet.in !== undefined ? peakSet.in : merged.in,
      cacheRead: peakSet.cacheRead !== undefined ? peakSet.cacheRead : merged.cacheRead,
      cacheWrite: peakSet.cacheWrite !== undefined ? peakSet.cacheWrite : merged.cacheWrite,
      out: peakSet.out !== undefined ? peakSet.out : merged.out,
      alt: pkAlt,
    }
  }
  return merged
}

export function buildPriceList(configPrices) {
  const extra = Object.keys(configPrices || {}).filter((k) => DEFAULT_PRICES[k] === undefined).sort()
  const builtin = Object.keys(DEFAULT_PRICES)
  const rows = []
  for (const model of builtin.concat(extra)) {
    const p = resolvePrice(model, configPrices)
    if (p === undefined) continue
    rows.push({
      model,
      currency: p.currency || 'USD',
      in: p.in,
      cacheRead: p.cacheRead === undefined ? null : p.cacheRead,
      cacheWrite: p.cacheWrite === undefined ? null : p.cacheWrite,
      out: p.out,
      builtin: DEFAULT_PRICES[model] !== undefined,
      // 修订 101：用户是否显式配置过该行（区分「我的价格」与「内置默认」）
      configured: configPrices !== null && configPrices !== undefined && Object.prototype.hasOwnProperty.call(configPrices, model),
      // 修订 119：该行是否带峰谷价组(内置或渠道特选/全局自定义的 peak)
      hasPeak: p.peak !== undefined,
    })
  }
  return rows
}
