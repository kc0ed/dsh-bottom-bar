#!/usr/bin/env node
// 把静态固化版 lib/client.js 机械变换成动态插件形式（cost-2 的 client half）。
// 用法：node scripts/static-to-dynamic.cjs <静态 client.js 路径> [输出路径]
// 输出默认 dynamic/client.js。⚠️ 不要用 stdout 重定向（Windows 上 node 的
// stdout 重定向按系统代码页输出，中文会乱码），脚本自己写 UTF-8 文件。
// 变换表：
//   __ModuleLoader__ 包装        → Cordis 插件对象 { inject, apply(ctx) }
//   insertCss(...)               → styles.insert(...)
//   ctx.slots.* / ctx.locale.*   → slots.* / locale.*
//   remote.<method>(args)        → host.call('<wire>', args)
// 静态包与动态版逻辑一致、手工同步（两边头部修订记录逐条对应）；本脚本保证
// client half 的函数体零抄写错误。
const fs = require('fs')

const input = process.argv[2]
if (!input) {
  console.error('usage: node scripts/static-to-dynamic.cjs <lib/client.js> [输出路径]')
  process.exit(1)
}
const output = process.argv[3] || 'dynamic/client.js'
let s = fs.readFileSync(input, 'utf8')

// 1) 提取 factory 函数体（头部注释与 __ModuleLoader__ 包装都丢弃）
const startMarker = 'factory: (require) => {'
const endMarker = '    exports.apply = apply'
const si = s.indexOf(startMarker)
const ei = s.indexOf(endMarker)
if (si < 0 || ei < 0) {
  console.error('markers not found (上游结构变了？)')
  process.exit(1)
}
let body = s.slice(si + startMarker.length, ei)

// 2) 去掉静态特有的脚手架
body = body.replace('var module = { exports: {} }\n', '')
body = body.replace('var exports = module.exports\n', '')
body = body.replace("Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' })\n", '')
body = body.replace("let React = require('react')\n", '')
body = body.replace(/\/\/ ── 幂等样式注入（静态插件无 styles 符号） ──\n    function insertCss\(css\) \{[\s\S]*?\n    \}\n/, '')
body = body.replace(/const inject = \[[^\]]*\]\n/, '')
body = body.replace('function apply(ctx) {', 'apply(ctx) {')
body = body.replace(/^.*const remote = ctx\.remote\.bottomBar.*\n/gm, '')

// 3) RPC 调用点：remote.<method>(args) → host.call('<wire>', args)
const WIRES = {
  getConfig: 'get-composition',
  setConfig: 'set-composition',
  resetConfig: 'reset-composition',
  estimateCost: 'estimate-cost',
  getPrices: 'get-prices',
  setPrice: 'set-price',
  removePrice: 'remove-price',
  resetPrices: 'reset-prices',
  diagnostics: 'diagnostics',
}
body = body.replace(/remote\.(\w+)\(([^)]*)\)/g, (m, name, args) => {
  const wire = WIRES[name]
  if (wire === undefined) throw new Error('unknown remote call: ' + name)
  const argText = args.trim()
  return "host.call('" + wire + "'" + (argText ? ', ' + argText : '') + ')'
})

// 4) 符号：insertCss → styles.insert（styles 是 closure 参数，可直接用）。
// ⚠️ ctx.slots / ctx.locale **不能**改写为自由变量：动态客户端 runner 的
// closure 参数表是固定的（React/console/styles/host/harness/traps/process/
// Buffer），slots/locale 服务只能经 ctx.<名> 访问（inject 门控）——改写成
// 自由变量会 ReferenceError: "xxx is not defined"（2026-08-14 实测）。
body = body.replace(/insertCss\(/g, 'styles.insert(')

// 5) 拼装（body 本身已含 apply(ctx) { ... }，只需包一层插件对象）
// ⚠️ inject 必须含 'locale'/'slots'：动态客户端运行时它们不是自由内置符号，
// 只能经 ctx.<名> 访问（inject 门控）；丢了会 ReferenceError（2026-08-14 实测）。
const HEADER = `// ══════════════════════════════════════════════════════════════════
// 动态插件形式（cost-2 的 client half · 与静态包同步）
// ──
// 本文件由 scripts/static-to-dynamic.cjs 从 lib/client.js 机械变换生成。
// 动态形式 = 开发/正在运行的版本（harness.handle/host.call）；静态包 = 下次
// 启动生效的固化版（ctx.remote.bottomBar）。两者逻辑一致、手工同步，头部
// 修订记录逐条对应。复刻来源与上游版本见 lib/client.js 头部同步块。
// ══════════════════════════════════════════════════════════════════
`
const result = HEADER + "return {\n  inject: ['timer', 'locale', 'slots'],\n" + body + '  }\n'
fs.writeFileSync(output, result, 'utf8')
console.log('written: ' + output + ' (' + result.length + ' chars)')
