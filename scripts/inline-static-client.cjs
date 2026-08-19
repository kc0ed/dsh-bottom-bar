#!/usr/bin/env node
// 把 lib/client.src.js(带本地模块 require 的源码)内联为单文件自包含
// lib/client.js(加载器加载的产物)。
// 背景：dsh 的 client-modules 加载器（__ModuleLoader__ 的 require）只认识
// 平台种子词 / shell-own 静态模块 / 打包注册工厂，不支持相对路径 require；
// 静态版 lib/client.js 必须单文件自包含（dynamic/client.js 由
// static-to-dynamic.cjs 生成时已内联，本脚本补静态版）。
// 用法：node scripts/inline-static-client.cjs
// 提示：改拆分模块后重跑;若改的是组件代码,改的是 lib/client.src.js。
const fs = require('fs')
const path = require('path')

const srcFile = path.resolve(__dirname, '..', 'lib', 'client.src.js')
const target = path.resolve(__dirname, '..', 'lib', 'client.js')
let s = fs.readFileSync(srcFile, 'utf8')
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

// 顶部警示横幅:本文件是构建产物,所有手改都应落在拆分源码上
const BANNER =
'// ══════════════════════════════════════════════════════════════════\n' +
'// ⚠️ 构建产物 · 勿手改本文件                                           \n' +
'// 本文件由 scripts/inline-static-client.cjs 从 lib/client.src.js 物化  \n' +
'// (加载器不支持相对 require,静态版必须单文件自包含)。源码在:         \n' +
'//   组件/主逻辑 → lib/client.src.js;样式 → lib/client-css.cjs;       \n' +
'//   数据 → lib/client-data.cjs;纯函数 → lib/client-format.cjs        \n' +
'// 改完源码跑:npm run build:client(内联静态 + 动态镜像)               \n' +
'// ══════════════════════════════════════════════════════════════════\n\n'

fs.writeFileSync(target, BANNER + s, 'utf8')
console.log('inlined: ' + target + ' (' + before.length + ' -> ' + s.length + ' chars)')