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
// 修订 19（host）：全量折叠退役——订阅 'session/event' 实时增量流（O(1)/事件）+
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
// ══════════════════════════════════════════════════════════════════
window.__ModuleLoader__.load({
  id: 'dsh-bottom-bar',
  factory: (require) => {
    var module = { exports: {} }
    var exports = module.exports
    Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' })
    let React = require('react')

    // ── 幂等样式注入（静态插件无 styles 符号；追加 + Set 去重，避免多次
    // 调用互相覆盖或重挂重复追加） ──
    const insertCssSeen = new Set()
    function insertCss(css) {
      if (typeof document === 'undefined') return
      if (insertCssSeen.has(css)) return
      insertCssSeen.add(css)
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
      // 修订 36（静态包）：Remote contribution——host 侧 SRC 发现按方法名路由，
      // 客户端在 apply 里运行时 $mount 本 contribution（预构建的 dsh-api-remotes
      // 不包含我们，必须自挂载），之后 ctx.get('remote.bottomBar') 才可用。
      // ⚠️ 常量必须声明在 apply 内：生成器把 factory 顶层的语句放进动态插件的
      // return 对象字面量中间（const 声明在对象里 = 语法错误）。
      const TYPERT_JSON = { _zod: {}, parse: (v) => v }
      const TYPERT_REMOTE = {
        package: 'dsh-bottom-bar',
        descriptors: [
          { id: 'dsh-bottom-bar#bottomBar/estimateCost', service: 'bottomBar', namespace: 'bottomBar', method: 'estimateCost', invocation: { kind: 'direct' }, parameters: [{ name: 'args', wire: 'args', source: 'json', codec: { mode: 'strict', typeSymbol: 'dsh-bottom-bar#Json', schema: TYPERT_JSON } }], result: { mode: 'strict', typeSymbol: 'dsh-bottom-bar#Json', schema: TYPERT_JSON } },
          { id: 'dsh-bottom-bar#bottomBar/getClientUsage', service: 'bottomBar', namespace: 'bottomBar', method: 'getClientUsage', invocation: { kind: 'direct' }, parameters: [], result: { mode: 'strict', typeSymbol: 'dsh-bottom-bar#Json', schema: TYPERT_JSON } },
          { id: 'dsh-bottom-bar#bottomBar/getConfig', service: 'bottomBar', namespace: 'bottomBar', method: 'getConfig', invocation: { kind: 'direct' }, parameters: [], result: { mode: 'strict', typeSymbol: 'dsh-bottom-bar#Json', schema: TYPERT_JSON } },
          { id: 'dsh-bottom-bar#bottomBar/setConfig', service: 'bottomBar', namespace: 'bottomBar', method: 'setConfig', invocation: { kind: 'direct' }, parameters: [{ name: 'args', wire: 'args', source: 'json', codec: { mode: 'strict', typeSymbol: 'dsh-bottom-bar#Json', schema: TYPERT_JSON } }], result: { mode: 'strict', typeSymbol: 'dsh-bottom-bar#Json', schema: TYPERT_JSON } },
          { id: 'dsh-bottom-bar#bottomBar/resetConfig', service: 'bottomBar', namespace: 'bottomBar', method: 'resetConfig', invocation: { kind: 'direct' }, parameters: [], result: { mode: 'strict', typeSymbol: 'dsh-bottom-bar#Json', schema: TYPERT_JSON } },
          { id: 'dsh-bottom-bar#bottomBar/getPrices', service: 'bottomBar', namespace: 'bottomBar', method: 'getPrices', invocation: { kind: 'direct' }, parameters: [], result: { mode: 'strict', typeSymbol: 'dsh-bottom-bar#Json', schema: TYPERT_JSON } },
          { id: 'dsh-bottom-bar#bottomBar/setPrice', service: 'bottomBar', namespace: 'bottomBar', method: 'setPrice', invocation: { kind: 'direct' }, parameters: [{ name: 'args', wire: 'args', source: 'json', codec: { mode: 'strict', typeSymbol: 'dsh-bottom-bar#Json', schema: TYPERT_JSON } }], result: { mode: 'strict', typeSymbol: 'dsh-bottom-bar#Json', schema: TYPERT_JSON } },
          { id: 'dsh-bottom-bar#bottomBar/removePrice', service: 'bottomBar', namespace: 'bottomBar', method: 'removePrice', invocation: { kind: 'direct' }, parameters: [{ name: 'args', wire: 'args', source: 'json', codec: { mode: 'strict', typeSymbol: 'dsh-bottom-bar#Json', schema: TYPERT_JSON } }], result: { mode: 'strict', typeSymbol: 'dsh-bottom-bar#Json', schema: TYPERT_JSON } },
          { id: 'dsh-bottom-bar#bottomBar/resetPrices', service: 'bottomBar', namespace: 'bottomBar', method: 'resetPrices', invocation: { kind: 'direct' }, parameters: [], result: { mode: 'strict', typeSymbol: 'dsh-bottom-bar#Json', schema: TYPERT_JSON } },
          { id: 'dsh-bottom-bar#bottomBar/diagnostics', service: 'bottomBar', namespace: 'bottomBar', method: 'diagnostics', invocation: { kind: 'direct' }, parameters: [], result: { mode: 'strict', typeSymbol: 'dsh-bottom-bar#Json', schema: TYPERT_JSON } },
        ],
      }
      const mountSvc = ctx.get('remote')
      if (mountSvc !== undefined && typeof mountSvc.$mount === 'function') {
        try {
          await mountSvc.$mount(TYPERT_REMOTE)
        } catch (err) {
          console.error('dsh-bottom-bar: remote mount failed', err)
        }
      }
      const remote = ctx.get('remote.bottomBar')
        try {
          ctx.effect(() => ctx.locale.register('dsh-bottom-bar', {
            zh: { input: '输入 {input} tok · 输出 {output} tok', cacheHit: '缓存命中 {tokens} tok' },
            en: { input: 'Input {input} tok · Output {output} tok', cacheHit: 'Cache hit {tokens} tok' },
          }), 'dsh-bottom-bar: dictionaries')
        } catch (err) { console.error('dsh-bottom-bar: locale ns already registered (stale run); continuing', err) }
        const t = ctx.locale.bind('conversation')
        const tb = ctx.locale.bind('dsh-bottom-bar')
        insertCss('.dsh-stats-root{text-align:center;max-width:var(--dsh-chat-content-width);box-sizing:border-box;width:100%;padding:4px calc(var(--dsh-composer-side-clearance) + 16px) 0px;color:var(--dsw-alias-label-tertiary);white-space:nowrap;text-overflow:ellipsis;margin:0 auto;font-size:12px;line-height:20px;display:block;overflow:hidden}.dsh-stats-sep{color:var(--dsw-alias-separator-primary);margin:0 10px}.dsh-stats-empty{height:0;padding:0;overflow:hidden;line-height:0}')
        insertCss('.dsh-tip{position:fixed;z-index:100;width:max-content;max-width:50vw;padding:3px 7px;border-radius:8px;background:var(--dsw-alias-tooltip-bg);color:var(--dsw-static-neutral-bluish-00);font-size:13px;line-height:20px;white-space:pre-line;overflow-wrap:break-word;pointer-events:none;animation:dsh-tip-in .15s var(--ds-ease-in-out)}.dsh-tip[data-side=top]{transform:translate(-50%,-100%)}.dsh-tip[data-side=bottom]{transform:translate(-50%)}@keyframes dsh-tip-in{0%{opacity:0}}@media(prefers-reduced-motion:reduce){.dsh-tip{animation:none}}')
        insertCss('.dsh-comp-page{display:flex;flex-direction:column;gap:10px;padding:6px 0;font-size:13px;line-height:20px;color' +
            ':var(--dsw-alias-label-secondary)}.dsh-comp-desc{color:var(--dsw-alias-label-tertiary);font-size:12px;line-hei' +
            'ght:18px;margin:0}.dsh-comp-loading{display:flex;flex-direction:column;gap:8px;padding:6px 0}.dsh-comp-loading' +
            '-bar{height:14px;border-radius:7px;background:var(--dsw-alias-interactive-bg-hover);opacity:.6;animation:dsh-l' +
            'oading-pulse 1.2s ease-in-out infinite}.dsh-comp-loading-bar:nth-child(2){width:85%;animation-delay:.15s}.dsh-' +
            'comp-loading-bar:nth-child(3){width:60%;animation-delay:.3s}.dsh-comp-warn{color:var(--dsw-alias-danger-foregr' +
            'ound, var(--dsw-alias-label-tertiary));font-size:12px;line-height:18px;background:var(--dsw-alias-danger-bg, v' +
            'ar(--dsw-alias-interactive-bg-hover));border-radius:6px;padding:4px 8px}@keyframes dsh-loading-pulse{0%,100%{o' +
            'pacity:.35}50%{opacity:.85}}.dsh-preview{display:flex;flex-direction:column;gap:8px;padding:10px 12px;border-r' +
            'adius:10px;border:1px dashed var(--dsw-alias-border-l2);background:var(--dsw-alias-interactive-bg-hover)}.dsh-' +
            'preview-label{font-size:12px;line-height:18px;color:var(--dsw-alias-label-tertiary)}.dsh-preview-line{text-ali' +
            'gn:center;color:var(--dsw-alias-label-tertiary);font-size:12px;line-height:20px;white-space:nowrap;overflow:hi' +
            'dden;text-overflow:ellipsis}.dsh-preview-seg{transition:background .15s,color .15s;border-radius:4px;padding:0' +
            ' 3px}.dsh-preview-hl{background:var(--dsw-alias-brand-primary);color:var(--dsw-static-neutral-bluish-00)}.dsh-' +
            'preview-bubble{align-self:center;max-width:100%;padding:3px 7px;border-radius:8px;background:var(--dsw-alias-t' +
            'ooltip-bg);color:var(--dsw-static-neutral-bluish-00);font-size:13px;line-height:20px;white-space:nowrap;overfl' +
            'ow:hidden;text-overflow:ellipsis}.dsh-comp-row{display:flex;align-items:center;gap:10px;padding:6px 10px;borde' +
            'r-radius:8px;border:1px solid transparent;background:var(--dsw-alias-interactive-bg-hover);cursor:grab;will-ch' +
            'ange:transform;transition:opacity .15s,border-color .15s,box-shadow .15s}.dsh-comp-row:active{cursor:grabbing}' +
            '.dsh-comp-row.dsh-on{border-color:var(--dsw-alias-brand-primary);box-shadow:0 0 0 1px var(--dsw-alias-brand-pr' +
            'imary) inset}.dsh-comp-row.dsh-off{opacity:.5}.dsh-comp-row.dsh-dragging{opacity:.65}.dsh-comp-grip{color:var(' +
            '--dsw-alias-label-tertiary);user-select:none}.dsh-comp-label{flex:1;white-space:nowrap;overflow:hidden;text-ov' +
            'erflow:ellipsis}.dsh-comp-row.dsh-on .dsh-comp-label{color:var(--dsw-alias-label-primary);font-weight:500}.dsh' +
            '-comp-row.dsh-off .dsh-comp-label{color:var(--dsw-alias-label-tertiary)}.dsh-switch{position:relative;width:34' +
            'px;height:20px;flex:none;cursor:pointer}.dsh-switch input{position:absolute;opacity:0;width:100%;height:100%;m' +
            'argin:0;cursor:pointer}.dsh-switch input:disabled{cursor:not-allowed}.dsh-switch-track{position:absolute;inset' +
            ':0;border-radius:10px;background:var(--dsw-alias-interactive-bg-active);transition:background .15s}.dsh-switch' +
            ' input:checked+.dsh-switch-track{background:var(--dsw-alias-brand-primary)}.dsh-switch input:disabled+.dsh-swi' +
            'tch-track{opacity:.4}.dsh-switch-knob{position:absolute;top:2px;left:2px;width:16px;height:16px;border-radius:' +
            '50%;background:var(--dsw-static-neutral-bluish-00);transition:transform .15s;pointer-events:none}.dsh-switch i' +
            'nput:checked+.dsh-switch-track+.dsh-switch-knob{transform:translateX(14px)}.dsh-comp-btn{border:1px solid var(' +
            '--dsw-alias-border-l2);background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary);b' +
            'order-radius:6px;padding:2px 8px;font-size:12px;line-height:18px;cursor:pointer}.dsh-comp-btn:hover{border-col' +
            'or:var(--dsw-alias-brand-primary)}.dsh-comp-btn:disabled{opacity:.4;cursor:default}.dsh-comp-reset{margin-top:' +
            '2px;align-self:flex-start}.dsh-price-row{display:flex;align-items:center;gap:6px}.dsh-price-model{flex:1;min-w' +
            'idth:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.dsh-price-input{width:60px;font-size:12px;pa' +
            'dding:2px 4px;border-radius:4px;border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-interac' +
            'tive-bg-hover);color:var(--dsw-alias-label-primary)}.dsh-price-add{display:flex;gap:6px;margin-top:8px}.dsh-pr' +
            'ices{display:flex;flex-direction:column;gap:6px}.dsh-price-label{font-size:12px;line-height:18px;color:var(--d' +
            'sw-alias-label-tertiary)}.dsh-price-head{display:flex;align-items:center;gap:6px;font-size:12px;line-height:18' +
            'px;color:var(--dsw-alias-label-tertiary)}')
        insertCss('.dsh-comp-select{appearance:auto;-webkit-appearance:auto;font-size:12px;padding:2px 4px;border-radius:4px;background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}')
        insertCss('.dsh-seg{cursor:pointer;border-radius:3px;padding:0 2px;margin:0 -2px;transition:background .12s,color .12s}.dsh-seg:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}.dsh-detail{position:fixed;z-index:101;min-width:190px;max-width:min(430px,82vw);max-height:45vh;overflow:auto;padding:8px 12px;border-radius:10px;background:var(--dsw-alias-tooltip-bg);color:var(--dsw-static-neutral-bluish-00);font-size:12px;line-height:18px;white-space:nowrap;box-shadow:0 4px 16px rgba(0,0,0,.25);animation:dsh-tip-in .15s var(--ds-ease-in-out);scrollbar-width:thin;scrollbar-color:rgba(255,255,255,.35) transparent}.dsh-detail::-webkit-scrollbar{width:5px;height:5px}.dsh-detail::-webkit-scrollbar-thumb{background:rgba(255,255,255,.35);border-radius:3px}.dsh-detail::-webkit-scrollbar-track{background:transparent}.dsh-detail[data-side=top]{transform:translate(-50%,-100%)}.dsh-detail[data-side=bottom]{transform:translate(-50%)}.dsh-detail-title{font-weight:600;margin-bottom:4px}.dsh-detail-row{display:flex;justify-content:space-between;gap:18px}.dsh-detail-row+.dsh-detail-row{margin-top:2px}.dsh-detail-sep{border-top:1px solid rgba(255,255,255,.18);margin:6px 0}.dsh-detail-total{font-weight:600}.dsh-detail-model{font-weight:600;margin-top:6px}.dsh-detail-empty{opacity:.75;margin-top:2px}')
        insertCss('.dsh-comp-list{position:relative;display:flex;flex-direction:column;gap:6px}.dsh-drop-ind{position:absolute;left:8px;right:8px;height:2px;border-radius:1px;background:var(--dsw-alias-brand-primary);pointer-events:none;transition:top .12s ease;box-shadow:0 0 6px var(--dsw-alias-brand-primary)}')
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
          let steps = 0, llmMs = 0, toolMs = 0, ttftMs = 0, ttftSteps = 0, decodeMs = 0, decodeTokens = 0
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
            if (reading.ttftMs !== null) { ttftMs += reading.ttftMs; ttftSteps += 1 }
            if (reading.decodeMs !== null && reading.outputTokens !== null) { decodeMs += reading.decodeMs; decodeTokens += reading.outputTokens }
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
        const billedInputTokens = (usage) => (usage ? usage.uncachedInputTokens : 0) + (usage ? usage.cacheReadTokens : 0) + (usage ? usage.cacheWriteTokens : 0)
        const cacheHitPercent = (usage) => {
          const denominator = billedInputTokens(usage)
          return denominator === 0 ? null : Math.round(usage.cacheReadTokens / denominator * 100)
        }
        const compactMoney = (v, currency, precision) => {
          const prefix = currency === 'CNY' ? '¥' : '$'
          if (precision === 'full') return prefix + (v === 0 ? '0.0000' : v.toFixed(4))
          if (v === 0) return prefix + '0'
          if (v >= 1) return prefix + v.toFixed(2)
          if (v >= 0.01) return prefix + v.toFixed(2)
          return prefix + v.toFixed(3)
        }
        const costGroup = (estimate, precision, live) => {
          if (typeof estimate !== 'object' || estimate === null) return null
          if (!estimate.hasUsage) return null
          if (!Array.isArray(estimate.priced) || !Array.isArray(estimate.unpriced)) return null
          if (estimate.priced.length === 0) return estimate.unpriced.length > 0 ? '预估 — · 无官方价' : null
          const parts = []
          const totals = Object.assign({}, typeof estimate.totals === 'object' && estimate.totals !== null ? estimate.totals : {})
          if (live !== null && live !== undefined) totals[live.currency] = (totals[live.currency] || 0) + live.delta
          for (const key of Object.keys(totals)) parts.push(compactMoney(totals[key], key, precision))
          let text = '预估 ' + (parts.length > 0 ? parts.join(' + ') : '—')
          if (estimate.unpriced.length > 0) text += ' (+' + estimate.unpriced.length + ' 无价)'
          return text
        }
        const SEGMENT_IDS = ['counts', 'llm', 'toolCall', 'ttft', 'throughput', 'cacheHit', 'tokens', 'cost']
        const SEGMENT_LABELS = {
          counts: '轮/步', llm: 'LLM 时长', toolCall: '工具调用时长', ttft: '首 token 平均',
          throughput: '吞吐 tok/s', cacheHit: '缓存命中', tokens: '输入/输出 token', cost: '预估费用',
        }
        const PREVIEW_TEXTS = {
          counts: '12 轮 · 45 步', llm: 'LLM 2m10s', toolCall: '工具调用时长 45s', ttft: '首 token 平均 1.8s', throughput: '34.2 tok/s',
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
        // 修订 26：错误边界——渲染崩溃时显示空占位而非 abdicate 回退官方 StatsLine
        class DockBoundary extends React.Component {
          constructor(props) {
            super(props)
            this.state = { failed: false }
          }
          static getDerivedStateFromError() {
            return { failed: true }
          }
          componentDidCatch(error) {
            console.error('dsh-bottom-bar: dock render crashed, keeping placeholder', error)
          }
          render() {
            if (this.state.failed === true) return React.createElement('div', { className: 'dsh-stats-root dsh-stats-empty' })
            return this.props.children
          }
        }
        // ── 底栏（dock stats cell） ──
        ctx.slots.inject('conversation.composer.dock', () => ctx.slots.register(
          // 修订 37：priority -1 shadow 官方 StatsLine（官方同 id 'stats' 默认
          // priority 0；list 槽位同 id 多 entry 时最低 priority 胜出渲染）
          { name: 'conversation.composer.dock', id: 'stats', order: 0, priority: -1 },
          (props) => {
            const settledNodes = props.useSession((s) => (s !== null && s !== undefined && s.chat !== undefined && s.chat !== null && s.chat.legacy !== undefined && s.chat.legacy !== null && Array.isArray(s.chat.legacy.nodes)) ? s.chat.legacy.nodes : [])
            const usage = props.useProjection('tokenUsage')
            const projected = props.useProjection('sessionStats')
            const [estimate, setEstimate] = React.useState(null)
            // 修订 26：首帧就用已加载的配置（重挂时不再先渲染默认值）
            const [composition, setComposition] = React.useState(Array.isArray(compositionValue) ? compositionValue : null)
            const [mode, setMode] = React.useState('separate')
            const [tooltipAlways, setTooltipAlways] = React.useState(false)
            const [precision, setPrecision] = React.useState('compact')
            const [detailSeg, setDetailSeg] = React.useState(null)
            const [panelPos, setPanelPos] = React.useState(null)
            const [panelPlacement, setPanelPlacement] = React.useState('top')
            const panelRef = React.useRef(null)
            const segClickTimerRef = React.useRef(null)
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
                    runEstimate()
                    timer = ctx.timeout(tick, 1500)
                  })
              }
              tick()
              return () => { alive = false; if (timer !== null) timer() }
            }, [])
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
              if (typeof sid !== 'string') return
              estimateBusyRef.current = true
              const folded = usageRef.current
              let promise
              // 修订 32：把客户端投影总量随请求捎带给 host（浏览器侧全量折叠是
              // 唯一权威源——服务端投影单元只有部分数据，实测 43M vs 253M）
              const cur = usageRef.current
              const usageArgs = (cur !== null && cur !== undefined && typeof cur === 'object')
                ? {
                    uncachedInputTokens: typeof cur.uncachedInputTokens === 'number' ? cur.uncachedInputTokens : null,
                    outputTokens: typeof cur.outputTokens === 'number' ? cur.outputTokens : null,
                    cacheReadTokens: typeof cur.cacheReadTokens === 'number' ? cur.cacheReadTokens : null,
                    cacheWriteTokens: typeof cur.cacheWriteTokens === 'number' ? cur.cacheWriteTokens : null,
                  }
                : null
              try {
                promise = remote.estimateCost({ sessionId: sid, usage: usageArgs })
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
                setEstimate(null)
                setDetailSeg(null)
                setPanelPos(null)
                runEstimate()
              }
            }, [props.sessionId, usage])
            const stats = React.useMemo(() => projected ?? deriveStats(settledNodes), [projected, settledNodes])
            const usageActive = usage !== null && usage !== undefined && (billedInputTokens(usage) > 0 || usage.outputTokens > 0)
            const cacheHitPct = usageActive ? cacheHitPercent(usage) : null
            // 修订 33：删除 liveDelta——修订 30-32 对账已把账本拉平到客户端全量，
            // 再按「usage 全量 − lastSample 单步」加增量会把全量重复计入（底栏 ≈ 2× 明细）；
            // 底栏费用 = 明细面板 = 账本（对账后即全量），单一数据源。
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
                input: formatTokens(separate ? (usage.uncachedInputTokens || 0) + (usage.cacheWriteTokens || 0) : billedInputTokens(usage)),
                output: formatTokens(usage.outputTokens || 0),
              }) : null,
              cost: () => {
                if (estimate === null) return usageActive ? '计算中…' : null
                return costGroup(estimate, precision, null)
              },
            }
            // ⚠️ 修订 25：三函数必须在 children 构造之前定义（const TDZ）
            const cancelSegClick = () => {
              if (segClickTimerRef.current !== null) { segClickTimerRef.current(); segClickTimerRef.current = null }
            }
            const onSegClick = (segId, el) => {
              if (typeof window !== 'undefined' && typeof window.getSelection === 'function') {
                const sel = window.getSelection()
                if (sel !== null && sel.toString().length > 0) return
              }
              cancelSegClick()
              segClickTimerRef.current = ctx.timeout(() => {
                segClickTimerRef.current = null
                toggleDetail(segId, el)
              }, 220)
            }
            const toggleDetail = (segId, el) => {
              if (timerRef.current !== null) { timerRef.current(); timerRef.current = null }
              setPos(null)
              if (detailSeg === segId) { setDetailSeg(null); setPanelPos(null); return }
              const r = el.getBoundingClientRect()
              setPanelPlacement('top')
              setDetailSeg(segId)
              setPanelPos({ x: r.left + r.width / 2, top: r.top, bottom: r.bottom })
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
              if (i > 0) { children.push(React.createElement('span', { className: 'dsh-stats-sep', 'aria-hidden': true, key: 'sep' + i }, '|')); children.push(' ') }
              children.push(React.createElement('span', {
                className: 'dsh-seg', key: group.id, title: '点击查看明细',
                onClick: (e) => onSegClick(group.id, e.currentTarget),
                onDoubleClick: cancelSegClick,
              }, group.text))
            })
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
              if (timerRef.current !== null) { timerRef.current(); timerRef.current = null }
              timerRef.current = ctx.timeout(() => { timerRef.current = null; show() }, 500)
            }
            const hide = () => {
              if (timerRef.current !== null) { timerRef.current(); timerRef.current = null }
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
              if (segClickTimerRef.current !== null) segClickTimerRef.current()
            }, [])
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
                    const unitText = b.unit === null || b.unit === undefined ? '按输入价' : compactMoney(b.unit, p.currency, 'compact') + '/1M'
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
            // 修订 16：永不返回 null（槽位看到 null 会回退官方 StatsLine）
            return React.createElement(DockBoundary, null,
              React.createElement(React.Fragment, null,
                React.createElement('div', {
                  className: 'dsh-stats-root' + (lineGroups.length === 0 ? ' dsh-stats-empty' : ''),
                  ref: rootRef, onMouseEnter: showAfterDelay, onMouseLeave: hide,
                }, children),
                pos !== null && React.createElement('span', {
                  ref: bubbleRef, className: 'dsh-tip', 'data-side': placement,
                  style: { left: pos.x, top: placement === 'top' ? pos.top - 8 : pos.bottom + 8 },
                }, line),
                detailSeg !== null && panelPos !== null && React.createElement('div', {
                  ref: panelRef, className: 'dsh-detail', 'data-side': panelPlacement,
                  style: { left: panelPos.x, top: panelPlacement === 'top' ? panelPos.top - 8 : panelPos.bottom + 8 },
                },
                  React.createElement('div', { className: 'dsh-detail-title' }, (SEGMENT_LABELS[detailSeg] || detailSeg) + ' 明细'),
                  detailNodes === null ? React.createElement('div', { className: 'dsh-detail-empty' }, '（暂无数据）') : detailNodes,
                ),
              ),
            )
          },
        ))
        // ── 设置页（设置 → 底栏） ──
        ctx.slots.inject('settings.section', () => ctx.slots.register(
          { name: 'settings.section', id: 'cost-estimate', order: 25, label: '底栏' },
          () => {
            const [segments, setSegments] = React.useState(Array.isArray(compositionValue) ? compositionValue : null)
            const [loaded, setLoaded] = React.useState(Array.isArray(compositionValue))
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
            const [diag, setDiag] = React.useState(null)
            // 修订 34：客户端全量用量面板（浏览器侧全量折叠 = 唯一权威源）
            const [fullUsage, setFullUsage] = React.useState(null)
            React.useEffect(() => {
              let cancelled = false
              remote.getConfig()
                .then((result) => {
                  if (cancelled) return
                  if (Array.isArray(result.segments)) { setSegments(result.segments); setCompositionState(result.segments) }
                  if (result.mode === 'separate' || result.mode === 'combined') { setMode(result.mode); optionsRef.current.mode = result.mode }
                  if (typeof result.tooltip === 'string') { setTooltipAlways(result.tooltip === 'always'); optionsRef.current.tooltip = result.tooltip }
                  if (result.precision === 'compact' || result.precision === 'full') { setPrecision(result.precision); optionsRef.current.precision = result.precision }
                  setLoaded(true)
                })
                .catch(() => {})
              remote.getPrices().then((result) => { if (!cancelled && result.prices) setPrices(result.prices) }).catch(() => {})
              remote.diagnostics().then((result) => { if (!cancelled) setDiag(result) }).catch(() => {})
              remote.getClientUsage().then((result) => { if (!cancelled && result.usage) setFullUsage(result.usage) }).catch(() => {})
              return () => { cancelled = true }
            }, [])
            // 修订 34：客户端全量面板每 3s 刷新（host 侧缓存底栏捎带的用量）
            React.useEffect(() => {
              let alive = true
              const timer = ctx.interval(() => {
                remote.getClientUsage().then((result) => { if (alive && result.usage) setFullUsage(result.usage) }).catch(() => {})
              }, 3000)
              return () => { alive = false; timer() }
            }, [])
            React.useEffect(() => {
              if (loaded) return
              const timer = ctx.timeout(() => setLoaded(true), 3000)
              return () => timer()
            }, [loaded])
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
                if (delta !== 0) { moved = true; el.style.transition = 'none'; el.style.transform = 'translateY(' + delta + 'px)' }
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
              remote.setConfig({ segments: segs ?? segmentsRef.current, ...nextOptions })
                .then((result) => {
                  if (Array.isArray(result.segments)) { setSegments(result.segments); setCompositionState(result.segments) }
                  if (result.mode === 'separate' || result.mode === 'combined') { setMode(result.mode); optionsRef.current.mode = result.mode }
                  if (typeof result.tooltip === 'string') { setTooltipAlways(result.tooltip === 'always'); optionsRef.current.tooltip = result.tooltip }
                  if (result.precision === 'compact' || result.precision === 'full') { setPrecision(result.precision); optionsRef.current.precision = result.precision }
                })
                .catch((err) => console.error('dsh-bottom-bar: setConfig failed', err))
            }
            const apply = (next) => { setSegments(next); setCompositionState(next); saveOptions(optionsRef.current, next) }
            const dropAt = (to) => {
              const from = dragFromRef.current
              const current = segmentsRef.current
              if (from === null || !Array.isArray(current)) return
              if (to === null || to === from || to === from + 1) return
              flipTops.current = rowRefs.current.map((el) => el === null || el === undefined ? 0 : el.getBoundingClientRect().top)
              const next = current.slice()
              const item = next.splice(from, 1)[0]
              next.splice(to > from ? to - 1 : to, 0, item)
              segmentsRef.current = next
              setSegments(next)
              setCompositionState(next)
            }
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
              const tmp = next[index]; next[index] = next[j]; next[j] = tmp
              apply(next)
            }
            const setEnabled = (index, enabled) => {
              if (!Array.isArray(segments)) return
              const next = segments.slice()
              next[index] = { id: next[index].id, enabled }
              apply(next)
            }
            const toggleMode = () => { if (!Array.isArray(segments)) return; saveOptions({ ...optionsRef.current, mode: mode === 'separate' ? 'combined' : 'separate' }) }
            const toggleTooltip = () => { if (!Array.isArray(segments)) return; saveOptions({ ...optionsRef.current, tooltip: tooltipAlways ? 'auto' : 'always' }) }
            const togglePrecision = () => { if (!Array.isArray(segments)) return; saveOptions({ ...optionsRef.current, precision: precision === 'full' ? 'compact' : 'full' }) }
            const reset = () => {
              if (!Array.isArray(segments)) return
              remote.resetConfig().then((result) => {
                if (Array.isArray(result.segments)) { setSegments(result.segments); setCompositionState(result.segments) }
                if (result.mode === 'separate' || result.mode === 'combined') { setMode(result.mode); optionsRef.current.mode = result.mode }
                if (typeof result.tooltip === 'string') { setTooltipAlways(result.tooltip === 'always'); optionsRef.current.tooltip = result.tooltip }
                if (result.precision === 'compact' || result.precision === 'full') { setPrecision(result.precision); optionsRef.current.precision = result.precision }
              }).catch(() => {})
            }
            const updatePrice = (model, patch) => {
              if (!Array.isArray(prices)) return
              const cur = prices.find((p) => p.model === model)
              const next = { model, currency: cur ? cur.currency : 'USD', in: cur ? cur.in : 0, cacheRead: cur ? cur.cacheRead : undefined, cacheWrite: cur ? cur.cacheWrite : undefined, out: cur ? cur.out : 0, builtin: cur ? cur.builtin : false, ...patch }
              setPrices(prices.map((p) => p.model === model ? next : p))
              remote.setPrice({ model, price: { currency: next.currency, in: next.in, cacheRead: next.cacheRead === undefined ? null : next.cacheRead, cacheWrite: next.cacheWrite === undefined ? null : next.cacheWrite, out: next.out } })
                .then((result) => { if (result.prices) setPrices(result.prices) })
                .catch((err) => console.error('dsh-bottom-bar: setPrice failed', err))
            }
            const removePrice = (model) => {
              remote.removePrice({ model }).then((result) => { if (result.prices) setPrices(result.prices) }).catch((err) => console.error('dsh-bottom-bar: removePrice failed', err))
            }
            const addPrice = () => {
              const id = newModel.trim()
              if (id === '') return
              const input = Number(newIn)
              const inPrice = Number.isFinite(input) && input >= 0 ? input : 0
              setNewModel('')
              setNewIn('')
              remote.setPrice({ model: id, price: { currency: 'USD', in: inPrice, cacheRead: Math.round(inPrice * 0.1 * 1000) / 1000, cacheWrite: Math.round(inPrice * 1.25 * 1000) / 1000, out: Math.round(inPrice * 5 * 1000) / 1000 } })
                .then((result) => { if (result.prices) setPrices(result.prices) })
                .catch((err) => console.error('dsh-bottom-bar: addPrice failed', err))
            }
            const resetPrices = () => {
              remote.resetPrices().then((result) => { if (result.prices) setPrices(result.prices) }).catch((err) => console.error('dsh-bottom-bar: resetPrices failed', err))
            }
            const num = (v) => { const n = Number(v); return Number.isFinite(n) ? n : 0 }
            const numOrUndef = (v) => {
              if (v === '' || v === undefined || v === null) return undefined
              const n = Number(v)
              return Number.isFinite(n) ? n : undefined
            }
            // 修订 34/35：客户端全量面板行样式（内联，紧凑两列）
            const fullRow = { display: 'flex', justifyContent: 'space-between', gap: 16 }
            const fallbackSegments = loaded ? DEFAULT_COMPOSITION : null
            const effectiveSegments = Array.isArray(segments) ? segments : fallbackSegments
            if (effectiveSegments === null) {
              return React.createElement('div', { className: 'dsh-comp-page' },
                React.createElement('div', { className: 'dsh-comp-loading' },
                  React.createElement('div', { className: 'dsh-comp-loading-bar' }),
                  React.createElement('div', { className: 'dsh-comp-loading-bar' }),
                  React.createElement('div', { className: 'dsh-comp-loading-bar' }),
                ),
                React.createElement('div', { className: 'dsh-comp-desc' }, '正在加载底栏配置…'),
              )
            }
            const offline = !Array.isArray(segments)
            const previewSegs = []
            for (const seg of effectiveSegments) {
              if (seg.enabled !== true) continue
              const sampleDef = PREVIEW_TEXTS[seg.id]
              if (sampleDef === undefined) continue
              const sample = typeof sampleDef === 'string' ? sampleDef : sampleDef[mode]
              previewSegs.push({ id: seg.id, text: sample })
            }
            const previewChildren = []
            previewSegs.forEach((item, i) => {
              if (i > 0) { previewChildren.push(React.createElement('span', { className: 'dsh-stats-sep', 'aria-hidden': true, key: 'ps' + i }, '|')); previewChildren.push(' ') }
              previewChildren.push(React.createElement('span', { className: 'dsh-preview-seg' + (hovered === item.id ? ' dsh-preview-hl' : ''), key: item.id }, item.text))
            })
            const priceRows = Array.isArray(prices) ? prices.map((p) => React.createElement('div', { className: 'dsh-price-row', key: p.model },
              React.createElement('span', { className: 'dsh-price-model', title: p.model }, p.model),
              React.createElement('select', { className: 'dsh-comp-select', value: p.currency, onChange: (e) => updatePrice(p.model, { currency: e.target.value }) }, ['USD', 'CNY'].map((c) => React.createElement('option', { value: c, key: c }, c))),
              React.createElement('input', { className: 'dsh-price-input', type: 'number', step: '0.01', value: p.in, title: '输入', onChange: (e) => updatePrice(p.model, { in: num(e.target.value) }) }),
              React.createElement('input', { className: 'dsh-price-input', type: 'number', step: '0.01', value: (p.cacheRead === undefined || p.cacheRead === null) ? '' : p.cacheRead, title: '缓存读（留空=无此桶）', onChange: (e) => updatePrice(p.model, { cacheRead: numOrUndef(e.target.value) }) }),
              React.createElement('input', { className: 'dsh-price-input', type: 'number', step: '0.01', value: (p.cacheWrite === undefined || p.cacheWrite === null) ? '' : p.cacheWrite, title: '缓存写（留空=无此桶）', onChange: (e) => updatePrice(p.model, { cacheWrite: numOrUndef(e.target.value) }) }),
              React.createElement('input', { className: 'dsh-price-input', type: 'number', step: '0.01', value: p.out, title: '输出', onChange: (e) => updatePrice(p.model, { out: num(e.target.value) }) }),
              React.createElement('button', { className: 'dsh-comp-btn', title: p.builtin ? '恢复默认' : '删除该模型', onClick: () => removePrice(p.model) }, p.builtin ? '↺' : '×'),
            )) : []
            const rows = effectiveSegments.map((seg, index) => React.createElement(
              'div',
              {
                className: 'dsh-comp-row' + (seg.enabled === true ? ' dsh-on' : ' dsh-off') + (dragFrom === index ? ' dsh-dragging' : ''),
                key: seg.id,
                ref: (el) => { rowRefs.current[index] = el },
                draggable: true,
                onMouseEnter: () => setHovered(seg.id),
                onMouseLeave: () => setHovered(null),
                onDragStart: (e) => { setDragFrom(index); dragFromRef.current = index; e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.dropEffect = 'move' },
              },
              React.createElement('span', { className: 'dsh-comp-grip' }, '⠿'),
              React.createElement('span', { className: 'dsh-comp-label' }, SEGMENT_LABELS[seg.id] || seg.id),
              React.createElement('label', { className: 'dsh-switch' },
                React.createElement('input', { type: 'checkbox', checked: seg.enabled === true, disabled: offline, onChange: () => setEnabled(index, !(seg.enabled === true)) }),
                React.createElement('span', { className: 'dsh-switch-track' }),
                React.createElement('span', { className: 'dsh-switch-knob' }),
              ),
              React.createElement('button', { className: 'dsh-comp-btn', onClick: () => move(index, -1), disabled: offline || index === 0 }, '↑'),
              React.createElement('button', { className: 'dsh-comp-btn', onClick: () => move(index, 1), disabled: offline || index === effectiveSegments.length - 1 }, '↓'),
            ))
            return React.createElement('div', { className: 'dsh-comp-page', onDragOver: (e) => e.preventDefault() },
              offline && React.createElement('div', { className: 'dsh-comp-warn' }, '配置服务未响应——当前为离线预览（默认配置），改动暂不可用；服务恢复后自动同步。'),
              React.createElement('p', { className: 'dsh-comp-desc' }, '配置输入框下方的底栏统计行。开关组：显示/隐藏、输入缓存口径、黑条行为、费用精度；价格表在页面底部（折叠）。拖拽行排序（拖动时显示放置指示线）；悬停字段在预览中高亮；底栏点击分段查看明细。配置保存在 settings 文档旁的 JSON 中。'),
              React.createElement('div', { className: 'dsh-comp-row dsh-on' },
                React.createElement('span', { className: 'dsh-comp-label' }, '输入/缓存分离'),
                React.createElement('label', { className: 'dsh-switch' },
                  React.createElement('input', { type: 'checkbox', checked: mode === 'separate', disabled: offline, onChange: toggleMode }),
                  React.createElement('span', { className: 'dsh-switch-track' }),
                  React.createElement('span', { className: 'dsh-switch-knob' }),
                ),
              ),
              React.createElement('div', { className: 'dsh-comp-row' + (tooltipAlways ? ' dsh-on' : ' dsh-off') },
                React.createElement('span', { className: 'dsh-comp-label' }, '悬停黑条始终显示完整行'),
                React.createElement('label', { className: 'dsh-switch' },
                  React.createElement('input', { type: 'checkbox', checked: tooltipAlways, disabled: offline, onChange: toggleTooltip }),
                  React.createElement('span', { className: 'dsh-switch-track' }),
                  React.createElement('span', { className: 'dsh-switch-knob' }),
                ),
              ),
              React.createElement('div', { className: 'dsh-comp-row' + (precision === 'full' ? ' dsh-on' : ' dsh-off') },
                React.createElement('span', { className: 'dsh-comp-label' }, '费用完整精度（4 位小数）'),
                React.createElement('label', { className: 'dsh-switch' },
                  React.createElement('input', { type: 'checkbox', checked: precision === 'full', disabled: offline, onChange: togglePrecision }),
                  React.createElement('span', { className: 'dsh-switch-track' }),
                  React.createElement('span', { className: 'dsh-switch-knob' }),
                ),
              ),
              React.createElement('div', { className: 'dsh-preview' },
                React.createElement('span', { className: 'dsh-preview-label' }, '效果预览（示例数值）'),
                previewSegs.length === 0
                  ? React.createElement('span', { className: 'dsh-preview-line' }, '（全部隐藏）')
                  : React.createElement('span', { className: 'dsh-preview-line' }, previewChildren),
                previewSegs.length === 0 ? null : React.createElement('span', { className: 'dsh-preview-bubble' }, previewChildren),
              ),
              React.createElement('div', { className: 'dsh-comp-list', ref: listRef,
                onDragOver: (e) => {
                  e.preventDefault()
                  e.dataTransfer.dropEffect = 'move'
                  if (dragFromRef.current === null) return
                  const index = computeDropIndex(e)
                  if (index !== dropIndexRef.current) { dropIndexRef.current = index; setDropIndex(index) }
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
                onDrop: (e) => { e.preventDefault(); e.stopPropagation(); dropAt(computeDropIndex(e)); finalize() },
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
              React.createElement('button', { className: 'dsh-comp-btn dsh-comp-reset', onClick: reset, disabled: offline }, '恢复默认（段/模式/黑条/精度）'),
              React.createElement('button', { className: 'dsh-comp-btn dsh-comp-reset', onClick: () => setPricesOpen(!pricesOpen) }, pricesOpen ? '▲ 收起价格表' : '▼ 展开价格表'),
              pricesOpen && React.createElement('div', { className: 'dsh-prices' },
                React.createElement('span', { className: 'dsh-price-label' }, '价格表（每 1M tokens；内置仅 DeepSeek 系列，其他按需添加——新增时填输入价，输出/缓存读/缓存写按 5×/0.1×/1.25× 自动派生，可再改；缓存桶留空=该模型无此桶）'),
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
                  React.createElement('input', { type: 'text', placeholder: '模型 id，如 gpt-4o', value: newModel, onChange: (e) => setNewModel(e.target.value) }),
                  React.createElement('input', { type: 'number', step: '0.01', placeholder: '输入价（USD）', value: newIn, onChange: (e) => setNewIn(e.target.value) }),
                  React.createElement('button', { className: 'dsh-comp-btn', onClick: addPrice }, '添加'),
                  React.createElement('button', { className: 'dsh-comp-btn', onClick: resetPrices }, '恢复默认价格'),
                ),
              ),
              // 修订 34/35：客户端全量用量面板（浏览器侧全量折叠 = 唯一权威源，
              // host 缓存底栏每 1.5s 捎带的 usage，本面板每 3s 刷新；内联紧凑样式）
              React.createElement('div', { className: 'dsh-fullusage', style: { display: 'flex', flexDirection: 'column', padding: '6px 8px', borderRadius: 6, background: 'var(--dsw-alias-interactive-bg-hover)', fontSize: 12, lineHeight: 16, color: 'var(--dsw-alias-label-secondary)' } },
                React.createElement('span', { style: { fontWeight: 600 } },
                  '客户端全量（权威源）' + (fullUsage === null ? ' — 等待底栏轮询…' : ' · ' + fullUsage.model),
                ),
                fullUsage !== null && React.createElement(React.Fragment, null,
                  React.createElement('div', { style: fullRow },
                    React.createElement('span', null, '未缓存输入 ' + formatTokens(fullUsage.uncachedInput) + ' tok'),
                    React.createElement('span', null, '缓存读 ' + formatTokens(fullUsage.cacheRead) + ' tok'),
                  ),
                  React.createElement('div', { style: fullRow },
                    React.createElement('span', null, '缓存写 ' + formatTokens(fullUsage.cacheWrite) + ' tok'),
                    React.createElement('span', null, '输出 ' + formatTokens(fullUsage.output) + ' tok'),
                  ),
                  React.createElement('div', { style: fullRow },
                    React.createElement('span', null, '缓存命中率'),
                    React.createElement('span', null, (() => { const d = fullUsage.uncachedInput + fullUsage.cacheRead + fullUsage.cacheWrite; return d === 0 ? '—' : Math.round(fullUsage.cacheRead / d * 100) + '%' })()),
                  ),
                  fullUsage.total !== null && fullUsage.total !== undefined && React.createElement(React.Fragment, null,
                    React.createElement('div', { style: { borderTop: '1px solid rgba(255,255,255,.18)', margin: '2px 0' } }),
                    React.createElement('div', { style: fullRow },
                      React.createElement('span', null, '输入 ' + compactMoney(fullUsage.inCost, fullUsage.currency, 'full')),
                      React.createElement('span', null, '缓存读 ' + compactMoney(fullUsage.cacheReadCost, fullUsage.currency, 'full')),
                    ),
                    React.createElement('div', { style: fullRow },
                      React.createElement('span', null, '缓存写 ' + compactMoney(fullUsage.cacheWriteCost, fullUsage.currency, 'full')),
                      React.createElement('span', null, '输出 ' + compactMoney(fullUsage.outCost, fullUsage.currency, 'full')),
                    ),
                    React.createElement('div', { style: Object.assign({}, fullRow, { fontWeight: 600 }) },
                      React.createElement('span', null, '总计'),
                      React.createElement('span', null, compactMoney(fullUsage.total, fullUsage.currency, 'full')),
                    ),
                  ),
                ),
              ),
              React.createElement('div', { className: 'dsh-comp-desc', style: { whiteSpace: 'pre-wrap', wordBreak: 'break-all', marginTop: 8 } },
                '诊断: ' + (diag === null ? '（加载中…）' : JSON.stringify(diag)),
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
