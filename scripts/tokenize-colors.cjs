// ══════════════════════════════════════════════════════════════════
// dsh-bottom-bar · 硬编码品牌色 → 主题 token 转换器（修订 69）
// ──
// 用法：node scripts/tokenize-colors.cjs [文件路径]（默认 lib/client.js）
// 把 45-67 修订里写死的 Claude 橘色（#D97757 / rgba(193,95,60,·) /
// rgba(217,119,87,·)）与深色边框 #383731 统一替换为跟随主题的：
//   · #D97757            → var(--dsw-alias-brand-primary)
//   · rgba(193/217,...)  → color-mix(in srgb, var(--dsw-alias-brand-primary) X%, transparent)
//   · #383731            → var(--dsw-alias-border-l2)
// 中性色（黑/白/灰、rgba(44,39,32,·) 深色药丸底）保持不动。
// 幂等：已替换过的文件再跑不会重复替换（没有可匹配的残留）。
// ══════════════════════════════════════════════════════════════════
const fs = require('node:fs')
const path = process.argv[2] || 'lib/client.js'

let s = fs.readFileSync(path, 'utf8')
const before = s

const toMix = (m, a) => {
  const pct = Math.round(parseFloat(a) * 100)
  return `color-mix(in srgb, var(--dsw-alias-brand-primary) ${pct}%, transparent)`
}

// 浅色品牌色 rgba(193, 95, 60, A) 与深色品牌色 rgba(217, 119, 87, A)
s = s.replace(/rgba\(193, 95, 60, (0?\.\d+)\)/g, toMix)
s = s.replace(/rgba\(217, 119, 87, (0?\.\d+)\)/g, toMix)
// 实心品牌色
s = s.replace(/#D97757/g, 'var(--dsw-alias-brand-primary)')
// 深色模式边框（≈ 主题深色 border-l2 #3A3934）
s = s.replace(/#383731/g, 'var(--dsw-alias-border-l2)')

if (s === before) {
  console.log('no changes (already tokenized or nothing to do)')
  process.exit(0)
}
fs.writeFileSync(path, s)
console.log('tokenized: ' + path)
