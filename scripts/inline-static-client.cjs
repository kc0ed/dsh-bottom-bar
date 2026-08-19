#!/usr/bin/env node
// 把 lib/client.js 里的本地模块 require('./client-*.cjs') 内联为单文件自包含。
// 背景：dsh 的 client-modules 加载器（__ModuleLoader__ 的 require）只认识
// 平台种子词 / shell-own 静态模块 / 打包注册工厂，不支持相对路径 require；
// 静态版 lib/client.js 必须单文件自包含（dynamic/client.js 由
// static-to-dynamic.cjs 生成时已内联，本脚本补静态版）。
// 用法：node scripts/inline-static-client.cjs
const fs = require('fs')
const path = require('path')

const target = path.resolve(__dirname, '..', 'lib', 'client.js')
let s = fs.readFileSync(target, 'utf8')
const before = s

s = s.replace(/const \{ ([^}]+) \} = require\('\.\/client-([a-z-]+)\.cjs'\)/g, (m, names, mod) => {
  const rel = path.resolve(__dirname, '..', 'lib', 'client-' + mod + '.cjs')
  let out = fs.readFileSync(rel, 'utf8')
  out = out.replace(/^\/\/═══.*$/gm, '')          // 顶部分隔注释
  out = out.replace(/\/\/ .*$/gm, '')             // 普通注释
  out = out.replace(/module\.exports\s*=\s*\{[^}]*\}\s*\n?/, '')
  out = out.replace(/^\s*$/gm, '')
  return '\n/* [inlined lib/client-' + mod + '.cjs] */\n' + out.trim() + '\n'
})

if (s === before) {
  console.error('no local requires found — nothing to inline')
  process.exit(1)
}
if (/require\('\.\/client-/.test(s)) {
  console.error('residual local require remains — aborting (no write)')
  process.exit(1)
}

fs.writeFileSync(target, s, 'utf8')
console.log('inlined: ' + target + ' (' + before.length + ' -> ' + s.length + ' chars)')