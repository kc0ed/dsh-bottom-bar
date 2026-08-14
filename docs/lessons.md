# DSH 动态插件经验教训（dsh-bottom-bar 开发实测 · 2026-08）

这些是从 `cost-2`（底栏统计 + 预估费用）插件开发中踩坑总结的，全部经过实测。写动态插件前先读一遍，能省一轮"定义→崩溃→修复"循环。正文里的 `host.call` 在固化版（静态包）中对应 `ctx.remote.bottomBar.<method>`。

## 1. Guard 门面：useState 只能传值，不能传函数

动态 Client 的 `React.useState(initial)` 门面**不承诺支持惰性初始化**。实测：

```js
// ❌ 首次渲染直接崩溃：函数初值在门面下变成 undefined
const [composition, setComposition] = React.useState(getCompositionSync)

// ✅ 只传值；初始状态用 null，靠 effect/RPC 填充
const [composition, setComposition] = React.useState(null)
```

崩溃特征：`Cannot read properties of undefined (reading 'length')`，发生在首次渲染，栈在 eval 的 `xxx.length`（常被 `=== null` 短路保护之外的第二个属性访问处）。

## 2. RPC 回包一律 Array.isArray / 形状校验

`host.call` 的返回值直接进 React state，**不要假设形状正确**：

- 数组字段：`Array.isArray(x) ? x : []`
- 对象字段：先 `typeof === 'object' && !== null`
- Host 侧 normalize 函数兜底：未知 id 剔除、缺失段补默认、非法 placement/enabled 回退
- **⚠️ 线上协议拒绝 `undefined`**：`harness.handle` 结果/参数里出现 undefined 会直接报 `must be lossless JSON data`。可选字段（如"该模型无缓存桶"）用 **`null` 编码**过线，收到 null 显示为空；内部语义可以保持 undefined（计费时 `??` 回退）。错误特征：报错指向 `result.<field>` 的字段名

## 3. 动态 Host 没有 zod → 三条官方持久化路径都不可用

- `settings.register(ns, schema)`：需要 zod/schemastery schema ❌
- `storageDomain.open(spec)`：DomainSpec 的 schema 是 zod ❌
- `sessionProjections.register(definition)`：ProjectionDefinition 的 schema 是 zod ❌

**替代**：`fs` 服务 + `settings.prepareDocument()` 拿配置文档绝对路径，在**同目录**写自己的 JSON：

```js
const doc = await settingsSvc.prepareDocument()   // 例如 ~/.dsh/settings.yaml
const configFile = doc.replace(/[\\/][^\\/]*$/, '') + '/my-plugin.config.json'
```

## 4. 官方 UI 无扩展口 → 接管 cell + 复刻，并记录上游版本

`conversation.composer.dock` 的 stats cell 是**唯一接缝**：加独立条目是"另一个元素"（视觉不在一行）；要改那一行只能 `id: 'stats'` 接管 cell 自行渲染。复刻纪律：

- 逐零件复制官方实现（纯函数、CSS、交互），每个零件标注上游来源文件+行号
- **代码头部写同步块**：上游包名@版本、同步日期、升级后逐项核对步骤
- 插件 name/purpose 里也带上"复刻自 X@版本 · 日期"，读插件说明一眼可见

## 5. 全量重算优于增量折叠

监听 `session/event` 维护增量状态有坑：`request/context`/`request/header`（带 model id 的事件）**只在路由变化时写入日志**，插件加载后活跃会话不再产生 → 用量全归"未知模型"。**每次 RPC 从 `sessionQuery.readSession(id)` 全量折叠重算**：无状态、无竞态、自愈，O(事件数) 毫秒级，每步 1~2 次 RPC 可忽略。

## 6. 同 step 用量是"替换"不是"累加"

同一个 (turn, step) 会先有 `assistant/chunk`(usage) 早期样本、再有 `assistant/message` 的最终样本。与官方 `tokenUsage` 投影同语义：**同 turn+step 的后续样本减去旧值再加新值**，否则重复计费。adjacency 不变式：同一 step 的用量报告相邻，之后不会再来。

## 7. 计时器用 timer 服务；window 要守卫

- 延迟/间隔：`inject: ['timer']` + `ctx.timeout(cb, ms)`（返回 disposer，卸载时清掉）
- 视口尺寸等浏览器全局：`typeof window !== 'undefined' ? window.innerWidth : fallback`；`ResizeObserver` 同样先 `typeof` 守卫

## 8. 设置页入口

- 整页设置：`settings.section`（list 槽位，id/order/label，页面数据走自己的 RPC）
- 单条偏好：`settings.general.item`
- 页面组件数据自取（ownerProps 只有 `close`），改动即时生效用进程内迷你 store（模块级变量 + Set 监听器 + `useEffect(() => subscribe(fn), [])`）
- **`settings.section` 是根级（root）作用域**：拿不到 `useSession`/`useProjection`，预览区只能用示例数值；要真实数据得让 Host 提供 RPC

## 9. 跨组件配置同步：组件直连轮询 > 共享 store 订阅

设置页（root 作用域）和底栏（session 作用域）是两个独立组件。共享 store 订阅链路**实测不可靠**（"改了不应用"跨多个版本复现，静态分析看不出原因）。最终可靠的模式：

- **Host 是配置的唯一事实源**（写入即持久化 + 内存缓存）
- **每个消费组件自己轮询**，结果**直接写自己的本地 state**（`ctx.timeout` 递归，1.5s；这是被验证过的定时路径）：

```js
React.useEffect(() => {
  let alive = true
  let timer = null
  const tick = () => {
    if (!alive) return
    host.call('get-config')
      .then((r) => { if (alive && Array.isArray(r.segments)) setComposition(r.segments) })
      .catch((err) => console.error('poll failed', err))
      .then(() => { if (alive) timer = ctx.timeout(tick, 1500) })
  }
  tick()
  return () => { alive = false; if (timer !== null) timer() }
}, [])
```

- 链路只有"RPC → setState"两步，中间没有共享状态可断；轮询内容必须是内存级零 IO 的
- **数字数据保持实时**（投影订阅），只有**配置**轮询——用户无感知
- 教训：跨槽位作用域同步出问题时，不要层层加机制（订阅+轮询叠着叠着就说不清了），直接改成"消费方直连轮询写本地 state"，正确性由结构保证

## 10. HTML5 拖拽：容器级 preventDefault 消除禁止光标 🚫

拖拽经过**没有放行**的元素（行间空隙、按钮、容器背景）时光标会变禁止符号。修复：

- 容器级：`onDragOver={(e) => e.preventDefault()}` + `onDrop={(e) => { e.preventDefault(); finalize() }}`
- 行级：`onDragStart` 里 `e.dataTransfer.effectAllowed = 'move'`；`onDragOver` 里 `e.preventDefault()` + `e.dataTransfer.dropEffect = 'move'`
- **实时换位**：`onDragOver` 时若 `dragFrom !== index` 立即交换数组（只改本地 state，不写 Host）；**松手**（onDrop/onDragEnd）才持久化——避免拖拽过程中刷磁盘

> 修订（2026-08-14）：实时换位手感跳（每跨一行就换一次、列表跟着抖），改为 **「指示线 + 落点换位」**：拖动时只按指针算**插入下标**（指针在行上半 → 插到该行前，否则下一个/末尾），在目标间隙显示 2px 指示线；drop 时才换位 + FLIP。细节见 §14。

## 11. 列表重排动画：FLIP

拖拽换位/↑↓ 换序时让行"滑过去"而不是"拍下去"：

1. 换序前用 refs 记录每行旧 `getBoundingClientRect().top`
2. `useLayoutEffect`（[segments] 变化后）给每行设 `transition:'none'` + `translateY(旧-新)`
3. 下一帧 rAF：`transition = 'transform 240ms cubic-bezier(0.34, 1.3, 0.64, 1)'` + `translateY(0)`（弹性缓动，带轻微回弹）
4. 行加 `will-change: transform`；ref 用按位置索引的 callback ref（重排后索引对应新位置，FLIP 按位置对比）

## 12. React #310：hooks 必须无条件在组件顶部，提前 return 放最后

```js
// ❌ 提前 return 在 hooks 之前：某次渲染走到 return、下次不走到，
//    hooks 数量变化 → "Rendered more hooks than during the previous render"
const lineGroups = []
if (lineGroups.length === 0) return null   // ← 别在这
const ref = React.useRef(null)             // ← hooks 在 return 之后 = 定时炸弹

// ✅ 所有 hooks 提到顶部（数据计算可以放中间），提前 return 只放在所有 hooks 之后
const ref = React.useRef(null)
// ...全部 hooks...
if (lineGroups.length === 0) return null   // ← 这里才安全
```

崩溃特征：`Minified React error #310`，栈在某个 useRef/useState。这个 bug 可以潜伏很久——只要"提前返回分支"从未真正走到，一切正常；一旦渲染到无数据状态（空白会话）就炸。组件里加 ⚠️ 注释防回归。

## 13. 返回 disposer 的服务调用必须交给 ctx.effect 所有

`locale.register(ns, dicts)` 返回 disposer，**不归 fiber 自动管理**。直接调用且丢弃返回值 → 插件停止/更新时注册残留 → 下次 apply 报 `locale namespace "x" already has locale "y"`，整个 client half 挂载失败。

```js
// ✅ ctx.effect 持有：fiber 卸载自动调用 disposer
ctx.effect(() => locale.register('my-ns', { zh: {...}, en: {...} }))

// 容错残留（旧 run 已停但页面未刷新时仍会撞名）：内容相同就继续用
try { ctx.effect(() => locale.register('my-ns', {...})) }
catch (err) { console.error('ns already registered (stale run); continuing', err) }
```

通用规则：任何返回 disposer 的服务 API（`register`/`on`/`inject` 等）都要让 disposer 挂在 fiber 上——`ctx.effect(() => api(...))` 或显式持有并在 effect cleanup 里调用。

## 14. 拖拽排序：指示线 + 落点换位（替代实时换位）

实时换位在跨行时列表来回跳，且没有"会落在哪"的预告。改法：

- **插入下标**：`computeDropIndex(e)` 遍历行 refs，指针 `clientY < 行.top + 行高/2` → 插到该行前；都不满足 → 末尾
- **指示线**：容器 `position:relative`，`onDragOver` 时按间隙中心算 `top`（首行上沿、末行下沿、或 `(prev.bottom + next.top)/2 - 容器.top - 1`），绝对定位 2px 线（`pointer-events:none` + `transition:top .12s`）；index 变了才 `setDropIndex`（React 对相同值 bailout），top 每帧 `setIndicatorTop(Math.round(top))`
- **落点换位**：`dropAt(to)` —— `to === from || to === from + 1` 视为原位跳过；否则**先删后插**：`next.splice(to > from ? to - 1 : to, 0, item)`（to 是含被拖行的插入下标，删除后要 -1）
- **离开隐藏**：容器 `onDragLeave` 里 `e.currentTarget.contains(e.relatedTarget)` 为 false 才清指示线（划过子元素不算离开）
- drop/dragend 统一走 `finalize()`：清 dragFrom/dropIndex/指示线 + 持久化

## 15. 锚定弹层（tooltip/明细面板）的通用三件套

底栏分段点击弹出明细面板，与官方 Tooltip 同构，三个零件复用：

1. **锚点**：点击时 `el.getBoundingClientRect()` 存 `{x: 左中, top, bottom}`；渲染 fixed 定位 + `translate(-50%)` 水平居中
2. **夹紧**：`useLayoutEffect`（依赖 pos）测量后 `dx` 修正，左右各留 12px
3. **翻转**：`data-side=top/bottom`，放不下下方且上方够 → 翻到上方（translate(-50%,-100%)），反之亦然；effect 依赖含 placement 会再跑一次
4. **关闭**：`document` `mousedown` 监听，`panelRef.contains(e.target)` 则保留，否则关闭（监听放 `useEffect`，detailSeg 非空才挂）

## 16. 高频触发的 RPC：latest-wins 节流（替代"每次变化发 + 取消前一个"）

流式期间 usage 投影每个 chunk 都变。旧写法：

```js
React.useEffect(() => {
  let cancelled = false
  host.call('estimate', ...).then(r => { if (!cancelled) setEstimate(r) })
  return () => { cancelled = true }   // ← 每次 usage 变化都作废上一个在途请求
}, [usage])
```

token 流越快，在途折叠被作废得越多 → 依赖该 RPC 的 UI（如费用段）**整个流式期间不更新，流结束才"姗姗来迟"**。修法：

```js
const busyRef = React.useRef(false)
const usageRef = React.useRef(usage)      // 始终指向最新
const sessionRef = React.useRef(props.sessionId)
const disposedRef = React.useRef(false)
React.useEffect(() => () => { disposedRef.current = true }, [])
const runEstimate = () => {
  if (busyRef.current || disposedRef.current) return   // 在途则跳过
  busyRef.current = true
  const folded = usageRef.current
  const sid = sessionRef.current
  host.call('estimate', { sessionId: sid })
    .then((r) => { if (sessionRef.current === sid) setEstimate(r) })
    .catch(() => {})
    .then(() => {
      busyRef.current = false
      // 在途期间数据又变了 → 再补跑一次，保证收敛到最新
      if (usageRef.current !== folded || sessionRef.current !== sid) runEstimate()
    })
}
React.useEffect(() => { usageRef.current = usage; sessionRef.current = props.sessionId; runEstimate() }, [usage, props.sessionId])
```

要点：至多一个在途；完成时对比"折叠时"与"当前"引用，变了才补跑；会话切换时丢弃旧会话结果。另外排查这类"延迟"问题先问一句：**是不是每次变化都发 RPC 且取消前一个？**

## 17. 实时数值：折叠底账 + 投影增量（重活降频，轻活每帧）

RPC 全量重算的实时性上限 = RPC 延迟 + 计算耗时，流式场景永远"慢半拍"。对"当前轮/当前步"这类**已有实时投影**的数值，把展示拆成两层：

```
展示 = foldTotal(折叠底账，低频) + max(0, cost(实时投影) − cost(折叠时最后样本))
```

- **底账**：Host 折叠回包额外返回 `lastSample`（折叠时看到的最后一个用量样本，含 model + 各桶 tokens）。折叠只触发于：挂载/切会话、1.5s 轮询发现投影引用变了、或距上次折叠超 30s（兜底价格修改等）。不再每个 chunk 折叠。
- **增量**：客户端拿投影（"直接记录"的当前轮用量）× 单价即时计价，减去 lastSample 同口径成本。`max(0, ·)` 保证只增不减——新步/新轮开头投影回退时钳 0，不闪跌。
- **收敛**：底账低频追平，增量自动归零；投影语义（按步替换/按轮累计）不确定也能安全工作。

要点：增量永远非负、且只在"折叠还没追上的缺口"上生效；换会话时丢弃旧回包。实测流式期间费用随输出即时跳动，折叠从每个 chunk 一次降到约 1.5s 一次。

## 18. 同 id 替换的槽位：会话切换时组件崩溃会被回退给官方占用者

`conversation.composer.dock` 是 **session 作用域**的 list 槽，我们以 `id:'stats'` 与官方同 id 替换（Inspect 可见两个注册者：我们 active、官方 inactive）。**切到另一会话时若本组件渲染抛异常，槽位会把该会话回退给官方 StatsLine**——用户看到"原版内容"。

切换瞬间的三处典型崩溃（官方实现不读这些字段所以不炸，我们全中）：

1. `useSession((s) => s.chat.legacy.nodes)` 选择器：切换中快照可能不完整 → 全链判空兜底返回 `[]`
2. `useProjection('tokenUsage')` 可能返回 **null** 而非 undefined → `usage !== null && usage !== undefined` 双判；取值辅助函数内部也判空
3. RPC 参数 `sessionId` 切换瞬间可能是 undefined → 线上协议同步拒绝 → `typeof sid !== 'string'` 提前 return + try/catch 包 `host.call`

另外：切会话时清掉旧会话的 estimate/面板 state（`setEstimate(null)` + 关明细面板），并给回包加 `sessionRef.current === sid` 守卫，防止旧会话结果串台。

> 修订：**返回 null 也会触发回退**，不只是抛异常。切会话瞬间本组件数据为空（nodes/usage/estimate 全空）→ `lineGroups` 空 → `return null` → 槽位把这一帧回退给官方 StatsLine，闪 1-2 帧后我们的数据到了才切回来。修法：**永远不返回 null**——空数据渲染零高度占位根节点（`.dsh-stats-empty{height:0;padding:0;overflow:hidden;line-height:0}`），视觉不可见但槽位永远看到我们在场。通用规则：接管槽位的组件要么抛异常要么返回 null，都可能被回退，两样都要防。

## 19. 高频 RPC 的重活：Host 侧结果缓存（TTL）+ 客户端"计算中…"占位

流式期间客户端 1.5s 轮询会反复请求同一会话的折叠结果，而全量 readSession 对长会话很重。给"重活"加会话级结果缓存：

```js
const cache = new Map()          // sessionId → {result, foldedAt}
const TTL = 5000
// 命中且未过期 → 直接返回（零 readSession）；过期/未命中 → 全量折叠并写缓存
// 上限 40 条，超了删 Map 里最旧的（keys().next().value）
```

- 客户端展示层有实时增量兜底（§17），TTL 内的"已结算差额"由下个折叠周期追平，视觉连续
- 改价格等配置后最多 TTL 内被新折叠覆盖——可接受
- 配套 UX：首次折叠未返回且有用量在动时，显示「计算中…」而不是空白（`estimate === null && usageActive`），用户感知从"卡住"变成"正在算"

## 20. 重算结果要"存得住"：磁盘持久化缓存（刷新/重启不重算）

内存缓存扛不住页面刷新和插件重启。动态插件没有官方存储 API 可用（无 zod → settings/storageDomain 不可用），但**有 fs + settings.prepareDocument()**——配置已经这么干了（§3），预估结果同样可以：

- 文件：settings 文档同目录 `cost-estimate.estimates.json`，结构 `{version, updatedAt, entries: {sessionId: {foldedAt, result}}}`
- 两级 TTL：内存 5s（流式即时性，命中零 IO）→ 磁盘 5min（刷新/切会话/重启后读盘秒出）
- 写盘节流 30s（`now - lastDiskWrite < 30000` 才写），避免每 5s 折叠就写一次盘
- 上限 200 条，超了按 foldedAt 删最旧
- 加载容错：首次无文件/JSON 损坏 → 空缓存继续跑

参考："原版为什么流畅"——官方 StatsLine 零 RPC，全部数据来自本地 store 的同步订阅（useSession/useProjection）；凡是要 Host 侧数据的展示天然异步，缓存的终极形态是**把数据搬到客户端**（拉一份小价格表过去，客户端用节点+投影直接算），代价是模型归属等正确性细节。
