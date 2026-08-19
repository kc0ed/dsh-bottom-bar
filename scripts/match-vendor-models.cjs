// ══════════════════════════════════════════════════════════════════
// match-vendor-models.cjs —— 厂商模板自动匹配脚本
// ──
// 数据源(按序):MODELS_JSON 环境变量 → 本机 opencode 缓存
// (~/.cache/opencode/models.json 等) → models.dev/api.json(网络,
// 或 raw.githubusercontent.com/anomalyco/models.dev)。
// 输出:① 每个厂商匹配到的真实模型(优先 2026 年 release_date);
// ② 官方单价比例参考:缓存读/缓存写/输出 ÷ 输入。
// 用法:node scripts/match-vendor-models.cjs
// 依赖:Node 18+(https 模块),无需安装包。
// ══════════════════════════════════════════════════════════════════
const https = require('https')
const fs = require('fs')
const os = require('os')
const path = require('path')

function get(url, redirects = 0) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { headers: { 'User-Agent': 'dsh-bottom-bar-match' } }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location && redirects < 3) {
        res.resume()
        resolve(get(res.headers.location, redirects + 1))
        return
      }
      let d = ''
      res.on('data', (c) => (d += c))
      res.on('end', () => {
        if (res.statusCode !== 200) reject(new Error('HTTP ' + res.statusCode + ' for ' + url))
        else resolve(d)
      })
    })
    req.on('error', reject)
    req.setTimeout(30000, () => req.destroy(new Error('timeout: ' + url)))
  })
}

async function loadData() {
  const home = os.homedir()
  const candidates = [
    process.env.MODELS_JSON,
    path.join(home, '.cache', 'opencode', 'models.json'),
    path.join(home, 'AppData', 'Local', 'opencode', 'models.json'),
    path.join(home, '.local', 'share', 'opencode', 'models.json'),
    path.join(home, '.opencode', 'models.json'),
  ].filter(Boolean)
  for (const c of candidates) {
    try {
      if (fs.existsSync(c)) {
        const raw = fs.readFileSync(c, 'utf8')
        console.log('数据源:本地缓存 ' + c + ' (' + (raw.length / 1024).toFixed(0) + ' KB, 修改于 ' + fs.statSync(c).mtime.toISOString().slice(0, 10) + ')')
        return JSON.parse(raw)
      }
    } catch (e) { /* 下一个源 */ }
  }
  for (const url of ['https://models.dev/api.json', 'https://raw.githubusercontent.com/anomalyco/models.dev/dev/api.json']) {
    try {
      const raw = await get(url)
      console.log('数据源:网络 ' + url + ' (' + (raw.length / 1024).toFixed(0) + ' KB)')
      return JSON.parse(raw)
    } catch (e) { console.log('网络源失败: ' + url + ' → ' + e.message) }
  }
  throw new Error('所有数据源都不可用;可用 MODELS_JSON 环境变量指定 models.dev api.json 路径')
}

// 厂商关键词:kw=短模型 id 含任一即候选;prefer=优选关键词(排序在前)
const VENDORS = [
  { id: 'deepseek-v4', kw: ['deepseek'], prefer: ['v4'], tag: '🐳 DeepSeek V4' },
  { id: 'claude', kw: ['claude'], prefer: ['opus', 'sonnet'], tag: '⚡ Claude' },
  { id: 'openai-gpt5', kw: ['gpt-5'], prefer: [], tag: '🧠 GPT-5.x' },
  { id: 'gemini', kw: ['gemini'], prefer: ['pro', 'flash'], tag: '🌐 Gemini 3' },
  { id: 'kimi', kw: ['kimi'], prefer: ['k3', 'k2'], tag: '🌙 Kimi K3' },
  { id: 'qwen35', kw: ['qwen'], prefer: ['3.5'], tag: '🇨🇳 Qwen 3.5' },
  { id: 'glm', kw: ['glm'], prefer: ['5'], tag: '📘 GLM 5' },
  { id: 'minimax', kw: ['minimax'], prefer: ['m3', 'm2'], tag: '🤖 MiniMax M3' },
  { id: 'doubao', kw: ['doubao', 'seed'], prefer: [], tag: '⚡ 豆包 Seed 2' },
  { id: 'grok', kw: ['grok'], prefer: [], tag: '🪐 Grok 4' },
]

const r4 = (x) => Math.round(x * 10000) / 10000

async function main() {
  const data = await loadData()
  // 拍平全部模型:provider 层 models 映射;按短 id 去重(优先带 cost 的条目)
  const byShort = new Map()
  for (const prov of Object.keys(data)) {
    const models = (data[prov] && data[prov].models) || {}
    for (const id of Object.keys(models)) {
      const m = models[id]
      const short = id.slice(id.indexOf('/') + 1)
      const prev = byShort.get(short)
      if (!prev || (m.cost && !prev.cost)) byShort.set(short, { ...m, id, short })
    }
  }
  const all = Array.from(byShort.values())
  console.log('去重后模型总数:', all.length)

  const is2026 = (m) => typeof m.release_date === 'string' && m.release_date.slice(0, 4) === '2026'

  for (const v of VENDORS) {
    const list = all.filter((m) => v.kw.some((k) => m.short.toLowerCase().includes(k)))
    const y26 = list.filter(is2026)
    const pool = y26.length > 0 ? y26 : list
    const score = (m) => {
      const id = m.short.toLowerCase()
      const p = v.prefer.some((k) => id.includes(k)) ? 0 : 1
      const d = typeof m.release_date === 'string' ? Date.parse(m.release_date) : 0
      return [p, -d, id]
    }
    pool.sort((a, b) => { const sa = score(a), sb = score(b); return sa[0] - sb[0] || sa[1] - sb[1] || (sa[2] < sb[2] ? -1 : 1) })
    const top = pool.slice(0, 4)
    if (top.length === 0) {
      console.log('\n### ' + v.tag + ' —— 无匹配!')
      continue
    }
    console.log('\n### ' + v.tag + ' (2026 候选 ' + y26.length + ' / 共 ' + list.length + ')')
    for (const m of top) {
      const c = m.cost || {}
      const inp = Number(c.input) || 0
      const ratio = (x) => (inp > 0 && Number.isFinite(Number(x)) && Number(x) > 0 ? r4(Number(x) / inp) : 0)
      const w = c.cache_write !== undefined ? ratio(c.cache_write) + 'x' : '—'
      console.log('  ' + m.short.padEnd(30) + '| ' + (is2026(m) ? '2026' : '    ') + ' | ' + String(m.release_date || '—').slice(0, 10) +
        ' | 入$' + inp + ' 读' + ratio(c.cache_read) + 'x 写' + w + ' 出' + ratio(c.output) + 'x' +
        (m.id !== m.short ? ' [' + m.id.slice(0, m.id.indexOf('/')) + ']' : ''))
    }
    console.log('  匹配示例(2026): ' + top.filter(is2026).map((m) => m.short).join(' · '))
  }
}

main().catch((e) => { console.error(e); process.exit(1) })
