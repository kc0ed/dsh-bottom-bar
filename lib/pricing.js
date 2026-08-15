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

  // ── DeepSeek 系列（CNY / 1M tokens） ──
  'deepseek-v4-flash': { currency: 'CNY', in: 1, cacheRead: 0.02, cacheWrite: 0.02, out: 2 },
  'deepseek-v4-pro': { currency: 'CNY', in: 3, cacheRead: 0.025, cacheWrite: 0.025, out: 6 },
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

export function derivePriceByFamily(modelId, inPrice) {
  const m = modelId.toLowerCase()
  // DeepSeek 系: CNY, out 2x~4x, cacheRead 0.02x~0.25x
  if (m.includes('deepseek')) {
    const isV4 = m.includes('v4') || m.includes('flash')
    const outMult = isV4 ? 2 : 4
    const readMult = isV4 ? 0.02 : 0.25
    return {
      currency: 'CNY',
      in: inPrice,
      cacheRead: Math.round(inPrice * readMult * 1000) / 1000,
      cacheWrite: Math.round(inPrice * readMult * 1000) / 1000,
      out: Math.round(inPrice * outMult * 1000) / 1000,
    }
  }
  // OpenAI 系: USD, out 4x, cacheRead 0.5x, cacheWrite 1.25x
  if (m.includes('gpt') || m.includes('openai') || m.includes('o1') || m.includes('o3') || m.includes('o4')) {
    return {
      currency: 'USD',
      in: inPrice,
      cacheRead: Math.round(inPrice * 0.5 * 1000) / 1000,
      cacheWrite: Math.round(inPrice * 1.25 * 1000) / 1000,
      out: Math.round(inPrice * 4 * 1000) / 1000,
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
  // 国产大模型系 (Qwen / GLM / MiniMax / 豆包): CNY, out 3x~4x, cacheRead 0.2x~0.25x
  if (m.includes('qwen') || m.includes('glm') || m.includes('minimax') || m.includes('doubao')) {
    return {
      currency: 'CNY',
      in: inPrice,
      cacheRead: Math.round(inPrice * 0.25 * 1000) / 1000,
      cacheWrite: Math.round(inPrice * 1.0 * 1000) / 1000,
      out: Math.round(inPrice * 3 * 1000) / 1000,
    }
  }
  // Claude 系与经典黄金比例 (1x : 5x : 0.1x : 1.25x)
  return {
    currency: 'USD',
    in: inPrice,
    cacheRead: Math.round(inPrice * 0.1 * 1000) / 1000,
    cacheWrite: Math.round(inPrice * 1.25 * 1000) / 1000,
    out: Math.round(inPrice * 5 * 1000) / 1000,
  }
}

export function resolvePrice(model, configPrices) {
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
    } else if (m.includes('deepseek')) {
      base = { currency: 'CNY', in: 1, cacheRead: 0.02, cacheWrite: 0.02, out: 2 }
    } else if (m.includes('qwen') || m.includes('glm') || m.includes('minimax') || m.includes('doubao')) {
      base = { currency: 'CNY', in: 2, cacheRead: 0.2, cacheWrite: 2, out: 8 }
    } else {
      base = { currency: 'CNY', in: 1, cacheRead: 0.1, cacheWrite: 1, out: 2 }
    }
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
    })
  }
  return rows
}
