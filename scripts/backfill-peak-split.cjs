#!/usr/bin/env node
// ═══ 1.2.0 峰谷分时回溯 ═══
// 从 ~/.dsh/sessions/**/session.jsonl.zstd 转录中提取每次 LLM 调用的
// (时刻, 模型, 用量),按各自峰谷窗口把历史账本切分为 idle/peak 双桶。
// 规则:
//   · 2026-08-17T00:00(本地时区)之前的调用 → 一律 idle(峰谷制生效前)
//   · 该模型价目不带峰谷 → 全部 idle
//   · 转录缺失的会话/模型 → 原量全归 idle(兜底)
//   · 残差(转录聚合 vs 账本累计的微小差额)→ 归 idle,保证 token 总数不变
// 用法:
//   node scripts/backfill-peak-split.cjs --dry-run   # 只算不写
//   node scripts/backfill-peak-split.cjs             # 备份后写回
const fs = require('fs')
const path = require('path')
const home = process.env.USERPROFILE.replace(/\\/g, '/')
const DRY = process.argv.includes('--dry-run')
const PEAK_ERA_START = new Date('2026-08-17T00:00:00')

function loadFzstd() {
  try { return require('fzstd') } catch (e) {}
  const tempMod = path.join(process.env.TEMP || '', 'zstdx', 'node_modules', 'fzstd')
  try { return require(tempMod) } catch (e) {}
  console.error('缺少 fzstd:npm install fzstd --prefix "%TEMP%\\zstdx" 后重试')
  process.exit(1)
}
const fzstd = loadFzstd()

async function main() {
  // 计价/窗口逻辑直接复用插件源码(ESM 动态导入)
  const pricing = await import('file://' + path.resolve(__dirname, '..', 'lib', 'pricing.js').replace(/\\/g, '/'))
  let cfgPrices = null
  let tz = 'system'
  const cfgPath = home + '/.dsh/cost-estimate.composition.json'
  try {
    const cfg = JSON.parse(fs.readFileSync(cfgPath, 'utf8'))
    if (typeof cfg.prices === 'object' && cfg.prices !== null) cfgPrices = cfg.prices
    if (cfg.peakTimezone !== undefined) tz = cfg.peakTimezone
  } catch (e) {}

  const ledgerPath = home + '/.dsh/cost-estimate.ledger.json'
  const ledger = JSON.parse(fs.readFileSync(ledgerPath, 'utf8'))

  // ── 收集转录 ──
  const sessRoot = home + '/.dsh/sessions'
  const files = []
  ;(function walkDir(d) {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name)
      if (e.isDirectory()) walkDir(p)
      else if (e.name === 'session.jsonl.zstd') files.push(p)
    }
  })(sessRoot)

  // calls[sid][modelKey] = [{time,in,out,cr,cw}]
  const calls = {}
  for (const f of files) {
    const sid = path.basename(path.dirname(f))
    let json
    try {
      json = Buffer.from(fzstd.decompress(fs.readFileSync(f))).toString('utf8')
    } catch (e) { console.error('解压失败(跳过):', f); continue }
    for (const l of json.split('\n')) {
      if (!l.includes('"assistant/message"')) continue
      let o
      try { o = JSON.parse(l) } catch (e) { continue }
      const msg = o.data && o.data.message
      const src = msg && msg.source
      const u = o.data && o.data.usage
      if (!src || !src.provider || !src.model || !u || !o.time) continue
      const key = src.provider + '/' + src.model
      const arr = (calls[sid] = calls[sid] || {})[key] = (calls[sid][key] || [])
      arr.push({ time: o.time, in: u.inputTokens || 0, out: u.outputTokens || 0, cr: u.cacheReadTokens || 0, cw: u.cacheWriteTokens || 0 })
    }
  }

  // ── 逐行切分 ──
  const Z = () => ({ uncachedInput: 0, output: 0, cacheRead: 0, cacheWrite: 0 })
  const addF = (dst, src, sign) => { for (const k of ['uncachedInput', 'output', 'cacheRead', 'cacheWrite']) dst[k] += sign * (src[k] || 0) }
  let changed = 0
  for (const [sid, sess] of Object.entries(ledger.sessions)) {
    if (!sess.models) continue
    for (const [mk, mv] of Object.entries(sess.models)) {
      // 已是 v2 → 先摊平成总量再重切(--force 场景)
      const isV2 = mv.idle !== undefined && typeof mv.idle === 'object'
      const total = isV2
        ? { uncachedInput: (mv.idle.uncachedInput || 0) + ((mv.peak || {}).uncachedInput || 0), output: (mv.idle.output || 0) + ((mv.peak || {}).output || 0), cacheRead: (mv.idle.cacheRead || 0) + ((mv.peak || {}).cacheRead || 0), cacheWrite: (mv.idle.cacheWrite || 0) + ((mv.peak || {}).cacheWrite || 0) }
        : { uncachedInput: mv.uncachedInput || 0, output: mv.output || 0, cacheRead: mv.cacheRead || 0, cacheWrite: mv.cacheWrite || 0 }
      const totTokens = total.uncachedInput + total.output + total.cacheRead + total.cacheWrite
      if (totTokens <= 0) continue
      const idle = Z()
      const peak = Z()
      const evs = (calls[sid] || {})[mk] || []
      let covered = 0
      for (const ev of evs) {
        const when = new Date(ev.time)
        let bucketName = 'idle'
        if (when >= PEAK_ERA_START) {
          let ranges = null
          try {
            const p = pricing.resolvePrice(mk, cfgPrices, { peakEnabled: false })
            if (p !== undefined && p.peak !== undefined) ranges = pricing.peakWindowOf(p)
          } catch (e) {}
          if (ranges !== null) {
            // 修订 191:默认窗口按 08-23 周末计费调整做时代切换——该时刻前的
            // 调用按旧规则(每天 9-12/14-18 均峰)判,之后仅周一至五算峰
            if (ranges === pricing.PEAK_RANGES || ranges === pricing.PEAK_RANGES_LEGACY) ranges = pricing.peakRangesFor(when)
            if (pricing.isPeakTime(when, tz, ranges)) bucketName = 'peak'
          }
        }
        const dst = bucketName === 'peak' ? peak : idle
        dst.uncachedInput += ev.in; dst.output += ev.out; dst.cacheRead += ev.cr; dst.cacheWrite += ev.cw
        covered += ev.in + ev.out + ev.cr + ev.cw
      }
      // 残差归 idle,保证 token 总数与账本完全一致
      const sumAll = { uncachedInput: idle.uncachedInput + peak.uncachedInput, output: idle.output + peak.output, cacheRead: idle.cacheRead + peak.cacheRead, cacheWrite: idle.cacheWrite + peak.cacheWrite }
      for (const k of ['uncachedInput', 'output', 'cacheRead', 'cacheWrite']) idle[k] += total[k] - sumAll[k]
      const pct = totTokens > 0 ? Math.round((peak.uncachedInput + peak.output + peak.cacheRead + peak.cacheWrite) / totTokens * 100) : 0
      console.log(sid.slice(0, 16), mk.padEnd(36), '调用' + String(evs.length).padStart(5), '覆盖' + Math.round(covered / totTokens * 100) + '%', '→ 峰' + pct + '%')
      sess.models[mk] = { idle, peak }
      changed++
    }
  }
  console.log('\n迁移行数:', changed, DRY ? '(dry-run,未写入)' : '')
  if (DRY) return
  fs.writeFileSync(ledgerPath.replace('.json', '.backup-' + Date.now() + '.json'), fs.readFileSync(ledgerPath))
  ledger.version = 2
  ledger.updatedAt = new Date().toISOString()
  fs.writeFileSync(ledgerPath, JSON.stringify(ledger, null, 1), 'utf8')
  console.log('已写回(原文件已备份):', ledgerPath)
}

main().catch((e) => { console.error(e); process.exit(1) })