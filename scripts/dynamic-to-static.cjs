#!/usr/bin/env node
// 反向变换：把运行中的动态 client half（_client-ref.js）变回静态固化形式
// lib/client.js，保证仓库与线上运行版本零偏差。随后用正向生成器重建
// dynamic/client.js 并 diff 验证往返一致。
// 用法：node scripts/dynamic-to-static.cjs <动态 client.js> <静态 lib/client.js>
const fs = require('fs')

const input = process.argv[2]
const output = process.argv[3]
if (!input || !output) {
  console.error('usage: node scripts/dynamic-to-static.cjs <dynamic/client-ref.js> <lib/client.js>')
  process.exit(1)
}

const oldStatic = fs.readFileSync(output, 'utf8')
let s = fs.readFileSync(input, 'utf8')

// 1) 去掉动态头注释与插件对象包装，取 apply 函数体
const applyMarker = 'apply(ctx) {'
const ai = s.indexOf(applyMarker)
if (ai < 0) { console.error('apply(ctx) { not found'); process.exit(1) }
let body = s.slice(ai + applyMarker.length)
// 去掉前导换行（避免静态文件在 remote 行后残留空行）
body = body.replace(/^\n/, '')
// 去掉结尾的 "  },\n}"（插件对象收尾）
body = body.replace(/\n  \},\n}\s*$/, '\n')

// 2) 符号：styles.insert → insertCss；host.call('wire', args) → remote.Method(args)
const WIRES = {
  'get-composition': 'getConfig',
  'set-composition': 'setConfig',
  'reset-composition': 'resetConfig',
  'estimate-cost': 'estimateCost',
  'get-prices': 'getPrices',
  'set-price': 'setPrice',
  'remove-price': 'removePrice',
  'reset-prices': 'resetPrices',
  'get-client-usage': 'getClientUsage',
  diagnostics: 'diagnostics',
}
body = body.replace(/styles\.insert\(/g, 'insertCss(')
body = body.replace(/host\.call\('([^']+)'(?:, ([^)]*))?\)/g, (m, wire, args) => {
  const name = WIRES[wire]
  if (name === undefined) throw new Error('unknown wire: ' + wire)
  const argText = (args || '').trim()
  return "remote." + name + "(" + argText + ")"
})

// 3) 整体缩进 +4（动态 2 空格基准 → 静态 6 空格基准）
body = body.split('\n').map((l) => (l.length > 0 ? '    ' + l : l)).join('\n')

// 4) 旧头注释（到第二个全 ═ 行）+ 修订 19-27 新注释
const lines = oldStatic.split('\n')
const boxIndexes = []
lines.forEach((l, i) => { if (/^\/\/ ═+$/.test(l)) boxIndexes.push(i) })
if (boxIndexes.length < 2) { console.error('old header box lines not found'); process.exit(1) }
const oldHeader = lines.slice(0, boxIndexes[1] + 1).join('\n')
const NEW_NOTES = `// 修订 19（host）：全量折叠退役——订阅 'session/event' 实时增量流（O(1)/事件）+
// 投影冷快照 coldSnapshot 补历史（归因最后已知模型，近似）；配置改写到工作区
// .dsh-bottom-bar/composition.json（沙箱 workspaceRoot），读仍兼容旧 ~/.dsh。
// 修订 20（host）：自研持久化账本 ledger.json——首次建账用投影总量做初始基线
// （之后不再依赖投影），session/flush（parallel 检查点）同步落盘 + 60s 兜底，
// 重启后从账本恢复继续追加，永不全量重算（用户设计：缓存到某一层后只管追加）。
// 修订 21（host）：补回 normalizeSegments/normalizePrices/bucketNum（丢失导致
// set-composition 崩溃）；estimate-cost 先 await loadConfig；存储路径 stat 探测
// （fs 无 mkdir，.dsh-bottom-bar 不存在则直接写根目录）+ 写入失败多级降级。
// 修订 22（host/client）：diagnostics handler + 设置页底部诊断 JSON——实测沙箱
// workspaceRoot 是 telegram-saver 而非会话工作区，写入一直成功，是查找位置错了。
// 修订 23（client）：① 预估改为无条件每 1.5s 轮询（host 端 O(1) 增量，不再等
// usage 投影变化才重算——AI 干活期间投影滞后会导致底栏卡住）；② 设置页加载态
// 升级：骨架屏 + 3s 超时兜底（配置服务无响应时离线预览默认配置、保存禁用、
// 恢复自动同步），不再永远「加载中」。
// 修订 24（client）：双击/拖选底栏分段文字不再误弹明细面板——单击延迟 220ms
// 确认（等双击让路）、选中文字直接忽略；面板滚动条瘦身为细半透明（用户困惑的
// 「右侧滑动条」即面板溢出滚动条）。
// 修订 25（client）：TDZ 修复——cancelSegClick/onSegClick/toggleDetail 三个 const
// 函数定义在 children 构造之后 → 渲染期读取绑定抛 ReferenceError → dock 崩溃
// 回退官方 StatsLine。三函数提升到 children 构造之前。
// 修订 26（client/host）：① 错误边界 DockBoundary——渲染崩溃显示空占位而非
// abdicate 回退官方 StatsLine；dock 首帧直接用模块级配置缓存；② 模型归因修复：
// request/context 仅变更时追加、订阅前可能从未收到 → lastModel 恒 null、用量全挂
// "?" 无官方价；改用实时会话 session.contextFold（懒折叠 getter）取模型，并就地
// 愈合历史 "?" 行（幂等合并）。
// 修订 27（host）：归因键升级为「渠道@模型」（如 opencode-go@deepseek-v4-flash）
// ——request/context 自带 provider，同一模型 id 经不同渠道价格可能不同；价格仍按
// 模型 id 查（先试完整键支持未来按渠道覆盖）；历史裸模型行自动迁移到渠道名下。
`
const NEW_BOX = '// ══════════════════════════════════════════════════════════════════'

// 5) 组装静态文件
const SCAFFOLD = `window.__ModuleLoader__.load({
  id: 'dsh-bottom-bar',
  factory: (require) => {
    var module = { exports: {} }
    var exports = module.exports
    Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' })
    let React = require('react')

    // ── 幂等样式注入（静态插件无 styles 符号） ──
    function insertCss(css) {
      // 追加 + Set 去重（函数属性）：多次调用不互相覆盖、重挂不重复追加
      if (typeof document === 'undefined') return
      if (insertCss.seen === undefined) insertCss.seen = new Set()
      if (insertCss.seen.has(css)) return
      insertCss.seen.add(css)
      const tagId = 'dsh-bottom-bar'
      let tag = document.querySelector('style[data-plugin-css="' + tagId + '"]')
      if (tag === null) {
        tag = document.createElement('style')
        tag.dataset.pluginCss = tagId
        document.head.appendChild(tag)
      }
      tag.textContent += css
    }

    const inject = ['slots', 'remote', 'locale', 'timer']

    async function apply(ctx) {
`
const TAIL = `
    }

    exports.apply = apply
    exports.inject = inject
    return module.exports
  },
})
`
const result = oldHeader + '\n' + NEW_NOTES + NEW_BOX + '\n' + SCAFFOLD + body + TAIL
fs.writeFileSync(output, result, 'utf8')
console.log('written: ' + output + ' (' + result.length + ' chars)')
