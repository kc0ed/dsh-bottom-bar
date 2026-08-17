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
// 修订 24（client）：双击/拖选底栏分段文字不再误弹明细面板——单击延迟 160ms
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
// 修订 39（client）：弹层/气泡兼容浅色主题——dsh-detail/dsh-tip/dsh-preview-bubble
// 原样复刻官方的「tooltip-bg 底 + static-neutral-bluish-00 白字」契约，但 tooltip-bg
// 随主题可变成浅色 → 白字白底不可见。文字改主题自适应 label-primary、分隔线改
// border-l2、滚动条改 label-tertiary；品牌色底白字的预览高亮与开关滑块保持不动。
// 修订 40（client）：tooltip-bg 是 legacy 别名（不在官方注册 token 表，主题下行为
// 不可靠：浅色纯白/深色纯黑），弹层/气泡背景改官方注册的 popover token
// `--dsw-alias-bg-overlay`（Theme 注册表 requiresLightAndDark，明暗两套值保证），
// 文字 label-primary 不变——浅色=浅底深字、深色=深底浅字，彻底跟随主题。
// 修订 41（client）：出现速度优化（用户反馈"出现得慢"）——单击确认 220→160ms
// （仍拦快速双击）、悬停黑条 500→260ms、淡入动画 .15s→.1s、数据轮询 1.5s→1s
// （费用数字更新更快；host 端 O(1) 增量 + 5s 折叠缓存，无压力）。
// 修订 42（client）：设置页「客户端全量」面板出现慢——它自己不产数据，只读底栏
// 1s 心跳捎带给 host 的缓存，而面板自己 3s 才问一次 → 最坏等 4s。轮询 3s→1s
// 与心跳同频，打开设置 ≤1s 出数。
// 修订 43（client）：弹层配色回到官方契约（推翻 39/40 的错误方向）——直接查了
// 实际运行的 dsh-claude-theme/lib/theme.css：tooltip-bg 明暗两模式都是实心深色
// （浅 #26221B / 深 #2E2D28），官方 Tooltip 的「tooltip-bg 底 + static-neutral-
// bluish-00 白字」契约在它下面完全自洽；而 bg-overlay 只是 8% alpha 遮罩层
// （浅 rgba(44,39,32,.08) / 深 rgba(255,255,255,.08)），当弹层背景就是透明。
// 修订 39 把文字改 label-primary（浅色模式是深字）→ 深底深字不可读；修订 40
// 换 bg-overlay → 透明。现恢复官方配对，背景加固定深色兜底（防主题删别名）。
// 修订 44（client）：纯黑底在亮色模式突兀——tooltip-bg 主题里明暗恒深。改「实心
// 自适应表面」：背景用官方注册的 `--dsw-alias-bg-layer-2`（Claude 主题：浅
// #FCFBF9 / 深 #242421，主题自己的卡片也在用），文字 label-primary（浅深字/
// 深浅字），边框/分隔线/滚动条 border-l2，黑条加轻阴影。注意 interactive-bg-hover
// 也是 alpha 色（浅 5% / 深 6%），浮层叠在内容上会透，不能当浮层底。
// 修订 69（client）：硬编码品牌色 → 主题 token（用户：不要写死黄/橘色,跟随主题色）。
// 45-67 修订的多选条/选中徽章/拖拽光效/脉冲动画写死了 Claude 橘色（#D97757、
// rgba(193,95,60,·)、rgba(217,119,87,·)）与深色边框 #383731。查 dsh-claude-theme
// theme.css 实锤：--dsw-alias-brand-primary 浅 #C15F3C / 深 #D97757 正是写死的值，
// 且主题自己就用 color-mix() 派生透明强调色。转换脚本 scripts/tokenize-colors.cjs
// 批量替换：实心 → var(--dsw-alias-brand-primary)，半透明 → color-mix(in srgb,
// var(--dsw-alias-brand-primary) X%, transparent)，#383731 → var(--dsw-alias-border-l2)。
// 中性色（黑/白/深色药丸底）保持不动；明暗两套块值相同后冗余但无害。
// 修订 70 已按用户决定回退（修订 71）：用户先要灰色,随后改口「跟着主题色走还是
// 比较好」——预览区 hover/高亮/幽灵分段恢复 var(--dsw-alias-brand-primary) +
// color-mix 派生,--dsh-preview-accent 局部变量删除。
// 修订 72（client）：实心品牌填充在默认主题翻车——默认主题 brand-primary 是
// 中性色随模式翻转（浅 rgb(15,17,21) 近黑 / 深 rgb(249,250,251) 近白），实心
// 填充 + 白字必有一边不可读（深色模式：白底白字）。按官方选中高亮惯例改
// 「品牌色 tint + 品牌色文字」：预览高亮 16% tint、选中徽章 22%、多选条 hover
// 24%、开关选中轨道 50%（白 knob 仍可见,整条不再刺眼）。drop 指示线保持实心
// （细线+光晕,瞬态元素两种模式都可见）。
// 修订 73（client）：高亮风格 CSS 开关——默认「白天=原版实心 / 夜间=tint」（用户：
// 原来的效果挺喜欢,白天做回原来那种;夜间保持现在的 tint）。.dsh-comp-page 上定义
// --dsh-hl-fill / --dsh-hl-text / --dsh-switch-fill 三个变量,白天=实心+白字、
// 夜间=tint+品牌文字;主题/用户可覆盖成「全部 tint」或「全部实心」（见代码注释）。
// 修订 74（client）：夜间默认改回「全部实心 + bg-base 文字」——用户实测 tint
// 高亮与未高亮几乎无差别,发光开不开也一个样（夜间发光关掉、白天保留原版光晕）;
// 实心文字用 var(--dsw-alias-bg-base)（默认主题夜间=白底深字、Claude 夜间=橘底
// 深字,全部可读）,开关轨道夜间仍 50% tint（避免「太亮」复现）。
// 修订 75（client/host）：DeepSeek 峰谷定价（2026-08-17 起,北京时间高峰
// 9:00-12:00/14:00-18:00,空闲=高峰一半）——v4-flash/pro 内置价表更新为新空闲价
// + peak 高峰价组,pricing.js 按 isPeakTime 切换;配置新增 peakEnabled 开关
// （默认开）;底栏费用段/明细面板/客户端全量卡标注「高峰/空闲」。
// 修订 76（host）：峰谷限官方渠道——DSH 官方 provider 名 = 'deepseek'
// （dsh-llm-deepseek）;三方网关（opencode-go/opencode,llm-pi-ai）未确认透传
// 官方峰谷价,一律按基价。配置 peakProviders 白名单（默认 ['deepseek']）,
// 归因键 provider 不在白名单/无 provider 时不套高峰价、不显示时段标注。
// 修订 77（host/client）：峰谷时区可配置——内部一律 UTC 基准计算（zoneMinutes）,
// 默认 'system' 跟随系统时区,可选 'UTC±N' 固定偏移;配置 peakTimezone 持久化,
// 设置页新增「峰谷时区」下拉（跟随系统 / UTC / UTC±1..12）。
// 修订 78（client）：新增「峰谷时段」底栏分段（默认启用,不适用时自动隐藏）——
// 显示 ⏱ 高峰/空闲,点击弹出详情（当前时段/高峰时段/空闲时段/时区/适用渠道）;
// host 的 peak 信息携带 tz 供显示。
// 修订 79（host/client）：计价与提醒解耦——peakEnabled=「峰谷计价」(按高峰价算,
// 官方渠道白名单生效),peakRemind=「峰谷提醒」(仅显示 ⏱/时段标注,不影响价格,
// 与渠道无关);est.peak/usage.peak 拆成 {enabled:提醒, priced:计价∧官方}:
// 峰谷分段与卡片行跟随 enabled,费用段后缀/明细面板时段行跟随 priced;
// 时区下拉并入「峰谷计价」行;配置 version 8。
// 修订 82（host/client）：峰谷分段展示价格+特效——est.peak 增加 baseIn/baseOut/
// peakIn/peakOut（取会话第一个官方渠道模型的高峰/空闲输入输出价）;分段文本
// 「⏱ 高峰 ¥3.0/1M」,详情弹层增加四行价格;高峰分段=品牌色胶囊+柔和脉冲光晕
// （prefers-reduced-motion 关动画）,空闲=次级色降噪。
// 修订 84（client）：峰谷分段两轴差异化——渠道轴:官方+计价=胶囊+脉冲强效果,
// 非官方仅参考=低调次级色（参考价仍显示）;时段轴:高峰时价格数字单独标品牌色
// 加粗（表示贵）。明细弹层改为「高峰 vs 空闲」价格对比表格,当前时段列高亮。
// 修订 85（client）：价格标注区分——分段价格标注桶类型「输入」,非官方渠道加
// 「参考」标记;明细弹层增加「实际计费」行(官方=按当前时段价/非官方=按基价),
// 表格首列改「单价(1M)」——两个价格不再让人混淆。
// 修订 86（host/client）：峰谷价格表补全三桶——输入/缓存读/输出齐全（DeepSeek
// 官方收费桶）;est.peak 增加 baseRead/peakRead,明细表格加「缓存读」行。
// 修订 87（host/client）：① 分段无价格——新会话无用量/模型时取不到参考价,兜底
// 最近模型/默认路由模型;② 胶囊背景条件改为「计费开关开 ∧ 高峰时段」(谷期
// 不加背景),非官方/未计价保持低调参考样式;est.peak 增加 billing 标志。
// 修订 88（host/client）：峰谷价按模型分组展示——est.peak.models 列出所有带
// peak 价组的官方模型(flash/pro),明细表格按模型分组(每组三桶两列),模型名
// 小标题;旧单模型字段保留作回退。
// 修订 89（client）：明细改为「占一行左右切换」——◀ 模型名 ▶ 按钮一次只显示
// 一个模型的表格,点箭头循环切换(用户要求,替代堆叠分组);打开明细时索引归零。
// 修订 90（client）：◀ ▶ 按钮升级为「分段式滑槽」——PeakModelSlider 组件:
// 轨道内滑动指示条(品牌色胶囊),点击任一模型滑块平滑滑过去(useLayoutEffect
// 量取 offsetLeft/offsetWidth + left/width 过渡),单模型退化小标题。
// 修订 91（client）：底栏分段参考价跟随滑槽——builders.peak 改从
// estimate.peak.models[peakModelIdx] 取价,多模型时带短模型名(Flash/Pro),
// 与明细弹层滑槽联动,不再只显示会话代表模型。
// 修订 92（host/client）：高亮当前所在窗口——pricing.js 新增
// currentPeakRangeLabel(返回 '9:00-12:00'/'14:00-18:00'/null),est.peak 带
// activeRange;明细「高峰时段」拆成两个窗口 chips,当前所在的高亮+「· 当前」,
// 空闲时段时在空闲行标「· 当前」。
// 修订 93（client）：滑槽选择持久化——删除「打开明细时索引归零」(用户:调成
// Pro 后点底栏分段又闪回 Flash);peakModelIdx 常驻,关闭重开保持所选模型,
// 模型列表变化时 Math.min 钳制兜底。
// 修订 94（client）：表格当前时段列高亮增强——默认主题 brand-primary≈黑,
// 纯颜色加粗几乎看不出;dsh-peak-cell-hot 加品牌色 14% 背景 tint + 圆角,
// 与窗口 chips 视觉一致,当前列一眼可见。
// 修订 95（client）：峰谷表格价格列居中——第 2/3 列(高峰/空闲)文字
// text-align:center(网格 nth-child 3n+2/3n+3),桶标签列保持左对齐。
// 修订 96（client）：当前列/窗口 chips 高亮去加粗——用户:居中就行,不要加粗;
// dsh-peak-cell-hot 与 dsh-peak-range-hot 去掉 font-weight,保留背景 tint+品牌色。
// 修订 97（client）：用户改口——「不要搞什么框,之前加粗就行」:表格当前列与
// 窗口 chips 去掉背景框,恢复 font-weight(700/600)+品牌色;居中保留。
// 修订 98（client）：底栏允许换行——用户反馈一行装不下、后面内容被掐:
// .dsh-stats-root 去掉 white-space:nowrap/ellipsis/overflow:hidden 改 normal
// 换行(断点落在分段之间,行尾自然挂 '|');.dsh-seg 加 white-space:nowrap
// 保持分段原子(如「预估 ¥43.31」不会从中间断开)。悬停黑条依赖的 truncated
// 检测在换行后恒为 false,「始终显示」开关仍可用。
// 修订 99（client）：设置页价格表布局修复——① 模型名不再被右侧挤压截断:
// .dsh-price-model 去掉 nowrap/ellipsis,改 white-space:normal + word-break:
// break-all + min-width:110px,长渠道@模型 id 完整换行显示;② 整表列对齐:
// 输入框/币种/操作按钮统一 box-sizing:border-box + 固定宽度,表头标签列宽
// 与行控件一致(此前表头 60px vs 输入框实际 86px,整列错位)。
// 修订 100（client/host）：厂商比例模板按 2026 年模型重配——下拉只列 2026
// 在售主力比例(DeepSeek V4 / Claude / GPT-5.x / Gemini 3 / Kimi K3 / Qwen3.5 /
// GLM5 / MiniMax M3 / 豆包 Seed2 / Grok4),旧系列(4o/o1、deepseek-v3、qwen 经典)
// 不进下拉,auto 识别时内联 LEGACY_TPLS 兼容比例;未知厂商落「通用 1:4:0.25:1.0
// · USD」(不再抽象地变 DeepSeek V4 CNY)。pricing.js 的 derivePriceByFamily 与
// resolvePrice 兜底同步更新(openai 拆 5.x/经典、qwen 拆 3.5/经典、glm/minimax/
// doubao/grok 独立)。
// 修订 101（client/host）：价格表分组折叠——用户嫌内置几十行全摊开太吓人、
// 找自己那几行调价麻烦:buildPriceList 每行加 configured 标记;价格表分
// 「我的价格」(配置过/自定义,默认展开)与「内置默认」(默认折叠,点击
// 「内置默认价格 · N 个 ▸」展开);说明文案精简。缓存写列保留(各厂商模板
// write 值不同:deepseek-v4=0、claude/openai=1.25、其余 1.0)。
// 修订 102（client/host）：免费渠道标注「省了多少钱」——用户反馈
// opencode/deepseek-v4-flash-free 这类免费模型明细只显示 $0/1M → $0.0000,
// 没有「省」的概念:host estimateOf 对四桶全 0 的模型算 refCost(去掉该模型
// 用户配置后按官方/内置价解析的参考费用);明细弹层在模型小计上方显示
// 绿色徽章「🎉 免费渠道 · 按官方价本应 $X · 已省 $X」。
// 修订 103（client/host）：渠道维度 + 价格来源标注——① 设置页「我的价格」
// 分「渠道特选(键含 /,只覆盖该渠道)」与「全局默认(纯模型名,所有渠道通用)」
// 两组;② 账本汇总「用过的模型」(sessions[*].models 键,按 token 降序),
// 未配置的显示在价格表并带「按官方价配置」一键按钮(setPrice 空对象 =
// 按 refPriceOf 官方参考价填充,host 新增 blank 分支);③ 明细弹层每个模型
// 显示价格来源徽章:按官方价估算(灰)/ 你的全局价(次级色)/ 渠道特选价(品牌色),
// 免费模型沿用绿色徽章。host 新增 priceSourceOf/usedModelsOf。
// 修订 104（client）：明细弹层「未配置价格」闭环——unpriced 模型提示
// 「未配置价格 · N tok」+「按官方价一键配置」按钮(复用 setPrice 空对象
// 语义),底栏 → 明细 → 一键配置,最短路径。
// 修订 105（client）：厂商比例区重构——用户吐槽两个框又丑又看不懂:
// ① 厂商下拉从主流程拿掉,输入模型 id 自动识别(预览徽章「💡 自动识别:
// 厂商+比例」);② 「⚙ 厂商比例」收进徽章行,点开才展开下拉(选项短名
// emoji+厂商,不再一长串比例文本)/手动填写桶输入。
// 修订 107（client/host）：免费省多少进综合统计/分享卡——summaryAll 每免费渠道记 refCost + savedTotals 累加;卡片免费行「免费 · 省 」、底部「按官方价已省 」;导出卡免费统计带省下金额。
// 修订 108（client/host）：峰谷适用渠道扩大 + 可配置——opencode 官方也实施
// 同时段峰谷(UTC 01-04/06-10 = 北京 9-12/14-18,价=官方 USD 折算):默认白名单
// 扩为 ['deepseek','opencode','opencode-go'];设置页峰谷计价行下加「峰谷适用
// 渠道(逗号分隔)」输入框(失焦保存,轮询/saveOptions/reset 三处同步)。
// 修订 109（host/client）：DeepSeek V4 正式版上调后新计费(2026-08-17 北京
// 00:00 起)——flash/pro 全面上调并执行峰谷:基价=闲时=高峰一半。按用户确认
// 的 opencode 渠道 USD 表更新 DEFAULT_PRICES(flash 0.22/0.66/0.007,高峰
// 0.44/1.32/0.014;pro 0.66/1.98/0.022,高峰 1.32/3.96/0.044,缓存写 0),
// 币种 CNY→USD;厂商模板 deepseek-v4/derivePriceByFamily/resolvePrice 兜底
// 同步;明细弹层「适用渠道」改为动态显示实际白名单(est.peak.providers)。
// 修订 110（host/client）：官方两套货币定价并存——用户指出官方本来就有
// CNY(中国区)/USD(国际)两套独立价,不是汇率换算:内置价加 alt 组(CNY),
// 峰值覆盖保留 alt;peakModelList 输出 baseAlt*/peakAlt*;峰谷明细表每格
// 双币种显示「$0.44 / ¥3.00」;money() 修正(原硬编码 CNY,主币种已 USD)。
// 修订 111（client）：峰谷明细表币种切换按钮——USD(国际)/ CNY(中国区) /
// 「两类」(默认):peakCur state,表格 money 按模式过滤;官方两套价均确认。
// 修订 112（client）：峰谷表格 cell key 冲突修复——旧 key=文本内容,双币种后
// 多个「—」/同价 cell key 相同 → React 同级重复 key 渲染错乱(切换越来越多);
// cell key 改序号 'pc'+index,永唯一。
// 修订 113（client）：模型滑槽 thumb 跟随宽度变化——币种切换/弹层宽度
// 变化时 seg 位置变但 thumb 没重新量(useLayoutEffect 只依赖 curIdx/models),
// 看起来滞后;给滑槽容器加 ResizeObserver,宽度一变立即重量 thumb。
// 修订 114（client）：导出图片重设计(B 彩版)——用户嫌弃旧白底大字报:
// 圆角卡片布局:品牌色标题+日期、三个彩色统计块(总Tokens/预估费用蓝/
// 命中率绿)、分渠道明细(来源色点:官方灰/全局蓝/渠道品牌/免费绿 + 名称+
// token+费用,免费行绿色「免费省$X」)、免费绿色横幅、页脚;canvas 直接读
// 主题 CSS 变量(品牌色跟随主题)。
// 修订 115（host/client）：分享卡按模型细化消耗——summaryAll rows 加
// 分桶字段(uncachedInput/cacheRead/cacheWrite/output + 分桶费用);
// 分享卡明细行改双行:主行名称+总tok+费用,次行各桶消耗小字(输入 X ·
// 缓存读 Y · 输出 Z,仅非零桶);新增 docs/preview-export-card.html 预览页
// (深浅两版,浏览器直接看效果)。
// 修订 116（client）：无 logo 模型升级字母徽章——预览页 unknown 示例凸出秃
// 圆点难看:无 logo 时渲染品牌色底+模型首字母圆角方块(预览页 <span class=
// badge>,logo 加载失败 logoFail 回调补徽章);canvas 分享卡圆点同样换
// 16px 字母徽章(品牌色底白字首字母)。
// 修订 117（client）：分享卡美学升级——① 卡片层次:暖灰外底 + 主卡圆角20+
// 细边框;② 品牌 logo 方块(30px 圆角 + 白色 D)+ 标题并排;③ 数字等宽
// ('SF Mono'/Consolas);④ 统计块自适应字号(超宽缩号不截断);⑤ alpha()
// 兼容主题色 rgb()/rgba() 形式(原只认 #hex,遇到 rgba 会 NaN 丢色块)。
// 修订 118（client）：峰谷适用渠道输入框补样式——该框此前无任何 CSS
// (浏览器默认生硬方框);补全套:圆角8+主题边框+白底/深色#181816+
// placeholder 灰字+聚焦品牌色光晕,与下拉/开关控件家族统一。
// 修订 119（host/client）：自定义价支持峰谷双价——用户指出渠道特选/全局价
// 只有单一价,需要"专门定义波峰波谷、不同渠道各配各的":① host setPrice
// 支持 price.peak 透传(渠道特选/全局均可配高峰价组),一键按官方价配置也
// 带官方 peak,行内编辑不覆盖已有 peak;② 添加/更新表单加「高峰输入价
// (可选)」输入框,其余桶按厂商比例派生;③ buildPriceList 行加 hasPeak,
// 价格表行内已设峰谷的行显示 ⛰ 标记;resolvePrice 已有用户 peak 优先逻辑
// (merged.peak ?? base.peak),配了即高峰自动切换。
// 修订 121（host/client）：行内峰谷编辑——用户问「波峰波谷在哪里调整」:
// 每行加「峰谷/⛰」按钮,点击展开该行高峰价编辑(输入/缓存读/缓存写/输出
// 四桶 + 清除按钮);主行仍编辑空闲价;buildPriceList 行输出 peak 值;
// updatePrice 支持 peak patch;host setPrice peak===null = 显式清除;
// 底栏峰谷分段货币符号修复(原硬编码 CNY,现按模型币种)。
// 修订 122（client）：底栏币种跟随详情弹层——peakCur=USD→$、CNY→¥、
// 「两类」→默认人民币(用户拍板);模型无 CNY alt 时回落主币种。
// 修订 124（client）：改拍板——点「两类」时底栏货币保持当前显示不跳动
// (barCur state:点 USD/CNY 才跟随,两类不动);初始默认主币种 USD。
// 修订 125（client）：吞吐明细加「最近 100 次」统计——用户要请求级趋势,
// 但不搞复杂:requestStatsOf 扫 settledNodes 的 assistant step(有解码耗时
// 的),取最后 100 条算平均吞吐/输出/首 token/请求数,追加到吞吐明细行;
// 零 host 改动,纯客户端"偷懒"实现。
// 修订 126（client）：吞吐明细升级为滑槽选窗口——「全部 / 最近 100」分段
// 滑槽(复用 PeakModelSlider),选中窗口决定下方平均吞吐/输出/解码时长/
// 步数(请求数)/平均首 token;detail 渲染支持 {slider:true} 特殊行。
// 修订 127（client）：PeakModelSlider 兼容字符串项——吞吐滑槽传字符串数组,
// 组件内 label(m.model) 取到 undefined → 按钮文字全空、只剩 thumb;
// 统一 key/label 处理(字符串直接用,对象取 .model)。
// 修订 128（host/client）：请求统计改增量——用户要"算平均就行,来一条加、
// 挤出一条减":host 心跳 diff 新增节点进环形100+和值(sumMs/sumOut 加减),
// 平均 = 和/条数,永不全量重扫;est.recent 带 count/和值/平均TTFT;
// 吞吐「最近 100」窗口优先读 est.recent,无则回退客户端扫描。
// 修订 129（host/client）：token 明细联动滑槽——用户要求 token 也跟窗口走:
// 增量环补记每请求 in/read/write 桶(host sumIn/sumRead/sumWrite 加减 +
// 客户端 requestStatsOf 扩展);r100 上提为 segDetailRows 共享;「输入/输出
// token」明细加同款「全部/最近 100」滑槽,最近100窗口显示各桶之和+请求数。
// 修订 130（client）：底栏与详情滑槽联动——用户澄清要的是「详情选窗口,底栏
// 跟着变」(像峰谷那样):r100 提升组件级;底栏吞吐段按 tputWin 显示全部/
// 近100平均,底栏 token 段按 tputWin 显示对应各桶。
// 修订 131（client）：token 明细两窗口行数对齐——「最近 100」比「全部」
// 多一行「请求数」导致弹层切换跳高;删掉,两窗口都是 4 行。
// 修订 132（client）：token 明细最近100窗口桶口径修复——之前「未缓存输入」
// 误显示总输入(含缓存读),与底栏(未缓存+写)对不上(用户:底栏0 vs 明细
// 32.2M);改为真实拆分:未缓存输入 = 总输入−缓存读−缓存写。
// 修订 133（host/client）：节点 usage 字段兜底——opencode 等渠道节点可能无
// uncachedInputTokens(只有 inputTokens),取不到当 0 导致「最近100未缓存输入0」
// 与全部窗口(投影)对不上;uncachedInputTokens 缺失时回退 inputTokens。
// 修订 134（client）：① 模板卡裸 input 挂 dsh-comp-input 类(生硬方框修复,
// 与峰谷适用渠道/其他控件统一圆角边框聚焦光晕);② 点底栏分段响应慢——点击
// 时先取消悬停黑条定时器(否则 260ms 后黑条与弹层打架),确认延迟 160→100ms。
// 修订 135（client）：统计窗口选择持久化——tputWin 存 localStorage,页面
// 刷新/重挂载后恢复上次选择(原来刷新归零回「全部」)。
// 修订 136（client）：模板卡输入框过高——.dsh-price-add 缺 align-items:
// center,flex 默认 stretch 把输入框拉到按钮高度;补 center + 输入框固定
// line-height 18/padding 3px,高度与按钮齐平。
// 修订 138（client）：设置页重排——底栏预览+段列表拖拽移到顶部,开关集中到
// 「其他设置」小标题下(输入缓存分离/黑条/精度/峰谷计价/峰谷提醒/适用渠道),
// 价格按钮与价格表随后,统计最后。
// 修订 139（client）：价格区三 tab——价格表/新增价格/厂商,替代弹出折叠:
// 「价格表」= 我的价格/渠道特选/全局/用过的/内置折叠;「新增价格」= 模板卡
// (自动匹配厂商→比例预览→确认流:第一次点进入待确认,主题色 @property 边缘
// 流光+确认/取消按钮,输入变化自动退出待确认);「厂商」= 内置厂商比例一览
// (只读,同一厂商多价暂手动)。确认流光用主题色(brand-primary),不用模型品牌色。
// 修订 140（host/client）：上下文长度分档——价格条目支持 ctxScales
// [{limit, price{in,cr,cw,out,peak?}}];resolvePrice 按 opts.ctx(请求上下文量)
// 取档(超过 limit 即切档),峰谷叠于当前档;host setPrice/一键配置透传,计价点
// (estimateOf/getClientUsage/summaryAll)以代表上下文估档;新增价格 tab 加
// 「临界上下文 + 超档输入价(缺省×2)」,其余桶按比例派生;价格行「档」小标。
// 内置官方档位数据待用户提供后预置。
// 修订 141（client）：新增价格卡片化 + 实时预览面板——卡片加厚(内边距14/16
// 圆角14/淡阴影);预览徽章升级为结构化面板:识别+币种头、四桶两列表格、
// 峰谷/分档附加预览行(填一步长一步),未填模型 id 时显示引导文案。
// 修订 142（client）：① 自动识别 tplName undefined——LEGACY_TPLS(旧系列)无
// name 字段,预览显示「兼容比例(旧系列)」;② 上下文量压缩显示 formatCtx:
// 250000→250k、1.2M、1.5k,分档预览行与输入提示统一用缩写。
// 修订 123（client）：拖拽多选悬浮条去掉毛玻璃模糊——backdrop-filter:
// blur(16px) 把底衬文字糊掉;背景已提至 95%/97% 实底,模糊无必要。
// 修订 120（host/client）：峰谷定价通用化——从 DeepSeek 特例升级为通用机制:
// 任何价格条目(内置或自定义)可带 peakWindow(自己的高峰时段)或
// peak.window,不同模型可各有不同时段;isPeakTime/currentPeakRangeLabel
// 接受 ranges;resolvePrice 按条目自带窗口判断;est.peak 输出代表模型窗口
// ranges,明细弹层高峰时段 chips 随之动态显示;内置 deepseek-v4 显式声明
// 默认窗口作范例。实测:自定义窗口 0-6 点模型 2 点命中高峰、11 点回落;
// DeepSeek 默认窗口 10 点命中。
// 修订 106（client/host）：客户端全量卡改为「费用统计 · 综合全部」——
// 用户反馈只看当前这条没意思,想要综合视角还能导出图片:host 新增
// summaryAll()(账本汇总 sessions[*].models,按渠道/模型聚合 token + 费用 +
// 来源 + 免费数,得总命中率),getClientUsage 加 all 字段;卡片改渲染
// 综合总量 + 分渠道/模型行 + 总计费用 + 免费数 + 「📤导出图片」按钮
// (canvas 手绘 PNG 分享卡)。
// ══════════════════════════════════════════════════════════════════
window.__ModuleLoader__.load({
  id: '@kc0ed/dsh-bottom-bar',
  factory: (require) => {
    var module = { exports: {} }
    var exports = module.exports
    Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' })
    let React = require('react')

    // ── 幂等样式注入（静态插件无 styles 符号） ──
    function insertCss(css) {
      // 追加 + Set 去重（函数属性，避免顶层声明被生成器带进动态插件对象）：
      // 多次调用不互相覆盖、重挂不重复追加
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

    const LS_CFG_KEY = 'dsh-bottom-bar:config'
    const getLocalConfig = () => {
      try {
        const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(LS_CFG_KEY) : null
        if (raw) return JSON.parse(raw)
      } catch (e) {}
      return null
    }
    const setLocalConfig = (cfg) => {
      try {
        if (typeof localStorage !== 'undefined' && cfg && typeof cfg === 'object') {
          localStorage.setItem(LS_CFG_KEY, JSON.stringify(cfg))
        }
      } catch (e) {}
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
        package: '@kc0ed/dsh-bottom-bar',
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
      // 修订 37c：remote 代理方法返回 {ok, value} 包装——Proxy 统一解包成裸数据
      const unwrapRemote = (r) => (r !== null && typeof r === 'object' && r.ok === true && Object.prototype.hasOwnProperty.call(r, 'value')) ? r.value : r
      const remoteRaw = ctx.get('remote.bottomBar')
      const remote = (remoteRaw !== null && remoteRaw !== undefined && typeof Proxy !== 'undefined')
        ? new Proxy(remoteRaw, {
            get(target, prop) {
              const v = target[prop]
              if (typeof v === 'function') return (...args) => Promise.resolve(v.apply(target, args)).then(unwrapRemote)
              return v
            },
          })
        : remoteRaw
        try {
          ctx.effect(() => ctx.locale.register('dsh-bottom-bar', {
            zh: { input: '输入 {input} tok · 输出 {output} tok', cacheHit: '缓存命中 {tokens} tok' },
            en: { input: 'Input {input} tok · Output {output} tok', cacheHit: 'Cache hit {tokens} tok' },
          }), 'dsh-bottom-bar: dictionaries')
        } catch (err) { console.error('dsh-bottom-bar: locale ns already registered (stale run); continuing', err) }
        const t = ctx.locale.bind('conversation')
        const tb = ctx.locale.bind('dsh-bottom-bar')
        insertCss(`/* ══════════════════════════════════════════════════════════════════
   dsh-bottom-bar · 经典 Claude 暖纸与黑曜石精雕美学 UI
   ══════════════════════════════════════════════════════════════════ */
.dsh-stats-root {
  text-align: center;
  max-width: var(--dsh-chat-content-width);
  box-sizing: border-box;
  width: 100%;
  padding: 6px calc(var(--dsh-composer-side-clearance) + 16px) 2px;
  color: var(--dsw-alias-label-tertiary);
  white-space: normal;
  margin: 0 auto;
  font-family: var(--dsw-font-family);
  font-size: 12px;
  line-height: 22px;
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.01em;
  display: block;
}
.dsh-stats-sep {
  color: var(--dsw-alias-label-tertiary);
  margin: 0 10px;
  opacity: 0.65;
  font-weight: 300;
  user-select: none;
  display: inline-block;
}
.dsh-stats-empty {
  height: 0;
  padding: 0;
  overflow: hidden;
  line-height: 0;
}

.dsh-seg {
  cursor: pointer;
  border-radius: 6px;
  padding: 2px 6px;
  margin: 0 -1px;
  transition: all 0.14s ease;
  display: inline-block;
  white-space: nowrap;
}
.dsh-seg:hover {
  background: var(--dsw-alias-interactive-bg-hover);
  color: var(--dsw-alias-label-primary);
}
.dsh-seg:active {
  transform: scale(0.97);
}
/* 修订 82：峰谷时段分段特效——高峰=品牌色胶囊+柔和脉冲光晕,空闲=次级色（降噪） */
.dsh-seg-peak {
  background: color-mix(in srgb, var(--dsw-alias-brand-primary) 16%, transparent);
  color: var(--dsw-alias-brand-primary) !important;
  font-weight: 600;
  animation: dsh-peak-pulse 2.4s ease-in-out infinite;
}
.dsh-seg-offpeak {
  color: var(--dsw-alias-label-secondary);
  opacity: 0.9;
}
/* 修订 84：仅参考（非官方渠道/未计价）→ 低调次级色;价格单独标色——高峰时深色加粗（贵） */
.dsh-seg-ref {
  color: var(--dsw-alias-label-secondary);
}
.dsh-seg-price {
  font-weight: 600;
}
.dsh-seg-price-hot {
  color: var(--dsw-alias-brand-primary) !important;
  font-weight: 700;
}
@keyframes dsh-peak-pulse {
  0%, 100% { box-shadow: 0 0 0 0 color-mix(in srgb, var(--dsw-alias-brand-primary) 32%, transparent); }
  50% { box-shadow: 0 0 0 3px color-mix(in srgb, var(--dsw-alias-brand-primary) 10%, transparent); }
}
@media (prefers-reduced-motion: reduce) {
  .dsh-seg-peak { animation: none; }
}
/* 修订 84：峰谷明细价格对比表格——当前时段列高亮（品牌色加粗） */
.dsh-peak-table {
  display: grid;
  grid-template-columns: auto 1fr 1fr;
  gap: 2px 12px;
  margin: 4px 0;
  align-items: center;
}
.dsh-peak-cell {
  white-space: nowrap;
}
/* 修订 95：价格列(第 2/3 列)文字居中,桶标签列保持左对齐 */
.dsh-peak-table .dsh-peak-cell:nth-child(3n+2),
.dsh-peak-table .dsh-peak-cell:nth-child(3n+3) {
  text-align: center;
}
.dsh-peak-cell-head {
  opacity: 0.65;
  font-size: 11px;
  line-height: 16px;
}
.dsh-peak-cell-hot {
  color: var(--dsw-alias-brand-primary) !important;
  font-weight: 700;
}
/* 修订 88：峰谷明细按模型分组——模型名小标题 */
.dsh-peak-model {
  font-weight: 600;
  font-size: 11px;
  line-height: 16px;
  color: var(--dsw-alias-label-secondary);
  margin-top: 6px;
}
.dsh-peak-model + .dsh-peak-table {
  margin-top: 2px;
}
/* 修订 89/90：峰谷明细模型切换——分段式滑槽（轨道+滑动指示条）,替代 ◀ ▶ 按钮 */
.dsh-peak-slider {
  position: relative;
  display: flex;
  gap: 2px;
  padding: 2px;
  border-radius: 8px;
  border: 1px solid var(--dsw-alias-border-l2);
  background: var(--dsw-alias-interactive-bg-hover);
  margin: 4px 0 2px;
  width: 100%;
  box-sizing: border-box;
}
.dsh-peak-slider-thumb {
  position: absolute;
  top: 2px;
  bottom: 2px;
  left: 0;
  width: 0;
  border-radius: 6px;
  background: color-mix(in srgb, var(--dsw-alias-brand-primary) 18%, transparent);
  border: 1px solid color-mix(in srgb, var(--dsw-alias-brand-primary) 35%, transparent);
  box-sizing: border-box;
  transition: left 0.22s cubic-bezier(0.2, 0.9, 0.3, 1), width 0.22s cubic-bezier(0.2, 0.9, 0.3, 1);
  pointer-events: none;
}
.dsh-peak-slider-seg {
  position: relative;
  z-index: 1;
  flex: 1;
  min-width: 0;
  padding: 3px 6px;
  border: none;
  background: transparent;
  color: var(--dsw-alias-label-secondary);
  font-size: 12px;
  line-height: 18px;
  font-weight: 500;
  border-radius: 6px;
  cursor: pointer;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  transition: color 0.18s ease;
}
.dsh-peak-slider-seg:hover {
  color: var(--dsw-alias-label-primary);
}
.dsh-peak-slider-seg.dsh-on {
  color: var(--dsw-alias-brand-primary);
  font-weight: 600;
}
/* 修订 92：高峰时段窗口 chips——当前所在窗口高亮 */
.dsh-peak-ranges {
  display: inline-flex;
  gap: 4px;
}
.dsh-peak-range {
  padding: 0 5px;
  border-radius: 4px;
  border: 1px solid transparent;
  color: var(--dsw-alias-label-secondary);
  font-size: 11px;
  line-height: 16px;
  white-space: nowrap;
}
.dsh-peak-range-hot {
  color: var(--dsw-alias-brand-primary);
  font-weight: 600;
}

.dsh-tip {
  position: fixed;
  z-index: 1000;
  width: max-content;
  max-width: 50vw;
  padding: 6px 12px;
  border-radius: 10px;
  border: 1px solid var(--dsw-alias-border-l1);
  box-shadow: 0 8px 24px rgba(35, 30, 20, 0.14), 0 2px 6px rgba(35, 30, 20, 0.06);
  background: var(--dsw-alias-bg-layer-2);
  color: var(--dsw-alias-label-primary);
  font-family: var(--dsw-font-family);
  font-size: 12.5px;
  line-height: 19px;
  white-space: pre-line;
  overflow-wrap: break-word;
  pointer-events: none;
  animation: dsh-tip-in 0.12s var(--ds-ease-in-out);
}
body[data-ds-dark-theme] .dsh-tip {
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.6);
  border-color: var(--dsw-alias-border-l2);
}
.dsh-tip[data-side=top] { transform: translate(-50%, -100%); }
.dsh-tip[data-side=bottom] { transform: translate(-50%); }
@keyframes dsh-tip-in { 0% { opacity: 0; } }
@media (prefers-reduced-motion: reduce) { .dsh-tip { animation: none; } }

.dsh-detail {
  position: fixed;
  z-index: 1001;
  min-width: 220px;
  max-width: min(460px, 86vw);
  max-height: 48vh;
  overflow: auto;
  padding: 12px 16px;
  border-radius: 16px;
  border: 1px solid var(--dsw-alias-border-l1);
  background: var(--dsw-alias-bg-layer-2);
  color: var(--dsw-alias-label-primary);
  font-family: var(--dsw-font-family);
  font-size: 12px;
  line-height: 18px;
  white-space: nowrap;
  box-shadow: 0 16px 40px rgba(35, 30, 20, 0.18), 0 2px 10px rgba(35, 30, 20, 0.08);
  animation: dsh-tip-in 0.12s var(--ds-ease-in-out);
  scrollbar-width: thin;
  scrollbar-color: var(--dsw-alias-border-l2) transparent;
}
body[data-ds-dark-theme] .dsh-detail {
  background: #242320;
  border-color: var(--dsw-alias-border-l2);
  box-shadow: 0 16px 40px rgba(0, 0, 0, 0.65), 0 2px 10px rgba(0, 0, 0, 0.3);
}
.dsh-detail::-webkit-scrollbar { width: 5px; height: 5px; }
.dsh-detail::-webkit-scrollbar-thumb { background: var(--dsw-alias-border-l2); border-radius: 3px; }
.dsh-detail::-webkit-scrollbar-track { background: transparent; }
.dsh-detail[data-side=top] { transform: translate(-50%, -100%); }
.dsh-detail[data-side=bottom] { transform: translate(-50%); }
.dsh-detail-title { font-weight: 600; font-size: 13px; margin-bottom: 6px; color: var(--dsw-alias-label-primary); }
.dsh-detail-row { display: flex; justify-content: space-between; gap: 20px; font-variant-numeric: tabular-nums; }
.dsh-detail-row + .dsh-detail-row { margin-top: 3px; }
.dsh-detail-sep { border-top: 1px dashed var(--dsw-alias-border-l2); margin: 8px 0; }
.dsh-detail-total { font-weight: 600; color: var(--dsw-alias-brand-primary); }
.dsh-detail-model { font-weight: 600; margin-top: 8px; color: var(--dsw-alias-brand-primary); }
.dsh-detail-empty { opacity: 0.75; margin-top: 3px; }

.dsh-comp-page {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 4px 0 20px;
  font-size: 13px;
  line-height: 20px;
  color: var(--dsw-alias-label-secondary);
}
.dsh-comp-desc {
  color: var(--dsw-alias-label-tertiary);
  font-size: 12.5px;
  line-height: 18px;
  margin: 0;
}
.dsh-comp-loading {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 8px 0;
}
.dsh-comp-loading-bar {
  height: 14px;
  border-radius: 7px;
  background: var(--dsw-alias-interactive-bg-hover);
  opacity: 0.6;
  animation: dsh-loading-pulse 1.2s ease-in-out infinite;
}
.dsh-comp-loading-bar:nth-child(2) { width: 85%; animation-delay: 0.15s; }
.dsh-comp-loading-bar:nth-child(3) { width: 60%; animation-delay: 0.3s; }
.dsh-comp-warn {
  color: var(--dsw-alias-state-error-primary);
  font-size: 12px;
  line-height: 18px;
  background: rgba(220, 53, 69, 0.08);
  border: 1px solid rgba(220, 53, 69, 0.2);
  border-radius: 8px;
  padding: 8px 12px;
}
@keyframes dsh-loading-pulse { 0%, 100% { opacity: 0.35; } 50% { opacity: 0.85; } }

.dsh-preview {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 12px 16px;
  border-radius: 14px;
  border: 1px solid var(--dsw-alias-border-l1);
  background: var(--dsw-alias-bg-module-platform);
  box-shadow: 0 1px 3px rgba(35, 30, 20, 0.03);
  box-sizing: border-box;
  max-width: 100%;
  overflow: hidden;
}
.dsh-preview-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}
.dsh-preview-label {
  font-size: 12px;
  font-weight: 600;
  line-height: 16px;
  color: var(--dsw-alias-label-tertiary);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
.dsh-preview-hint {
  font-size: 11.5px;
  line-height: 16px;
  color: var(--dsw-alias-label-tertiary);
  opacity: 0.8;
}
.dsh-preview-dock {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: flex-start;
  width: 100%;
  height: 40px;
  min-height: 40px;
  max-height: 40px;
  box-sizing: border-box;
  overflow-x: auto;
  overflow-y: hidden;
  padding: 0 10px;
  border-radius: 10px;
  border: 1px solid var(--dsw-alias-border-l1);
  background: #FFFFFF;
  scrollbar-width: none;
  -ms-overflow-style: none;
  user-select: none;
  -webkit-user-select: none;
  -webkit-user-drag: none;
  cursor: default;
}
body[data-ds-dark-theme] .dsh-preview-dock {
  background: #252420;
  border-color: var(--dsw-alias-border-l2);
}
.dsh-preview-dock::-webkit-scrollbar {
  display: none;
  width: 0;
  height: 0;
}
.dsh-preview-line {
  color: var(--dsw-alias-label-primary);
  font-size: 12px;
  line-height: 22px;
  height: 24px;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
  min-width: max-content;
  display: inline-flex;
  align-items: center;
  padding: 0 4px;
  box-sizing: border-box;
  user-select: none;
  -webkit-user-select: none;
  -webkit-user-drag: none;
}
.dsh-preview-empty {
  color: var(--dsw-alias-label-tertiary);
  font-size: 12px;
  line-height: 22px;
  text-align: center;
  padding: 4px 0;
}
.dsh-preview-seg {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 22px;
  box-sizing: border-box;
  border: 1px solid transparent;
  border-radius: 5px;
  padding: 0 6px;
  font-weight: 500;
  white-space: nowrap;
  user-select: none;
  -webkit-user-select: none;
  -webkit-user-drag: none;
  cursor: pointer;
  overflow: hidden;
  max-width: 280px;
  opacity: 1;
  transition: max-width 0.22s cubic-bezier(0.16, 1, 0.3, 1),
              opacity 0.18s ease,
              padding 0.22s cubic-bezier(0.16, 1, 0.3, 1),
              background 0.16s ease,
              color 0.16s ease,
              border-color 0.16s ease,
              box-shadow 0.16s ease;
}
.dsh-preview-seg.dsh-seg-collapsed {
  max-width: 0 !important;
  opacity: 0 !important;
  padding-left: 0 !important;
  padding-right: 0 !important;
  margin: 0 !important;
  border-width: 0 !important;
  border-color: transparent !important;
  pointer-events: none !important;
}
.dsh-preview-seg.dsh-seg-visible {
  max-width: 280px;
  opacity: 1;
  padding: 0 6px;
}
/* 修订 71：修订 70 按用户决定回退——「跟着主题色走还是比较好」，
   预览区强调色恢复跟随 var(--dsw-alias-brand-primary) + color-mix 派生 */
.dsh-preview-seg:hover {
  background: color-mix(in srgb, var(--dsw-alias-brand-primary) 12%, transparent);
  color: var(--dsw-alias-brand-primary);
  border-color: transparent;
}
body[data-ds-dark-theme] .dsh-preview-seg:hover {
  background: color-mix(in srgb, var(--dsw-alias-brand-primary) 18%, transparent);
  color: var(--dsw-alias-brand-primary);
  border-color: transparent;
}
/* 修订 73/74：高亮风格 CSS 开关——默认「全部实心 + bg-base 文字」（用户：实心
   才好认,tint 高亮和没高亮没差别;夜间不要发光,白天保留原版光晕）。主题/用户想
   改,在 .dsh-comp-page 上覆盖下面四个变量即可：
     全部 tint → --dsh-hl-fill: color-mix(in srgb, var(--dsw-alias-brand-primary) 16%, transparent);
                 --dsh-hl-text: var(--dsw-alias-brand-primary);
                 --dsh-hl-glow: none;
                 --dsh-switch-fill: color-mix(in srgb, var(--dsw-alias-brand-primary) 50%, transparent);
     夜间也要光 → body[data-ds-dark-theme] .dsh-comp-page { --dsh-hl-glow: 0 0 12px color-mix(in srgb, var(--dsw-alias-brand-primary) 45%, transparent), 0 2px 6px color-mix(in srgb, var(--dsw-alias-brand-primary) 30%, transparent); } */
.dsh-comp-page {
  --dsh-hl-fill: var(--dsw-alias-brand-primary);
  --dsh-hl-text: var(--dsw-alias-bg-base);
  --dsh-hl-glow: 0 0 12px color-mix(in srgb, var(--dsw-alias-brand-primary) 45%, transparent), 0 2px 6px color-mix(in srgb, var(--dsw-alias-brand-primary) 30%, transparent);
  --dsh-switch-fill: var(--dsw-alias-brand-primary);
}
body[data-ds-dark-theme] .dsh-comp-page {
  --dsh-hl-fill: var(--dsw-alias-brand-primary);
  --dsh-hl-text: var(--dsw-alias-bg-base);
  --dsh-hl-glow: none;
  --dsh-switch-fill: color-mix(in srgb, var(--dsw-alias-brand-primary) 50%, transparent);
}
.dsh-preview-hl {
  background: var(--dsh-hl-fill) !important;
  color: var(--dsh-hl-text) !important;
  border-color: var(--dsw-alias-brand-primary) !important;
  font-weight: 500 !important;
  box-shadow: var(--dsh-hl-glow) !important;
}
.dsh-preview-ghost {
  border: 1px dashed var(--dsw-alias-brand-primary) !important;
  background: color-mix(in srgb, var(--dsw-alias-brand-primary) 15%, transparent) !important;
  color: var(--dsw-alias-brand-primary) !important;
  font-weight: 500 !important;
  box-shadow: 0 0 10px color-mix(in srgb, var(--dsw-alias-brand-primary) 30%, transparent), inset 0 0 6px color-mix(in srgb, var(--dsw-alias-brand-primary) 15%, transparent) !important;
}
body[data-ds-dark-theme] .dsh-preview-ghost {
  border-color: var(--dsw-alias-brand-primary) !important;
  background: color-mix(in srgb, var(--dsw-alias-brand-primary) 20%, transparent) !important;
  color: var(--dsw-alias-brand-primary) !important;
  box-shadow: 0 0 12px color-mix(in srgb, var(--dsw-alias-brand-primary) 40%, transparent), inset 0 0 8px color-mix(in srgb, var(--dsw-alias-brand-primary) 20%, transparent) !important;
}

/* 预览区内置分隔符平滑过渡 */
.dsh-preview-dock .dsh-stats-sep {
  color: var(--dsw-alias-label-tertiary);
  opacity: 0.65;
  font-weight: 300;
  user-select: none;
  display: inline-block;
  overflow: hidden;
  white-space: nowrap;
  vertical-align: middle;
  max-width: 24px;
  margin: 0 10px;
  transition: max-width 0.22s cubic-bezier(0.16, 1, 0.3, 1),
              opacity 0.18s ease,
              margin 0.22s cubic-bezier(0.16, 1, 0.3, 1);
}
.dsh-preview-dock .dsh-stats-sep.dsh-sep-collapsed {
  max-width: 0 !important;
  opacity: 0 !important;
  margin: 0 !important;
  pointer-events: none !important;
}
.dsh-preview-dock .dsh-stats-sep.dsh-sep-visible {
  max-width: 24px;
  opacity: 0.65;
  margin: 0 10px;
}
.dsh-comp-row.dsh-row-hovered {
  border-color: var(--dsw-alias-brand-primary) !important;
  background: var(--dsw-alias-button-floating-hover) !important;
  box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--dsw-alias-brand-primary) 40%, transparent), 0 0 16px color-mix(in srgb, var(--dsw-alias-brand-primary) 22%, transparent), 0 4px 18px color-mix(in srgb, var(--dsw-alias-brand-primary) 15%, transparent) !important;
  transform: none !important;
}
body[data-ds-dark-theme] .dsh-comp-row.dsh-row-hovered {
  border-color: var(--dsw-alias-brand-primary) !important;
  box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--dsw-alias-brand-primary) 50%, transparent), 0 0 18px color-mix(in srgb, var(--dsw-alias-brand-primary) 32%, transparent), 0 4px 22px color-mix(in srgb, var(--dsw-alias-brand-primary) 22%, transparent) !important;
  transform: none !important;
}

.dsh-comp-list {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 4px;
}
.dsh-drop-ind {
  position: absolute;
  left: 6px;
  right: 6px;
  height: 3px;
  border-radius: 3px;
  background: var(--dsw-alias-brand-primary);
  pointer-events: none;
  transition: top 0.12s cubic-bezier(0.16, 1, 0.3, 1);
  box-shadow: 0 0 10px var(--dsw-alias-brand-primary), 0 0 20px color-mix(in srgb, var(--dsw-alias-brand-primary) 60%, transparent);
  z-index: 20;
}
.dsh-drop-ind::before {
  content: '';
  position: absolute;
  left: -4px;
  top: -3.5px;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: var(--dsw-alias-brand-primary);
  box-shadow: 0 0 6px var(--dsw-alias-brand-primary);
}
.dsh-drop-ind::after {
  content: '';
  position: absolute;
  right: -4px;
  top: -3.5px;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: var(--dsw-alias-brand-primary);
  box-shadow: 0 0 6px var(--dsw-alias-brand-primary);
}
.dsh-comp-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 14px;
  border-radius: 12px;
  border: 1px solid var(--dsw-alias-border-l1);
  background: var(--dsw-alias-bg-module-platform);
  cursor: grab;
  will-change: transform, box-shadow, border-color;
  user-select: none;
  box-shadow: 0 1px 3px rgba(35, 30, 20, 0.03);
  transition: opacity 0.2s, border-color 0.25s, box-shadow 0.25s, transform 0.28s cubic-bezier(0.2, 0.9, 0.3, 1.1), background 0.2s;
}
.dsh-comp-row:hover {
  background: var(--dsw-alias-button-floating-hover);
  border-color: var(--dsw-alias-border-l2);
}
.dsh-comp-row:active {
  cursor: grabbing;
}
.dsh-comp-row.dsh-on {
  background: #FFFFFF;
  border-color: var(--dsw-alias-border-l2);
}
body[data-ds-dark-theme] .dsh-comp-row.dsh-on {
  background: #252420;
  border-color: var(--dsw-alias-border-l2);
}
.dsh-comp-row.dsh-off {
  opacity: 0.52;
  background: var(--dsw-alias-bg-module-platform);
}
.dsh-comp-row.dsh-selected {
  border-color: var(--dsw-alias-brand-primary) !important;
  background: linear-gradient(90deg, color-mix(in srgb, var(--dsw-alias-brand-primary) 16%, transparent) 0%, color-mix(in srgb, var(--dsw-alias-brand-primary) 6%, transparent) 100%) !important;
  box-shadow: 0 0 0 2px var(--dsw-alias-brand-primary), 0 4px 18px color-mix(in srgb, var(--dsw-alias-brand-primary) 30%, transparent) !important;
  transform: translateY(-1.5px) scale(1.01);
  animation: dsh-select-pulse 0.35s cubic-bezier(0.16, 1, 0.3, 1);
}
@keyframes dsh-select-pulse {
  0% {
    transform: scale(0.985);
    box-shadow: 0 0 0 0 color-mix(in srgb, var(--dsw-alias-brand-primary) 60%, transparent);
  }
  60% {
    transform: translateY(-2px) scale(1.015);
    box-shadow: 0 0 0 4px color-mix(in srgb, var(--dsw-alias-brand-primary) 25%, transparent), 0 6px 20px color-mix(in srgb, var(--dsw-alias-brand-primary) 35%, transparent);
  }
  100% {
    transform: translateY(-1.5px) scale(1.01);
    box-shadow: 0 0 0 2px var(--dsw-alias-brand-primary), 0 4px 18px color-mix(in srgb, var(--dsw-alias-brand-primary) 30%, transparent);
  }
}
body[data-ds-dark-theme] .dsh-comp-row.dsh-selected {
  background: linear-gradient(90deg, color-mix(in srgb, var(--dsw-alias-brand-primary) 24%, transparent) 0%, color-mix(in srgb, var(--dsw-alias-brand-primary) 9%, transparent) 100%) !important;
  border-color: var(--dsw-alias-brand-primary) !important;
  box-shadow: 0 0 0 2px var(--dsw-alias-brand-primary), 0 4px 22px color-mix(in srgb, var(--dsw-alias-brand-primary) 40%, transparent) !important;
  transform: translateY(-1.5px) scale(1.01);
  animation: dsh-select-pulse-dark 0.35s cubic-bezier(0.16, 1, 0.3, 1);
}
@keyframes dsh-select-pulse-dark {
  0% {
    transform: scale(0.985);
    box-shadow: 0 0 0 0 color-mix(in srgb, var(--dsw-alias-brand-primary) 70%, transparent);
  }
  60% {
    transform: translateY(-2px) scale(1.015);
    box-shadow: 0 0 0 4px color-mix(in srgb, var(--dsw-alias-brand-primary) 30%, transparent), 0 6px 24px color-mix(in srgb, var(--dsw-alias-brand-primary) 45%, transparent);
  }
  100% {
    transform: translateY(-1.5px) scale(1.01);
    box-shadow: 0 0 0 2px var(--dsw-alias-brand-primary), 0 4px 22px color-mix(in srgb, var(--dsw-alias-brand-primary) 40%, transparent);
  }
}
.dsh-comp-row.dsh-selected .dsh-comp-label {
  color: var(--dsw-alias-brand-primary) !important;
  font-weight: 600;
}
.dsh-comp-selected-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  border-radius: 5px;
  background: var(--dsh-hl-fill);
  color: var(--dsh-hl-text) !important;
  font-size: 12px;
  font-weight: 700;
  box-shadow: 0 2px 8px color-mix(in srgb, var(--dsw-alias-brand-primary) 40%, transparent);
  user-select: none;
  cursor: pointer;
  animation: dsh-badge-pop 0.26s cubic-bezier(0.34, 1.56, 0.64, 1);
}
@keyframes dsh-badge-pop {
  0% { transform: scale(0.65); opacity: 0; }
  100% { transform: scale(1); opacity: 1; }
}
.dsh-comp-row.dsh-dragging {
  opacity: 0.92;
  transform: scale(1.02) translateY(-2px);
  box-shadow: 0 16px 36px color-mix(in srgb, var(--dsw-alias-brand-primary) 28%, transparent), 0 0 0 2px var(--dsw-alias-brand-primary) !important;
  z-index: 10;
  cursor: grabbing !important;
  filter: brightness(1.04);
}
body[data-ds-dark-theme] .dsh-comp-row.dsh-dragging {
  box-shadow: 0 16px 36px rgba(0, 0, 0, 0.65), 0 0 0 2px var(--dsw-alias-brand-primary), 0 0 18px color-mix(in srgb, var(--dsw-alias-brand-primary) 35%, transparent) !important;
  filter: brightness(1.08);
}
.dsh-comp-row.dsh-just-moved {
  animation: dsh-settle-glow 0.75s cubic-bezier(0.16, 1, 0.3, 1) forwards;
}
@keyframes dsh-settle-glow {
  0% {
    border-color: var(--dsw-alias-brand-primary);
    box-shadow: 0 0 0 2.5px var(--dsw-alias-brand-primary), 0 6px 22px color-mix(in srgb, var(--dsw-alias-brand-primary) 40%, transparent);
    transform: scale(1.015);
    filter: brightness(1.06);
  }
  100% {
    border-color: var(--dsw-alias-border-l2);
    box-shadow: 0 1px 3px rgba(35, 30, 20, 0.03);
    transform: scale(1);
    filter: none;
  }
}
body[data-ds-dark-theme] .dsh-comp-row.dsh-just-moved {
  animation: dsh-settle-glow-dark 0.75s cubic-bezier(0.16, 1, 0.3, 1) forwards;
}
@keyframes dsh-settle-glow-dark {
  0% {
    border-color: var(--dsw-alias-brand-primary);
    box-shadow: 0 0 0 2.5px var(--dsw-alias-brand-primary), 0 6px 26px color-mix(in srgb, var(--dsw-alias-brand-primary) 50%, transparent);
    transform: scale(1.015);
    filter: brightness(1.12);
  }
  100% {
    border-color: var(--dsw-alias-border-l2);
    box-shadow: none;
    transform: scale(1);
    filter: none;
  }
}
.dsh-multi-bar {
  position: fixed;
  bottom: 24px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 1000;
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 7px 16px;
  border-radius: 999px;
  background: rgba(44, 39, 32, 0.95);
  border: 1px solid color-mix(in srgb, var(--dsw-alias-brand-primary) 50%, transparent);
  color: #FFFFFF;
  font-size: 12.5px;
  font-weight: 500;
  box-shadow: 0 12px 36px rgba(0, 0, 0, 0.32), 0 0 0 1px rgba(255, 255, 255, 0.08);
  /* 修订 123：去掉毛玻璃模糊——底衬文字被糊住;背景已 95% 实底,blur 无必要 */
  animation: dsh-pill-in 0.22s cubic-bezier(0.16, 1, 0.3, 1);
  pointer-events: auto;
}
body[data-ds-dark-theme] .dsh-multi-bar {
  background: rgba(26, 25, 22, 0.97);
  border-color: color-mix(in srgb, var(--dsw-alias-brand-primary) 55%, transparent);
  box-shadow: 0 12px 36px rgba(0, 0, 0, 0.65), 0 0 0 1px rgba(255, 255, 255, 0.06);
}
@keyframes dsh-pill-in {
  0% { transform: translate(-50%, 14px) scale(0.95); opacity: 0; }
  100% { transform: translate(-50%, 0) scale(1); opacity: 1; }
}
.dsh-multi-bar-action {
  font-size: 11.5px;
  color: #FFFFFF;
  background: rgba(255, 255, 255, 0.12);
  border: 1px solid rgba(255, 255, 255, 0.22);
  border-radius: 999px;
  padding: 3px 10px;
  cursor: pointer;
  font-weight: 500;
  transition: all 0.15s ease;
}
.dsh-multi-bar-action:hover {
  background: var(--dsh-hl-fill);
  border-color: var(--dsw-alias-brand-primary);
  color: var(--dsh-hl-text);
}
.dsh-price-template-card {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 14px 16px;
  border-radius: 14px;
  background: var(--dsw-alias-bg-module-platform);
  border: 1px solid var(--dsw-alias-border-l1);
  box-shadow: 0 2px 12px color-mix(in srgb, #000 5%, transparent);
  margin-top: 6px;
}
/* 修订 141：新增价格预览面板——结构化卡片内预览 */
.dsh-price-preview-panel {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 10px 12px;
  border-radius: 10px;
  background: color-mix(in srgb, var(--dsw-alias-label-tertiary) 7%, transparent);
  border: 1px dashed var(--dsw-alias-border-l2);
}
.dsh-price-preview-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
  font-size: 12px;
  font-weight: 600;
  color: var(--dsw-alias-label-primary);
  flex-wrap: wrap;
}
.dsh-price-preview-head span:last-child {
  font-weight: 500;
  color: var(--dsw-alias-label-tertiary);
  font-size: 11px;
}
.dsh-price-preview-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 4px 14px;
  font-size: 12px;
  font-variant-numeric: tabular-nums;
}
.dsh-price-preview-grid > span:nth-child(odd) {
  color: var(--dsw-alias-label-tertiary);
}
.dsh-price-preview-hint {
  font-size: 11px;
  color: var(--dsw-alias-label-tertiary);
}
.dsh-price-preview-extra {
  font-size: 11.5px;
  color: var(--dsw-alias-label-secondary);
  border-top: 1px dashed var(--dsw-alias-border-l2);
  padding-top: 6px;
  margin-top: 2px;
}
.dsh-price-preview-badge {
  font-size: 11.5px;
  color: var(--dsw-alias-label-secondary);
  font-variant-numeric: tabular-nums;
  padding: 4px 8px;
  border-radius: 6px;
  background: color-mix(in srgb, var(--dsw-alias-brand-primary) 8%, transparent);
  border: 1px dashed var(--dsw-alias-brand-primary);
  display: flex;
  align-items: center;
  gap: 10px;
}
.dsh-comp-grip {
  color: var(--dsw-alias-label-tertiary);
  user-select: none;
  font-size: 14px;
  cursor: grab;
}
.dsh-comp-label-wrap {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: baseline;
  gap: 10px;
  overflow: hidden;
}
.dsh-comp-label {
  white-space: nowrap;
  font-size: 13.5px;
  font-weight: 500;
  flex: none;
}
.dsh-comp-sample {
  font-size: 12px;
  color: var(--dsw-alias-label-tertiary);
  opacity: 0.8;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.01em;
}
.dsh-comp-row.dsh-on .dsh-comp-label {
  color: var(--dsw-alias-label-primary);
}
.dsh-comp-row.dsh-off .dsh-comp-label {
  color: var(--dsw-alias-label-tertiary);
}
.dsh-comp-row.dsh-off .dsh-comp-sample {
  opacity: 0.45;
}

.dsh-switch {
  position: relative;
  width: 34px;
  height: 20px;
  flex: none;
  cursor: pointer;
}
.dsh-switch input {
  position: absolute;
  opacity: 0;
  width: 100%;
  height: 100%;
  margin: 0;
  cursor: pointer;
}
.dsh-switch input:disabled {
  cursor: not-allowed;
}
.dsh-switch-track {
  position: absolute;
  inset: 0;
  border-radius: 10px;
  background: var(--dsw-alias-border-l2);
  transition: background 0.15s ease;
}
.dsh-switch input:checked + .dsh-switch-track {
  background: var(--dsh-switch-fill);
}
.dsh-switch input:disabled + .dsh-switch-track {
  opacity: 0.4;
}
.dsh-switch-knob {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: #FFFFFF;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.15);
  transition: transform 0.15s ease;
  pointer-events: none;
}
.dsh-switch input:checked + .dsh-switch-track + .dsh-switch-knob {
  transform: translateX(14px);
}

.dsh-comp-btn {
  border: 1px solid var(--dsw-alias-border-l2);
  background: var(--dsw-alias-bg-module-platform);
  color: var(--dsw-alias-label-secondary);
  border-radius: 8px;
  padding: 3px 10px;
  font-size: 12px;
  font-weight: 500;
  line-height: 18px;
  cursor: pointer;
  transition: all 0.15s ease;
}
.dsh-comp-btn:hover:not(:disabled) {
  border-color: var(--dsw-alias-brand-primary);
  color: var(--dsw-alias-brand-primary);
  background: var(--dsw-alias-button-floating-hover);
}
.dsh-comp-btn:disabled {
  opacity: 0.35;
  cursor: default;
}
.dsh-comp-reset {
  margin-top: 4px;
  align-self: flex-start;
}
.dsh-comp-select {
  appearance: auto;
  -webkit-appearance: auto;
  font-size: 12px;
  font-weight: 500;
  padding: 4px 8px;
  border-radius: 8px;
  border: 1px solid var(--dsw-alias-border-l2);
  background: var(--dsw-alias-bg-module-platform);
  color: var(--dsw-alias-label-primary);
  transition: all 0.15s ease;
  outline: none;
}
.dsh-comp-select:focus-visible {
  border-color: var(--dsw-alias-brand-primary);
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--dsw-alias-brand-primary) 18%, transparent);
}
/* 修订 118：峰谷适用渠道输入框——此前无任何样式(浏览器默认方框),补全套 */
.dsh-comp-input {
  box-sizing: border-box;
  font-size: 12px;
  line-height: 18px;
  font-family: var(--dsw-font-family);
  padding: 3px 10px;
  border-radius: 8px;
  border: 1px solid var(--dsw-alias-border-l2);
  background: #FFFFFF;
  color: var(--dsw-alias-label-primary);
  transition: all 0.15s ease;
  outline: none;
}
body[data-ds-dark-theme] .dsh-comp-input {
  background: #181816;
}
.dsh-comp-input::placeholder {
  color: var(--dsw-alias-label-tertiary);
}
.dsh-comp-input:focus-visible,
.dsh-comp-input:focus {
  border-color: var(--dsw-alias-brand-primary);
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--dsw-alias-brand-primary) 18%, transparent);
}

.dsh-prices {
  display: flex;
  flex-direction: column;
  gap: 8px;
  background: var(--dsw-alias-bg-module-platform);
  border: 1px solid var(--dsw-alias-border-l1);
  border-radius: 14px;
  padding: 14px 16px;
  margin-top: 6px;
}
.dsh-price-head {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 11.5px;
  font-weight: 600;
  line-height: 18px;
  color: var(--dsw-alias-label-tertiary);
  text-transform: uppercase;
  letter-spacing: 0.03em;
  padding-bottom: 4px;
  border-bottom: 1px solid var(--dsw-alias-border-l1);
}
.dsh-price-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 3px 0;
}
.dsh-price-model {
  flex: 1;
  min-width: 110px;
  white-space: normal;
  word-break: break-all;
  line-height: 18px;
  font-weight: 500;
  font-size: 13px;
  color: var(--dsw-alias-label-primary);
}
.dsh-price-input {
  box-sizing: border-box;
  width: 68px;
  font-size: 12px;
  font-variant-numeric: tabular-nums;
  padding: 4px 8px;
  border-radius: 8px;
  border: 1px solid var(--dsw-alias-border-l2);
  background: #FFFFFF;
  color: var(--dsw-alias-label-primary);
  transition: all 0.15s ease;
  outline: none;
}
body[data-ds-dark-theme] .dsh-price-input {
  background: #181816;
  border-color: var(--dsw-alias-border-l2);
}
.dsh-price-input:focus-visible,
.dsh-price-input:focus {
  border-color: var(--dsw-alias-brand-primary);
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--dsw-alias-brand-primary) 18%, transparent);
}
.dsh-price-add {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 10px;
  padding-top: 8px;
  border-top: 1px dashed var(--dsw-alias-border-l1);
}
.dsh-price-actions {
  display: flex;
  gap: 8px;
  margin-top: 8px;
}
/* 修订 139：待确认流光——主题色沿卡片边缘流动(贪吃蛇);@property 不支持时退化为静态主题色边框 */
@property --dsh-ang {
  syntax: '<angle>';
  initial-value: 0deg;
  inherits: false;
}
.dsh-confirm-pending {
  position: relative;
  border-color: color-mix(in srgb, var(--dsw-alias-brand-primary) 60%, transparent) !important;
}
.dsh-confirm-pending::before {
  content: '';
  position: absolute;
  inset: -1px;
  border-radius: inherit;
  padding: 1px;
  background: conic-gradient(from var(--dsh-ang, 0deg), transparent 0%, var(--dsw-alias-brand-primary) 14%, transparent 30%);
  -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
  -webkit-mask-composite: xor;
  mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
  mask-composite: exclude;
  animation: dsh-border-flow 1.8s linear infinite;
  pointer-events: none;
}
@keyframes dsh-border-flow {
  to { --dsh-ang: 360deg; }
}
.dsh-price-toggle {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  border: 1px dashed var(--dsw-alias-border-l2);
  background: var(--dsw-alias-bg-module-platform);
  color: var(--dsw-alias-label-secondary);
  border-radius: 10px;
  padding: 6px 12px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  margin-top: 4px;
  font-family: var(--dsw-font-family);
  transition: all 0.15s ease;
}
.dsh-price-toggle:hover {
  border-color: var(--dsw-alias-brand-primary);
  color: var(--dsw-alias-label-primary);
  background: var(--dsw-alias-interactive-bg-hover);
}
.dsh-price-empty {
  padding: 10px 4px;
  font-size: 12px;
  color: var(--dsw-alias-label-tertiary);
}
.dsh-price-row-peak {
  padding-left: 8px;
  background: color-mix(in srgb, var(--dsw-alias-brand-primary) 5%, transparent);
  border-radius: 8px;
}
.dsh-peak-on {
  border-color: var(--dsw-alias-brand-primary) !important;
  color: var(--dsw-alias-brand-primary) !important;
  background: color-mix(in srgb, var(--dsw-alias-brand-primary) 10%, transparent) !important;
}
.dsh-free-badge {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin: 4px 0 2px;
  padding: 4px 10px;
  border-radius: 8px;
  background: rgba(16, 185, 129, 0.12);
  color: #10b981;
  font-size: 12px;
  font-weight: 600;
  line-height: 18px;
}
.dsh-price-group {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 8px;
  padding: 0 2px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--dsw-alias-label-tertiary);
}
.dsh-price-group + .dsh-price-row {
  margin-top: 2px;
}
.dsh-detail-src {
  display: inline-flex;
  align-items: center;
  margin: 0 0 4px;
  padding: 1px 8px;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 600;
  line-height: 16px;
}
.dsh-detail-src-official {
  color: var(--dsw-alias-label-tertiary);
  background: color-mix(in srgb, var(--dsw-alias-label-tertiary) 10%, transparent);
}
.dsh-detail-src-global {
  color: var(--dsw-alias-label-secondary);
  background: color-mix(in srgb, var(--dsw-alias-label-secondary) 10%, transparent);
}
.dsh-detail-src-channel {
  color: var(--dsw-alias-brand-primary);
  background: color-mix(in srgb, var(--dsw-alias-brand-primary) 12%, transparent);
}
.dsh-detail-fix {
  border: 1px solid color-mix(in srgb, var(--dsw-alias-brand-primary) 40%, transparent);
  background: color-mix(in srgb, var(--dsw-alias-brand-primary) 8%, transparent);
  color: var(--dsw-alias-brand-primary);
  border-radius: 8px;
  padding: 2px 10px;
  font-size: 12px;
  font-weight: 600;
  margin: 2px 0 6px;
  cursor: pointer;
  transition: all 0.15s ease;
}
.dsh-detail-fix:hover {
  background: color-mix(in srgb, var(--dsw-alias-brand-primary) 16%, transparent);
}
.dsh-tpl-gear {
  border: 1px solid var(--dsw-alias-border-l2);
  background: var(--dsw-alias-bg-module-platform);
  color: var(--dsw-alias-label-secondary);
  border-radius: 8px;
  padding: 2px 10px;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s ease;
}
.dsh-tpl-gear:hover {
  border-color: var(--dsw-alias-brand-primary);
  color: var(--dsw-alias-label-primary);
}
.dsh-cur-toggle {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  margin: 0 0 6px;
  padding: 2px;
  border-radius: 8px;
  background: color-mix(in srgb, var(--dsw-alias-label-tertiary) 10%, transparent);
}
.dsh-cur-btn {
  border: none;
  background: transparent;
  color: var(--dsw-alias-label-secondary);
  border-radius: 6px;
  padding: 2px 10px;
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
}
.dsh-cur-btn:hover {
  color: var(--dsw-alias-label-primary);
}
.dsh-cur-btn.dsh-on {
  background: var(--dsw-alias-brand-primary);
  color: var(--dsw-alias-bg-base);
}`)
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
        // 修订 125：最近 N 次请求的吞吐/时延统计——扫 settledNodes 的 assistant
        // step(带解码耗时的),取最后 N 条快速算平均;「偷懒」版,零 host 改动
        const requestStatsOf = (nodes, lastN) => {
          const list = Array.isArray(nodes) ? nodes : []
          const all = []
          for (const node of list) {
            if (node.kind !== 'assistant') continue
            const r = assistantStepReading(node)
            if (r.decodeMs === null || r.decodeMs <= 0 || r.outputTokens === null) continue
            const u = node.usage
            all.push(Object.assign({}, r, {
              // 修订 133：字段兜底(uncachedInputTokens 缺失时回退 inputTokens)
              inTokens: (u !== undefined && u !== null) ? (((u.uncachedInputTokens !== undefined ? u.uncachedInputTokens : (u.inputTokens !== undefined ? u.inputTokens : 0))) + (u.cacheReadTokens !== undefined ? u.cacheReadTokens : 0) + (u.cacheWriteTokens !== undefined ? u.cacheWriteTokens : 0)) : 0,
              readTokens: (u !== undefined && u !== null && u.cacheReadTokens !== undefined) ? u.cacheReadTokens : 0,
              writeTokens: (u !== undefined && u !== null && u.cacheWriteTokens !== undefined) ? u.cacheWriteTokens : 0,
            }))
          }
          const sel = lastN > 0 && all.length > lastN ? all.slice(all.length - lastN) : all
          let decodeMs = 0, outputTokens = 0, inTokens = 0, readTokens = 0, writeTokens = 0, ttftMs = 0, ttftN = 0
          for (const r of sel) {
            decodeMs += r.decodeMs
            outputTokens += r.outputTokens
            inTokens += r.inTokens
            readTokens += r.readTokens
            writeTokens += r.writeTokens
            if (r.ttftMs !== null) { ttftMs += r.ttftMs; ttftN += 1 }
          }
          return { count: sel.length, decodeMs, outputTokens, inTokens, readTokens, writeTokens, ttftMs: ttftN > 0 ? ttftMs / ttftN : null }
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
        // 修订 142：上下文量压缩显示——1200000→1.2M、250000→250k、1536→1.5k
        const formatCtx = (n) => {
          if (!Number.isFinite(n)) return String(n)
          if (n >= 1e6) return (Math.round(n / 1e6 * 10) / 10) + 'M'
          if (n >= 1e3) {
            const k = n / 1e3
            return (k >= 100 ? String(Math.round(k)) : String(Math.round(k * 10) / 10)) + 'k'
          }
          return String(n)
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
          // 修订 75/79：峰谷计价开启且实际套用高峰价时,费用段标注当前时段
          if (estimate.peak !== undefined && estimate.peak.priced) text += estimate.peak.window === 'peak' ? ' · 高峰' : ' · 空闲'
          return text
        }
        const SEGMENT_IDS = ['counts', 'llm', 'toolCall', 'ttft', 'throughput', 'cacheHit', 'tokens', 'cost', 'peak']
        const SEGMENT_LABELS = {
          counts: '轮/步', llm: 'LLM 时长', toolCall: '工具调用时长', ttft: '首 token 平均',
          throughput: '吞吐 tok/s', cacheHit: '缓存命中', tokens: '输入/输出 token', cost: '预估费用', peak: '峰谷时段',
        }
        const PREVIEW_TEXTS = {
          counts: '12 轮 · 45 步', llm: 'LLM 2m10s', toolCall: '工具调用时长 45s', ttft: '首 token 平均 1.8s', throughput: '34.2 tok/s',
          cacheHit: { separate: '缓存命中 5.93M tok', combined: '缓存命中 97%' },
          tokens: { separate: '输入 96.3K tok · 输出 72.8K tok', combined: '输入 6.0M tok · 输出 72.8K tok' },
          cost: '预估 ¥0.36', peak: '⏱ 高峰 输入 ¥3.0/1M',
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
        // 修订 90：峰谷模型切换滑槽——分段式滑动指示条（轨道 + 平滑滑动滑块）
        const PeakModelSlider = (props) => {
          const segRefs = React.useRef([])
          const thumbRef = React.useRef(null)
          const rootRef = React.useRef(null)
          const { models, curIdx, onPick, label } = props
          const measure = React.useCallback(() => {
            const thumb = thumbRef.current
            const seg = segRefs.current[curIdx]
            if (thumb === null || seg === null || seg === undefined) return
            thumb.style.left = seg.offsetLeft + 'px'
            thumb.style.width = seg.offsetWidth + 'px'
          }, [curIdx])
          React.useLayoutEffect(() => {
            measure()
          }, [measure, models])
          // 修订 113：币种切换/弹层宽度变化时滑槽 seg 位置会变,
          // ResizeObserver 监听容器,宽度一变立即重量 thumb,消除滞后
          React.useEffect(() => {
            if (typeof ResizeObserver === 'undefined') return
            const root = rootRef.current
            if (root === null) return
            const ro = new ResizeObserver(() => { measure() })
            ro.observe(root)
            return () => ro.disconnect()
          }, [measure])
          return React.createElement('div', { className: 'dsh-peak-slider', ref: rootRef },
            React.createElement('span', { className: 'dsh-peak-slider-thumb', ref: thumbRef }),
            models.map((m, i) => {
              // 修订 127：兼容字符串项(吞吐滑槽传 ['全部','最近 100']),
              // 峰谷场景传对象(有 .model);统一取 key 与 label
              const key = typeof m === 'string' ? m : m.model
              return React.createElement('button', {
                key,
                className: 'dsh-peak-slider-seg' + (i === curIdx ? ' dsh-on' : ''),
                ref: (el) => { segRefs.current[i] = el },
                onClick: () => onPick(i),
              }, typeof m === 'string' ? label(m) : label(m.model))
            }),
          )
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
            const initDockCfg = getLocalConfig()
            // 修订 26/62：首帧秒级从 LocalStorage + compositionValue 双重水合，刷新网页 0ms 完美保持所有定制配置
            const [composition, setComposition] = React.useState(Array.isArray(compositionValue) ? compositionValue : (initDockCfg && Array.isArray(initDockCfg.segments) ? initDockCfg.segments : DEFAULT_COMPOSITION))
            const [mode, setMode] = React.useState(initDockCfg && (initDockCfg.mode === 'separate' || initDockCfg.mode === 'combined') ? initDockCfg.mode : 'separate')
            const [tooltipAlways, setTooltipAlways] = React.useState(initDockCfg ? initDockCfg.tooltip === 'always' : false)
            const [precision, setPrecision] = React.useState(initDockCfg && initDockCfg.precision === 'full' ? 'full' : 'compact')
            const [detailSeg, setDetailSeg] = React.useState(null)
            // 修订 89：峰谷明细弹层的模型切换索引（◀ 模型名 ▶）
            const [peakModelIdx, setPeakModelIdx] = React.useState(0)
            const [peakCur, setPeakCur] = React.useState('both')
            // 修订 126：吞吐明细统计窗口滑槽(0=全部,1=最近100)
            // 修订 135：统计窗口选择持久化——localStorage 存 tputWin,页面刷新/重挂载后恢复
            const [tputWin, setTputWin] = React.useState(() => {
              try {
                return (typeof localStorage !== 'undefined' && localStorage.getItem('dsh-bottom-bar:tputWin') === '1') ? 1 : 0
              } catch (e) { return 0 }
            })
            const chooseTputWin = (i) => {
              setTputWin(i)
              try { if (typeof localStorage !== 'undefined') localStorage.setItem('dsh-bottom-bar:tputWin', i === 1 ? '1' : '0') } catch (e) { /* ignore */ }
            }
            // 修订 124：底栏货币——点 USD/CNY 时跟随;点「两类」保持当前显示不跳动
            const [barCur, setBarCur] = React.useState('usd')
            const chooseCur = (v) => {
              setPeakCur(v)
              if (v === 'usd') setBarCur('usd')
              else if (v === 'cny') setBarCur('cny')
            }
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
                    if (result && typeof result === 'object') setLocalConfig(result)
                    if (Array.isArray(result.segments)) setComposition(result.segments)
                    if (result.mode === 'separate' || result.mode === 'combined') setMode(result.mode)
                    if (typeof result.tooltip === 'string') setTooltipAlways(result.tooltip === 'always')
                    if (result.precision === 'compact' || result.precision === 'full') setPrecision(result.precision)
                  })
                  .catch((err) => console.error('dsh-bottom-bar: config poll failed', err))
                  .then(() => {
                    if (!alive) return
                    runEstimate()
                    timer = ctx.timeout(tick, 1000)
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
            // 修订 128/129/130：最近 100 请求统计提升为组件级——host 增量优先
            // (est.recent),回退客户端扫描;底栏吞吐/token 段与详情滑槽联动共用
            let r100 = { count: 0, decodeMs: 0, outputTokens: 0, inTokens: 0, readTokens: 0, writeTokens: 0, ttftMs: null }
            if (estimate !== null && estimate !== undefined && estimate.recent !== null && estimate.recent !== undefined && estimate.recent.count > 0) {
              r100 = {
                count: estimate.recent.count,
                decodeMs: estimate.recent.decodeMs,
                outputTokens: estimate.recent.outputTokens,
                inTokens: estimate.recent.inTokens !== undefined ? estimate.recent.inTokens : 0,
                readTokens: estimate.recent.readTokens !== undefined ? estimate.recent.readTokens : 0,
                writeTokens: estimate.recent.writeTokens !== undefined ? estimate.recent.writeTokens : 0,
                ttftMs: estimate.recent.ttftMs,
              }
            } else {
              r100 = requestStatsOf(settledNodes, 100)
            }
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
              throughput: () => {
                // 修订 130：底栏吞吐跟随详情滑槽——「最近 100」窗口显示近100平均
                if (tputWin === 1 && r100.count > 0 && r100.decodeMs > 0) {
                  return t('stats.tokensPerSecond', { throughput: formatTokensPerSecond(r100.outputTokens / (r100.decodeMs / 1e3)) })
                }
                return stats.decodeMs > 0 ? t('stats.tokensPerSecond', { throughput: formatTokensPerSecond(stats.decodeTokens / (stats.decodeMs / 1e3)) }) : null
              },
              cacheHit: () => usageActive && (separate ? (usage.cacheReadTokens || 0) > 0 : cacheHitPct !== null)
                ? (separate ? tb('cacheHit', { tokens: formatTokens(usage.cacheReadTokens) }) : t('stats.cacheHit', { percent: cacheHitPct }))
                : null,
              tokens: () => {
                if (!usageActive) return null
                // 修订 130：底栏 token 跟随详情滑槽——「最近 100」窗口显示近100各桶
                if (tputWin === 1 && r100.count > 0) {
                  return tb('input', {
                    input: formatTokens(separate ? r100.inTokens - r100.readTokens : r100.inTokens),
                    output: formatTokens(r100.outputTokens),
                  })
                }
                return tb('input', {
                  input: formatTokens(separate ? (usage.uncachedInputTokens || 0) + (usage.cacheWriteTokens || 0) : billedInputTokens(usage)),
                  output: formatTokens(usage.outputTokens || 0),
                })
              },
              cost: () => {
                if (estimate === null) return usageActive ? '计算中…' : null
                return costGroup(estimate, precision, null)
              },
              // 修订 78/79/85/91：峰谷提醒分段——价格跟随明细滑槽所选模型(多模型
              // 时带短模型名),标注桶类型(输入)与参考/实际身份
              peak: () => {
                if (estimate === null || estimate.peak === undefined || !estimate.peak.enabled) return null
                const p = estimate.peak
                const models = Array.isArray(p.models) && p.models.length > 0 ? p.models : null
                const idx = models !== null ? Math.min(peakModelIdx, models.length - 1) : 0
                const cur = models !== null ? models[idx] : p
                // 修订 122/124：底栏币种——栏内 barCur 决定(点 USD/CNY 跟随,
                // 「两类」保持当前显示不跳动);模型无 alt(CNY)时回落主币种
                const hasCny = cur.baseAltIn !== null && cur.baseAltIn !== undefined
                const useCny = barCur === 'cny' && hasCny
                const inPrice = p.window === 'peak'
                  ? (useCny ? cur.peakAltIn : cur.peakIn)
                  : (useCny ? cur.baseAltIn : cur.baseIn)
                const inCurrency = useCny ? 'CNY' : (cur.currency || 'USD')
                const priceText = inPrice !== null && inPrice !== undefined ? compactMoney(inPrice, inCurrency, 'compact') + '/1M' : ''
                const when = p.window === 'peak' ? '⏱ 高峰' : '⏱ 空闲'
                const ref = p.priced ? '' : ' 参考'
                const modelTag = models !== null && models.length > 1
                  ? ({ 'deepseek-v4-flash': ' Flash', 'deepseek-v4-pro': ' Pro' }[cur.model] || ' ' + cur.model)
                  : ''
                return when + ref + modelTag + ' 输入 ' + priceText
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
              // 修订 134：点击时立即取消悬停黑条定时器(否则 260ms 后黑条与弹层
              // 打架,造成「点开响应变慢/乱」的感觉),确认延迟 160→100ms
              if (timerRef.current !== null) { timerRef.current(); timerRef.current = null }
              setPos(null)
              segClickTimerRef.current = ctx.timeout(() => {
                segClickTimerRef.current = null
                toggleDetail(segId, el)
              }, 100)
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
              // 修订 82/84/87：峰谷分段状态类——胶囊背景条件=「计费开关开 ∧ 高峰
              // 时段」(用户拍板:谷期不用管);非官方/未计价保持低调参考样式
              let segClass = 'dsh-seg'
              let peakPriceText = ''
              if (group.id === 'peak' && estimate !== null && estimate.peak !== undefined && estimate.peak.enabled) {
                const pk = estimate.peak
                if (pk.billing === true && pk.window === 'peak') {
                  segClass += ' dsh-seg-peak'
                } else if (pk.priced !== true) {
                  segClass += ' dsh-seg-ref'
                }
                const sp = group.text.lastIndexOf(' ')
                if (sp !== -1) {
                  peakPriceText = group.text.slice(sp + 1)
                  group.text = group.text.slice(0, sp)
                }
              }
              const isPeakWindow = group.id === 'peak' && estimate !== null && estimate.peak !== undefined && estimate.peak.window === 'peak'
              children.push(React.createElement('span', {
                className: segClass, key: group.id, title: '点击查看明细',
                onClick: (e) => onSegClick(group.id, e.currentTarget),
                onDoubleClick: cancelSegClick,
              },
                group.text,
                peakPriceText !== ''
                  ? React.createElement('span', { className: 'dsh-seg-price' + (isPeakWindow ? ' dsh-seg-price-hot' : '') }, ' ' + peakPriceText)
                  : null,
              ))
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
              timerRef.current = ctx.timeout(() => { timerRef.current = null; show() }, 260)
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
                case 'throughput': {
                  // 修订 126：统计窗口滑槽——「全部 / 最近 100」切换,数据跟随
                  const isRecent = tputWin === 1
                  const win = isRecent
                    ? { decodeMs: r100.decodeMs, decodeTokens: r100.outputTokens, ttftMs: r100.ttftMs, ttftN: r100.count }
                    : { decodeMs: stats.decodeMs, decodeTokens: stats.decodeTokens, ttftMs: stats.ttftSteps > 0 ? stats.ttftMs / stats.ttftSteps : null, ttftN: isRecent ? 0 : stats.steps }
                  const rows = [{
                    slider: true,
                    models: ['全部', '最近 100'],
                    curIdx: tputWin,
                    onPick: chooseTputWin,
                  }]
                  rows.push(['平均吞吐', formatTokensPerSecond(win.decodeMs > 0 ? win.decodeTokens / (win.decodeMs / 1e3) : 0) + ' tok/s'])
                  rows.push(['输出 token', formatTokens(win.decodeTokens) + ' tok'])
                  rows.push(['解码时长', formatDuration(win.decodeMs)])
                  rows.push([isRecent ? '请求数' : '步数', String(win.ttftN)])
                  if (win.ttftMs !== null) rows.push(['平均首 token', formatDuration(win.ttftMs)])
                  return rows
                }
                case 'cacheHit': return usageActive
                  ? [['缓存命中', formatTokens(usage.cacheReadTokens || 0) + ' tok'], ['输入总量', formatTokens(billedInputTokens(usage)) + ' tok'], ['命中率', cacheHitPct === null ? '—' : cacheHitPct + '%']]
                  : null
                case 'tokens': {
                  // 修订 129：token 明细联动统计窗口滑槽——「全部 / 最近 100」
                  const rows = [{
                    slider: true,
                    models: ['全部', '最近 100'],
                    curIdx: tputWin,
                    onPick: chooseTputWin,
                  }]
                  if (tputWin === 1) {
                    // 修订 132：按真实桶拆分——「未缓存输入」= 总输入−缓存读−缓存写,
                    // 与底栏 separate 口径一致(之前误显示总输入,标签名不副实)
                    rows.push(['未缓存输入', formatTokens(r100.inTokens - r100.readTokens - r100.writeTokens) + ' tok'])
                    rows.push(['缓存读', formatTokens(r100.readTokens) + ' tok'])
                    rows.push(['缓存写', formatTokens(r100.writeTokens) + ' tok'])
                    rows.push(['输出', formatTokens(r100.outputTokens) + ' tok'])
                  } else if (usageActive) {
                    rows.push(['未缓存输入', formatTokens(usage.uncachedInputTokens || 0) + ' tok'])
                    rows.push(['缓存读', formatTokens(usage.cacheReadTokens || 0) + ' tok'])
                    rows.push(['缓存写', formatTokens(usage.cacheWriteTokens || 0) + ' tok'])
                    rows.push(['输出', formatTokens(usage.outputTokens || 0) + ' tok'])
                  }
                  return rows
                }
                default: return null
              }
            }
            // 修订 84：峰谷明细 = 高峰/空闲价格对比表格（当前时段列高亮）+ 规则行
            const peakDetail = () => {
              if (estimate === null || estimate.peak === undefined || !estimate.peak.enabled) return null
              const p = estimate.peak
              const nodes = []
              const money = (v, altV) => {
                const usd = v !== null && v !== undefined ? compactMoney(v, 'USD', 'compact') + '/1M' : null
                const cny = altV !== null && altV !== undefined ? compactMoney(altV, 'CNY', 'compact') + '/1M' : null
                if (peakCur === 'usd') return usd !== null ? usd : '—'
                if (peakCur === 'cny') return cny !== null ? cny : '—'
                return [usd, cny].filter((x) => x !== null).join(' / ') || '—'
              }
              const hot = p.window === 'peak' ? 'peak' : 'base'
              const cell = (text, head, colHot, keyNum) => React.createElement('span', {
                className: 'dsh-peak-cell' + (head ? ' dsh-peak-cell-head' : '') + (colHot ? ' dsh-peak-cell-hot' : ''),
                key: 'pc' + keyNum,
              }, text)
              nodes.push(React.createElement('div', { className: 'dsh-detail-row', key: 'cur' },
                React.createElement('span', null, '当前时段'),
                React.createElement('span', null, p.window === 'peak' ? '高峰' : '空闲'),
              ))
              nodes.push(React.createElement('div', { className: 'dsh-detail-row', key: 'bill' },
                React.createElement('span', null, '实际计费'),
                React.createElement('span', null, p.priced ? '按当前时段价' : '本渠道不计峰谷 · 按基价(空闲价)'),
              ))
              // 修订 88/89：官方峰谷价按模型展示——多模型时给「占一行左右切换」
              const modelLabel = (m) => ({ 'deepseek-v4-flash': 'DeepSeek V4 Flash', 'deepseek-v4-pro': 'DeepSeek V4 Pro' }[m] || m)
              const modelList = Array.isArray(p.models) && p.models.length > 0 ? p.models : null
              const curIdx = modelList !== null ? Math.min(peakModelIdx, modelList.length - 1) : 0
              const curModel = modelList !== null ? modelList[curIdx] : p
              const tableFor = (mm, tblKey) => React.createElement('div', { className: 'dsh-peak-table', key: tblKey },
                cell('单价(1M)', true, false, 0),
                cell('高峰', true, hot === 'peak', 1),
                cell('空闲', true, hot === 'base', 2),
                cell('输入', false, false, 3),
                cell(money(mm.peakIn, mm.peakAltIn), false, hot === 'peak', 4),
                cell(money(mm.baseIn, mm.baseAltIn), false, hot === 'base', 5),
                cell('缓存读', false, false, 6),
                cell(money(mm.peakRead, mm.peakAltRead), false, hot === 'peak', 7),
                cell(money(mm.baseRead, mm.baseAltRead), false, hot === 'base', 8),
                cell('输出', false, false, 9),
                cell(money(mm.peakOut, mm.peakAltOut), false, hot === 'peak', 10),
                cell(money(mm.baseOut, mm.baseAltOut), false, hot === 'base', 11),
              )
              if (modelList !== null && modelList.length > 1) {
                nodes.push(React.createElement(PeakModelSlider, { key: 'sl', models: modelList, curIdx, onPick: setPeakModelIdx, label: modelLabel }))
              } else if (modelList !== null) {
                nodes.push(React.createElement('div', { className: 'dsh-peak-model', key: 'mh' }, modelLabel(curModel.model)))
              }
              // 修订 111：币种切换——USD(国际)/ CNY(中国区) / 两类,默认两类
              nodes.push(React.createElement('div', { className: 'dsh-cur-toggle', key: 'curt' },
                React.createElement('button', { className: 'dsh-cur-btn' + (peakCur === 'usd' ? ' dsh-on' : ''), onClick: () => chooseCur('usd') }, 'USD'),
                React.createElement('button', { className: 'dsh-cur-btn' + (peakCur === 'cny' ? ' dsh-on' : ''), onClick: () => chooseCur('cny') }, 'CNY'),
                React.createElement('button', { className: 'dsh-cur-btn' + (peakCur === 'both' ? ' dsh-on' : ''), onClick: () => chooseCur('both') }, '两类'),
              ))
              nodes.push(tableFor(curModel, 'tbl'))
              // 修订 92/120：高峰时段 chips——优先用该模型自己的窗口(通用峰谷),
              // 缺省回退 DeepSeek 默认窗口
              const rangeLabels = Array.isArray(p.ranges) && p.ranges.length > 0 ? p.ranges : ['9:00-12:00', '14:00-18:00']
              nodes.push(React.createElement('div', { className: 'dsh-detail-row', key: 'win' },
                React.createElement('span', null, '高峰时段'),
                React.createElement('span', { className: 'dsh-peak-ranges' },
                  rangeLabels.map((r) => React.createElement('span', { className: 'dsh-peak-range' + (p.activeRange === r ? ' dsh-peak-range-hot' : ''), key: r }, r + (p.activeRange === r ? ' · 当前' : ''))),
                ),
              ))
              nodes.push(React.createElement('div', { className: 'dsh-detail-row', key: 'off' },
                React.createElement('span', null, '空闲时段'),
                React.createElement('span', null, '其余时间（高峰一半）' + (p.window === 'offpeak' ? ' · 当前' : '')),
              ))
              nodes.push(React.createElement('div', { className: 'dsh-detail-row', key: 'tz' },
                React.createElement('span', null, '时区'),
                React.createElement('span', null, p.tz === undefined || p.tz === 'system' ? '跟随系统' : p.tz),
              ))
              nodes.push(React.createElement('div', { className: 'dsh-detail-row', key: 'ch' },
                React.createElement('span', null, '适用渠道'),
                React.createElement('span', null, Array.isArray(p.providers) && p.providers.length > 0 ? p.providers.join(', ') : '未配置'),
              ))
              return nodes
            }
            const costDetail = () => {
              if (typeof estimate !== 'object' || estimate === null || !estimate.hasUsage) return null
              const nodes = []
              // 修订 75/79：峰谷计价实际套用时,明细面板首行标注当前时段
              if (estimate.peak !== undefined && estimate.peak.priced) {
                nodes.push(React.createElement('div', { className: 'dsh-detail-row', key: 'peak' },
                  React.createElement('span', null, '当前时段'),
                  React.createElement('span', null, estimate.peak.window === 'peak' ? '高峰 · 9:00-12:00/14:00-18:00' : '空闲时段'),
                ))
              }
              if (Array.isArray(estimate.priced)) {
                for (const p of estimate.priced) {
                  nodes.push(React.createElement('div', { className: 'dsh-detail-model', key: 'm' + p.model }, p.model))
                  // 修订 103：价格来源标注(免费模型已有绿色徽章,不再重复)
                  if (p.free !== true) {
                    const srcMeta = {
                      official: ['按官方价估算', 'dsh-detail-src-official'],
                      global: ['你的全局价', 'dsh-detail-src-global'],
                      channel: ['渠道特选价', 'dsh-detail-src-channel'],
                    }
                    const sm = srcMeta[p.source]
                    if (sm !== undefined) {
                      nodes.push(React.createElement('span', { className: 'dsh-detail-src ' + sm[1], key: 'src' + p.model }, sm[0]))
                    }
                  }
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
                  if (p.free === true && p.refCost !== null && p.refCost !== undefined && p.refCost > 0) {
                    nodes.push(React.createElement('div', { className: 'dsh-free-badge', key: 'f' + p.model },
                      React.createElement('span', null, '🎉 免费渠道'),
                      React.createElement('span', null, '按官方价本应 ' + compactMoney(p.refCost, p.refCurrency, 'full') + ' · 已省 ' + compactMoney(p.refCost, p.refCurrency, 'full')),
                    ))
                  }
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
                  // 修订 104：未配置价格的模型给「一键按官方价配置」入口(最短路径闭环)
                  nodes.push(React.createElement('div', { className: 'dsh-detail-empty', key: 'ue' + u.model }, '未配置价格 · ' + formatTokens(toks) + ' tok'))
                  nodes.push(React.createElement('button', { className: 'dsh-detail-fix', key: 'uf' + u.model, onClick: () => { remote.setPrice({ model: u.model, price: {} }).catch((err) => console.error('dsh-bottom-bar: fix price failed', err)) } }, '按官方价一键配置'))
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
              : detailSeg === 'peak'
                ? peakDetail()
                : (() => {
                const rows = segDetailRows(detailSeg)
                if (rows === null) return null
                return rows.map((row, i) => (row !== null && row !== undefined && row.slider === true)
                  ? React.createElement(PeakModelSlider, { key: 'sl-' + i, models: row.models, curIdx: row.curIdx, onPick: row.onPick, label: (m) => m })
                  : React.createElement('div', { className: 'dsh-detail-row', key: i },
                    React.createElement('span', null, row[0]),
                    React.createElement('span', null, row[1]),
                  ),
                )
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
            const initPageCfg = getLocalConfig()
            const [segments, setSegments] = React.useState(Array.isArray(compositionValue) ? compositionValue : (initPageCfg && Array.isArray(initPageCfg.segments) ? initPageCfg.segments : null))
            const [loaded, setLoaded] = React.useState(Array.isArray(compositionValue) || !!(initPageCfg && Array.isArray(initPageCfg.segments)))
            const [mode, setMode] = React.useState(initPageCfg && (initPageCfg.mode === 'separate' || initPageCfg.mode === 'combined') ? initPageCfg.mode : 'separate')
            const [tooltipAlways, setTooltipAlways] = React.useState(initPageCfg ? initPageCfg.tooltip === 'always' : false)
            const [precision, setPrecision] = React.useState(initPageCfg && initPageCfg.precision === 'full' ? 'full' : 'compact')
            // 修订 75：峰谷定价开关 + 当前时段指示（DeepSeek 2026-08-17 起）
            const [peakEnabled, setPeakEnabled] = React.useState(initPageCfg ? initPageCfg.peakEnabled === true : false)
            const [peakRemind, setPeakRemind] = React.useState(initPageCfg ? initPageCfg.peakRemind === true : true)
            const [peakNow, setPeakNow] = React.useState(initPageCfg && (initPageCfg.peakNow === 'peak' || initPageCfg.peakNow === 'offpeak') ? initPageCfg.peakNow : null)
            // 修订 77：峰谷时区——'system'=跟随系统,或 'UTC±N' 固定偏移
            const [peakTz, setPeakTz] = React.useState(initPageCfg && typeof initPageCfg.peakTimezone === 'string' ? initPageCfg.peakTimezone : 'system')
            // 修订 108：峰谷适用渠道白名单(逗号分隔文本,默认官方 deepseek + opencode 系)
            const [peakProvidersText, setPeakProvidersText] = React.useState(initPageCfg && Array.isArray(initPageCfg.peakProviders) ? initPageCfg.peakProviders.join(', ') : 'deepseek, opencode, opencode-go')
            const [prices, setPrices] = React.useState(null)
            const [pricesOpen, setPricesOpen] = React.useState(false)
            // 修订 139：价格区三 tab(价格表/新增价格/厂商)——替代弹出/折叠
            const [priceTab, setPriceTab] = React.useState('table')
            const [addPending, setAddPending] = React.useState(false)
            const [builtinOpen, setBuiltinOpen] = React.useState(false)
            const [growPeak, setGrowPeak] = React.useState(new Set())
            const toggleGrowPeak = (model) => { setGrowPeak((s) => { const n = new Set(s); if (n.has(model)) n.delete(model); else n.add(model); return n }) }
            const [tplOpen, setTplOpen] = React.useState(false)
            const [usedModels, setUsedModels] = React.useState([])
            const [vendorTpl, setVendorTpl] = React.useState('auto')
            const [newModel, setNewModel] = React.useState('')
            const [newIn, setNewIn] = React.useState('')
            const [newInPeak, setNewInPeak] = React.useState('')
            const [newCtxLimit, setNewCtxLimit] = React.useState('')
            const [newCtxIn, setNewCtxIn] = React.useState('')
            const [customCurrency, setCustomCurrency] = React.useState('CNY')
            const [customOut, setCustomOut] = React.useState('')
            const [customRead, setCustomRead] = React.useState('')
            const [customWrite, setCustomWrite] = React.useState('')
            const [hovered, setHovered] = React.useState(null)
            const [dragFrom, setDragFrom] = React.useState(null)
            const dragFromRef = React.useRef(null)
            const [dropIndex, setDropIndex] = React.useState(null)
            const [indicatorTop, setIndicatorTop] = React.useState(null)
            const dropIndexRef = React.useRef(null)
            const listRef = React.useRef(null)
            const segmentsRef = React.useRef(null)
            const optionsRef = React.useRef({ mode: 'separate', tooltip: 'auto', precision: 'compact', peakEnabled: false, peakRemind: true, peakTimezone: 'system', peakProviders: ['deepseek', 'opencode', 'opencode-go'] })
            const rowRefs = React.useRef([])
            const flipTops = React.useRef(null)
            const previewDockRef = React.useRef(null)
            const previewSegRefs = React.useRef({})
            const [selectedIds, setSelectedIds] = React.useState(new Set())
            const selectedIdsRef = React.useRef(new Set())
            selectedIdsRef.current = selectedIds
            const lastClickedIndexRef = React.useRef(null)
            const [justMovedIds, setJustMovedIds] = React.useState(new Set())
            const [diag, setDiag] = React.useState(null)
            // 修订 34：客户端全量用量面板（浏览器侧全量折叠 = 唯一权威源）
            const [fullUsage, setFullUsage] = React.useState(null)
            const [fullAll, setFullAll] = React.useState(null)
            React.useEffect(() => {
              const onKeyDown = (e) => {
                if (e.key === 'Escape' && selectedIdsRef.current.size > 0) {
                  setSelectedIds(new Set())
                  selectedIdsRef.current = new Set()
                }
              }
              if (typeof window !== 'undefined') window.addEventListener('keydown', onKeyDown)
              return () => { if (typeof window !== 'undefined') window.removeEventListener('keydown', onKeyDown) }
            }, [])
            const hoverTimerRef = React.useRef(null)
            const handleHover = (id) => {
              if (hoverTimerRef.current !== null) {
                clearTimeout(hoverTimerRef.current)
                hoverTimerRef.current = null
              }
              setHovered(id)
            }
            const handleUnhover = () => {
              if (hoverTimerRef.current !== null) clearTimeout(hoverTimerRef.current)
              hoverTimerRef.current = setTimeout(() => {
                setHovered(null)
                hoverTimerRef.current = null
              }, 120)
            }
            // 鼠标悬停条目时：平滑将高光分段滑动对齐，两端自然吸附边框（不留虚空大空白，最多到边缘）；移开时不强行回弹
            React.useEffect(() => {
              const dock = previewDockRef.current
              if (dock === null || dock === undefined) return
              if (hovered !== null && previewSegRefs.current[hovered]) {
                const el = previewSegRefs.current[hovered]
                const elLeft = el.offsetLeft
                const elWidth = el.offsetWidth
                const dockWidth = dock.clientWidth
                const maxScroll = Math.max(0, dock.scrollWidth - dockWidth)
                if (maxScroll > 0) {
                  const idealScroll = elLeft - (dockWidth - elWidth) / 2
                  const targetScroll = Math.min(maxScroll, Math.max(0, idealScroll))
                  dock.scrollTo({ left: targetScroll, behavior: 'smooth' })
                }
              }
            }, [hovered])
            React.useEffect(() => {
              let cancelled = false
              remote.getConfig()
                .then((result) => {
                  if (cancelled) return
                  if (result && typeof result === 'object') setLocalConfig(result)
                  if (Array.isArray(result.segments)) { setSegments(result.segments); setCompositionState(result.segments) }
                  if (result.mode === 'separate' || result.mode === 'combined') { setMode(result.mode); optionsRef.current.mode = result.mode }
                  if (typeof result.tooltip === 'string') { setTooltipAlways(result.tooltip === 'always'); optionsRef.current.tooltip = result.tooltip }
                  if (result.precision === 'compact' || result.precision === 'full') { setPrecision(result.precision); optionsRef.current.precision = result.precision }
                  if (typeof result.peakEnabled === 'boolean') { setPeakEnabled(result.peakEnabled); optionsRef.current.peakEnabled = result.peakEnabled }
                  if (typeof result.peakRemind === 'boolean') { setPeakRemind(result.peakRemind); optionsRef.current.peakRemind = result.peakRemind }
                  if (typeof result.peakTimezone === 'string') { setPeakTz(result.peakTimezone); optionsRef.current.peakTimezone = result.peakTimezone }
                  if (Array.isArray(result.peakProviders)) { setPeakProvidersText(result.peakProviders.join(', ')); optionsRef.current.peakProviders = result.peakProviders }
                  if (result.peakNow === 'peak' || result.peakNow === 'offpeak') setPeakNow(result.peakNow)
                  setLoaded(true)
                })
                .catch(() => {})
              remote.getPrices().then((result) => { if (!cancelled && result.prices) setPrices(result.prices); if (!cancelled && Array.isArray(result.usedModels)) setUsedModels(result.usedModels) }).catch(() => {})
              remote.diagnostics().then((result) => { if (!cancelled) setDiag(result) }).catch(() => {})
              remote.getClientUsage().then((result) => { if (!cancelled && result.usage) setFullUsage(result.usage); if (!cancelled && result.all) setFullAll(result.all) }).catch(() => {})
              return () => { cancelled = true }
            }, [])
            // 修订 34/42：客户端全量面板每 1s 刷新（host 侧缓存底栏捎带的用量——
            // 3s 轮询 + 底栏 1s 心跳最坏要等 4s；修订 42 降为 1s 与心跳同频，≤1s 出数）
            React.useEffect(() => {
              let alive = true
              const timer = ctx.interval(() => {
                remote.getClientUsage().then((result) => {
                  if (!alive || !result.usage) return
                  setFullUsage(result.usage)
                  if (result.all) setFullAll(result.all)
                  if (result.usage.peak !== undefined && (result.usage.peak.window === 'peak' || result.usage.peak.window === 'offpeak')) setPeakNow(result.usage.peak.window)
                }).catch(() => {})
              }, 1000)
              return () => { alive = false; timer() }
            }, [])
            React.useEffect(() => {
              if (loaded) return
              const timer = ctx.timeout(() => setLoaded(true), 3000)
              return () => timer()
            }, [loaded])
            segmentsRef.current = segments
            optionsRef.current = { mode, tooltip: tooltipAlways ? 'always' : 'auto', precision, peakEnabled, peakRemind, peakTimezone: peakTz, peakProviders: peakProvidersText.split(',').map((s) => s.trim()).filter(Boolean) }
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
                  el.style.transition = 'transform 320ms cubic-bezier(0.2, 0.9, 0.3, 1.1)'
                  el.style.transform = 'translateY(0)'
                }
              })
            }, [segments])
            const saveOptions = (nextOptions, segs) => {
              optionsRef.current = nextOptions
              const payload = { segments: segs ?? segmentsRef.current, ...nextOptions }
              setLocalConfig(payload)
              remote.setConfig(payload)
                .then((result) => {
                  if (result && typeof result === 'object') setLocalConfig(result)
                  if (Array.isArray(result.segments)) { setSegments(result.segments); setCompositionState(result.segments) }
                  if (result.mode === 'separate' || result.mode === 'combined') { setMode(result.mode); optionsRef.current.mode = result.mode }
                  if (typeof result.tooltip === 'string') { setTooltipAlways(result.tooltip === 'always'); optionsRef.current.tooltip = result.tooltip }
                  if (result.precision === 'compact' || result.precision === 'full') { setPrecision(result.precision); optionsRef.current.precision = result.precision }
                  // 修订 80：峰谷三状态在 saveOptions 返回后回写（漏了→开关点了没反应）
                  if (typeof result.peakEnabled === 'boolean') { setPeakEnabled(result.peakEnabled); optionsRef.current.peakEnabled = result.peakEnabled }
                  if (typeof result.peakRemind === 'boolean') { setPeakRemind(result.peakRemind); optionsRef.current.peakRemind = result.peakRemind }
                  if (typeof result.peakTimezone === 'string') { setPeakTz(result.peakTimezone); optionsRef.current.peakTimezone = result.peakTimezone }
                  if (Array.isArray(result.peakProviders)) { setPeakProvidersText(result.peakProviders.join(', ')); optionsRef.current.peakProviders = result.peakProviders }
                  if (result.peakNow === 'peak' || result.peakNow === 'offpeak') setPeakNow(result.peakNow)
                })
                .catch((err) => console.error('dsh-bottom-bar: setConfig failed', err))
            }
            const apply = (next) => { setSegments(next); setCompositionState(next); saveOptions(optionsRef.current, next) }
            const dropAt = (to) => {
              const from = dragFromRef.current
              const current = segmentsRef.current
              if (from === null || !Array.isArray(current) || to === null) return
              const curSelected = selectedIdsRef.current
              const isBatch = curSelected.size > 1 && curSelected.has(current[from]?.id)

              flipTops.current = rowRefs.current.map((el) => (el === null || el === undefined ? 0 : el.getBoundingClientRect().top))

              if (isBatch) {
                // 严格按照列表中已有的原始顺序提取选中的分段项（原展现顺序）
                const movingItems = current.filter((s) => curSelected.has(s.id))
                const nonMovingItems = current.filter((s) => !curSelected.has(s.id))

                let insertIndex = 0
                for (let i = 0; i < to; i++) {
                  if (!curSelected.has(current[i].id)) {
                    insertIndex++
                  }
                }

                const next = nonMovingItems.slice()
                next.splice(insertIndex, 0, ...movingItems)
                if (next.map((s) => s.id).join(',') === current.map((s) => s.id).join(',')) {
                  setSelectedIds(new Set())
                  selectedIdsRef.current = new Set()
                  lastClickedIndexRef.current = null
                  return
                }
                segmentsRef.current = next
                setSegments(next)
                setCompositionState(next)
                setJustMovedIds(new Set(movingItems.map((m) => m.id)))
                ctx.timeout(() => setJustMovedIds(new Set()), 800)
              } else {
                if (to === from || to === from + 1) {
                  setSelectedIds(new Set())
                  selectedIdsRef.current = new Set()
                  lastClickedIndexRef.current = null
                  return
                }
                const next = current.slice()
                const item = next.splice(from, 1)[0]
                next.splice(to > from ? to - 1 : to, 0, item)
                segmentsRef.current = next
                setSegments(next)
                setCompositionState(next)
                setJustMovedIds(new Set([item.id]))
                ctx.timeout(() => setJustMovedIds(new Set()), 800)
              }
              // 拖拽落位后直接结束选取状态
              setSelectedIds(new Set())
              selectedIdsRef.current = new Set()
              lastClickedIndexRef.current = null
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
              // 拖拽结束后立即清空选取
              setSelectedIds(new Set())
              selectedIdsRef.current = new Set()
              lastClickedIndexRef.current = null
              if (Array.isArray(segmentsRef.current)) saveOptions(optionsRef.current)
            }
            const onRowClick = (index, segId, e) => {
              const current = segmentsRef.current || []
              if (e.shiftKey && lastClickedIndexRef.current !== null && lastClickedIndexRef.current !== index) {
                const start = Math.min(lastClickedIndexRef.current, index)
                const end = Math.max(lastClickedIndexRef.current, index)
                const next = new Set(selectedIdsRef.current)
                for (let i = start; i <= end; i++) {
                  if (current[i]) next.add(current[i].id)
                }
                selectedIdsRef.current = next
                setSelectedIds(next)
                lastClickedIndexRef.current = index
              } else if (e.ctrlKey || e.metaKey) {
                const next = new Set(selectedIdsRef.current)
                if (next.has(segId)) next.delete(segId)
                else next.add(segId)
                selectedIdsRef.current = next
                setSelectedIds(next)
                lastClickedIndexRef.current = index
              } else {
                // 普通点按：绝不触发多选；若当前有多选状态则直接清空
                if (selectedIdsRef.current.size > 0) {
                  selectedIdsRef.current = new Set()
                  setSelectedIds(new Set())
                }
                lastClickedIndexRef.current = index
              }
            }
            const onRowDragStart = (index, segId, e) => {
              let cur = selectedIdsRef.current
              if (e.ctrlKey || e.metaKey) {
                cur = new Set(cur)
                cur.add(segId)
                selectedIdsRef.current = cur
                setSelectedIds(cur)
              } else if (!cur.has(segId)) {
                // 未按住 Ctrl 拖拽未选中的行时，清空多选，只拖拽当前行
                cur = new Set()
                selectedIdsRef.current = cur
                setSelectedIds(cur)
              }
              lastClickedIndexRef.current = index
              setDragFrom(index)
              dragFromRef.current = index
              e.dataTransfer.effectAllowed = 'move'
              e.dataTransfer.dropEffect = 'move'
            }
            const move = (index, delta) => {
              if (!Array.isArray(segments)) return
              const j = index + delta
              if (j < 0 || j >= segments.length) return
              flipTops.current = rowRefs.current.map((el) => el === null || el === undefined ? 0 : el.getBoundingClientRect().top)
              const next = segments.slice()
              const tmp = next[index]; next[index] = next[j]; next[j] = tmp
              setJustMovedIds(new Set([tmp.id]))
              ctx.timeout(() => setJustMovedIds(new Set()), 800)
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
            // 修订 75：峰谷计价开关
            const togglePeak = () => { if (!Array.isArray(segments)) return; saveOptions({ ...optionsRef.current, peakEnabled: !peakEnabled }) }
            // 修订 79：峰谷提醒开关（仅显示时段,不改价格）
            const togglePeakRemind = () => { if (!Array.isArray(segments)) return; saveOptions({ ...optionsRef.current, peakRemind: !peakRemind }) }
            // 修订 77：峰谷时区切换
            const togglePeakTz = (v) => { if (!Array.isArray(segments)) return; saveOptions({ ...optionsRef.current, peakTimezone: v }) }
            // 修订 108：峰谷适用渠道保存(逗号分隔 → 数组)
            const savePeakProviders = () => {
              if (!Array.isArray(segments)) return
              const list = peakProvidersText.split(',').map((s) => s.trim()).filter(Boolean)
              if (list.length === 0) return
              setPeakProvidersText(list.join(', '))
              saveOptions({ ...optionsRef.current, peakProviders: list })
            }
            const reset = () => {
              if (!Array.isArray(segments)) return
              remote.resetConfig().then((result) => {
                if (Array.isArray(result.segments)) { setSegments(result.segments); setCompositionState(result.segments) }
                if (result.mode === 'separate' || result.mode === 'combined') { setMode(result.mode); optionsRef.current.mode = result.mode }
                if (typeof result.tooltip === 'string') { setTooltipAlways(result.tooltip === 'always'); optionsRef.current.tooltip = result.tooltip }
                if (result.precision === 'compact' || result.precision === 'full') { setPrecision(result.precision); optionsRef.current.precision = result.precision }
                if (typeof result.peakEnabled === 'boolean') { setPeakEnabled(result.peakEnabled); optionsRef.current.peakEnabled = result.peakEnabled }
                if (typeof result.peakRemind === 'boolean') { setPeakRemind(result.peakRemind); optionsRef.current.peakRemind = result.peakRemind }
                if (typeof result.peakTimezone === 'string') { setPeakTz(result.peakTimezone); optionsRef.current.peakTimezone = result.peakTimezone }
                if (Array.isArray(result.peakProviders)) { setPeakProvidersText(result.peakProviders.join(', ')); optionsRef.current.peakProviders = result.peakProviders }
                if (result.peakNow === 'peak' || result.peakNow === 'offpeak') setPeakNow(result.peakNow)
              }).catch(() => {})
            }
            const updatePrice = (model, patch) => {
              if (!Array.isArray(prices)) return
              const cur = prices.find((p) => p.model === model)
              const next = { model, currency: cur ? cur.currency : 'USD', in: cur ? cur.in : 0, cacheRead: cur ? cur.cacheRead : undefined, cacheWrite: cur ? cur.cacheWrite : undefined, out: cur ? cur.out : 0, builtin: cur ? cur.builtin : false, peak: cur && cur.peak ? cur.peak : undefined, ...patch }
              setPrices(prices.map((p) => p.model === model ? next : p))
              remote.setPrice({ model, price: { currency: next.currency, in: next.in, cacheRead: next.cacheRead === undefined ? null : next.cacheRead, cacheWrite: next.cacheWrite === undefined ? null : next.cacheWrite, out: next.out, peak: next.peak === undefined ? undefined : next.peak } })
                .then((result) => { if (result.prices) setPrices(result.prices) })
                .catch((err) => console.error('dsh-bottom-bar: setPrice failed', err))
            }
            const removePrice = (model) => {
              remote.removePrice({ model }).then((result) => { if (result.prices) setPrices(result.prices) }).catch((err) => console.error('dsh-bottom-bar: removePrice failed', err))
            }
            // 峰谷时区选项:跟随系统 + UTC 固定偏移
            const TZ_OPTIONS = ['system', 'UTC']
            for (let tzi = 1; tzi <= 12; tzi++) TZ_OPTIONS.push('UTC+' + tzi)
            for (let tzi = 1; tzi <= 12; tzi++) TZ_OPTIONS.push('UTC-' + tzi)
            // 修订 100：厂商比例模板只按 2026 年模型采样（旧系列不进下拉,
            // auto 识别时内联兼容比例,见 computePreviewPrice）。
            const VENDOR_TEMPLATES = [
              { id: 'auto', name: '⚡ 自动识别（默认）' },
              { id: 'deepseek-v4', name: '🐳 DeepSeek V4', currency: 'USD', out: 3, read: 0.0318, write: 0 },
              { id: 'claude', name: '⚡ Claude', currency: 'USD', out: 5, read: 0.1, write: 1.25 },
              { id: 'openai-gpt5', name: '🧠 GPT-5.x', currency: 'USD', out: 6, read: 0.1, write: 1.25 },
              { id: 'gemini', name: '🌐 Gemini 3', currency: 'USD', out: 4, read: 0.25, write: 1.0 },
              { id: 'kimi', name: '🌙 Kimi K3', currency: 'CNY', out: 4, read: 0.2, write: 1.0 },
              { id: 'qwen35', name: '🇨🇳 Qwen 3.5', currency: 'CNY', out: 5, read: 0.1667, write: 1.0 },
              { id: 'glm', name: '📘 GLM 5', currency: 'CNY', out: 3.5, read: 0.2, write: 1.0 },
              { id: 'minimax', name: '🤖 MiniMax M3', currency: 'CNY', out: 4, read: 0.1, write: 1.0 },
              { id: 'doubao', name: '⚡ 豆包 Seed 2', currency: 'CNY', out: 4, read: 0.1, write: 1.0 },
              { id: 'grok', name: '🪐 Grok 4', currency: 'USD', out: 5, read: 0.1, write: 1.0 },
              { id: 'custom', name: '⚙️ 手动填写' },
            ]
            // 旧系列兼容比例（2025 及更早,不进下拉;auto 命中时内联使用,不写错价）
            const LEGACY_TPLS = {
              openaiClassic: { currency: 'USD', out: 4, read: 0.5, write: 1.0 },
              deepseekV3: { currency: 'CNY', out: 4, read: 0.25, write: 1.0 },
              qwenClassic: { currency: 'CNY', out: 3, read: 0.25, write: 1.0 },
              generic: { currency: 'USD', out: 4, read: 0.25, write: 1.0 },
            }

            const computePreviewPrice = () => {
              const inVal = Number(newIn)
              const inPrice = Number.isFinite(inVal) && inVal >= 0 ? inVal : 0
              if (vendorTpl === 'custom') {
                return {
                  currency: customCurrency,
                  in: inPrice,
                  cacheRead: customRead === '' ? undefined : Number(customRead),
                  cacheWrite: customWrite === '' ? undefined : Number(customWrite),
                  out: customOut === '' ? inPrice * 2 : Number(customOut),
                  tplName: '自定义单价',
                }
              }
              let tpl = VENDOR_TEMPLATES.find((t) => t.id === vendorTpl)
              let tplName = ''
              if (!tpl || tpl.id === 'auto') {
                const m = newModel.toLowerCase()
                if (m.includes('claude') || m.includes('anthropic')) tpl = VENDOR_TEMPLATES.find((t) => t.id === 'claude')
                else if (m.includes('grok')) tpl = VENDOR_TEMPLATES.find((t) => t.id === 'grok')
                else if (m.includes('gpt') || m.includes('openai') || m.includes('o1') || m.includes('o3') || m.includes('o4')) {
                  // GPT-5.x 用 2026 模板;4o/o 系列旧模型用兼容比例
                  tpl = m.includes('gpt-5') ? VENDOR_TEMPLATES.find((t) => t.id === 'openai-gpt5') : LEGACY_TPLS.openaiClassic
                } else if (m.includes('gemini') || m.includes('google')) tpl = VENDOR_TEMPLATES.find((t) => t.id === 'gemini')
                else if (m.includes('kimi') || m.includes('moonshot')) tpl = VENDOR_TEMPLATES.find((t) => t.id === 'kimi')
                else if (m.includes('deepseek')) {
                  tpl = (m.includes('v4') || m.includes('flash')) ? VENDOR_TEMPLATES.find((t) => t.id === 'deepseek-v4') : LEGACY_TPLS.deepseekV3
                } else if (m.includes('glm')) tpl = VENDOR_TEMPLATES.find((t) => t.id === 'glm')
                else if (m.includes('minimax')) tpl = VENDOR_TEMPLATES.find((t) => t.id === 'minimax')
                else if (m.includes('doubao')) tpl = VENDOR_TEMPLATES.find((t) => t.id === 'doubao')
                else if (m.includes('qwen')) {
                  tpl = (m.includes('qwen3-5') || m.includes('qwen3.5')) ? VENDOR_TEMPLATES.find((t) => t.id === 'qwen35') : LEGACY_TPLS.qwenClassic
                } else {
                  tpl = LEGACY_TPLS.generic
                  tplName = '通用比例（未识别厂商）'
                }
              }
              const curr = tpl.currency || 'CNY'
              return {
                currency: curr,
                in: inPrice,
                cacheRead: Math.round(inPrice * tpl.read * 1000) / 1000,
                cacheWrite: Math.round(inPrice * tpl.write * 1000) / 1000,
                out: Math.round(inPrice * tpl.out * 1000) / 1000,
                // 修订 142：LEGACY_TPLS 无 name → 显示兼容比例标签(原来 undefined)
                tplName: tplName !== '' ? tplName : (tpl.name !== undefined ? tpl.name : '兼容比例(旧系列)'),
              }
            }

            const addPrice = () => {
              const id = newModel.trim()
              if (id === '') return
              const computed = computePreviewPrice()
              // 修订 119：高峰输入价(可选)——填了就给该价配峰谷双价,其余桶按比例派生
              const peakInVal = Number(newInPeak)
              const hasPeak = newInPeak.trim() !== '' && Number.isFinite(peakInVal) && peakInVal >= 0
              const tplRatio = computed.out !== 0 && computed.in !== 0 ? computed.out / computed.in : 3
              const peak = hasPeak
                ? {
                    currency: computed.currency,
                    in: peakInVal,
                    cacheRead: computed.cacheRead !== undefined ? Math.round(peakInVal * (computed.cacheRead / computed.in) * 1000) / 1000 : null,
                    cacheWrite: computed.cacheWrite !== undefined ? Math.round(peakInVal * (computed.cacheWrite / computed.in) * 1000) / 1000 : null,
                    out: Math.round(peakInVal * tplRatio * 1000) / 1000,
                  }
                : undefined
              // 修订 140：上下文长度分档(可选)——临界 + 超档输入价(缺省=主价×2),
              // 其余桶按主价比例派生;超档未给 peak 时自动继承主峰谷(计价时峰谷叠档)
              const ctxLimitVal = Number(newCtxLimit)
              const hasCtx = newCtxLimit.trim() !== '' && Number.isFinite(ctxLimitVal) && ctxLimitVal > 0
              const ctxInVal = newCtxIn.trim() !== '' && Number.isFinite(Number(newCtxIn)) && Number(newCtxIn) >= 0 ? Number(newCtxIn) : Math.round(computed.in * 2 * 1000) / 1000
              const ctxScales = hasCtx
                ? [{
                    limit: ctxLimitVal,
                    price: {
                      currency: computed.currency,
                      in: ctxInVal,
                      cacheRead: computed.cacheRead !== undefined ? Math.round(ctxInVal * (computed.cacheRead / computed.in) * 1000) / 1000 : null,
                      cacheWrite: computed.cacheWrite !== undefined ? Math.round(ctxInVal * (computed.cacheWrite / computed.in) * 1000) / 1000 : null,
                      out: Math.round(ctxInVal * tplRatio * 1000) / 1000,
                    },
                  }]
                : undefined
              setNewModel('')
              setNewIn('')
              setNewInPeak('')
              setNewCtxLimit('')
              setNewCtxIn('')
              setCustomOut('')
              setCustomRead('')
              setCustomWrite('')
              remote.setPrice({
                model: id,
                price: {
                  currency: computed.currency,
                  in: computed.in,
                  cacheRead: computed.cacheRead === undefined ? null : computed.cacheRead,
                  cacheWrite: computed.cacheWrite === undefined ? null : computed.cacheWrite,
                  out: computed.out,
                  peak,
                  ctxScales,
                },
              })
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
            const fullCell = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, whiteSpace: 'nowrap', lineHeight: '18px' }
            const fullGrid = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '5px 16px' }
            const fullDivider = { borderTop: '1px solid var(--dsw-alias-border-l2)', margin: '3px 0' }
            const fullValue = { fontWeight: 500, color: 'var(--dsw-alias-label-primary)' }
            const fullTok = { fontSize: 10, lineHeight: '16px', color: 'var(--dsw-alias-label-tertiary)' }
            // 修订 106：导出费用统计为 PNG(canvas 手绘分享卡)
            const exportSummaryImage = () => {
              const all = fullAll
              if (!all || all.hasUsage !== true) return
              const isDark = document.body !== null && document.body.getAttribute('data-ds-dark-theme') !== null
              // 主题色(canvas 直接读 CSS 变量,跟随主题)
              const cssVar = (name, fb) => {
                try {
                  const v = window.getComputedStyle(document.body).getPropertyValue(name).trim()
                  return v !== '' ? v : fb
                } catch (e) { return fb }
              }
              const brand = cssVar('--dsw-alias-brand-primary', isDark ? '#f2b18c' : '#c15f3c')
              const textMain = isDark ? '#eaeae8' : '#22221f'
              const textSub = isDark ? '#9c9c9a' : '#7a7a77'
              const lineC = isDark ? '#343437' : '#e4e4e2'
              const cardBg = isDark ? '#242427' : '#f2f2f0'
              const green = '#10b981'
              const blue = '#4a90d9'
              // 圆角矩形
              const rr = (x, y, w, h, r, fill) => {
                ctx.beginPath()
                ctx.moveTo(x + r, y)
                ctx.arcTo(x + w, y, x + w, y + h, r)
                ctx.arcTo(x + w, y + h, x, y + h, r)
                ctx.arcTo(x, y + h, x, y, r)
                ctx.arcTo(x, y, x + w, y, r)
                ctx.closePath()
                ctx.fillStyle = fill
                ctx.fill()
              }
              const alpha = (hex, a) => {
                // 修订 117：兼容主题色为 rgb()/rgba() 形式(默认主题可能返回 rgba)
                const s = String(hex).trim()
                let rgb = null
                if (s.charAt(0) === '#') {
                  const n = parseInt(s.slice(1), 16)
                  if (!Number.isNaN(n)) rgb = [((n >> 16) & 255), ((n >> 8) & 255), (n & 255)]
                } else {
                  const m = /rgba?\(([^)]+)\)/.exec(s)
                  if (m !== null) {
                    const parts = m[1].split(',').map((x) => parseFloat(x))
                    if (parts.length >= 3 && parts.slice(0, 3).every((x) => !Number.isNaN(x))) rgb = parts.slice(0, 3)
                  }
                }
                return rgb === null ? 'rgba(128,128,128,' + a + ')' : 'rgba(' + rgb[0] + ',' + rgb[1] + ',' + rgb[2] + ',' + a + ')'
              }
              const mono = '"SF Mono", Consolas, monospace'
              // 自适应字号:放得下就不缩,依次 17/14/12
              const fitFont = (text, maxW, base) => {
                let size = base
                ctx.font = '700 ' + size + 'px ' + mono
                while (size > 11 && ctx.measureText(text).width > maxW) {
                  size -= 1
                  ctx.font = '700 ' + size + 'px ' + mono
                }
                return size
              }
              const pad = 32
              const w = 720
              const bodyW = w - pad * 2
              const rows = all.rows.slice(0, 20)
              const cardH = 84
              const gap = 14
              const rowH = 40
              const listTop = pad + 46 + cardH + gap + 34
              const h = listTop + rows.length * rowH + 44 + 26
              const cv = document.createElement('canvas')
              cv.width = w
              cv.height = h
              const ctx = cv.getContext('2d')
              // 背景(暖灰底) + 主卡(圆角 + 细边框 = 卡片层次感)
              ctx.fillStyle = isDark ? '#131315' : '#efeeec'
              ctx.fillRect(0, 0, w, h)
              ctx.textBaseline = 'alphabetic'
              const cardX = 8
              const cardY = 8
              const cardW = w - 16
              const cardH2 = h - 16
              rr(cardX, cardY, cardW, cardH2, 20, isDark ? '#1b1b1e' : '#fdfdfb')
              ctx.strokeStyle = isDark ? '#2c2c30' : '#e8e6e4'
              ctx.lineWidth = 1
              ctx.beginPath()
              ctx.moveTo(cardX + 20, cardY)
              ctx.arcTo(cardX + cardW, cardY, cardX + cardW, cardY + cardH2, 20)
              ctx.arcTo(cardX + cardW, cardY + cardH2, cardX, cardY + cardH2, 20)
              ctx.arcTo(cardX, cardY + cardH2, cardX, cardY, 20)
              ctx.arcTo(cardX, cardY, cardX + cardW, cardY, 20)
              ctx.closePath()
              ctx.stroke()
              // 品牌 logo 方块(30px,品牌色圆角方块 + 白色 D)
              const logoX = pad
              const logoY = 26
              rr(logoX, logoY, 30, 30, 9, brand)
              ctx.fillStyle = isDark ? '#19191c' : '#ffffff'
              ctx.font = '800 16px sans-serif'
              ctx.textAlign = 'center'
              ctx.fillText('D', logoX + 15, logoY + 21)
              ctx.textAlign = 'left'
              // 标题 + 日期
              ctx.fillStyle = brand
              ctx.font = '700 22px sans-serif'
              ctx.fillText('DSH 费用统计', logoX + 42, logoY + 21)
              ctx.fillStyle = textSub
              ctx.font = 'normal 11px sans-serif'
              ctx.textAlign = 'right'
              ctx.fillText(all.at ? new Date(all.at).toLocaleString() : '', w - pad, logoY + 19)
              ctx.textAlign = 'left'
              // 三个统计块(等宽数字 + 自适应字号)
              const blockW = (bodyW - gap * 2) / 3
              const blocks = [
                { label: '总 Tokens', value: formatTokens(all.totalTokens), fill: alpha(brand, 0.14), val: brand },
                { label: '预估费用', value: Object.keys(all.totals).map((k) => compactMoney(all.totals[k], k, 'full')).join(' + '), fill: alpha(blue, 0.14), val: blue },
                { label: '缓存命中率', value: all.hitRate === null ? '—' : all.hitRate + '%', fill: alpha(green, 0.14), val: green },
              ]
              blocks.forEach((b, i) => {
                const bx = pad + i * (blockW + gap)
                rr(bx, pad + 40, blockW, cardH, 14, b.fill)
                ctx.fillStyle = textSub
                ctx.font = '500 11px sans-serif'
                ctx.fillText(b.label, bx + 14, pad + 40 + 22)
                ctx.fillStyle = b.val
                const size = fitFont(b.value, blockW - 28, 17)
                ctx.fillText(b.value, bx + 14, pad + 40 + 52)
              })
              // 明细区标题
              ctx.fillStyle = textMain
              ctx.font = '600 13px sans-serif'
              ctx.fillText('分渠道明细', pad, listTop - 12)
              ctx.strokeStyle = lineC
              ctx.beginPath()
              ctx.moveTo(pad, listTop - 4)
              ctx.lineTo(w - pad, listTop - 4)
              ctx.stroke()
              // 明细行:来源色点 + 名称 / token / 费用 + 次行各桶消耗小字(修订 115)
              let y = listTop + 6
              for (const r of rows) {
                const dot = r.free ? green : (r.source === 'channel' ? brand : (r.source === 'global' ? blue : textSub))
                // 字母徽章(无 logo 的分享卡用:品牌色底 + 模型首字母)
                const letter = (r.model || r.key).charAt(0).toUpperCase() || '?'
                rr(pad + 1, y - 16, 16, 16, 4, dot)
                ctx.fillStyle = '#ffffff'
                ctx.font = '700 10px sans-serif'
                ctx.textAlign = 'center'
                ctx.fillText(letter, pad + 9, y - 5)
                ctx.textAlign = 'left'
                ctx.fillStyle = r.free ? green : textMain
                ctx.font = r.free ? '600 13px sans-serif' : '500 13px sans-serif'
                const name = r.key.length > 30 ? r.key.slice(0, 29) + '…' : r.key
                ctx.fillText(name, pad + 16, y)
                const costText = r.free ? ('免费省 ' + (r.refCost !== null && r.refCost !== undefined ? compactMoney(r.refCost, r.refCurrency, 'compact') : '')) : compactMoney(r.cost, r.currency, 'compact')
                ctx.textAlign = 'right'
                ctx.font = (r.free ? '600 ' : 'normal ') + '12px ' + mono
                ctx.fillStyle = r.free ? green : textMain
                ctx.fillText(costText, w - pad, y)
                ctx.fillStyle = textSub
                ctx.font = 'normal 11px ' + mono
                ctx.fillText(formatTokens(r.tokens) + ' tok', w - pad - 108, y)
                ctx.textAlign = 'left'
                // 次行:各桶消耗明细(仅非零桶)
                const buckets = []
                if (r.uncachedInput > 0) buckets.push('输入 ' + formatTokens(r.uncachedInput))
                if (r.cacheRead > 0) buckets.push('缓存读 ' + formatTokens(r.cacheRead))
                if (r.cacheWrite > 0) buckets.push('缓存写 ' + formatTokens(r.cacheWrite))
                if (r.output > 0) buckets.push('输出 ' + formatTokens(r.output))
                ctx.fillStyle = textSub
                ctx.font = 'normal 11px sans-serif'
                ctx.fillText(buckets.length > 0 ? buckets.join(' · ') : '', pad + 16, y + 15)
                y += rowH
              }
              // 免费横幅
              if (all.freeCount > 0) {
                const savedText = all.savedTotals !== null && all.savedTotals !== undefined && Object.keys(all.savedTotals).length > 0 ? '按官方价已省 ' + Object.keys(all.savedTotals).map((k) => compactMoney(all.savedTotals[k], k, 'full')).join(' ') : '按官方价计费为 0'
                rr(pad, y + 6, bodyW, 34, 12, alpha(green, 0.14))
                ctx.fillStyle = green
                ctx.font = '600 12px sans-serif'
                ctx.fillText('🎉 其中 ' + all.freeCount + ' 个免费渠道 · ' + savedText, pad + 14, y + 27)
                y += 40 + 12
              }
              // 页脚
              ctx.fillStyle = textSub
              ctx.font = 'normal 10px sans-serif'
              ctx.fillText('由 dsh-bottom-bar 生成 · 估算仅供参考,实际以账单为准', pad, h - 8)
              const a = document.createElement('a')
              a.download = 'dsh-cost-summary-' + Date.now() + '.png'
              a.href = cv.toDataURL('image/png')
              a.click()
            }
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
            const makeLineChildren = () => {
              const children = []
              let visibleCount = 0
              effectiveSegments.forEach((seg, i) => {
                const sampleDef = PREVIEW_TEXTS[seg.id]
                const sample = typeof sampleDef === 'string' ? sampleDef : (sampleDef ? sampleDef[mode] : '')
                if (!sample) return

                const isEnabled = seg.enabled === true
                const isGhost = !isEnabled && (hovered === seg.id)
                const isCurrentlyActive = isEnabled || isGhost

                if (i > 0) {
                  const sepActive = isCurrentlyActive && visibleCount > 0
                  children.push(React.createElement('span', {
                    className: 'dsh-stats-sep' + (sepActive ? ' dsh-sep-visible' : ' dsh-sep-collapsed'),
                    'aria-hidden': true,
                    key: 'ps_sep_' + seg.id,
                  }, '|'))
                }

                if (isCurrentlyActive) {
                  visibleCount++
                }

                let segClass = 'dsh-preview-seg'
                if (isEnabled) {
                  segClass += ' dsh-seg-visible' + (hovered === seg.id ? ' dsh-preview-hl' : '')
                } else if (isGhost) {
                  segClass += ' dsh-seg-visible dsh-preview-ghost'
                } else {
                  segClass += ' dsh-seg-collapsed'
                }

                children.push(React.createElement('span', {
                  className: segClass,
                  key: 'ps_seg_' + seg.id,
                  ref: (el) => { if (el) previewSegRefs.current[seg.id] = el },
                  title: (SEGMENT_LABELS[seg.id] || seg.id) + (!isEnabled ? '（未启用 · 悬停动态插入预览效果）' : ' · 悬停联动下方条目'),
                  onMouseEnter: () => handleHover(seg.id),
                  onMouseLeave: handleUnhover,
                }, sample + (!isEnabled ? ' ✦' : '')))
              })
              return children
            }
            // 修订 68：修复设置区块渲染崩溃——新版预览改用 makeLineChildren 后遗漏
            // 的两处 previewSegs 引用（未定义 → ReferenceError → settings.section 槽
            // 错误边界接管整个设置页）。等价推导：已启用分段的预览文本（旧语义）。
            const previewDockTitle = effectiveSegments
              .filter((s) => s.enabled === true)
              .map((s) => { const d = PREVIEW_TEXTS[s.id]; const t = typeof d === 'string' ? d : (d ? d[mode] : ''); return t })
              .filter(Boolean)
              .join(' | ')
            const hasPreviewSegs = previewDockTitle !== ''
            // 修订 121：行内峰谷编辑——每行 ⛰ 按钮展开高峰价编辑(主行编辑空闲价)
            const priceRowEl = (p) => React.createElement(React.Fragment, { key: p.model },
              React.createElement('div', { className: 'dsh-price-row' },
                React.createElement('span', { className: 'dsh-price-model', title: p.model }, p.model, p.hasPeak === true ? React.createElement('span', { style: { marginLeft: 4, fontSize: 11, fontWeight: 700, color: 'var(--dsw-alias-brand-primary)' }, title: '已设峰谷双价' }, '⛰') : null, p.hasScales === true ? React.createElement('span', { style: { marginLeft: 4, fontSize: 11, fontWeight: 700, color: 'var(--dsw-alias-brand-primary)' }, title: '已设上下文长度分档' }, '档') : null),
                React.createElement('select', { className: 'dsh-comp-select', style: { width: 66, boxSizing: 'border-box' }, value: p.currency, onChange: (e) => updatePrice(p.model, { currency: e.target.value }) }, ['USD', 'CNY'].map((c) => React.createElement('option', { value: c, key: c }, c))),
                React.createElement('input', { className: 'dsh-price-input', type: 'number', step: '0.01', value: p.in, title: '输入', onChange: (e) => updatePrice(p.model, { in: num(e.target.value) }) }),
                React.createElement('input', { className: 'dsh-price-input', type: 'number', step: '0.01', value: (p.cacheRead === undefined || p.cacheRead === null) ? '' : p.cacheRead, title: '缓存读（留空=无此桶）', onChange: (e) => updatePrice(p.model, { cacheRead: numOrUndef(e.target.value) }) }),
                React.createElement('input', { className: 'dsh-price-input', type: 'number', step: '0.01', value: (p.cacheWrite === undefined || p.cacheWrite === null) ? '' : p.cacheWrite, title: '缓存写（留空=无此桶）', onChange: (e) => updatePrice(p.model, { cacheWrite: numOrUndef(e.target.value) }) }),
                React.createElement('input', { className: 'dsh-price-input', type: 'number', step: '0.01', value: p.out, title: '输出', onChange: (e) => updatePrice(p.model, { out: num(e.target.value) }) }),
                React.createElement('button', { className: 'dsh-comp-btn' + (p.hasPeak === true ? ' dsh-peak-on' : ''), style: { width: 40, padding: '3px 4px', boxSizing: 'border-box' }, title: '峰谷双价(高峰价组)——点击展开/收起编辑', onClick: () => toggleGrowPeak(p.model) }, p.hasPeak === true ? '⛰' : '峰谷'),
                React.createElement('button', { className: 'dsh-comp-btn', style: { width: 32, padding: '3px 4px', boxSizing: 'border-box' }, title: p.builtin ? '恢复默认' : '删除该模型', onClick: () => removePrice(p.model) }, p.builtin ? '↺' : '×'),
              ),
              growPeak.has(p.model) && React.createElement('div', { className: 'dsh-price-row dsh-price-row-peak' },
                React.createElement('span', { style: { flex: 1, minWidth: 0, fontSize: 11, fontWeight: 700, color: 'var(--dsw-alias-brand-primary)', whiteSpace: 'nowrap' } }, '高峰价'),
                React.createElement('span', { style: { width: 66, flex: 'none', fontSize: 10, color: 'var(--dsw-alias-label-tertiary)' } }, p.currency),
                React.createElement('input', { className: 'dsh-price-input', type: 'number', step: '0.01', value: p.peak !== null && p.peak !== undefined && p.peak.in !== undefined ? p.peak.in : '', title: '高峰输入', placeholder: p.peak !== null && p.peak !== undefined ? '' : '未设', onChange: (e) => updatePrice(p.model, { peak: { ...(p.peak || {}), in: numOrUndef(e.target.value) } }) }),
                React.createElement('input', { className: 'dsh-price-input', type: 'number', step: '0.01', value: p.peak !== null && p.peak !== undefined && p.peak.cacheRead !== null && p.peak.cacheRead !== undefined ? p.peak.cacheRead : '', title: '高峰缓存读', onChange: (e) => updatePrice(p.model, { peak: { ...(p.peak || {}), cacheRead: numOrUndef(e.target.value) } }) }),
                React.createElement('input', { className: 'dsh-price-input', type: 'number', step: '0.01', value: p.peak !== null && p.peak !== undefined && p.peak.cacheWrite !== null && p.peak.cacheWrite !== undefined ? p.peak.cacheWrite : '', title: '高峰缓存写', onChange: (e) => updatePrice(p.model, { peak: { ...(p.peak || {}), cacheWrite: numOrUndef(e.target.value) } }) }),
                React.createElement('input', { className: 'dsh-price-input', type: 'number', step: '0.01', value: p.peak !== null && p.peak !== undefined && p.peak.out !== undefined ? p.peak.out : '', title: '高峰输出', onChange: (e) => updatePrice(p.model, { peak: { ...(p.peak || {}), out: numOrUndef(e.target.value) } }) }),
                React.createElement('button', { className: 'dsh-comp-btn', style: { width: 58, padding: '3px 4px', boxSizing: 'border-box' }, title: '清除峰谷价(高峰时段按空闲价计)', onClick: () => updatePrice(p.model, { peak: null }) }, '清除'),
              ),
            )
            // 修订 101：价格表分组——「我的价格」(配置过/自定义)默认展开,「内置默认」默认折叠
            const priceList = Array.isArray(prices) ? prices : []
            const userPriceRows = priceList.filter((p) => p.configured === true || p.builtin !== true).map(priceRowEl)
            const builtinPriceRows = priceList.filter((p) => !(p.configured === true || p.builtin !== true)).map(priceRowEl)
            // 修订 103：渠道分层——渠道特选(键含 '/')与全局默认(纯模型名)分开展示
            const channelRows = priceList.filter((p) => (p.configured === true || p.builtin !== true) && p.model.indexOf('/') !== -1)
            const globalRows = priceList.filter((p) => (p.configured === true || p.builtin !== true) && p.model.indexOf('/') === -1)
            // 用过的模型:账本汇总,未配置的一键按官方价配置(渠道特选,用完整 渠道/模型 键)
            const configuredKeys = new Set(priceList.filter((p) => p.configured === true).map((p) => p.model))
            const usedUnconfigured = Array.isArray(usedModels) ? usedModels.filter((u) => !configuredKeys.has(u.key)) : []
            const configureUsed = (key) => {
              remote.setPrice({ model: key, price: {} }).then((result) => { if (result.prices) setPrices(result.prices) }).catch((err) => console.error('dsh-bottom-bar: configure-used failed', err))
            }
            const rows = effectiveSegments.map((seg, index) => {
              const sampleDef = PREVIEW_TEXTS[seg.id]
              const sampleText = sampleDef !== undefined
                ? (typeof sampleDef === 'string' ? sampleDef : sampleDef[mode])
                : ''
              const isSelected = selectedIds.has(seg.id)
              const isDraggingThis = dragFrom === index || (dragFrom !== null && isSelected && selectedIds.has(effectiveSegments[dragFrom]?.id))
              const isJustMoved = justMovedIds.has(seg.id)
              const isHovered = hovered === seg.id
              let selectGrip = React.createElement('span', {
                className: 'dsh-comp-grip',
                title: '拖拽排序 · 按住 Ctrl 点击可多选',
              }, '⠿')
              if (isSelected) {
                selectGrip = React.createElement('span', {
                  className: 'dsh-comp-selected-badge',
                  title: '已多选 · 拖拽批量排序',
                }, '✓')
              }
              return React.createElement(
                'div',
                {
                  className: 'dsh-comp-row' + (seg.enabled === true ? ' dsh-on' : ' dsh-off') + (isSelected ? ' dsh-selected' : '') + (isDraggingThis ? ' dsh-dragging' : '') + (isJustMoved ? ' dsh-just-moved' : '') + (isHovered ? ' dsh-row-hovered' : ''),
                  key: seg.id,
                  ref: (el) => { rowRefs.current[index] = el },
                  draggable: true,
                  onClick: (e) => onRowClick(index, seg.id, e),
                  onMouseEnter: () => handleHover(seg.id),
                  onMouseLeave: handleUnhover,
                  onDragStart: (e) => onRowDragStart(index, seg.id, e),
                },
                selectGrip,
                React.createElement('div', { className: 'dsh-comp-label-wrap' },
                  React.createElement('span', { className: 'dsh-comp-label' }, SEGMENT_LABELS[seg.id] || seg.id),
                  sampleText ? React.createElement('span', { className: 'dsh-comp-sample' }, '示例: ' + sampleText) : null,
                ),
                React.createElement('label', { className: 'dsh-switch', onClick: (e) => e.stopPropagation() },
                  React.createElement('input', { type: 'checkbox', checked: seg.enabled === true, disabled: offline, onChange: () => setEnabled(index, !(seg.enabled === true)) }),
                  React.createElement('span', { className: 'dsh-switch-track' }),
                  React.createElement('span', { className: 'dsh-switch-knob' }),
                ),
                React.createElement('button', { className: 'dsh-comp-btn', onClick: (e) => { e.stopPropagation(); move(index, -1) }, disabled: offline || index === 0 }, '↑'),
                React.createElement('button', { className: 'dsh-comp-btn', onClick: (e) => { e.stopPropagation(); move(index, 1) }, disabled: offline || index === effectiveSegments.length - 1 }, '↓'),
              )
            })
            return React.createElement('div', { className: 'dsh-comp-page', onDragOver: (e) => e.preventDefault() },
              offline && React.createElement('div', { className: 'dsh-comp-warn' }, '配置服务未响应——当前为离线预览（默认配置），改动暂不可用；服务恢复后自动同步。'),
              React.createElement('p', { className: 'dsh-comp-desc' }, '配置输入框下方的底栏统计行：先看预览与拖拽排序；下方是其他开关、价格表与统计。按住 Ctrl 点击可多选批量拖拽排序。'),
              React.createElement('div', { className: 'dsh-preview' },
                React.createElement('div', { className: 'dsh-preview-header' },
                  React.createElement('span', { className: 'dsh-preview-label' }, '底栏效果预览'),
                  React.createElement('span', { className: 'dsh-preview-hint' }, '可横向滑动 · 支持多选批量拖拽'),
                ),
                !hasPreviewSegs
                  ? React.createElement('span', { className: 'dsh-preview-empty' }, '（所有分段均已隐藏）')
                  : React.createElement('div', {
                      className: 'dsh-preview-dock',
                      ref: previewDockRef,
                      title: previewDockTitle,
                      onWheel: (e) => {
                        if (previewDockRef.current && e.deltaY) {
                          previewDockRef.current.scrollLeft += e.deltaY * 0.8
                        }
                      },
                    },
                      React.createElement('div', { className: 'dsh-preview-line' }, makeLineChildren()),
                    ),
              ),
              selectedIds.size > 1 && React.createElement('div', { className: 'dsh-multi-bar' },
                React.createElement('span', null, '✨ 已选 ' + selectedIds.size + ' 项 · 拖拽移动到新位置 · 释放后自动完成'),
                React.createElement('div', { style: { display: 'flex', gap: 6 } },
                  React.createElement('button', { className: 'dsh-multi-bar-action', onClick: () => { const all = new Set(effectiveSegments.map((s) => s.id)); setSelectedIds(all); selectedIdsRef.current = all } }, '全选'),
                  React.createElement('button', { className: 'dsh-multi-bar-action', onClick: () => { const inv = new Set(effectiveSegments.filter((s) => !selectedIds.has(s.id)).map((s) => s.id)); setSelectedIds(inv); selectedIdsRef.current = inv } }, '反选'),
                  React.createElement('button', { className: 'dsh-multi-bar-action', onClick: () => { setSelectedIds(new Set()); selectedIdsRef.current = new Set(); lastClickedIndexRef.current = null } }, '取消选择'),
                ),
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
              // 修订 138：设置页重排——段列表/预览移到顶部,开关集中到「其他设置」
              React.createElement('div', { className: 'dsh-price-group', key: 'g-settings' }, '其他设置'),
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
              React.createElement('div', { className: 'dsh-comp-row' + (peakEnabled ? ' dsh-on' : ' dsh-off') },
                React.createElement('span', { className: 'dsh-comp-label' }, '峰谷计价（按高峰价计费）' + (peakNow !== null ? (peakNow === 'peak' ? ' · 当前高峰' : ' · 当前空闲') : '') + (peakTz === 'system' ? '' : '（' + peakTz + '）')),
                React.createElement('label', { className: 'dsh-switch' },
                  React.createElement('input', { type: 'checkbox', checked: peakEnabled, disabled: offline, onChange: togglePeak }),
                  React.createElement('span', { className: 'dsh-switch-track' }),
                  React.createElement('span', { className: 'dsh-switch-knob' }),
                ),
                React.createElement('select', { className: 'dsh-comp-select', value: peakTz, disabled: offline, onChange: (e) => togglePeakTz(e.target.value) }, TZ_OPTIONS.map((z) => React.createElement('option', { value: z, key: z }, z === 'system' ? '跟随系统' : z))),
              ),
              React.createElement('div', { className: 'dsh-comp-row' + (peakRemind ? ' dsh-on' : ' dsh-off') },
                React.createElement('span', { className: 'dsh-comp-label' }, '峰谷提醒（仅显示时段，不改价格）'),
                React.createElement('label', { className: 'dsh-switch' },
                  React.createElement('input', { type: 'checkbox', checked: peakRemind, disabled: offline, onChange: togglePeakRemind }),
                  React.createElement('span', { className: 'dsh-switch-track' }),
                  React.createElement('span', { className: 'dsh-switch-knob' }),
                ),
              ),
              // 修订 108：峰谷适用渠道白名单(opencode 2026 也实施峰谷,可自行添加渠道)
              React.createElement('div', { className: 'dsh-comp-row' },
                React.createElement('span', { className: 'dsh-comp-label' }, '峰谷适用渠道（逗号分隔）'),
                React.createElement('input', { type: 'text', className: 'dsh-comp-input', style: { flex: 1, minWidth: 0 }, value: peakProvidersText, disabled: offline, onChange: (e) => setPeakProvidersText(e.target.value), onBlur: savePeakProviders, placeholder: 'deepseek, opencode, opencode-go' }),
              ),
              React.createElement('p', { className: 'dsh-comp-desc' }, 'DeepSeek 自 2026-08-17 00:00 起实行峰谷定价：高峰时段 9:00-12:00 / 14:00-18:00（按所选时区，默认跟随系统），空闲时段为高峰一半。opencode 官方同样实施该峰谷时段（UTC 01:00-04:00 / 06:00-10:00）。「计价」按高峰价算钱，仅对上方「适用渠道」生效（默认官方 deepseek + opencode 系）；「提醒」只显示 ⏱ 高峰/空闲 与时段标注，不影响价格。'),
              React.createElement('button', { className: 'dsh-comp-btn dsh-comp-reset', onClick: reset, disabled: offline }, '恢复默认（段/模式/黑条/精度）'),
              // 修订 139：价格区三 tab——不再弹出/折叠,切换只变内容区
              React.createElement('div', { className: 'dsh-cur-toggle', key: 'ptab', style: { marginTop: 10 } },
                React.createElement('button', { className: 'dsh-cur-btn' + (priceTab === 'table' ? ' dsh-on' : ''), onClick: () => { setPriceTab('table'); setAddPending(false) } }, '价格表'),
                React.createElement('button', { className: 'dsh-cur-btn' + (priceTab === 'add' ? ' dsh-on' : ''), onClick: () => { setPriceTab('add'); setAddPending(false) } }, '新增价格'),
                React.createElement('button', { className: 'dsh-cur-btn' + (priceTab === 'vendor' ? ' dsh-on' : ''), onClick: () => { setPriceTab('vendor'); setAddPending(false) } }, '厂商'),
              ),
              priceTab === 'table' && React.createElement('div', { className: 'dsh-prices' },
                React.createElement('span', { className: 'dsh-price-label' }, '价格表（每 1M tokens）：这里只列出你配置过的价格；内置默认价格默认收起，需要时展开。没单独配置的渠道/模型会自动按内置价估算。'),
                React.createElement('div', { className: 'dsh-price-head' },
                  React.createElement('span', { className: 'dsh-price-model' }, '模型'),
                  React.createElement('span', { style: { width: 66 } }, '币种'),
                  React.createElement('span', { style: { width: 68 } }, '输入'),
                  React.createElement('span', { style: { width: 68 } }, '缓存读'),
                  React.createElement('span', { style: { width: 68 } }, '缓存写'),
                  React.createElement('span', { style: { width: 68 } }, '输出'),
                  React.createElement('span', { style: { width: 32 } }, ''),
                ),
                userPriceRows.length === 0 && builtinPriceRows.length === 0 && React.createElement('div', { className: 'dsh-price-empty' }, '还没有配置任何价格 —— 在下方「添加/更新价格」里录入你的模型'),
                channelRows.length > 0 && React.createElement('div', { className: 'dsh-price-group', key: 'g-channel' }, '渠道特选（只覆盖这个渠道）'),
                channelRows.map(priceRowEl),
                globalRows.length > 0 && React.createElement('div', { className: 'dsh-price-group', key: 'g-global' }, '全局默认（所有渠道通用）'),
                globalRows.map(priceRowEl),
                usedUnconfigured.length > 0 && React.createElement('div', { className: 'dsh-price-group', key: 'g-used' }, '用过的模型 · 未配置价格'),
                usedUnconfigured.map((u) => React.createElement('div', { className: 'dsh-price-row', key: 'u' + u.key },
                  React.createElement('span', { className: 'dsh-price-model', title: u.key }, u.key),
                  React.createElement('span', { style: { flex: 'none', fontSize: 11, color: 'var(--dsw-alias-label-tertiary)' } }, formatTokens(u.tokens) + ' tok'),
                  React.createElement('button', { className: 'dsh-comp-btn', style: { flex: 'none' }, title: '按官方价一键配置该渠道价格', onClick: () => configureUsed(u.key) }, '按官方价配置'),
                )),
                builtinPriceRows.length > 0 && React.createElement('button', { className: 'dsh-price-toggle', onClick: () => setBuiltinOpen(!builtinOpen) },
                  React.createElement('span', null, '内置默认价格'),
                  React.createElement('span', null, builtinPriceRows.length + ' 个' + (builtinOpen ? ' ▾' : ' ▸')),
                ),
                builtinOpen && builtinPriceRows,
              ),
              // 修订 139：新增价格 tab——模板卡(自动匹配厂商 + 比例预览 + 主题色流光确认)
              priceTab === 'add' && (() => {
                const preview = computePreviewPrice()
                const sym = preview.currency === 'USD' ? '$' : '¥'
                return React.createElement('div', { className: 'dsh-price-template-card' + (addPending ? ' dsh-confirm-pending' : ''), onInput: () => { if (addPending) setAddPending(false) } },
                  React.createElement('p', { className: 'dsh-comp-desc' }, '填模型 id 与输入价 → 自动匹配厂商并按官方比例推算 → 确认后加入价格表。'),
                  // 修订 137：重排——输入一行、高峰一行、按钮独立一行,不再全挤一行
                  React.createElement('div', { className: 'dsh-price-add' },
                    React.createElement('input', { className: 'dsh-comp-input', type: 'text', style: { flex: 2 }, placeholder: '模型 id，如 opencode/deepseek-v4-flash', value: newModel, onChange: (e) => setNewModel(e.target.value) }),
                    React.createElement('input', { className: 'dsh-comp-input', type: 'number', step: '0.01', style: { flex: 1 }, placeholder: '空闲输入价 (' + preview.currency + ')', value: newIn, onChange: (e) => setNewIn(e.target.value) }),
                  ),
                  React.createElement('div', { className: 'dsh-price-add', style: { borderTop: 'none', marginTop: 0, paddingTop: 0 } },
                    React.createElement('input', { className: 'dsh-comp-input', type: 'number', step: '0.01', style: { flex: 2 }, placeholder: '高峰输入价（可选，留空=仅单一价）', value: newInPeak, onChange: (e) => setNewInPeak(e.target.value) }),
                    React.createElement('span', { style: { flex: 1, fontSize: 11, color: 'var(--dsw-alias-label-tertiary)' } }, '其余桶按厂商比例自动派生高峰价'),
                  ),
                  React.createElement('div', { className: 'dsh-price-add', style: { borderTop: 'none', marginTop: 0, paddingTop: 0 } },
                    React.createElement('input', { className: 'dsh-comp-input', type: 'number', step: '1', style: { flex: 1 }, placeholder: '临界上下文(可选,如 272000)', value: newCtxLimit, onChange: (e) => setNewCtxLimit(e.target.value) }),
                    React.createElement('input', { className: 'dsh-comp-input', type: 'number', step: '0.01', style: { flex: 1 }, placeholder: '超档输入价(可选,缺省=主价×2)', value: newCtxIn, onChange: (e) => setNewCtxIn(e.target.value) }),
                    React.createElement('span', { style: { flex: 1.4, fontSize: 11, color: 'var(--dsw-alias-label-tertiary)' } }, '超过临界上下文用超档价,其余桶按比例派生'),
                  ),
                  React.createElement('div', { className: 'dsh-price-actions' },
                    // 修订 139：确认流——第一次点进入「待确认」(边缘流光),再点提交;[取消]退出
                    addPending
                      ? React.createElement(React.Fragment, null,
                          React.createElement('button', { className: 'dsh-comp-btn', style: { borderColor: 'var(--dsw-alias-brand-primary)', color: 'var(--dsw-alias-brand-primary)' }, onClick: () => { addPrice(); setAddPending(false) } }, '✓ 确认添加到价格表'),
                          React.createElement('button', { className: 'dsh-comp-btn', onClick: () => setAddPending(false) }, '✕ 取消'),
                        )
                      : React.createElement(React.Fragment, null,
                          React.createElement('button', { className: 'dsh-comp-btn', onClick: () => setAddPending(true) }, '添加/更新价格'),
                          React.createElement('button', { className: 'dsh-comp-btn', onClick: resetPrices }, '恢复默认价格'),
                        ),
                  ),
                  // 修订 141：预览面板——识别 + 四桶表格 + 峰谷/分档附加预览,填一步长一步
                  React.createElement('div', { className: 'dsh-price-preview-panel' },
                    React.createElement('div', { className: 'dsh-price-preview-head' },
                      React.createElement('span', null, '💡 ' + (vendorTpl === 'auto' ? '自动识别: ' : '已选: ') + preview.tplName),
                      React.createElement('span', null, '币种 ' + preview.currency),
                    ),
                    (() => {
                      const tplRatio = preview.out !== 0 && preview.in !== 0 ? preview.out / preview.in : 3
                      const extras = []
                      if (newInPeak.trim() !== '' && Number.isFinite(Number(newInPeak)) && Number(newInPeak) >= 0) {
                        const pv = Number(newInPeak)
                        const pOut = Math.round(pv * tplRatio * 1000) / 1000
                        extras.push('⛰ 高峰价 · 输入 ' + sym + pv + '/1M · 输出 ' + sym + pOut + '/1M')
                      }
                      if (newCtxLimit.trim() !== '' && Number.isFinite(Number(newCtxLimit)) && Number(newCtxLimit) > 0) {
                        const cv = Number(newCtxLimit)
                        const cin = newCtxIn.trim() !== '' && Number.isFinite(Number(newCtxIn)) && Number(newCtxIn) >= 0 ? Number(newCtxIn) : Math.round(preview.in * 2 * 1000) / 1000
                        const cOut = Math.round(cin * tplRatio * 1000) / 1000
                        extras.push('📏 超过 ' + formatCtx(cv) + ' 上下文 · 输入 ' + sym + cin + '/1M · 输出 ' + sym + cOut + '/1M')
                      }
                      if (newModel.trim() === '') {
                        return React.createElement('div', { className: 'dsh-price-preview-hint' }, '填写模型 id 后自动识别厂商、按官方比例派生价格预览;需要峰谷/分档可继续填右侧可选行。')
                      }
                      return React.createElement(React.Fragment, null,
                        React.createElement('div', { className: 'dsh-price-preview-grid' },
                          React.createElement('span', null, '输入'),
                          React.createElement('span', null, sym + preview.in + '/1M'),
                          React.createElement('span', null, '缓存读'),
                          React.createElement('span', null, preview.cacheRead !== undefined ? sym + preview.cacheRead + '/1M' : '—'),
                          React.createElement('span', null, '缓存写'),
                          React.createElement('span', null, preview.cacheWrite !== undefined ? sym + preview.cacheWrite + '/1M' : '—'),
                          React.createElement('span', null, '输出'),
                          React.createElement('span', null, sym + preview.out + '/1M'),
                        ),
                        extras.map((t, i) => React.createElement('div', { className: 'dsh-price-preview-extra', key: 'ex' + i }, t)),
                      )
                    })(),
                    React.createElement('button', { className: 'dsh-tpl-gear', style: { alignSelf: 'flex-start' }, onClick: () => setTplOpen(!tplOpen) }, '⚙ 厂商比例' + (tplOpen ? ' ▾' : ' ▸')),
                  ),
                  tplOpen && React.createElement('div', { style: { display: 'flex', gap: 8, alignItems: 'center', marginTop: 8 } },
                    React.createElement('select', {
                      className: 'dsh-comp-select',
                      style: { flex: 1 },
                      value: vendorTpl,
                      onChange: (e) => setVendorTpl(e.target.value),
                    }, VENDOR_TEMPLATES.map((t) => React.createElement('option', { value: t.id, key: t.id }, t.name))),
                  ),
                  tplOpen && vendorTpl === 'custom' && React.createElement('div', { style: { display: 'flex', gap: 8, alignItems: 'center' } },
                    React.createElement('select', { className: 'dsh-comp-select', value: customCurrency, onChange: (e) => setCustomCurrency(e.target.value) }, ['CNY', 'USD'].map((c) => React.createElement('option', { value: c, key: c }, c))),
                    React.createElement('input', { className: 'dsh-price-input', placeholder: '缓存读单价', value: customRead, onChange: (e) => setCustomRead(e.target.value) }),
                    React.createElement('input', { className: 'dsh-price-input', placeholder: '缓存写单价', value: customWrite, onChange: (e) => setCustomWrite(e.target.value) }),
                    React.createElement('input', { className: 'dsh-price-input', placeholder: '输出单价', value: customOut, onChange: (e) => setCustomOut(e.target.value) }),
                  ),
                )
              })(),
              // 修订 139：厂商 tab——内置厂商比例一览(只读,参考用)
              priceTab === 'vendor' && React.createElement('div', { className: 'dsh-prices' },
                React.createElement('span', { className: 'dsh-price-label' }, '厂商比例模板（输入价 → 缓存读/缓存写/输出 自动派生）：自动识别按模型名匹配；同一厂商多套价格体系暂手动维护。'),
                React.createElement('div', { className: 'dsh-price-head' },
                  React.createElement('span', { className: 'dsh-price-model' }, '厂商'),
                  React.createElement('span', { style: { width: 110 } }, '比例(输出/读/写)'),
                  React.createElement('span', { style: { width: 66 } }, '币种'),
                ),
                VENDOR_TEMPLATES.filter((t) => t.id !== 'auto' && t.id !== 'custom').map((t) => React.createElement('div', { className: 'dsh-price-row', key: t.id },
                  React.createElement('span', { className: 'dsh-price-model', title: t.id }, t.name),
                  React.createElement('span', { style: { width: 110, fontSize: 12, color: 'var(--dsw-alias-label-secondary)', fontFamily: '"SF Mono", Consolas, monospace' } }, '1 : ' + t.out + ' : ' + (t.read !== undefined ? t.read : '—') + ' : ' + (t.write !== undefined ? t.write : '—')),
                  React.createElement('span', { style: { width: 66, fontSize: 12, color: 'var(--dsw-alias-label-tertiary)' } }, t.currency || '—'),
                )),
                React.createElement('p', { className: 'dsh-comp-desc' }, '「⚖ 参考厂商」配置(中转参考别家比例)与自定义比例维护将随后续版本提供;当前可用「新增价格」里的手动填写与厂商选择。'),
              ),
              // 修订 106：综合全部会话/渠道/模型 —— fullAll 来自 host summaryAll(账本汇总)
              React.createElement('div', { className: 'dsh-fullusage', style: { display: 'flex', flexDirection: 'column', gap: '8px', padding: '10px 12px', borderRadius: 10, border: '1px solid var(--dsw-alias-border-l2)', background: 'var(--dsw-alias-interactive-bg-hover)', fontSize: 12, lineHeight: '18px', color: 'var(--dsw-alias-label-secondary)', fontVariantNumeric: 'tabular-nums' } },
                React.createElement('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between' } },
                  React.createElement('span', { style: { fontSize: 10, lineHeight: '16px', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--dsw-alias-label-tertiary)' } }, '费用统计 · 综合全部'),
                  React.createElement('span', { style: { display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, lineHeight: '16px', fontWeight: 600, color: '#10b981', background: 'rgba(16, 185, 129, 0.12)', padding: '1px 6px', borderRadius: 4, whiteSpace: 'nowrap' } },
                    '命中率 ' + (fullAll === null || fullAll.hitRate === null ? '—' : fullAll.hitRate + '%'),
                  ),
                ),
                fullAll === null || fullAll.hasUsage !== true
                  ? React.createElement('span', { style: { fontSize: 11, lineHeight: '16px', color: 'var(--dsw-alias-label-tertiary)' } }, '暂无用量数据…')
                  : React.createElement(React.Fragment, null,
                    React.createElement('div', { style: fullGrid },
                      React.createElement('div', { style: fullCell },
                        React.createElement('span', null, '未缓存输入'),
                        React.createElement('span', { style: fullValue }, formatTokens(fullAll.tokens.uncachedInput), React.createElement('small', { style: fullTok }, ' tok')),
                      ),
                      React.createElement('div', { style: fullCell },
                        React.createElement('span', null, '缓存读'),
                        React.createElement('span', { style: fullValue }, formatTokens(fullAll.tokens.cacheRead), React.createElement('small', { style: fullTok }, ' tok')),
                      ),
                      React.createElement('div', { style: fullCell },
                        React.createElement('span', null, '缓存写'),
                        React.createElement('span', { style: fullValue }, formatTokens(fullAll.tokens.cacheWrite), React.createElement('small', { style: fullTok }, ' tok')),
                      ),
                      React.createElement('div', { style: fullCell },
                        React.createElement('span', null, '输出'),
                        React.createElement('span', { style: fullValue }, formatTokens(fullAll.tokens.output), React.createElement('small', { style: fullTok }, ' tok')),
                      ),
                    ),
                    React.createElement('div', { style: fullDivider }),
                    fullAll.rows.length > 0 && fullAll.rows.map((r) => React.createElement('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 } },
                      React.createElement('span', { style: { fontWeight: 500, color: 'var(--dsw-alias-label-primary)', whiteSpace: 'nowrap' }, title: r.key }, r.key),
                      React.createElement('span', { style: { display: 'inline-flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap' } },
                        React.createElement('small', { style: fullTok }, formatTokens(r.tokens) + ' tok'),
                        React.createElement('span', { style: r.free ? { color: '#10b981', fontWeight: 600 } : { fontSize: 11, color: 'var(--dsw-alias-label-tertiary)' } },
                          r.free ? ('免费 · 省 ' + (r.refCost !== null && r.refCost !== undefined ? compactMoney(r.refCost, r.refCurrency, 'compact') : '')) : compactMoney(r.cost, r.currency, 'compact'),
                        ),
                      ),
                    )),
                    React.createElement('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 8, marginTop: 2, borderTop: '1px dashed var(--dsw-alias-border-l2)' } },
                      React.createElement('span', { style: { fontWeight: 500, color: 'var(--dsw-alias-label-primary)' } }, '总计费用'),
                      React.createElement('span', { style: { fontSize: 14, lineHeight: '20px', fontWeight: 700, color: 'var(--dsw-alias-brand-primary)' } }, Object.keys(fullAll.totals).map((k) => compactMoney(fullAll.totals[k], k, 'full')).join('   ')),
                    ),
                    fullAll.freeCount > 0 && React.createElement('div', { style: { fontSize: 11, lineHeight: '16px', fontWeight: 600, color: '#10b981' } },
                      '其中 ' + fullAll.freeCount + ' 个免费渠道' + (typeof fullAll.savedTotals === 'object' && fullAll.savedTotals !== null && Object.keys(fullAll.savedTotals).length > 0 ? ' · 按官方价已省 ' + Object.keys(fullAll.savedTotals).map((k) => compactMoney(fullAll.savedTotals[k], k, 'full')).join(' ') : ''),
                    ),
                    React.createElement('button', { className: 'dsh-comp-btn dsh-comp-reset', onClick: exportSummaryImage, style: { alignSelf: 'flex-start' } }, '📤 导出图片'),
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
