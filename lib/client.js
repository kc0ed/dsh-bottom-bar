// ══════════════════════════════════════════════════════════════════
// dsh-bottom-bar · Client 半体（固化版，2026-08-14）
// ──
// 由动态插件 cost-2（pkg-47）的 client 半体固化而来：
// · RPC 从 host.call(method, args) 改为 ctx.remote.bottomBar.<method>(args)
//   （Host 提供 bottomBar Remote 服务，wire 名见 Host MARKS）
// · 样式用静态插件惯用的幂等 style 注入（不再有 styles 符号）
// · 复刻来源：@deepseek-ai/dsh-client-ui-conversation@0.1.0-rc.6 的
//   StatsLine/Tooltip（同步说明见动态版代码头；升级 DSH 时逐零件核对）。
// 经验教训见用户技能 dsh-dynamic-plugin-lessons。
// 修订 10（pkg-53 同步）：拖拽排序改「指示线 + 落点换位」（不再悬停即换位）；
// 底栏分段可点击，弹出明细面板（费用段逐模型单价/各桶 tokens/金额/小计/总计，
// 其他段原始数值；依赖 Host 明细字段）。
// 修订 11（pkg-54 同步）：预估计费 RPC 改 latest-wins 节流（至多一个在途请求，
// 完成后若 usage/会话已变再补跑），消除流式期间"每个 chunk 发 RPC 又取消前一个"
// 造成的费用段迟迟不更新；去掉 usage 变化时冗余的 getConfig（1.5s 轮询已覆盖）。
// 修订 12（pkg-55 同步）：费用实时跳动 ——「折叠底账 + 当前轮投影增量」。
// 折叠只发生在挂载/切会话、1.5s 轮询发现 usage 有变、或距上次折叠超 30s；
// 展示 = foldTotal + max(0, cost(投影) − cost(lastSample))，投影是"直接记录"
// 的当前轮用量，客户端即时计价，费用随输出实时跳动且只增不减。依赖 Host
// lastSample 锚点（pkg-55 起）。
// 修订 13（pkg-56 同步）：会话切换加固。dock 槽位是 session 作用域的同 id
// 替换：切到另一会话时若本组件渲染抛异常，槽位会把该会话回退给官方
// StatsLine。三处防御：useSession 选择器全链判空（切换中快照可能不完整）；
// usage 判 null（useProjection 可能返回 null 而非 undefined，官方实现不读
// 这些字段所以不炸）；runEstimate 先校验 sessionId 为 string 再发 RPC 并
// try/catch；切会话清 estimate/面板。
// 修订 14（pkg-57 同步）：不再反复重算 —— Host 侧会话级折叠缓存（内存 TTL 5s）；
// 客户端在首次折叠未返回且有用量在动时，费用段显示「计算中…」替代空白。
// 修订 15（pkg-58 同步）：预估结果持久化 —— Host 把折叠结果按 session 写入
// settings 文档同目录的 cost-estimate.estimates.json（磁盘 TTL 5min、写盘节流
// 30s）。页面刷新/切会话/插件重启后直接读盘秒出，不再全量重算；客户端无改动。
// 修订 16（pkg-59 同步）：消灭切会话的原版闪帧 —— dock 组件永远不返回 null：
// 数据未就绪时渲染零高度占位根节点（.dsh-stats-empty，height:0 不可见）。
// 槽位看到 null 会把该帧回退给官方 StatsLine，切会话瞬间本组件数据为空 →
// 返回 null → 官方闪 1-2 帧。永远在场即无回退。
// 修订 17（pkg-61 同步）：修复设置页"开关点了又弹回"—— saveOptions 发送的
// segments 取自 segmentsRef.current，而 ref 只在渲染时刷新；事件处理器里
// setSegments 后同步调用 saveOptions 时 ref 还是旧数组 → Host 收到旧配置原样
// 返回 → 界面回弹（拖拽排序同样受影响）。改为 saveOptions(nextOptions, segs)
// 显式传目标数组；dropAt 落点后同步 segmentsRef.current 再让 finalize 保存。
// 修订 18（性能）：设置页首屏直接用模块级 compositionValue 缓存（底栏轮询
// 已加载），避免等 get-composition RPC 才渲染——大会话时折叠可能短暂占用
// 事件循环，RPC 会排队；RPC 回来后静默刷新。
// ══════════════════════════════════════════════════════════════════
window.__ModuleLoader__.load({
  id: 'dsh-bottom-bar',
  factory: (require) => {
    var module = { exports: {} }
    var exports = module.exports
    Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' })
    let React = require('react')

    // ── 幂等样式注入（静态插件无 styles 符号） ──
    function insertCss(css) {
      if (typeof document === 'undefined') return
      const tagId = 'dsh-bottom-bar'
      let tag = document.querySelector('style[data-plugin-css="' + tagId + '"]')
      if (tag === null) {
        tag = document.createElement('style')
        tag.dataset.pluginCss = tagId
        document.head.appendChild(tag)
      }
      tag.textContent = css
    }

    const inject = ['slots', 'remote', 'remote.bottomBar', 'locale', 'timer']

    function apply(ctx) {
      // 我们自己的文案命名空间（zh/en）
      try {
        ctx.effect(() => ctx.locale.register('dsh-bottom-bar', {
          zh: {
            input: '输入 {input} tok · 输出 {output} tok',
            cacheHit: '缓存命中 {tokens} tok',
          },
          en: {
            input: 'Input {input} tok · Output {output} tok',
            cacheHit: 'Cache hit {tokens} tok',
          },
        }), 'dsh-bottom-bar: dictionaries')
      } catch (err) {
        console.error('dsh-bottom-bar: locale ns already registered (stale run); continuing', err)
      }
      const t = ctx.locale.bind('conversation')
      const tb = ctx.locale.bind('dsh-bottom-bar')
      const remote = ctx.remote.bottomBar

      // ── 官方零件 1：StatsLine 样式（StatsLine.module.css 的 .root/.sep） ──
      // 修订 16：.dsh-stats-empty = 空数据占位（height:0 不可见，保持槽位在场）
      insertCss('.dsh-stats-root{text-align:center;max-width:var(--dsh-chat-content-width);box-sizing:border-box;width:100%;padding:4px calc(var(--dsh-composer-side-clearance) + 16px) 0px;color:var(--dsw-alias-label-tertiary);white-space:nowrap;text-overflow:ellipsis;margin:0 auto;font-size:12px;line-height:20px;display:block;overflow:hidden}.dsh-stats-sep{color:var(--dsw-alias-separator-primary);margin:0 10px}.dsh-stats-empty{height:0;padding:0;overflow:hidden;line-height:0}')
      // ── 官方零件 2：Tooltip bubble 样式（primitives Tooltip 的 .bubble） ──
      insertCss('.dsh-tip{position:fixed;z-index:100;width:max-content;max-width:50vw;padding:3px 7px;border-radius:8px;background:var(--dsw-alias-tooltip-bg);color:var(--dsw-static-neutral-bluish-00);font-size:13px;line-height:20px;white-space:pre-line;overflow-wrap:break-word;pointer-events:none;animation:dsh-tip-in .15s var(--ds-ease-in-out)}.dsh-tip[data-side=top]{transform:translate(-50%,-100%)}.dsh-tip[data-side=bottom]{transform:translate(-50%)}@keyframes dsh-tip-in{0%{opacity:0}}@media(prefers-reduced-motion:reduce){.dsh-tip{animation:none}}')
      // ── 设置页样式（我们的零件） ──
      insertCss('.dsh-comp-page{display:flex;flex-direction:column;gap:10px;padding:6px 0;font-size:13px;line-height:20px;color:var(--dsw-alias-label-secondary)}.dsh-comp-desc{color:var(--dsw-alias-label-tertiary);font-size:12px;line-height:18px;margin:0}.dsh-preview{display:flex;flex-direction:column;gap:8px;padding:10px 12px;border-radius:10px;border:1px dashed var(--dsw-alias-border-l2);background:var(--dsw-alias-interactive-bg-hover)}.dsh-preview-label{font-size:12px;line-height:18px;color:var(--dsw-alias-label-tertiary)}.dsh-preview-line{text-align:center;color:var(--dsw-alias-label-tertiary);font-size:12px;line-height:20px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.dsh-preview-seg{transition:background .15s,color .15s;border-radius:4px;padding:0 3px}.dsh-preview-hl{background:var(--dsw-alias-brand-primary);color:var(--dsw-static-neutral-bluish-00)}.dsh-preview-bubble{align-self:center;max-width:100%;padding:3px 7px;border-radius:8px;background:var(--dsw-alias-tooltip-bg);color:var(--dsw-static-neutral-bluish-00);font-size:13px;line-height:20px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.dsh-comp-row{display:flex;align-items:center;gap:10px;padding:6px 10px;border-radius:8px;border:1px solid transparent;background:var(--dsw-alias-interactive-bg-hover);cursor:grab;will-change:transform;transition:opacity .15s,border-color .15s,box-shadow .15s}.dsh-comp-row:active{cursor:grabbing}.dsh-comp-row.dsh-on{border-color:var(--dsw-alias-brand-primary);box-shadow:0 0 0 1px var(--dsw-alias-brand-primary) inset}.dsh-comp-row.dsh-off{opacity:.5}.dsh-comp-row.dsh-dragging{opacity:.65}.dsh-comp-grip{color:var(--dsw-alias-label-tertiary);user-select:none}.dsh-comp-label{flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.dsh-comp-row.dsh-on .dsh-comp-label{color:var(--dsw-alias-label-primary);font-weight:500}.dsh-comp-row.dsh-off .dsh-comp-label{color:var(--dsw-alias-label-tertiary)}.dsh-switch{position:relative;width:34px;height:18px;flex:none;cursor:pointer}.dsh-switch input{position:absolute;opacity:0;inset:0;margin:0;cursor:pointer}.dsh-switch-track{position:absolute;inset:0;border-radius:999px;background:var(--dsw-alias-interactive-bg-hover);border:1px solid var(--dsw-alias-border-l2);transition:background .15s}.dsh-switch-knob{position:absolute;top:2px;left:2px;width:12px;height:12px;border-radius:999px;background:var(--dsw-alias-label-secondary);transition:transform .15s,background .15s}.dsh-switch input:checked + .dsh-switch-track{background:var(--dsw-alias-brand-primary);border-color:transparent}.dsh-switch input:checked + .dsh-switch-track + .dsh-switch-knob{transform:translateX(16px);background:#fff}.dsh-comp-btn{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-secondary);border:1px solid var(--dsw-alias-border-l2);border-radius:6px;font-size:12px;line-height:16px;padding:2px 7px;cursor:pointer}.dsh-comp-btn:disabled{opacity:.4;cursor:default}.dsh-comp-btn:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover)}.dsh-comp-reset{align-self:flex-start}.dsh-prices{display:flex;flex-direction:column;gap:6px;padding:10px 12px;border-radius:10px;border:1px dashed var(--dsw-alias-border-l2);background:var(--dsw-alias-interactive-bg-hover)}.dsh-price-label{font-size:12px;line-height:18px;color:var(--dsw-alias-label-tertiary)}.dsh-price-head{display:flex;align-items:center;gap:6px;font-size:11px;line-height:16px;color:var(--dsw-alias-label-tertiary)}.dsh-price-model{font-size:12px;color:var(--dsw-alias-label-primary);min-width:120px;font-family:var(--ds-font-family-code,ui-monospace,Menlo,Consolas,monospace);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.dsh-price-row{display:flex;align-items:center;gap:6px;flex-wrap:wrap}.dsh-price-input{width:60px;background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary);border:1px solid var(--dsw-alias-border-l2);border-radius:6px;font-size:12px;padding:2px 4px}.dsh-price-add{display:flex;gap:6px;align-items:center}.dsh-price-add input{flex:1;background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary);border:1px solid var(--dsw-alias-border-l2);border-radius:6px;font-size:12px;padding:2px 6px}')
      // 币种下拉：原生外观（appearance:auto），不做自绘，避免与系统控件割裂
      insertCss('.dsh-comp-select{appearance:auto;-webkit-appearance:auto;font-size:12px;padding:2px 4px;border-radius:4px;background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}')
      // ── 底栏分段（可点击弹明细）与明细面板样式（修订 10） ──
      insertCss('.dsh-seg{cursor:pointer;border-radius:3px;padding:0 2px;margin:0 -2px;transition:background .12s,color .12s}.dsh-seg:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}.dsh-detail{position:fixed;z-index:101;min-width:190px;max-width:min(430px,82vw);max-height:45vh;overflow:auto;padding:8px 12px;border-radius:10px;background:var(--dsw-alias-tooltip-bg);color:var(--dsw-static-neutral-bluish-00);font-size:12px;line-height:18px;white-space:nowrap;box-shadow:0 4px 16px rgba(0,0,0,.25);animation:dsh-tip-in .15s var(--ds-ease-in-out)}.dsh-detail[data-side=top]{transform:translate(-50%,-100%)}.dsh-detail[data-side=bottom]{transform:translate(-50%)}.dsh-detail-title{font-weight:600;margin-bottom:4px}.dsh-detail-row{display:flex;justify-content:space-between;gap:18px}.dsh-detail-row+.dsh-detail-row{margin-top:2px}.dsh-detail-sep{border-top:1px solid rgba(255,255,255,.18);margin:6px 0}.dsh-detail-total{font-weight:600}.dsh-detail-model{font-weight:600;margin-top:6px}.dsh-detail-empty{opacity:.75;margin-top:2px}')
      // ── 拖拽排序：列表容器 + 放置指示线（修订 10） ──
      insertCss('.dsh-comp-list{position:relative;display:flex;flex-direction:column;gap:6px}.dsh-drop-ind{position:absolute;left:8px;right:8px;height:2px;border-radius:1px;background:var(--dsw-alias-brand-primary);pointer-events:none;transition:top .12s ease;box-shadow:0 0 6px var(--dsw-alias-brand-primary)}')

      // ── 官方零件 3：StatsLine 纯函数（与上游逐一对应） ──
      const usageOutputTokens = (usage) => {
        if (typeof usage !== 'object' || usage === null) return null
        const value = usage.outputTokens
        return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : null
      }
      const assistantStepReading = (node) => {
        const timing = node.timing
        return {
          ttftMs: timing !== undefined && timing.stepStartTime !== null && timing.firstTokenTime !== null ? Math.max(0, timing.firstTokenTime - timing.stepStartTime) : null,
          decodeMs: timing !== undefined && timing.firstTokenTime !== null ? Math.max(0, timing.completedTime - timing.firstTokenTime) : null,
          outputTokens: usageOutputTokens(node.usage),
        }
      }
      const deriveStats = (nodes) => {
        const list = Array.isArray(nodes) ? nodes : []
        const turns = new Set()
        let steps = 0
        let llmMs = 0
        let toolMs = 0
        let ttftMs = 0
        let ttftSteps = 0
        let decodeMs = 0
        let decodeTokens = 0
        for (const node of list) {
          if (node.kind === 'tool-result') {
            if (node.callTime !== null) toolMs += Math.max(0, node.time - node.callTime)
            continue
          }
          if (node.kind !== 'assistant') continue
          turns.add(node.turn)
          steps += 1
          if (node.timing !== undefined && node.timing.stepStartTime !== null) llmMs += Math.max(0, node.timing.completedTime - node.timing.stepStartTime)
          const reading = assistantStepReading(node)
          if (reading.ttftMs !== null) {
            ttftMs += reading.ttftMs
            ttftSteps += 1
          }
          if (reading.decodeMs !== null && reading.outputTokens !== null) {
            decodeMs += reading.decodeMs
            decodeTokens += reading.outputTokens
          }
        }
        return { turns: turns.size, steps, llmMs, toolMs, ttftMs, ttftSteps, decodeMs, decodeTokens }
      }
      const formatTokens = (n) => {
        const scaled = (v) => v >= 100 ? String(Math.round(v)) : String(Math.round(v * 10) / 10)
        if (n < 1e3) return String(n)
        if (n < 1e6) return scaled(n / 1e3) + 'K'
        return scaled(n / 1e6) + 'M'
      }
      const formatDuration = (ms) => {
        const s = ms / 1e3
        if (s < 60) return Math.round(s * 10) / 10 + 's'
        const whole = Math.round(s)
        return Math.floor(whole / 60) + 'm' + whole % 60 + 's'
      }
      const formatTokensPerSecond = (tps) => {
        const clamped = Math.max(0, tps)
        return clamped >= 10 ? String(Math.round(clamped)) : String(Math.round(clamped * 10) / 10)
      }
      // 修订 13：判空（useProjection 可能返回 null 而非 undefined）
      const billedInputTokens = (usage) => (usage ? usage.uncachedInputTokens : 0) + (usage ? usage.cacheReadTokens : 0) + (usage ? usage.cacheWriteTokens : 0)
      const cacheHitPercent = (usage) => {
        const denominator = billedInputTokens(usage)
        return denominator === 0 ? null : Math.round(usage.cacheReadTokens / denominator * 100)
      }

      // ── 我们的零件：费用标注 ──
      const compactMoney = (v, currency, precision) => {
        const prefix = currency === 'CNY' ? '¥' : '$'
        if (precision === 'full') return prefix + (v === 0 ? '0.0000' : v.toFixed(4))
        if (v === 0) return prefix + '0'
        if (v >= 1) return prefix + v.toFixed(2)
        if (v >= 0.01) return prefix + v.toFixed(2)
        return prefix + v.toFixed(3)
      }
      // live：当前轮实时增量（修订 12）——foldTotal 上叠加 max(0, cost(投影) − cost(lastSample))
      const costGroup = (estimate, precision, live) => {
        if (typeof estimate !== 'object' || estimate === null) return null
        if (!estimate.hasUsage) return null
        if (!Array.isArray(estimate.priced) || !Array.isArray(estimate.unpriced)) return null
        if (estimate.priced.length === 0) {
          return estimate.unpriced.length > 0 ? '预估 — · 无官方价' : null
        }
        const parts = []
        const totals = Object.assign({}, typeof estimate.totals === 'object' && estimate.totals !== null ? estimate.totals : {})
        if (live !== null && live !== undefined) {
          totals[live.currency] = (totals[live.currency] || 0) + live.delta
        }
        for (const key of Object.keys(totals)) parts.push(compactMoney(totals[key], key, precision))
        let text = '预估 ' + (parts.length > 0 ? parts.join(' + ') : '—')
        if (estimate.unpriced.length > 0) text += ' (+' + estimate.unpriced.length + ' 无价)'
        return text
      }

      // ── 组装配置 ──
      const SEGMENT_IDS = ['counts', 'llm', 'toolCall', 'ttft', 'throughput', 'cacheHit', 'tokens', 'cost']
      const SEGMENT_LABELS = {
        counts: '轮/步',
        llm: 'LLM 时长',
        toolCall: '工具调用时长',
        ttft: '首 token 平均',
        throughput: '吞吐 tok/s',
        cacheHit: '缓存命中',
        tokens: '输入/输出 token',
        cost: '预估费用',
      }
      const PREVIEW_TEXTS = {
        counts: '12 轮 · 45 步',
        llm: 'LLM 2m10s',
        toolCall: '工具调用 45s',
        ttft: '首 token 平均 1.8s',
        throughput: '34.2 tok/s',
        cacheHit: { separate: '缓存命中 5.93M tok', combined: '缓存命中 97%' },
        tokens: { separate: '输入 96.3K tok · 输出 72.8K tok', combined: '输入 6.0M tok · 输出 72.8K tok' },
        cost: '预估 ¥0.36',
      }
      const DEFAULT_COMPOSITION = SEGMENT_IDS.map((id) => ({ id, enabled: true }))
      let compositionValue = null
      const compositionListeners = new Set()
      const setCompositionState = (segments) => {
        if (!Array.isArray(segments)) return
        compositionValue = segments
        for (const fn of compositionListeners) fn()
      }
      const subscribeComposition = (fn) => {
        compositionListeners.add(fn)
        return () => compositionListeners.delete(fn)
      }

      // ── 底栏（dock stats cell） ──
      ctx.slots.inject('conversation.composer.dock', () => ctx.slots.register(
        { name: 'conversation.composer.dock', id: 'stats', order: 0 },
        (props) => {
          // ⚠️ 全部 hooks 在组件顶部无条件调用（React #310 教训）
          // 修订 13：选择器全链判空（切换会话时快照可能不完整）
          const settledNodes = props.useSession((s) => (s !== null && s !== undefined && s.chat !== undefined && s.chat !== null && s.chat.legacy !== undefined && s.chat.legacy !== null && Array.isArray(s.chat.legacy.nodes)) ? s.chat.legacy.nodes : [])
          const usage = props.useProjection('tokenUsage')
          const projected = props.useProjection('sessionStats')
          const [estimate, setEstimate] = React.useState(null)
          const [composition, setComposition] = React.useState(null)
          const [mode, setMode] = React.useState('separate')
          const [tooltipAlways, setTooltipAlways] = React.useState(false)
          const [precision, setPrecision] = React.useState('compact')
          // 明细面板（修订 10）
          const [detailSeg, setDetailSeg] = React.useState(null)
          const [panelPos, setPanelPos] = React.useState(null)
          const [panelPlacement, setPanelPlacement] = React.useState('top')
          const panelRef = React.useRef(null)
          React.useEffect(() => subscribeComposition(setComposition), [])
          React.useEffect(() => {
            let alive = true
            let timer = null
            const tick = () => {
              if (!alive) return
              remote.getConfig()
                .then((result) => {
                  if (!alive) return
                  if (Array.isArray(result.segments)) setComposition(result.segments)
                  if (result.mode === 'separate' || result.mode === 'combined') setMode(result.mode)
                  if (typeof result.tooltip === 'string') setTooltipAlways(result.tooltip === 'always')
                  if (result.precision === 'compact' || result.precision === 'full') setPrecision(result.precision)
                })
                .catch((err) => console.error('dsh-bottom-bar: config poll failed', err))
                .then(() => {
                  if (!alive) return
                  // 用量有新变化（流式）或距上次折叠超 30s（兜底价格修改等）才重算费用
                  if (usageRef.current !== foldedUsageRef.current || nowMs() - lastFoldTimeRef.current > 30000) {
                    runEstimate()
                  }
                  timer = ctx.timeout(tick, 1500)
                })
            }
            tick()
            return () => {
              alive = false
              if (timer !== null) timer()
            }
          }, [])
          // ⚠️ 预估计费（修订 12）：折叠底账 + 当前轮投影增量。折叠只发生在
          // 挂载/切会话、1.5s 轮询发现 usage 有变、或距上次折叠超 30s；展示 =
          // foldTotal + max(0, cost(投影) − cost(lastSample))，投影变化即跳动。
          const estimateBusyRef = React.useRef(false)
          const usageRef = React.useRef(usage)
          const sessionRef = React.useRef(null)
          const foldedUsageRef = React.useRef(null)
          const lastFoldTimeRef = React.useRef(0)
          const disposedRef = React.useRef(false)
          const nowMs = () => (typeof Date !== 'undefined' ? Date.now() : 0)
          React.useEffect(() => () => { disposedRef.current = true }, [])
          const runEstimate = () => {
            if (estimateBusyRef.current || disposedRef.current) return
            const sid = sessionRef.current
            // 修订 13：切换会话瞬间 sessionId 可能是 undefined（线上协议会拒绝）
            if (typeof sid !== 'string') return
            estimateBusyRef.current = true
            const folded = usageRef.current
            let promise
            try {
              promise = remote.estimateCost({ sessionId: sid })
            } catch (err) {
              console.error('dsh-bottom-bar: estimateCost call failed', err)
              estimateBusyRef.current = false
              return
            }
            promise
              .then((result) => {
                if (sessionRef.current === sid) {
                  setEstimate(result)
                  foldedUsageRef.current = folded
                  lastFoldTimeRef.current = nowMs()
                }
              })
              .catch(() => {})
              .then(() => { estimateBusyRef.current = false })
          }
          React.useEffect(() => {
            usageRef.current = usage
            if (sessionRef.current !== props.sessionId) {
              sessionRef.current = props.sessionId
              foldedUsageRef.current = null
              // 修订 13：切会话清掉旧会话的底账与面板，避免串会话
              setEstimate(null)
              setDetailSeg(null)
              setPanelPos(null)
              runEstimate()
            }
          }, [props.sessionId, usage])
          const stats = React.useMemo(() => projected ?? deriveStats(settledNodes), [projected, settledNodes])
          // 修订 13：usage 判 null（useProjection 可能返回 null 而非 undefined）
          const usageActive = usage !== null && usage !== undefined && (billedInputTokens(usage) > 0 || usage.outputTokens > 0)
          const cacheHitPct = usageActive ? cacheHitPercent(usage) : null
          // 当前轮实时增量：cost(投影) − cost(折叠时最后样本)，只增不减（新步/新轮钳 0）
          const liveDeltaOf = (estimate, usage) => {
            if (typeof estimate !== 'object' || estimate === null) return null
            const ls = estimate.lastSample
            if (typeof ls !== 'object' || ls === null) return null
            if (typeof usage !== 'object' || usage === null) return null
            const p = Array.isArray(estimate.priced) ? estimate.priced.find((x) => x.model === ls.model) : undefined
            if (p === undefined) return null
            const bucketCost = (b) => b.uncachedInput / 1e6 * p.priceIn
              + b.cacheRead / 1e6 * (p.priceCacheRead === null || p.priceCacheRead === undefined ? p.priceIn : p.priceCacheRead)
              + b.cacheWrite / 1e6 * (p.priceCacheWrite === null || p.priceCacheWrite === undefined ? p.priceIn : p.priceCacheWrite)
              + b.output / 1e6 * p.priceOut
            const delta = bucketCost({
              uncachedInput: usage.uncachedInputTokens || 0,
              output: usage.outputTokens || 0,
              cacheRead: usage.cacheReadTokens || 0,
              cacheWrite: usage.cacheWriteTokens || 0,
            }) - bucketCost(ls)
            if (!(delta > 0)) return null
            return { currency: p.currency, delta }
          }
          const live = liveDeltaOf(estimate, usage)
          const separate = mode === 'separate'
          const builders = {
            counts: () => stats.steps > 0 ? t('stats.counts', { turns: stats.turns, steps: stats.steps }) : null,
            llm: () => stats.llmMs > 0 ? t('stats.llm', { duration: formatDuration(stats.llmMs) }) : null,
            toolCall: () => stats.toolMs > 0 ? t('stats.toolCall', { duration: formatDuration(stats.toolMs) }) : null,
            ttft: () => stats.ttftSteps > 0 ? t('stats.ttftAverage', { duration: formatDuration(stats.ttftMs / stats.ttftSteps) }) : null,
            throughput: () => stats.decodeMs > 0 ? t('stats.tokensPerSecond', { throughput: formatTokensPerSecond(stats.decodeTokens / (stats.decodeMs / 1e3)) }) : null,
            cacheHit: () => usageActive && (separate ? (usage.cacheReadTokens || 0) > 0 : cacheHitPct !== null)
              ? (separate ? tb('cacheHit', { tokens: formatTokens(usage.cacheReadTokens) }) : t('stats.cacheHit', { percent: cacheHitPct }))
              : null,
            tokens: () => usageActive ? tb('input', {
              input: formatTokens(separate
                ? (usage.uncachedInputTokens || 0) + (usage.cacheWriteTokens || 0)
                : billedInputTokens(usage)),
              output: formatTokens(usage.outputTokens || 0),
            }) : null,
            cost: () => {
              // 修订 14：首次折叠未返回且有用量在动 → 显示「计算中…」替代空白
              if (estimate === null) return usageActive ? '计算中…' : null
              return costGroup(estimate, precision, live)
            },
          }
          const active = Array.isArray(composition) && composition.length > 0 ? composition : DEFAULT_COMPOSITION
          const lineGroups = []
          for (const seg of active) {
            if (seg.enabled !== true) continue
            const build = builders[seg.id]
            if (build === undefined) continue
            const text = build()
            if (text === null) continue
            lineGroups.push({ id: seg.id, text })
          }
          const line = lineGroups.map((g) => g.text).join(' | ')
          const children = []
          lineGroups.forEach((group, i) => {
            if (i > 0) {
              children.push(React.createElement('span', { className: 'dsh-stats-sep', 'aria-hidden': true, key: 'sep' + i }, '|'))
              children.push(' ')
            }
            children.push(React.createElement('span', {
              className: 'dsh-seg',
              key: group.id,
              title: '点击查看明细',
              onClick: (e) => toggleDetail(group.id, e.currentTarget),
            }, group.text))
          })

          // ── 官方零件 4：Tooltip 交互（primitives Tooltip，上游 2301–2430） ──
          const rootRef = React.useRef(null)
          const bubbleRef = React.useRef(null)
          const timerRef = React.useRef(null)
          const [truncated, setTruncated] = React.useState(false)
          const [pos, setPos] = React.useState(null)
          const [placement, setPlacement] = React.useState('top')
          React.useLayoutEffect(() => {
            const el = rootRef.current
            if (el === null) return
            const measure = () => setTruncated(el.scrollWidth > el.clientWidth)
            measure()
            if (typeof ResizeObserver === 'undefined') return
            const observer = new ResizeObserver(measure)
            observer.observe(el)
            return () => observer.disconnect()
          }, [line])
          const show = React.useCallback(() => {
            const el = rootRef.current
            if (el === null) return
            if (line === '') return
            if (detailSeg !== null) return
            if (!tooltipAlways && !truncated) return
            const r = el.getBoundingClientRect()
            setPlacement('top')
            setPos({ x: r.left + r.width / 2, top: r.top, bottom: r.bottom })
          }, [truncated, line, tooltipAlways, detailSeg])
          const showAfterDelay = () => {
            if (timerRef.current !== null) {
              timerRef.current()
              timerRef.current = null
            }
            timerRef.current = ctx.timeout(() => {
              timerRef.current = null
              show()
            }, 500)
          }
          const hide = () => {
            if (timerRef.current !== null) {
              timerRef.current()
              timerRef.current = null
            }
            setPos(null)
          }
          React.useLayoutEffect(() => {
            if (pos === null) return
            const el = bubbleRef.current
            if (el === null) return
            el.style.left = pos.x + 'px'
            const r = el.getBoundingClientRect()
            let dx = 0
            const vw = typeof window !== 'undefined' ? window.innerWidth : r.right + 12
            const vh = typeof window !== 'undefined' ? window.innerHeight : r.bottom + 12
            if (r.right > vw - 12) dx = vw - 12 - r.right
            if (r.left + dx < 12) dx = 12 - r.left
            el.style.left = pos.x + dx + 'px'
            const fitsBelow = pos.bottom + 8 + r.height <= vh - 12
            const fitsAbove = pos.top - 8 - r.height >= 12
            if (placement === 'bottom' && !fitsBelow && fitsAbove) setPlacement('top')
            if (placement === 'top' && !fitsAbove && fitsBelow) setPlacement('bottom')
          }, [placement, pos])
          React.useEffect(() => () => {
            if (timerRef.current !== null) timerRef.current()
          }, [])

          // ── 明细面板（修订 10） ──
          // 点击分段：切换面板；先取消待触发的黑条
          const toggleDetail = (segId, el) => {
            if (timerRef.current !== null) {
              timerRef.current()
              timerRef.current = null
            }
            setPos(null)
            if (detailSeg === segId) {
              setDetailSeg(null)
              setPanelPos(null)
              return
            }
            const r = el.getBoundingClientRect()
            setPanelPlacement('top')
            setDetailSeg(segId)
            setPanelPos({ x: r.left + r.width / 2, top: r.top, bottom: r.bottom })
          }
          // 点击面板外关闭
          React.useEffect(() => {
            if (detailSeg === null) return
            if (typeof document === 'undefined') return
            const onDown = (e) => {
              const p = panelRef.current
              if (p !== null && p.contains(e.target)) return
              setDetailSeg(null)
              setPanelPos(null)
            }
            document.addEventListener('mousedown', onDown)
            return () => document.removeEventListener('mousedown', onDown)
          }, [detailSeg])
          // 面板水平夹紧 + 上下翻转（复用黑条同款逻辑）
          React.useLayoutEffect(() => {
            if (panelPos === null) return
            const el = panelRef.current
            if (el === null) return
            el.style.left = panelPos.x + 'px'
            const r = el.getBoundingClientRect()
            let dx = 0
            const vw = typeof window !== 'undefined' ? window.innerWidth : r.right + 12
            const vh = typeof window !== 'undefined' ? window.innerHeight : r.bottom + 12
            if (r.right > vw - 12) dx = vw - 12 - r.right
            if (r.left + dx < 12) dx = 12 - r.left
            el.style.left = panelPos.x + dx + 'px'
            const fitsBelow = panelPos.bottom + 8 + r.height <= vh - 12
            const fitsAbove = panelPos.top - 8 - r.height >= 12
            if (panelPlacement === 'bottom' && !fitsBelow && fitsAbove) setPanelPlacement('top')
            if (panelPlacement === 'top' && !fitsAbove && fitsBelow) setPanelPlacement('bottom')
          }, [panelPlacement, panelPos, detailSeg])
          // 非费用段：原始数值行
          const segDetailRows = (segId) => {
            switch (segId) {
              case 'counts': return [['轮数', String(stats.turns)], ['步数', String(stats.steps)]]
              case 'llm': return [['LLM 总时长', formatDuration(stats.llmMs)], ['步数', String(stats.steps)], ['平均每步', stats.steps > 0 ? formatDuration(stats.llmMs / stats.steps) : '—']]
              case 'toolCall': return [['工具调用总时长', formatDuration(stats.toolMs)]]
              case 'ttft': return [['首 token 总耗时', formatDuration(stats.ttftMs)], ['步数', String(stats.ttftSteps)], ['平均', stats.ttftSteps > 0 ? formatDuration(stats.ttftMs / stats.ttftSteps) : '—']]
              case 'throughput': return [['平均吞吐', formatTokensPerSecond(stats.decodeMs > 0 ? stats.decodeTokens / (stats.decodeMs / 1e3) : 0) + ' tok/s'], ['输出 token', formatTokens(stats.decodeTokens)], ['解码时长', formatDuration(stats.decodeMs)]]
              case 'cacheHit': return usageActive
                ? [['缓存命中', formatTokens(usage.cacheReadTokens || 0) + ' tok'], ['输入总量', formatTokens(billedInputTokens(usage)) + ' tok'], ['命中率', cacheHitPct === null ? '—' : cacheHitPct + '%']]
                : null
              case 'tokens': return usageActive
                ? [['未缓存输入', formatTokens(usage.uncachedInputTokens || 0) + ' tok'], ['缓存读', formatTokens(usage.cacheReadTokens || 0) + ' tok'], ['缓存写', formatTokens(usage.cacheWriteTokens || 0) + ' tok'], ['输出', formatTokens(usage.outputTokens || 0) + ' tok']]
                : null
              default: return null
            }
          }
          // 费用段：逐模型单价/各桶 tokens/金额/小计/总计
          const costDetail = () => {
            if (typeof estimate !== 'object' || estimate === null || !estimate.hasUsage) return null
            const nodes = []
            if (Array.isArray(estimate.priced)) {
              for (const p of estimate.priced) {
                nodes.push(React.createElement('div', { className: 'dsh-detail-model', key: 'm' + p.model }, p.model))
                const buckets = [
                  { label: '输入', tokens: p.uncachedInput, unit: p.priceIn, cost: p.inCost },
                  { label: '缓存读', tokens: p.cacheRead, unit: p.priceCacheRead, cost: p.cacheReadCost },
                  { label: '缓存写', tokens: p.cacheWrite, unit: p.priceCacheWrite, cost: p.cacheWriteCost },
                  { label: '输出', tokens: p.output, unit: p.priceOut, cost: p.outCost },
                ]
                let any = false
                for (const b of buckets) {
                  if (!(b.tokens > 0)) continue
                  any = true
                  const unitText = b.unit === null || b.unit === undefined
                    ? '按输入价'
                    : compactMoney(b.unit, p.currency, 'compact') + '/1M'
                  nodes.push(React.createElement('div', { className: 'dsh-detail-row', key: 'b' + p.model + b.label },
                    React.createElement('span', null, b.label + ' ' + formatTokens(b.tokens) + ' tok'),
                    React.createElement('span', null, unitText + ' → ' + compactMoney(b.cost, p.currency, 'full')),
                  ))
                }
                if (!any) nodes.push(React.createElement('div', { className: 'dsh-detail-empty', key: 'e' + p.model }, '（无用量）'))
                nodes.push(React.createElement('div', { className: 'dsh-detail-row dsh-detail-total', key: 's' + p.model },
                  React.createElement('span', null, '小计'),
                  React.createElement('span', null, compactMoney(p.cost, p.currency, 'full')),
                ))
              }
            }
            if (Array.isArray(estimate.unpriced) && estimate.unpriced.length > 0) {
              for (const u of estimate.unpriced) {
                const toks = (u.uncachedInput || 0) + (u.cacheRead || 0) + (u.cacheWrite || 0) + (u.output || 0)
                nodes.push(React.createElement('div', { className: 'dsh-detail-model', key: 'u' + u.model }, u.model))
                nodes.push(React.createElement('div', { className: 'dsh-detail-empty', key: 'ue' + u.model }, '无官方价 · ' + formatTokens(toks) + ' tok'))
              }
            }
            const totals = typeof estimate.totals === 'object' && estimate.totals !== null ? estimate.totals : {}
            const totalText = Object.keys(totals).map((k) => compactMoney(totals[k], k, 'full')).join(' + ')
            nodes.push(React.createElement('div', { className: 'dsh-detail-sep', key: 'sep' }))
            nodes.push(React.createElement('div', { className: 'dsh-detail-row dsh-detail-total', key: 'tot' },
              React.createElement('span', null, '总计'),
              React.createElement('span', null, totalText),
            ))
            return nodes
          }
          const detailNodes = detailSeg === 'cost'
            ? costDetail()
            : (() => {
              const rows = segDetailRows(detailSeg)
              if (rows === null) return null
              return rows.map((row, i) => React.createElement('div', { className: 'dsh-detail-row', key: i },
                React.createElement('span', null, row[0]),
                React.createElement('span', null, row[1]),
              ))
            })()

          // 修订 16：永远不返回 null —— 空数据渲染零高占位（.dsh-stats-empty），
          // 槽位看到 null 会把这一帧回退给官方 StatsLine（切会话闪帧的根源）
          return React.createElement(React.Fragment, null,
            React.createElement('div', {
              className: 'dsh-stats-root' + (lineGroups.length === 0 ? ' dsh-stats-empty' : ''),
              ref: rootRef,
              onMouseEnter: showAfterDelay,
              onMouseLeave: hide,
            }, children),
            pos !== null && React.createElement('span', {
              ref: bubbleRef,
              className: 'dsh-tip',
              'data-side': placement,
              style: { left: pos.x, top: placement === 'top' ? pos.top - 8 : pos.bottom + 8 },
            }, line),
            detailSeg !== null && panelPos !== null && React.createElement('div', {
              ref: panelRef,
              className: 'dsh-detail',
              'data-side': panelPlacement,
              style: { left: panelPos.x, top: panelPlacement === 'top' ? panelPos.top - 8 : panelPos.bottom + 8 },
            },
              React.createElement('div', { className: 'dsh-detail-title' }, (SEGMENT_LABELS[detailSeg] || detailSeg) + ' 明细'),
              detailNodes === null
                ? React.createElement('div', { className: 'dsh-detail-empty' }, '（暂无数据）')
                : detailNodes,
            ),
          )
        },
      ))

      // ── 设置页（设置 → 底栏） ──
      ctx.slots.inject('settings.section', () => ctx.slots.register(
        { name: 'settings.section', id: 'cost-estimate', order: 25, label: '底栏' },
        () => {
          // 修订 18：首屏直接用模块级 compositionValue 缓存（底栏轮询已加载），
          // 避免每次都等 get-composition RPC 回来才渲染；RPC 回来后静默刷新。
          const [segments, setSegments] = React.useState(Array.isArray(compositionValue) ? compositionValue : null)
          const [mode, setMode] = React.useState('separate')
          const [tooltipAlways, setTooltipAlways] = React.useState(false)
          const [precision, setPrecision] = React.useState('compact')
          const [prices, setPrices] = React.useState(null)
          const [pricesOpen, setPricesOpen] = React.useState(false)
          const [newModel, setNewModel] = React.useState('')
          const [newIn, setNewIn] = React.useState('')
          const [hovered, setHovered] = React.useState(null)
          const [dragFrom, setDragFrom] = React.useState(null)
          const dragFromRef = React.useRef(null)
          const [dropIndex, setDropIndex] = React.useState(null)
          const [indicatorTop, setIndicatorTop] = React.useState(null)
          const dropIndexRef = React.useRef(null)
          const listRef = React.useRef(null)
          const segmentsRef = React.useRef(null)
          const optionsRef = React.useRef({ mode: 'separate', tooltip: 'auto', precision: 'compact' })
          const rowRefs = React.useRef([])
          const flipTops = React.useRef(null)
          React.useEffect(() => {
            let cancelled = false
            remote.getConfig()
              .then((result) => {
                if (cancelled) return
                if (Array.isArray(result.segments)) {
                  setSegments(result.segments)
                  setCompositionState(result.segments)
                }
                if (result.mode === 'separate' || result.mode === 'combined') {
                  setMode(result.mode)
                  optionsRef.current.mode = result.mode
                }
                if (typeof result.tooltip === 'string') {
                  setTooltipAlways(result.tooltip === 'always')
                  optionsRef.current.tooltip = result.tooltip
                }
                if (result.precision === 'compact' || result.precision === 'full') {
                  setPrecision(result.precision)
                  optionsRef.current.precision = result.precision
                }
              })
              .catch(() => {})
            remote.getPrices()
              .then((result) => { if (!cancelled && result.prices) setPrices(result.prices) })
              .catch(() => {})
            return () => { cancelled = true }
          }, [])
          segmentsRef.current = segments
          optionsRef.current = { mode, tooltip: tooltipAlways ? 'always' : 'auto', precision }
          React.useLayoutEffect(() => {
            if (flipTops.current === null) return
            const tops = flipTops.current
            flipTops.current = null
            const els = rowRefs.current
            let moved = false
            for (let i = 0; i < els.length; i++) {
              const el = els[i]
              if (el === null || el === undefined) continue
              const delta = tops[i] - el.getBoundingClientRect().top
              if (delta !== 0) {
                moved = true
                el.style.transition = 'none'
                el.style.transform = 'translateY(' + delta + 'px)'
              }
            }
            if (!moved) return
            const raf = typeof requestAnimationFrame !== 'undefined' ? requestAnimationFrame : (cb) => ctx.timeout(cb, 16)
            raf(() => {
              for (const el of els) {
                if (el === null || el === undefined) continue
                el.style.transition = 'transform 240ms cubic-bezier(0.34, 1.3, 0.64, 1)'
                el.style.transform = 'translateY(0)'
              }
            })
          }, [segments])
          const saveOptions = (nextOptions, segs) => {
            optionsRef.current = nextOptions
            // ⚠️ 修订 17：segments 必须显式传目标数组（segs ?? segmentsRef.current）——
            // ref 只在渲染时刷新，事件处理器里 setSegments 后同步读 ref 是旧值，
            // Host 会收到旧配置并原样返回，界面回弹。
            remote.setConfig({ segments: segs ?? segmentsRef.current, ...nextOptions })
              .then((result) => {
                if (Array.isArray(result.segments)) {
                  setSegments(result.segments)
                  setCompositionState(result.segments)
                }
                if (result.mode === 'separate' || result.mode === 'combined') {
                  setMode(result.mode)
                  optionsRef.current.mode = result.mode
                }
                if (typeof result.tooltip === 'string') {
                  setTooltipAlways(result.tooltip === 'always')
                  optionsRef.current.tooltip = result.tooltip
                }
                if (result.precision === 'compact' || result.precision === 'full') {
                  setPrecision(result.precision)
                  optionsRef.current.precision = result.precision
                }
              })
              .catch((err) => console.error('dsh-bottom-bar: setConfig failed', err))
          }
          const apply = (next) => {
            setSegments(next)
            setCompositionState(next)
            saveOptions(optionsRef.current, next)
          }
          // 落点：按插入下标换位（to 为指针所在间隙；>from 时先删后插需 -1）
          const dropAt = (to) => {
            const from = dragFromRef.current
            const current = segmentsRef.current
            if (from === null || !Array.isArray(current)) return
            if (to === null || to === from || to === from + 1) return
            flipTops.current = rowRefs.current.map((el) => el === null || el === undefined ? 0 : el.getBoundingClientRect().top)
            const next = current.slice()
            const item = next.splice(from, 1)[0]
            next.splice(to > from ? to - 1 : to, 0, item)
            // 修订 17：先同步 ref 再 setSegments —— finalize 里 saveOptions 读的是 ref
            segmentsRef.current = next
            setSegments(next)
            setCompositionState(next)
          }
          // 指针在哪个行中点之上 → 插到该行前；否则末尾
          const computeDropIndex = (e) => {
            const els = rowRefs.current
            for (let i = 0; i < els.length; i++) {
              const el = els[i]
              if (el === null || el === undefined) continue
              const r = el.getBoundingClientRect()
              if (e.clientY < r.top + r.height / 2) return i
            }
            return els.length
          }
          const finalize = () => {
            setDragFrom(null)
            dragFromRef.current = null
            dropIndexRef.current = null
            setDropIndex(null)
            setIndicatorTop(null)
            if (Array.isArray(segmentsRef.current)) saveOptions(optionsRef.current)
          }
          const move = (index, delta) => {
            if (!Array.isArray(segments)) return
            const j = index + delta
            if (j < 0 || j >= segments.length) return
            flipTops.current = rowRefs.current.map((el) => el === null || el === undefined ? 0 : el.getBoundingClientRect().top)
            const next = segments.slice()
            const tmp = next[index]
            next[index] = next[j]
            next[j] = tmp
            apply(next)
          }
          const setEnabled = (index, enabled) => {
            if (!Array.isArray(segments)) return
            const next = segments.slice()
            next[index] = { id: next[index].id, enabled }
            apply(next)
          }
          const toggleMode = () => {
            saveOptions({ ...optionsRef.current, mode: mode === 'separate' ? 'combined' : 'separate' })
          }
          const toggleTooltip = () => {
            saveOptions({ ...optionsRef.current, tooltip: tooltipAlways ? 'auto' : 'always' })
          }
          const togglePrecision = () => {
            saveOptions({ ...optionsRef.current, precision: precision === 'full' ? 'compact' : 'full' })
          }
          const reset = () => {
            remote.resetConfig()
              .then((result) => {
                if (Array.isArray(result.segments)) {
                  setSegments(result.segments)
                  setCompositionState(result.segments)
                }
                if (result.mode === 'separate' || result.mode === 'combined') {
                  setMode(result.mode)
                  optionsRef.current.mode = result.mode
                }
                if (typeof result.tooltip === 'string') {
                  setTooltipAlways(result.tooltip === 'always')
                  optionsRef.current.tooltip = result.tooltip
                }
                if (result.precision === 'compact' || result.precision === 'full') {
                  setPrecision(result.precision)
                  optionsRef.current.precision = result.precision
                }
              })
              .catch(() => {})
          }
          const updatePrice = (model, patch) => {
            if (!Array.isArray(prices)) return
            const cur = prices.find((p) => p.model === model)
            const next = {
              model,
              currency: cur ? cur.currency : 'USD',
              in: cur ? cur.in : 0,
              cacheRead: cur ? cur.cacheRead : undefined,
              cacheWrite: cur ? cur.cacheWrite : undefined,
              out: cur ? cur.out : 0,
              builtin: cur ? cur.builtin : false,
              ...patch,
            }
            setPrices(prices.map((p) => p.model === model ? next : p))
            // RPC 线路上用 null 编码『无此桶』（undefined 不是合法 JSON）
            remote.setPrice({ model, price: {
              currency: next.currency,
              in: next.in,
              cacheRead: next.cacheRead === undefined ? null : next.cacheRead,
              cacheWrite: next.cacheWrite === undefined ? null : next.cacheWrite,
              out: next.out,
            } })
              .then((result) => { if (result.prices) setPrices(result.prices) })
              .catch((err) => console.error('dsh-bottom-bar: setPrice failed', err))
          }
          const removePrice = (model) => {
            remote.removePrice({ model })
              .then((result) => { if (result.prices) setPrices(result.prices) })
              .catch((err) => console.error('dsh-bottom-bar: removePrice failed', err))
          }
          // 新增：只填模型 id + 输入价，输出/缓存读/缓存写按 5×/0.1×/1.25× 自动派生
          const addPrice = () => {
            const id = newModel.trim()
            if (id === '') return
            const input = Number(newIn)
            const inPrice = Number.isFinite(input) && input >= 0 ? input : 0
            setNewModel('')
            setNewIn('')
            remote.setPrice({ model: id, price: {
              currency: 'USD',
              in: inPrice,
              cacheRead: Math.round(inPrice * 0.1 * 1000) / 1000,
              cacheWrite: Math.round(inPrice * 1.25 * 1000) / 1000,
              out: Math.round(inPrice * 5 * 1000) / 1000,
            } })
              .then((result) => { if (result.prices) setPrices(result.prices) })
              .catch((err) => console.error('dsh-bottom-bar: addPrice failed', err))
          }
          const resetPrices = () => {
            remote.resetPrices()
              .then((result) => { if (result.prices) setPrices(result.prices) })
              .catch((err) => console.error('dsh-bottom-bar: resetPrices failed', err))
          }
          const num = (v) => { const n = Number(v); return Number.isFinite(n) ? n : 0 }
          // 空输入 = 该桶不存在（undefined，计费回退输入价）
          const numOrUndef = (v) => {
            if (v === '' || v === undefined || v === null) return undefined
            const n = Number(v)
            return Number.isFinite(n) ? n : undefined
          }
          if (!Array.isArray(segments)) {
            return React.createElement('div', { className: 'dsh-comp-page' }, '加载中…')
          }
          const previewSegs = []
          for (const seg of segments) {
            if (seg.enabled !== true) continue
            const sampleDef = PREVIEW_TEXTS[seg.id]
            if (sampleDef === undefined) continue
            const sample = typeof sampleDef === 'string' ? sampleDef : sampleDef[mode]
            previewSegs.push({ id: seg.id, text: sample })
          }
          const previewChildren = []
          previewSegs.forEach((item, i) => {
            if (i > 0) {
              previewChildren.push(React.createElement('span', { className: 'dsh-stats-sep', 'aria-hidden': true, key: 'ps' + i }, '|'))
              previewChildren.push(' ')
            }
            previewChildren.push(React.createElement('span', {
              className: 'dsh-preview-seg' + (hovered === item.id ? ' dsh-preview-hl' : ''),
              key: item.id,
            }, item.text))
          })
          const priceRows = Array.isArray(prices) ? prices.map((p) => React.createElement('div', { className: 'dsh-price-row', key: p.model },
            React.createElement('span', { className: 'dsh-price-model', title: p.model }, p.model),
            React.createElement('select', {
              className: 'dsh-comp-select',
              value: p.currency,
              onChange: (e) => updatePrice(p.model, { currency: e.target.value }),
            }, ['USD', 'CNY'].map((c) => React.createElement('option', { value: c, key: c }, c))),
            React.createElement('input', { className: 'dsh-price-input', type: 'number', step: '0.01', value: p.in, title: '输入', onChange: (e) => updatePrice(p.model, { in: num(e.target.value) }) }),
            React.createElement('input', { className: 'dsh-price-input', type: 'number', step: '0.01', value: (p.cacheRead === undefined || p.cacheRead === null) ? '' : p.cacheRead, title: '缓存读（留空=无此桶）', onChange: (e) => updatePrice(p.model, { cacheRead: numOrUndef(e.target.value) }) }),
            React.createElement('input', { className: 'dsh-price-input', type: 'number', step: '0.01', value: (p.cacheWrite === undefined || p.cacheWrite === null) ? '' : p.cacheWrite, title: '缓存写（留空=无此桶）', onChange: (e) => updatePrice(p.model, { cacheWrite: numOrUndef(e.target.value) }) }),
            React.createElement('input', { className: 'dsh-price-input', type: 'number', step: '0.01', value: p.out, title: '输出', onChange: (e) => updatePrice(p.model, { out: num(e.target.value) }) }),
            React.createElement('button', {
              className: 'dsh-comp-btn',
              title: p.builtin ? '恢复默认' : '删除该模型',
              onClick: () => removePrice(p.model),
            }, p.builtin ? '↺' : '×'),
          )) : []
          const rows = segments.map((seg, index) => React.createElement(
            'div',
            {
              className: 'dsh-comp-row' + (seg.enabled === true ? ' dsh-on' : ' dsh-off') + (dragFrom === index ? ' dsh-dragging' : ''),
              key: seg.id,
              ref: (el) => { rowRefs.current[index] = el },
              draggable: true,
              onMouseEnter: () => setHovered(seg.id),
              onMouseLeave: () => setHovered(null),
              onDragStart: (e) => {
                setDragFrom(index)
                dragFromRef.current = index
                e.dataTransfer.effectAllowed = 'move'
                e.dataTransfer.dropEffect = 'move'
              },
            },
            React.createElement('span', { className: 'dsh-comp-grip' }, '⠿'),
            React.createElement('span', { className: 'dsh-comp-label' }, SEGMENT_LABELS[seg.id] || seg.id),
            React.createElement('label', { className: 'dsh-switch' },
              React.createElement('input', {
                type: 'checkbox',
                checked: seg.enabled === true,
                onChange: () => setEnabled(index, !(seg.enabled === true)),
              }),
              React.createElement('span', { className: 'dsh-switch-track' }),
              React.createElement('span', { className: 'dsh-switch-knob' }),
            ),
            React.createElement('button', { className: 'dsh-comp-btn', onClick: () => move(index, -1), disabled: index === 0 }, '↑'),
            React.createElement('button', { className: 'dsh-comp-btn', onClick: () => move(index, 1), disabled: index === segments.length - 1 }, '↓'),
          ))
          return React.createElement('div', {
            className: 'dsh-comp-page',
            onDragOver: (e) => e.preventDefault(),
          },
            React.createElement('p', { className: 'dsh-comp-desc' },
              '配置输入框下方的底栏统计行。开关组：显示/隐藏、输入缓存口径、黑条行为、费用精度；价格表在页面底部（折叠）。拖拽行排序（拖动时显示放置指示线）；悬停字段在预览中高亮；底栏点击分段查看明细。配置保存在 settings 文档旁的 JSON 中。'),
            React.createElement('div', { className: 'dsh-comp-row dsh-on' },
              React.createElement('span', { className: 'dsh-comp-label' }, '输入/缓存分离'),
              React.createElement('label', { className: 'dsh-switch' },
                React.createElement('input', { type: 'checkbox', checked: mode === 'separate', onChange: toggleMode }),
                React.createElement('span', { className: 'dsh-switch-track' }),
                React.createElement('span', { className: 'dsh-switch-knob' }),
              ),
            ),
            React.createElement('div', { className: 'dsh-comp-row' + (tooltipAlways ? ' dsh-on' : ' dsh-off') },
              React.createElement('span', { className: 'dsh-comp-label' }, '悬停黑条始终显示完整行'),
              React.createElement('label', { className: 'dsh-switch' },
                React.createElement('input', { type: 'checkbox', checked: tooltipAlways, onChange: toggleTooltip }),
                React.createElement('span', { className: 'dsh-switch-track' }),
                React.createElement('span', { className: 'dsh-switch-knob' }),
              ),
            ),
            React.createElement('div', { className: 'dsh-comp-row' + (precision === 'full' ? ' dsh-on' : ' dsh-off') },
              React.createElement('span', { className: 'dsh-comp-label' }, '费用完整精度（4 位小数）'),
              React.createElement('label', { className: 'dsh-switch' },
                React.createElement('input', { type: 'checkbox', checked: precision === 'full', onChange: togglePrecision }),
                React.createElement('span', { className: 'dsh-switch-track' }),
                React.createElement('span', { className: 'dsh-switch-knob' }),
              ),
            ),
            React.createElement('div', { className: 'dsh-preview' },
              React.createElement('span', { className: 'dsh-preview-label' }, '效果预览（示例数值）'),
              previewSegs.length === 0
                ? React.createElement('span', { className: 'dsh-preview-line' }, '（全部隐藏）')
                : React.createElement('span', { className: 'dsh-preview-line' }, previewChildren),
              previewSegs.length === 0
                ? null
                : React.createElement('span', { className: 'dsh-preview-bubble' }, previewChildren),
            ),
          React.createElement('div', { className: 'dsh-comp-list', ref: listRef,
            onDragOver: (e) => {
              e.preventDefault()
              e.dataTransfer.dropEffect = 'move'
              if (dragFromRef.current === null) return
              const index = computeDropIndex(e)
              if (index !== dropIndexRef.current) {
                dropIndexRef.current = index
                setDropIndex(index)
              }
              const container = listRef.current
              if (container === null) return
              const els = rowRefs.current
              const cr = container.getBoundingClientRect()
              let top
              if (index === 0) {
                const first = els[0]
                top = first !== null && first !== undefined ? first.getBoundingClientRect().top - cr.top - 1 : 0
              } else if (index >= els.length) {
                const last = els[els.length - 1]
                top = last !== null && last !== undefined ? last.getBoundingClientRect().bottom - cr.top - 1 : 0
              } else {
                const prev = els[index - 1]
                const next = els[index]
                top = prev !== null && prev !== undefined && next !== null && next !== undefined
                  ? (prev.getBoundingClientRect().bottom + next.getBoundingClientRect().top) / 2 - cr.top - 1
                  : 0
              }
              setIndicatorTop(Math.round(top))
            },
            onDrop: (e) => {
              e.preventDefault()
              e.stopPropagation()
              dropAt(computeDropIndex(e))
              finalize()
            },
            onDragEnd: () => finalize(),
            onDragLeave: (e) => {
              if (e.currentTarget.contains(e.relatedTarget)) return
              dropIndexRef.current = null
              setDropIndex(null)
            },
          },
            rows,
            dropIndex !== null && React.createElement('div', { className: 'dsh-drop-ind', style: { top: indicatorTop } }),
          ),
            React.createElement('button', { className: 'dsh-comp-btn dsh-comp-reset', onClick: reset }, '恢复默认（段/模式/黑条/精度）'),
            // 价格表：最底部、默认折叠
            React.createElement('button', {
              className: 'dsh-comp-btn dsh-comp-reset',
              onClick: () => setPricesOpen(!pricesOpen),
            }, pricesOpen ? '▲ 收起价格表' : '▼ 展开价格表'),
            pricesOpen && React.createElement('div', { className: 'dsh-prices' },
              React.createElement('span', { className: 'dsh-price-label' },
                '价格表（每 1M tokens；内置仅 DeepSeek 系列，其他按需添加——新增时填输入价，输出/缓存读/缓存写按 5×/0.1×/1.25× 自动派生，可再改；缓存桶留空=该模型无此桶）'),
              React.createElement('div', { className: 'dsh-price-head' },
                React.createElement('span', { className: 'dsh-price-model' }, '模型'),
                React.createElement('span', { style: { width: 58 } }, '币种'),
                React.createElement('span', { style: { width: 60 } }, '输入'),
                React.createElement('span', { style: { width: 60 } }, '缓存读'),
                React.createElement('span', { style: { width: 60 } }, '缓存写'),
                React.createElement('span', { style: { width: 60 } }, '输出'),
                React.createElement('span', { style: { width: 24 } }, ''),
              ),
              priceRows,
              React.createElement('div', { className: 'dsh-price-add' },
                React.createElement('input', {
                  type: 'text',
                  placeholder: '模型 id，如 gpt-4o',
                  value: newModel,
                  onChange: (e) => setNewModel(e.target.value),
                }),
                React.createElement('input', {
                  type: 'number',
                  step: '0.01',
                  placeholder: '输入价（USD）',
                  value: newIn,
                  onChange: (e) => setNewIn(e.target.value),
                }),
                React.createElement('button', { className: 'dsh-comp-btn', onClick: addPrice }, '添加'),
                React.createElement('button', { className: 'dsh-comp-btn', onClick: resetPrices }, '恢复默认价格'),
              ),
            ),
          )
        },
      ))
    }

    exports.apply = apply
    exports.inject = inject
    return module.exports
  },
})
