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

## 21. 动态插件固化 → 静态包（自动加载的正道）

动态插件是**会话级**的：重启进程即失，每次都要手动 define/run——"不自动加载"是设计使然，改不了。要自动加载只能**固化**成静态包（cordis 组合行挂载，重启自动生效）：

- **静态包结构**：`package.json` 声明 `dsh.client{inject, platform:"web"}` + `exports "./client"`；`lib/index.js` = Host（`TypertRemoteService extends Service` + `Remote()` 装饰器的手工等效 `remoteMarks()`，无 TS 装饰器语法也能标记 wire 名）；`lib/client.js` = `window.__ModuleLoader__.load({id, factory})` 浏览器模块
- **静态 Client 与动态的差异**：无 `harness`/`host.call`/`styles` 符号——RPC 改 `ctx.remote.bottomBar.<method>`（inject 声明 `'remote.bottomBar'`），样式用幂等注入（`document.querySelector('style[data-plugin-css=...]')` 查不到才建，`tag.textContent` 覆盖）
- **挂载**：profile 的 `cordis.patch.yml` 加 `- insert: [{id: <行id>, name: <包名>}]`；包解析用 junction 或（更稳，见 §22）profile package.json 依赖 + pnpm install
- **动态 ↔ 静态同步**：client 半体可**机械变换**（`remote.X` → `host.call('x', ...)`、`insertCss` → `styles`、`ctx.slots/ctx.locale` → `slots/locale`，`__ModuleLoader__` 包装 → Cordis 插件对象），本仓库有 `scripts/static-to-dynamic.cjs` 保证零抄写误差；host 半体因形态差异大（类+装饰器 vs 闭包+harness.handle）需手工同步。两边头部"修订记录"逐条对应

## 22. 静态挂载链的免重启验证（90% 可验）

"重启才知道挂没挂上"太慢。静态包挂载链可以拆开逐级验证，除最后一步外都不需要重启：

1. **组合树有行**：`node dsh web --dump-config`（用 `.bin\dsh.ps1` 那个真实入口）grep 到 `- id: bottom-bar`（注意：行在树里 ≠ 包能解析）
2. **包能解析**：`createRequire('<dsh CLI 目录>/probe.js').resolve('dsh-bottom-bar')` 返回真实路径（junction/pnpm 链接是否生效）
3. **Host 模块可导入**：`node --input-type=module -e "import('.../lib/index.js')"` 看导出形状（name/inject/apply）
4. **配置路径对**：`settings.prepareDocument()` 同目录下配置文件存在、内容正确（node 读 JSON 核对，别目测）
5. 剩下的 10%（Remote 运行时接线、客户端槽位注册）只能重启验证

安装方式优先级：官方组合包机制（见 §25）→ `dsh plugin --profile <name> add ./packages/<包名>`（裸目录 spec = link: 协议，junction 实时同步，自动进层栈）。

> ⚠️ **树内约束（朋友踩过的坑）**：包的真实位置**必须在 profile 树内**。Host 半体
> 运行时 `import '@deepseek-ai/*'`，Node 从包的**真实路径**向上找 node_modules，
> 而 @deepseek-ai 依赖在 profile 树内经 parent-walk 可达（`$DSH_HOME/profiles/node_modules`
> 是安装回退链接层，含全部 @deepseek-ai 包）。用 `link:<树外路径>` 或 junction 指向
> 树外仓库 → 真实路径在树外 → 启动时 `MODULE_NOT_FOUND: Cannot find module
> '@deepseek-ai/dsh-typert-protocol'` → **dsh web 打不开**。验证方法：
> `createRequire(<包真实位置>/probe.js)` 能否 resolve 到 @deepseek-ai（树外 FAIL /
> 树内 OK）。正确姿势：clone/拷贝到 `<profile>/packages/` 下（真实文件），
> `add ./packages/...`（junction）；**tarball 安装不受树内约束**（`pnpm pack` →
> `dsh plugin add ./xxx.tgz`，依赖随包装进 profile 的 node_modules，可放任意位置）。

## 23. Windows 生成脚本的编码坑（写工具脚本必读）

- PowerShell `>` 重定向写的是 **UTF-16**，node 读出来全是乱码 → 生成文件别用 PS 重定向
- node 的 `process.stdout` 重定向到文件时按**系统代码页（GBK）**输出 → 中文全变乱码 → **生成脚本自己 `fs.writeFileSync(out, text, 'utf8')`**，别依赖 stdout 重定向
- 目测不可靠：`Get-Content` 可能显示乱码而文件其实是好的（node 读 UTF-8 正确）→ 验证一律用 `node -e "readFileSync(...)+includes('关键字')"` 做字节级判断

## 24. gh 多账号发布的凭证坑

机器上登录了多个 gh 账号时，`gh auth switch --user X` 只切 gh 的激活账号；**git 的凭证助手（Git Credential Manager）缓存的是旧账号的 token**，推送仍会 403 "denied to <旧账号>"。

修法：

```powershell
gh auth setup-git        # 为 github.com 配置 gh 凭证助手（空 helper 条目中和 GCM）
gh auth switch --user <仓库所属账号>
git push                 # 走 gh 助手 → 当前激活账号的 token
gh auth switch --user <原默认账号>   # 用完切回
```

`gh auth setup-git` 会在 `~/.gitconfig` 写 `credential.https://github.com.helper`（第一行空字符串禁用继承的 GCM，第二行指向 `gh auth git-credential`），是官方支持的多账号流程。

## 25. 官方组合包机制（bundle）：装插件别再手改 patch 了

DSH 官方插件安装机制（文档 `docs/user/develop/basic/publish.zh.md`，本机 CLI `@deepseek-ai/dsh@0.1.0-rc.6` 实测）：

- **组合包 = 带配置层的 npm 包**：`package.json` 声明 `"dsh": { "bundle": { "patch": "./cordis.patch.yml" } }`，patch 里 `- insert: [{id, name}]` 按**包名**引用插件行。
- **profile 层栈**：manifest 的 `dsh.profile.bundles` 列表。`dsh plugin --profile <name> <pnpm 参数>` 转发 pnpm，**每次成功后自动 reconcile**：声明了 `dsh.bundle` 的依赖自动进栈（依赖顺序追加）、移除依赖自动出栈、无 bundle 声明的依赖打印一次警告（普通库，不进层）。
- **`dsh plugin --profile web remove dsh-bottom-bar` = 卸载**：依赖与层栈同时清理，无需手改任何文件。
- **安装 spec 用裸目录（link:）而不是 `file:`**：`add ./packages/foo` 在 node_modules 建 **junction**（git pull 实时同步）；`file:` 是**拷贝式**，内容变更时 pnpm 报 "Already up to date" 不更新 → 改代码永远不生效（实测踩坑）。相对 spec 按**调用目录**锚定（CLI 的 `anchorPathSpec`），所以在 profile 目录里执行 `add ./packages/...` 指向树内拷贝。
- **reconcile 的解析顺序**：先 INSTALL_ANCHOR（dsh 安装目录的 node_modules）再 profile 目录 —— 早期实验在 CLI 安装目录留下的陈旧 junction 会让 `exportsPatch` 读到旧 manifest（判定不是 bundle）→ 调试半天，清掉陈旧链接即恢复。
- **`--dump-config` 只印 bundle 层 + profile/home/overlay 层**；`--dump-default-config` 只印 bundle 层。dump 不 boot 插件（import 不执行），适合装后快速验证 `# == <包名>` 层在不在。
- **tarball 路径**：`pnpm pack`（受 `files` 字段控制）→ `dsh plugin add ./xxx.tgz` → 包 + 依赖一起装进 profile 的 node_modules，**与位置无关**（树外也行），适合 GitHub Release 分发。

**本次实测新坑**：

- **cordis.patch.yml 只剩注释 = 启动挂**：patch 文件必须是顶层 YAML 数组；注释-only 解析为 null → `must be a top-level YAML array` → profile 起不来。删除最后一个 insert 块时要在文件里留一个 `[]`。
- **Windows PowerShell 5.1 按 ANSI 读 .ps1**：write 工具写出的无 BOM UTF-8 脚本带中文注释时直接解析失败（报奇怪的括号/引号错位）→ **分发脚本必须带 UTF-8 BOM**（.ps1 不怕 BOM，JSON/YAML 才怕）。验证：`[System.Management.Automation.Language.Parser]::ParseFile` 无错误。
- **声明依赖 ≠ 摆脱树内约束**：把 `@deepseek-ai/cordis` / `@deepseek-ai/dsh-typert-protocol` 声明进 dependencies 后，pnpm 确实把它们装进 profile 的 node_modules，但 Node 仍按包**真实路径**向上解析 → 树外目录型安装依旧 MODULE_NOT_FOUND。声明依赖的价值在 tarball / npm 分发（依赖随包落地同一 node_modules 布局）。

**全新机器端到端实测（临时 DSH_HOME 模拟）又挖出 3 个坑**：

- **`$ErrorActionPreference="Stop"` + 原生命令 `2>&1` = 定时炸弹**：stderr 行会被转成 ErrorRecord，直接终止脚本。dsh 首次初始化往 stderr 写 `initialized profile`（`process.stderr.write`），**全新机器必炸**（正式环境 profile 已存在所以测不出来）。原生命令别合并 stderr，直接透传控制台。
- **全新机器自检顺序**：`dsh plugin add` 之后 `$DSH_HOME/profiles/node_modules` 回退层**还没生成**（启动时才"治愈"），此时 Host 导入必 MODULE_NOT_FOUND——先跑一次 `dsh --profile <name> --dump-config` 即可触发生成（在 loadProfile 阶段），再自检导入。
- **编辑工具重写文件会丢 BOM**：`.ps1` 加过 BOM 后，用编辑工具改一次 BOM 就没了（PS 5.1 按 ANSI 读 → 中文注释解析失败，报错却是括号/引号错位，很迷惑）。改完脚本必须重新加 BOM，提交前用 `[Parser]::ParseFile` 验证。

## 26. 静态固化包的"未完成"教训（2026-08-14 真实 boot 暴露）

固化静态包宣称"完成"前必须**真实启动验证**（`dsh --profile web --port <空闲端口>`），import 成功 / dump-config 有层 ≠ 能 boot。这次三个硬伤全部只在真实 boot 时暴露：

- **Host 半体 `service "bottomBar" has been registered`**：干净环境、单条目、真实 boot 必炸；但最小单 apply（bare Context）完全正常——机制未定位（疑似对象插件 + apply 内手动 `new Service` 与官方类插件模式的差异）。**官方带 Remote 服务的插件都是 Service 子类作 default export**（如 `dsh-goal`，`static inject` + 构造器 `super(ctx, key)` 一次注册），建议固化时改用该类插件模式。
- **缺 `./typert` + `./remote` 产物**：官方 Remote 插件都导出这两个产物（`lib/typert.host.js` / `lib/typert.remote-client.js`，被 typert loader/registry 扫描后把 remote 定义同步给客户端）；缺了客户端永远无法解析 `remote.bottomBar` → 静态客户端无法激活。
- **Host 逻辑不同步**：静态 `lib/index.js` 落后于动态版（价格表还是旧的 deepseek-chat/reasoner）。

**动态客户端 runner 的服务访问规则**（`dsh-cordis-client-runner` 源码实测）：

- closure 参数表**固定**：`React / console / styles / host / harness / traps(setTimeout 等) / process / Buffer`——**没有 slots/locale**！
- 服务必须 `inject: [...]` 声明 + **`ctx.<名>` 访问**（guard 门控未声明属性）。
- 生成器曾把 `ctx.slots.`/`ctx.locale.` 改写为自由变量 `slots.`/`locale.` → 必炸 `ReferenceError: locale is not defined`（修法：不改写，inject 补 `['timer','locale','slots']`）。
- 附带坑：激活流程里重复发起 run 会撞 host runner 的 `starting` 表（"already starting"）——一个 run 在等客户端审批时，别再发新 run；页面 F5 可重置页面侧 runner，Host 侧卡死需 stop 或重建插件。

## 27. 增量计费取代全量折叠（修订 19/20，2026-08-15）
- 订阅 host `'session/event'`（post-commit 实时追加流，带 Session）→ 每事件 O(1) 增量维护每会话用量，永不 readSession（本会话 130 万事件全量折叠 readSession 39s + fold 9.6s，已不可行）。
- 历史用量用 `sessionProjectionCache.coldSnapshot(id)` 的 tokenUsage 投影总量补足（归因最后已知模型，近似；只做一次，baseApplied 标记）。
- **自研持久化账本**（用户设计：缓存到某一层后只管追加）：累计状态持久化 `<workspaceRoot>/.dsh-bottom-bar/ledger.json`——首次建账用投影总量做初始基线，之后每次事件追加，`'session/flush'`（parallel 检查点，调用方 await 所有监听器）同步落盘 + 60s 兜底；重启从账本恢复继续追加，永不全量重算。

## 28. 沙箱 workspaceRoot ≠ 会话工作区（诊断先行，2026-08-15）
- 动态 Host 的 fs 是会话沙箱（workspace-write）：写 `~/.dsh` 被拒（FS_SANDBOX_DENIED），**可写根 = `sandboxPolicy.workspaceRoot`（实测是 telegram-saver，不是当前会话工作区）+ /tmp + os.tmpdir()**。
- 排查教训：账本"写不进去"查了 4 个位置（会话工作区/~/.dsh/TEMP/npx 检出）全无，其实是**写入一直成功、位置在别的目录**。先在插件里加 `diagnostics` handler（fs 可用性 + defaultMode/workspaceRoot/resolve + 逐策略写入探测的错误码/消息），设置页底部显示，一眼定位。
- fs 服务没有 mkdir：`writeText` 对已存在父目录才稳（实测该后端写新目录也能成功，但别依赖）；启动时 stat 探测 `.dsh-bottom-bar`，不存在则直接写根目录 + 失败多级降级（默认策略 → 显式 workspace-write → 显式 danger-full-access）。

## 29. request/context 仅"变更时"追加 + session.contextFold（修订 26）
- `request/context` 事件只在 provider/model/contextWindow **变化时**才 append（agent-loop 源码实测）——插件订阅事件流时第一条早已过去 → 靠事件流取模型必为 null → 用量全挂 "?" 无官方价。
- 正确姿势：实时 Session 的 `contextFold` 是**懒折叠 getter**（内部按 foldSeq 增量折叠，含 `{provider, model, contextWindow}`）——`sessions.get(id).contextFold.model` 随时读到当前模型，O(1) 增量。

## 30. 归因键 = 渠道@模型（修订 27，用户提点）
- 同一模型 id 经不同渠道（如 opencode-go / opencode 免费渠道）价格可能不同，**不能单看模型 id**：`request/context` 自带 provider，归因键升级为 `渠道@模型`（如 `opencode-go@deepseek-v4-flash`）。
- 价格仍按模型 id 查（先试完整键，支持未来按渠道覆盖）；历史裸模型行与 "?" 行在 healAttribution 中幂等迁移到渠道名下（账本就地愈合，下次落盘生效）。

## 31. 动态 define 的 payload 与往返同步（2026-08-15）
- `cordis_define` 的包是不可变完整快照：每个新版本必须携带**整份** host+client（~40-50KB），没有补丁式 API。体感"每次定义很久" = 模型重新生成整份源码 + 传输 + 预检；缩短办法：小改动攒批合并成一次 define、删动态副本的长注释头（完整注释留在 lib/ 源文件）、长期靠静态包（装一次自动生效）。
- **往返同步法**：把运行中的动态代码写为 `dynamic/_client-ref.js` → 反向脚本 `scripts/dynamic-to-static.cjs` 变回静态 `lib/client.js`（styles→insertCss、host.call→remote.*、补 ModuleLoader 脚手架，头部自动追加修订注释）→ 正向生成器重建 `dynamic/client.js` → 归一化 diff（去头、缩进对齐、滤空白行）验证 807/807 行一致。生成器 WIRES 表要同步新 RPC（diagnostics）。
- 生成器遗留：字符串 replace 会留下纯空白残留行（无害）；对比时 PowerShell 必须 `-Encoding UTF8` 读文件，否则中文按 GBK 乱码。

## 32. 账本与全量用量持续对账 + 客户端捎带权威源（修订 30-32，2026-08-15）
- **症状**：底栏投影合计（输入 1.1M/输出 1.9M/缓存读 253M/¥11.74）远大于账本明细（134K/452K/38.6M/¥1.81）——明细面板"缺历史"。
- **修订 30**：一次性基线（baseApplied）退役 → `reconcileWithProjection` 持续对账（节流 15s/会话）：权威总量 vs 账本总量，落后 ≥ max(1%, 100K tokens) 就把差额补进当前渠道行（幂等、永不缩小）；重启/投影重建/换会话自动追平。**仍然失败**（账本 41M）。
- **修订 31**：对账源从 `sessionProjectionCache.coldSnapshot`（磁盘投影缓存，只含部分/旧数据）改为 `sessionProjections.snapshot(实时会话)`。**仍然失败**（账本 43M）。
- **修订 32（成功）**：服务端投影单元本身只有部分数据（43M 缓存读），**浏览器侧 `useProjection('tokenUsage')` 的全量折叠才是唯一权威源**（实测 253M，覆盖全部 777 步）——客户端在 `estimate-cost` 请求里捎带四桶数值（null 守卫），host 对账源优先级 = 客户端捎带 → 实时投影 → 冷快照。激活后账本追平到 260M，明细面板与底栏一致。
- **教训**：同一份"投影"在服务端有多个版本（磁盘缓存/实时快照/单元数据），数据完整度天差地别；底栏 UI 显示的值来自客户端投影，**对账必须与 UI 同源**——RPC 本来就每 1.5s 一次，捎带是零成本的对账通道。

## 33. 底栏费用 2× 明细的真相：liveDelta 把全量当增量（修订 33，2026-08-15）
- **症状**：对账修复（修订 30-32）后账本与明细面板一致（¥10.35），但底栏费用变成 ¥20.99 ≈ **2× 明细**。
- **根因**：`liveDeltaOf` 计算"当前轮增量"用的是 `cost(客户端全量 usage) − cost(账本 lastSample 单步)`——`usage` 是浏览器全量折叠（266M 缓存读），`lastSample` 只是账本里最后一条**单步** usage → delta ≈ 全量费用。修订 30-32 对账把账本拉平到客户端全量后，底栏 = 账本 + 全量 = 2×。
- **历史佐证**：修订 32 之前账本只有 ¥1.81，底栏 ¥11.74 = 1.81 + 9.93（253M 全量价）——**重复一直存在，只是账本小被掩盖**；对账追平后显形。
- **修法**：删除 liveDelta（连同 `lastSample` 的客户端引用），底栏费用 = 明细面板 = 账本（对账后即全量），单一数据源，永不重复。显示滞后最多 1.5s 轮询间隔。
- **define 超长 payload 教训**：60KB+ 的 client 代码三次 define 都在**结尾附近**解析失败（host 25KB 从不失败）——超长参数生成时尾部易错；**压缩版**（去注释/空行/行首缩进，JS 无语义依赖，48KB）一次通过。仓库保留带注释完整版，define 用压缩版。

## 34. 客户端全量用量上设置页（修订 34，2026-08-15）
- 需求：把「客户端全量」（浏览器侧全量折叠，唯一权威源）显示到 **设置 → 底栏** 区块，并顺带做价格统计拓展。
- 实现：host 在 estimate-cost handler 里缓存客户端捎带的四桶（`lastClientUsage`，带 model/provider/时间戳）→ 新 RPC `get-client-usage` 返回四桶 + 按当前价格表算的费用拆分（inCost/cacheReadCost/cacheWriteCost/outCost/total/currency）；设置页新面板「客户端全量用量（权威源）」每 3s 轮询渲染（四桶 + 缓存命中率 + 分桶费用 + 总计）。
- 关键点：**零新增数据通路**——全量用量本来就随 estimate-cost 每 1.5s 捎带，host 缓存后设置页只多一个轻量 RPC；生成器 WIRES 表需同步新增 wire（getClientUsage ↔ 'get-client-usage'），否则往返同步会报 unknown wire。

## 35. 客户端全量面板紧凑化（修订 35，2026-08-15）
- 用户反馈面板"上下间距莫名长"：用了明细面板的 `.dsh-detail-row` 外部类，在设置页环境布局堆叠异常；改为**内联样式**（两列并排 fullRow + 行高 16 + padding 6×8 + 分隔线 margin 2px），完全可控。
- 顺带：`get-client-usage` 的 model 用 `rowKeyOf(provider, model)` 返回完整渠道键（`opencode-go/deepseek-v4-flash`），与账本归因一致。

## 36. 静态包修复：类插件模式 + SRC 发现 + 客户端自 $mount（2026-08-15）
- **boot 硬伤根因**：旧版是「对象插件 + apply 内手动 `new BottomBarService` + `ctx.provide('bottomBar', ...)`」——Service 构造里 `super(ctx, 'bottomBar')` 已注册一次，`ctx.provide` 再注册同名 → `service "bottomBar" has been registered`。官方带 Remote 的插件一律 **Service 子类 default export**（`export default class extends TypertRemoteService`，Cordis 实例化时构造即注册），照此重写即消除。
- **host 路由不需要 FaceModel**：Typert Gateway 支持 **SRC 发现**（`collectSrcClaims`/`resolveSrcDescriptor`：遍历 `ctx.reflect.props` 找 `typertRemote` 绑定 + `remoteMethods` 标记，参数 wire 名 = 方法参数名，codec 全 `src-json`）。但 `dsh-typert-loader` 会在挂载时自动 import 插件的 `./typert` 并 contribute host face（strict 校验：package/face/schemas/model.services|events|objects/invocations 全查，codec 必须 strict + typeSymbol + zod 实例）——用**透传 schema**（`{_zod:{}, parse:(v)=>v}`）免 zod 依赖，contribute 后走 strict descriptor 更正规。
- **客户端 remote 是构建期内联的**：`dsh-api-remotes` 把官方插件列表的 TYPERT_REMOTE 编译进 client bundle（#region 内联），我们的包不在其 peerDeps → `remote.bottomBar` 不存在。**解法：客户端 apply 里运行时 `ctx.remote.$mount(TYPERT_REMOTE)` 自挂载**（contribution 内联进 lib/client.js；inject 不能含 'remote.bottomBar'（mount 前不存在会死锁），用 `ctx.get('remote.bottomBar')`）。
- **wire 名必须两端一致**：client 代理方法名 = descriptor.method，endpoint = `namespace/method`；host claim 用 `exportName ?? method` → 全部用**方法名**（旧版短横线别名 'estimate-cost' 作废），否则 endpoint 不匹配 RPC 被拒。
- **生成器坑**：lib 里 TYPERT_REMOTE 常量若在 factory 顶层，生成后落在动态插件 `return {}` 对象字面量中间（const 声明在对象里 = 语法错误）→ **常量必须放 apply 函数体内**；反向生成器 SCAFFOLD 同步更新（async apply、去掉 `const remote = ctx.remote.bottomBar` 行、inject 去 'remote.bottomBar'）。
- **profile bundle 配置**：用户层 `cordis.patch.yml` 是 id-targeted（只能覆盖已有条目），**新增插件要走 bundle**：包内 `cordis.patch.yml` 用 `- insert:` 列表 + package.json `"dsh": {"bundle": {"patch": "./cordis.patch.yml"}}`，profile 的 `dsh.profile.bundles` 数组追加包名。验证时 `$DSH_HOME` 指到独立目录 + `--port 0` 干净 boot。
- 静态包存储改 `node:fs/promises` 直写官方 `~/.dsh`（主进程无会话沙箱，不需要动态版的 danger stamp 链）。

## 37. 用户给参考稿时的重排要点（修订 37f/38，2026-08-15）
- 用户直接贴了目标渲染稿（暗色卡片：标题行 + 绿色「命中率」徽章、模型名、token/费用 2×2 网格、虚线顶边总计栏）。改 UI 时**以参考稿结构为准**：把「命中率进度条行」改成标题行右侧绿色徽章（`#10b981` + `rgba(16,185,129,.12)` 底），删掉独立的命中率行，卡片明显更紧凑。
- 网格布局用 `display:grid;grid-template-columns:1fr 1fr` + 每格 `flex space-between` 单元格（`fullCell`），比逐行 flex 少一半高度；值带灰色 `<small> tok</small>` 后缀（`fontSize:10`）。
- 总计栏用 `borderTop: 1px dashed var(--dsw-alias-border-l2)` + `paddingTop:8`，品牌色加粗 `fontSize:14`；卡片加 `border:1px solid var(--dsw-alias-border-l2)` + `fontVariantNumeric:tabular-nums`（数字等宽对齐）。
- 颜色全部映射 DSH 主题变量（label-primary/secondary/tertiary、brand-primary），只有徽章绿用固定色（语义色，明暗主题都成立）；lineHeight 依旧必须带 px。
- 改完同步跑 `node scripts/static-to-dynamic.cjs lib/client.js dynamic/client.js` 再提交，dynamic 镜像保持可 round-trip。

## 38. 「tooltip-bg 底 + 白字」契约在浅色主题下失效（修订 39，2026-08-15）
- **症状**：明细弹层（dsh-detail）/ 悬停黑条（dsh-tip）/ 设置页预览气泡（dsh-preview-bubble）在用户浅色主题下**白字白底不可见**——原样复刻官方的 `background:var(--dsw-alias-tooltip-bg); color:var(--dsw-static-neutral-bluish-00)` 白字契约，隐含假设 tooltip-bg **恒为深色**；主题把浅色模式的 tooltip-bg 改成纯白后契约破裂。
- **修法**：文字改主题自适应 `var(--dsw-alias-label-primary)`（深底亮字/浅底深字都成立）、分隔线 `rgba(255,255,255,.18)` → `var(--dsw-alias-border-l2)`、滚动条 `rgba(255,255,255,.35)` → `var(--dsw-alias-label-tertiary)`。
- **保留不动**的「brand 底白字」模式（`.dsh-preview-hl` 高亮、`.dsh-switch-knob` 滑块）：底色是饱和品牌色，白字在两种主题都成立，属于安全模式。
- **教训**：复刻官方样式时别照抄「static 色」——`--dsw-static-*` 前缀就是不随主题变的颜色，凡是和可变的 alias 背景配对的 static 前景色都要警惕主题翻转；文字一律用 `--dsw-alias-label-*` 系。

## 39. tooltip-bg 是 legacy 别名,弹层要用注册的 bg-overlay（修订 40，2026-08-15）
- **症状**：修订 39 把弹层文字改成 label-primary 后，用户报告「背景变成黑色了」——`--dsw-alias-tooltip-bg` **不在官方 Theme 注册表**（`Theme.listTokens` 只列了 `--dsw-alias-bg-overlay`，描述 "Overlay and popover background"，`requiresLightAndDark: true`）。
- **推论**：官方复刻件沿用的 `tooltip-bg` 是 legacy 别名，主题里行为不可靠（用户主题：浅色=纯白、深色=纯黑）——浅色下白字白底（修订 39 前），深色下黑底黑字/黑底突兀（修订 39 后）。跟它配对永远赌主题脸色。
- **修法**：弹层/黑条/预览气泡背景统一改**官方注册的** `var(--dsw-alias-bg-overlay)` + `var(--dsw-alias-label-primary)`——主题系统保证该 token 明暗两套值，浅色=浅底深字、深色=深底浅字，彻底跟随主题，不再依赖任何 legacy 别名。
- **教训**：判断一个 CSS 变量靠不靠谱，先查官方 Token 注册表（Inspect → Theme.listTokens），不在表里的别名一律视为「可能被主题玩坏」；浮层/弹层用 `bg-overlay` 而不是 tooltip 系别名。

## 40. 弹层「出现慢」= 三个延迟叠加（修订 41，2026-08-15）
- **用户反馈**「这东西出现能不能出现得快一点」——明细弹层从点击到可见的感知延迟 = 单击确认 220ms（修订 24 防双击误触）+ 淡入动画 150ms ≈ 370ms；悬停黑条还有 500ms hover 延迟；费用数据每 1.5s 轮询才刷新（点开费用段可能看到上一轮数字）。
- **修法**：单击确认 220→**160ms**（仍拦快速双击；慢速双击本来 220ms 也拦不住，无实际回退）、hover 500→**260ms**、动画 .15s→**.1s**、轮询 1.5s→**1s**（host 端 O(1) 增量 + 5s 折叠缓存，无压力）。
- **教训**：弹层感知延迟要拆解成「事件确认 + 动画 + 数据刷新」三段分别量化，别只调一个；双击保护用「确认延迟」而非「事件后置」，快了 60ms 用户能感知到。

## 41. 「客户端全量」面板慢 = 消费端轮询周期 > 生产端心跳（修订 42，2026-08-15）
- **症状**：设置页「客户端全量 · 权威源」面板长时间显示「等待底栏轮询…」/「命中率 —」。
- **根因**：面板是**纯消费端**——数据来自底栏 dock 每 1s 心跳捎带给 host 的 `lastClientUsage`（estimateCost handler 里缓存），面板自己却每 **3s** 才 `getClientUsage` 一次。打开设置时错过心跳 → 最坏等 3s 轮询 + 1s 心跳 ≈ 4s 空白。
- **修法**：面板轮询 3s→**1s**，与生产端心跳同频，最坏等待从 4s 降到 1s。RPC 是 host 侧纯缓存读取（无折叠、无 IO），1s 频率无压力。
- **教训**：凡是「A 产生数据、B 消费数据」的 UI，消费端轮询周期必须 ≤ 生产端心跳周期，否则感知延迟 = 两者之和；改延迟前先画数据流，找「生产频率」和「消费频率」的错配。

## 42. 查主题真身：tooltip-bg 才是官方弹层底，bg-overlay 是遮罩（修订 43，2026-08-15）
- **翻车复盘**：修订 39/40 基于一个错误前提——以为用户主题把浅色 tooltip-bg 改成了纯白（实际并没有）。用户连报「背景变黑」「背景透明」后，直接读**实际运行的** `dsh-claude-theme/lib/theme.css` 拿到真身：
  - `--dsw-alias-tooltip-bg`：浅 `#26221B` / 深 `#2E2D28` —— **明暗都是实心深色**（官方 Tooltip 设计：黑条恒深），配静态白字完全自洽；
  - `--dsw-alias-bg-overlay`：浅 `rgba(44,39,32,.08)` / 深 `rgba(255,255,255,.08)` —— **8% alpha 遮罩层**，当弹层背景就是透明！
- **修法**：回到官方配对 `background:var(--dsw-alias-tooltip-bg); color:var(--dsw-static-neutral-bluish-00)`（分隔线/滚动条恢复白半透明），背景再加 `rgba(24,24,27,.95)` 兜底（防主题删别名）。
- **教训**：① Inspect 的 Theme 注册表只描述 token 意图（「Overlay and popover background」），主题作者实际实现要读主题自己的 CSS——`node_modules/<theme>/lib/theme.css` 才是真身；② `*-overlay` 系 token 是半透明遮罩，不是面板表面色，**弹层/面板用 `tooltip-bg`**；③ 「跟随官方」= 跟随官方组件的配对（tooltip-bg + 静态白字），不是跟随注册表描述；④ 用户报告「变黑/变透明」这类**前后矛盾**的症状时，先怀疑自己的改动方向，直接查运行包源码，别继续在 token 名字上推理。

## 43. 纯黑弹层在亮色模式突兀 → 浮层底要「实心自适应表面」（修订 44，2026-08-15）
- **症状**：tooltip-bg 配对（深底白字）修好后，用户说「亮色模式下看会感觉有点怪怪的」——主题里 tooltip-bg 明暗恒深，亮色模式下弹出一个纯黑方块确实突兀（Claude 主题作者故意保留官方黑条设计，但用户不买账）。
- **查主题真身**（dsh-claude-theme/theme.css）：能当**实心浮层底**的自适应 token 是 `--dsw-alias-bg-layer-2`（浅 `#FCFBF9` 暖白 / 深 `#242421`，主题自己的卡片 line 249/297 就在用）；`--dsw-alias-interactive-bg-hover` 也是 alpha 色（浅 `rgba(44,39,32,.05)` / 深 `rgba(255,255,255,.06)`），页面内嵌看着正常，**浮层叠在内容上会透**——设置页那张卡能用它是因为它嵌在设置页表面之上，不是悬浮。
- **修法**：弹层/黑条/预览气泡 → `background:var(--dsw-alias-bg-layer-2)` + `color:var(--dsw-alias-label-primary)` + `border:1px solid var(--dsw-alias-border-l2)`（分隔线/滚动条同 border-l2），黑条加轻阴影。浅色=暖白卡深字、深色=深卡浅字，两模式都自然。
- **教训**：悬浮浮层（fixed 定位、盖在内容上）的背景必须用**实心** token；判断实心与否直接看主题 CSS 的值（hex=实心，rgba+低 alpha=遮罩/悬停色）。「自适应表面」首选 bg-layer-2（主题自己的卡片契约），比 tooltip-bg（恒深）更贴合亮色模式审美。

## 44. 设置页整页空白 = settings.section 槽错误边界 + 未定义变量残留（修订 68，2026-08-15）
- **症状**：用户「快看看底栏/系统-底栏区域」——设置页只剩头部（打开配置文件/关闭按钮），正文 `<div data-slot-error="settings.section">` 空占位。
- **排查链**：① `Slots.listSubTree`（settings.section）看 occupants：general/models/plugins/agent-presets 全 active，唯独 `cost-estimate` active:false → 我们的区块渲染失败；② 通读设置区块代码，发现 `previewSegs` 被引用但**全文件无定义**——修订 45-67 把旧的 `previewSegs` 数组构建换成 `makeLineChildren()` 时漏改两处引用 → `ReferenceError` → 渲染崩溃 → 槽位错误边界接管整页。
- **修法**：等价推导 `previewDockTitle`（仅已启用分段的预览文本，旧语义）+ `hasPreviewSegs` 空态判断，替换两处残留引用。
- **教训**：① 渲染层崩溃会炸掉**整个槽位**（不是只坏自己那条），用户看到的是「设置页空了」而非报错；② 重构删变量后必须 grep 全文件查残留引用；③ Inspect 槽位 occupants 的 `active` 标志是快速定位「哪条没渲染成功」的入口。

## 45. 硬编码品牌色 → 主题 token：color-mix 是标准姿势（修订 69，2026-08-15）
- **用户需求**：45-67 修订加的多选条/选中徽章/拖拽光效/脉冲动画**写死了 Claude 橘色**（`#D97757`、`rgba(193,95,60,·)`、`rgba(217,119,87,·)`）、深色边框 `#383731`——「不要写死黄色，根据主题色定义」。
- **查主题真身**（dsh-claude-theme/theme.css）：`--dsw-alias-brand-primary` 浅 `#C15F3C` / 深 `#D97757` —— **正是写死的两个值**（作者把两套品牌色手动编进了明暗块）；且主题自己用 `color-mix(in srgb, var(--dsw-alias-brand-primary) X%, transparent)` 派生透明强调色（995/1013 行）——这就是官方跟随主题色的姿势，说明运行时 Chromium 支持 color-mix。
- **修法**：`scripts/tokenize-colors.cjs` 批量替换（幂等）——`#D97757` → `var(--dsw-alias-brand-primary)`；`rgba(193/217,95/119,60/87,A)` → `color-mix(in srgb, var(--dsw-alias-brand-primary) A×100%, transparent)`；`#383731` → `var(--dsw-alias-border-l2)`（深色 border-l2 #3A3934 几乎同值）。共 45 处。中性色（黑/白/深药丸底 rgba(44,39,32,.90)）保持不动。
- **教训**：① 做「主题化」先 grep 全文件硬编码色 + 查主题 CSS 确认对应 token 的值——写死值和 token 值对得上就说明找对了；② 半透明强调色一律 `color-mix(in srgb, var(--token) X%, transparent)`，不要 rgb() 手拆通道（主题一换就废）；③ 明暗两套块 token 化后值相同 → 冗余但无害，可后续合并。

## 46. 局部强调色要不要解耦：用户拍板「跟着主题色走」（修订 70/71，2026-08-15）
- **第一轮（修订 70）**：默认主题下 brand-primary 是近黑色 → 预览区高亮黑底白字对比过强，用户要求「改成灰色」。做了局部变量 `--dsh-preview-accent:#6B6B6B`（.dsh-comp-page 上定义），预览区 hover/高亮/幽灵分段与品牌色解耦，列表选中/徽章/多选条仍走品牌色。
- **第二轮（修订 71）**：用户改口「还是改回去吧，跟着主题色走比较好」→ 完整回退：预览区恢复 `var(--dsw-alias-brand-primary)` + color-mix 派生，局部变量删除。教训注释保留在代码头。
- **教训**：① 主题色驱动的 UI，用户最终倾向是「跟随主题色」——临时性审美妥协（灰色）往往是试探，做完后用户可能反悔；解耦方案尽量做成「局部 CSS 变量 + 一处定义」的形式，回退成本一行。② 用户说「改回去」就干净回退代码，别保留半吊子的双轨；文档里如实记录两轮决策即可。

## 47. 实心品牌填充在「中性品牌色主题」必翻车 → tint 填充 + 品牌文字（修订 72，2026-08-15）
- **症状**：深色模式 + 默认主题下：预览区高亮白得看不清字、开关选中条太亮。查默认主题 `design-platform.css` 实锤：`--dsw-alias-brand-primary` 是**中性色随模式翻转**（浅 `rgb(15,17,21)` 近黑 / 深 `rgb(249,250,251)` 近白），连 `brand-text`/`brand-primary-invert` 都是同值——**实心品牌填充 + 白字在这种主题下必有一边不可读**（深色：白底白字；浅色：黑底白字勉强但生硬）。Claude 主题是彩色品牌（橘），所以之前没暴露。
- **修法**（官方选中高亮惯例，theme.css 995 行同款）：一切「实心 brand 底 + 白字」→ **`color-mix(in srgb, var(--dsw-alias-brand-primary) X%, transparent)` 底 + `var(--dsw-alias-brand-primary)` 文字**：预览高亮 16%、选中徽章 22%、多选条 hover 24%、开关选中轨道 50%（白 knob 在灰色轨道上仍可见，整条不再刺眼）。透明 tint 在两种模式都成立（白 16% 叠深底=可读浅灰字白；黑 16% 叠浅底=可读浅黑字黑）。
- **教训**：① 写「品牌底 + 白字」前先确认主题品牌色是彩色还是中性——**中性品牌色主题（默认就是）实心填充必翻车**，tint 填充是唯一通吃写法；② 排查「太亮/看不清字」先查主题品牌色在两种模式的真实值，别猜；③ 细线/瞬态指示元素（拖拽落点线）可以保持实心，视觉噪声小、两种模式都可读。

## 48. 用户要「白天原版实心 / 夜间 tint」→ 风格开关用局部 CSS 变量（修订 73，2026-08-15）
- **用户需求**：「原来的那种效果我还挺喜欢的，白天做成原来那种，夜间做成现在这种，给个 CSS 开关——默认现在的，但有的主题可能有想法，也让它能开回原来那种。」
- **实现**：`.dsh-comp-page` 上定义三个变量，默认 **白天=实心+白字（原版）/ 夜间=tint+品牌文字（修订 72 版）**：
  - `--dsh-hl-fill` / `--dsh-hl-text`（预览高亮、选中徽章、多选条 hover 共用）
  - `--dsh-switch-fill`（开关选中轨道，白天实心/夜间 50% tint）
  - 主题/用户覆盖这三个变量即可整体切「全部 tint」或「全部实心」（代码注释里写了两种配方的完整值）。
- **教训**：① 用户说「喜欢原来的效果」时，先分清他喜欢的是**哪个主题/哪个模式**下的效果——这次的「原版」在白天好看、夜间翻车，所以答案不是整体回退而是**按模式分流**；② 「给个 CSS 开关」的落地形式 = 局部 CSS 自定义属性（一处定义、多处消费、主题可覆盖），比 JS 开关轻得多，也比写死两套规则好维护；③ 变量放 `.dsh-comp-page`（设置页容器）上，position:fixed 的多选条仍在 DOM 树内，能正常继承。

## 49. tint 高亮「看不出差别」→ 实心才是辨识度来源,发光是伪需求（修订 74，2026-08-15）
- **症状**：夜间 tint（16%）模式下用户连报两次：①「发光不发光看着真的一个样」②「原来实心就好很多，现在都空心就没啥差别」——低透明度 tint + 同色系光晕在深色背景上几乎不可见，高亮与未高亮无法区分，发光纯属浪费。
- **修法**：夜间默认改回**实心**填充 + `var(--dsw-alias-bg-base)` 文字（默认主题夜间=白底深字、Claude 夜间=橘底深字，全部可读）；夜间 `--dsh-hl-glow: none`（白天保留原版光晕）；开关轨道夜间仍 50% tint（避免修订 72 的「太亮」复现）。CSS 开关保留:主题可覆盖回 tint 或给夜间加回光晕（配方写在代码注释）。
- **教训**：① **高亮辨识度来自「填充对比」而非光晕**——透明 tint 在深底上就是「空心」,用户感知不到;实心填充是唯一强辨识度方案,代价是文字必须用反色 token（bg-base）,不能写死白字;② 用户说「发光开不开一个样」= 发光没起作用,直接删,别调参;③ 同一元素的不同属性（填充/文字/光晕/开关轨道）各自独立可覆盖,别捆在一个变量里。

## 50. DeepSeek 峰谷定价：`peak` 价组 + 北京时间窗口 + 开关（修订 75，2026-08-15）
- **需求**（用户贴官方公告）：2026-08-17 00:00 起 DeepSeek 实行峰谷定价——北京时间高峰 9:00-12:00 / 14:00-18:00，空闲=高峰一半；v4-flash 空闲 0.05/1.5/4.5、高峰 0.10/3.0/9.0；v4-pro 空闲 0.15/4.5/13.5、高峰 0.30/9.0/27.0。要一个开关 + 开启后提醒当前时段。
- **实现**：① `pricing.js` 内置 v4-flash/pro 基价=新空闲价 + `peak` 价组字段；`resolvePrice(model, config, {peakEnabled, when})` 高峰时用 peak 覆盖（用户自定义价无 peak 时继承内置,改价不影响峰谷）；`isPeakTime`/`beijingMinutes` 用 UTC+8 硬算（无夏令时）,窗口 [9,12)/[14,18)。② host 配置 `peakEnabled`（默认 true）随 composition.json 持久化（version 4→5）;estimateCost/getClientUsage 结果带 `peak:{enabled,window}`。③ 客户端：设置页开关 + 「当前高峰/空闲」实时指示（1s 轮询带回来的 window）、底栏费用段后缀「· 高峰/· 空闲」、明细面板首行「当前时段」、客户端全量卡模型下时段行;厂商模板 deepseek-v4 更新为新空闲价比值。
- **教训**：① 时间窗口判断用「UTC 分钟 + 固定时区偏移」而不是本地时间——服务器时区不可控,北京时间固定 UTC+8;② 峰值价格做成「基价 + peak 覆盖」而不是两套独立价格,开关关=只用基价,语义干净;③ 时段信息随已有 RPC 结果捎带（estimate/usage 加字段）,客户端不用另起轮询;④ 官方公告里的价格表先结构化（模型/桶/峰谷值）再编码,别手抄错位。

## 51. 峰谷限官方渠道:provider 白名单（修订 76，2026-08-15）
- **用户约束**：只有 DeepSeek **官方 API** 确认实行峰谷定价;其他提供商（尤其三方网关）是否透传官方价格未知 → 「暂时限定官方的未来价格」。
- **确认事实**：DSH 官方 DeepSeek provider 名 = **`deepseek`**（dsh-llm-deepseek 插件,settings.yaml 的 `llm-deepseek` 段）;用户实际流量走 `opencode-go`/`opencode`（llm-pi-ai 网关,settings.yaml 可见）——**不是官方渠道**。
- **实现**：配置 `peakProviders` 白名单（默认 `['deepseek']`）;`resolvePrice` 从归因键（`provider/model`）取 provider 段,不在白名单或无 provider 的键不套高峰价;`estimateCost`/`getClientUsage` 的 `peak.enabled` 改为「开关 ∧ 会话存在白名单渠道模型」——opencode-go 会话不显示时段标注（诚实:该渠道未确认适用）。
- **教训**：① 做「按渠道差异化计费」先查实际归因键（ledger 里 `渠道/模型`）和 settings.yaml 的 provider 配置——别假设"用户用的就是官方渠道";② 渠道级功能用白名单 + 默认保守（只含官方）,确认一个加一个;③ 「不适用」要体现在 UI 上（无标注）,而不是静默按错误价格算。

## 52. 峰谷时区可配置:UTC 基准 + 默认跟随系统（修订 77，2026-08-15）
- **用户需求**：「绑定 UTC 比较好,根据用户的系统时区处理,也设为可选时区」。
- **实现**：`zoneMinutes(date, tz)`——内部一律从 `Date` 的 UTC 字段计算（`getUTCHours*60+getUTCMinutes+offset*60` mod 1440）;`tz` 取值 `'system'`（默认,用 `date.getHours()` 本地时间=跟随 DSH 主进程所在机器的系统时区）或 `'UTC±N'` 固定偏移;`isPeakTime(date, tz)` 传入时区。配置 `peakTimezone` 持久化（version 7）;设置页新增「峰谷时区」下拉（跟随系统 / UTC / UTC±1..12）,选项标注在开关行旁。
- **测试抓到的 bug**：`'UTC'`（零偏移）不匹配 `^UTC([+-])\d+$` → 正则失败回退系统时区——**解析偏移的正则要单独处理零偏移特例**,否则 'UTC' 悄悄变成系统时区。
- **教训**：① 时区判断统一「UTC 字段 + 显式偏移」,绝不直接读服务器本地时间当业务时区（环境 TZ 不可控）;② 默认值选 `'system'`（用户机器即系统）,固定偏移留给有需要的场景;③ 每个时区选项都要有测试用例,零偏移/负偏移/边界时刻（12:00/18:00 整点）全测。

## 53. 峰谷提醒做成底栏分段:「⏱ 高峰/空闲」+ 点击详情（修订 78，2026-08-15）
- **需求**：「有人希望能提醒用户这个峰谷价,要不要做个按钮?或者显示在 UI 上」。
- **实现**：新增底栏分段 **`peak`（峰谷时段）**,复用现有分段机制（SEGMENT_IDS/LABELS/PREVIEW_TEXTS/builders/segDetailRows）——平时显示 `⏱ 高峰` / `⏱ 空闲`,点击弹详情（当前时段/高峰时段/空闲时段/时区/适用渠道）。**不适用时 builders 返回 null 自动隐藏**（非官方渠道/开关关闭时不占位）;默认启用,可拖拽换位。host 的 `est.peak` / `usage.peak` 增加 `tz` 字段供详情显示。
- **教训**：① 「提醒/按钮」类需求优先考虑**复用现有可点击分段机制**——分段本身就是按钮,加一个 id + builder + detail 行即可,不用另起 UI;② 新分段默认启用但**自隐藏**（数据不适用返回 null）,既满足提醒又不怕打扰;③ 分段文案用「⏱ 高峰」这类状态徽章式短语,和旁边「预估 ¥x」的数值型分段形成区分。

## 54. 「提醒」与「计价」解耦:peak 拆成 enabled/priced 两个开关（修订 79，2026-08-15）
- **用户需求**：① 峰谷时区下拉并入开关行;② 「我可能单纯想开启峰谷提醒...不一定额外扣费,就希望它显示出来」——提醒显示和峰谷计价是两件事。
- **实现**：两个开关——`peakEnabled`（峰谷计价:按高峰价算钱,官方渠道白名单生效）+ `peakRemind`（峰谷提醒:仅显示 ⏱ 高峰/空闲 与时段标注,与渠道无关,不影响价格）;`est.peak`/`usage.peak` 拆成 `{enabled:提醒, priced:计价∧官方渠道, window, tz}`——**峰谷分段/客户端全量卡行跟随 enabled,费用段后缀/明细面板时段行跟随 priced**（计价关时费用不标「高峰」,避免误导）。时区下拉并入计价开关行,配置 version 8。
- **教训**：① 「显示什么」和「按什么算钱」是独立的用户意图,拆成两个开关各管各的,别捆一起;② 一个功能开关被拆成两个后,数据字段要跟着拆（enabled vs priced）,UI 消费方按各自语义取——费用标注必须跟 priced,不然「提醒开着但没计价」时费用段会乱标;③ UI 行内联控件（开关+下拉同一行）注意行宽,label 别太长。

## 55. 新开关「点了没反应」= saveOptions 返回处理漏同步（修订 80，2026-08-15）
- **症状**：用户「峰谷计价/峰谷提醒两个开关都无法开关」——点击后 UI 无任何变化。其他开关（mode/precision）正常。
- **根因**：峰谷三状态（peakEnabled/peakRemind/peakTimezone）只在**挂载时的 getConfig 轮询**里同步,`saveOptions` 的 `.then(result)` 里**漏了回写**——host 其实已保存成功,但 React 状态从不更新 → 开关看起来是死的;其他开关能动,是因为它们的返回处理里有 setMode/setPrecision 等回写。
- **修法**：`saveOptions` 的 `.then` 补齐三个峰谷状态 + peakNow 的回写（与 getConfig 轮询同一套代码）。reset 的 `.then` 之前已补齐。
- **教训**：**新增状态时必须同时更新三处消费点**——getConfig 轮询、saveOptions 返回、reset 返回;只加轮询不加回写 = 「保存成功但 UI 无反应」。写新状态前先 grep 所有 `.then((result) =>` 的同步块,列个清单逐处补。

## 56. 新分段对老配置不可见 → normalizeSegments 自动补全（修订 81，2026-08-15）
- **症状**：用户重启后问「高峰期显示在哪里了」——「峰谷时段」分段在底栏和设置列表里都不存在。
- **根因**：① host 自己的 `SEGMENT_IDS` 常量没加 'peak'（只加了 client 的）→ normalizeSegments 把 'peak' 当未知 id 过滤;② normalizeSegments 只过滤不补全 → 用户磁盘上的旧配置（8 段）加载后仍是 8 段,新分段永远不出现,只能靠「恢复默认」才看得到。
- **修法**：host SEGMENT_IDS 补 'peak';normalizeSegments **自动把缺失的分段按默认启用追加**（新功能无需重置配置;peak 自隐藏所以无打扰）。
- **教训**：① 新增分段/选项时,**host 和 client 两份 SEGMENT_IDS/配置定义要同步改**,漏一处就是「client 有 UI、host 不认」;② 配置归一化函数（normalizeXxx）应该是「过滤未知 + 补全缺失」而不是只过滤——只过滤会让旧配置永远错过新字段;③ 用户问「显示在哪」先怀疑「旧配置里根本没有这个元素」,而不是怀疑渲染。

## 57. 状态分段要「有价有特效」:价格入分段 + 高峰/空闲差异化样式（修订 82，2026-08-15）
- **需求**：①「把价格也写进来——高峰价和低谷价」;②「高峰能不能给一点特别的效果?低谷也是」。
- **实现**：① host 在 estimateCost 里取**第一个官方渠道模型**,用 `resolvePrice(key, cfg, {peakEnabled:false})` 拿基价(其返回对象自带 `.peak` 价组,零额外查找) → `est.peak` 增加 `baseIn/baseOut/peakIn/peakOut`;② 分段文本 `⏱ 高峰 ¥3.0/1M`(按当前窗口取对应输入价),详情弹层加四行(高峰/空闲 × 输入/输出);③ 特效:高峰分段 = **品牌色 16% 胶囊底 + 品牌色文字 + 2.4s 柔和脉冲光晕**(box-shadow 扩散,`prefers-reduced-motion` 关闭),空闲 = 次级色 + 降透明度——状态一眼可分。
- **教训**：① 展示型状态(高峰/空闲)要「自带可读信息(价格)+ 视觉语义(颜色/动效)」,否则就是干巴巴的文字;② 取「基价 vs 高峰价」两组数字时,`resolvePrice(peakEnabled:false)` 返回的对象自带 `.peak` 字段,一次调用拿全两组,别为取数再写第二套解析;③ 动效遵守 `prefers-reduced-motion`(用户系统开了减弱动效就别脉冲)。

## 58. 展示价格对非官方渠道会话显示「—」→ 价格回退到任意带 peak 的模型（修订 83，2026-08-15）
- **症状**：用户贴的峰谷明细弹层——当前时段/时段/时区都正常,但**高峰/空闲输入输出价全是「—」**;用户会话走 opencode-go。
- **根因**：修订 82 的价格展示只取「官方渠道白名单（deepseek）」里的模型;opencode-go 不在白名单 → `officialKey` undefined → 四个价格字段 null。
- **修法**：价格展示回退——先找官方渠道模型,没有再找**第一个解析出 peak 价组**的模型（`resolvePrice(key, cfg, {peakEnabled:false})` 返回对象带 `.peak` 即视为有峰谷价,channel 无关,opencode-go/deepseek-v4-flash 也能命中）;按官方价作**参考展示**。计价语义不受影响:费用段标注仍跟 `priced`（白名单）,opencode-go 不计高峰价。
- **教训**：① 「展示参考值」和「实际计费值」是两个不同的选取规则——展示可以放宽到「任何有该价格的模型」,计费必须严守渠道白名单,别混用;② 详情弹层出现整列「—」时,先查数据源选取条件是否过窄（白名单/渠道过滤）,再查取值逻辑。

## 59. 分段两轴差异化:渠道轴(强/弱效果) + 时段轴(价格标色)（修订 84，2026-08-15）
- **用户需求**（口述整理）：① 就算当前没用官方模型,用户也想知道「官方现在高峰/低谷?什么价?」——参考价要常显;② 用官模（实际峰谷计价）给强效果,非官模给另一种（弱）效果;③ 高峰期给价格"标一下";④ 明细里塞个「高峰 vs 空闲」价格表格。
- **实现**：分段渲染拆出**价格子 span**（文本按最后一个空格拆分）——渠道轴:`priced`（官方∧计价）= 品牌胶囊+脉冲,否则 `dsh-seg-ref` 低调次级色（参考价照显）;时段轴:高峰窗口给价格加 `dsh-seg-price-hot`（品牌色加粗=贵）。明细弹层改为 `peakDetail()` 三列网格表格（价格/高峰/空闲 × 输入/输出）,当前时段列加 `dsh-peak-cell-hot` 高亮。
- **教训**：① 「两轴状态」分别映射到「容器类（效果强弱）」和「子元素类（价格标色）」,各管各的,别都堆在容器上;② 文本内嵌价格要单独标色,用「最后一个空格拆分」比正则解析稳;③ 表格用 CSS grid（3 列等分布局）比逐行 flex 更整齐,当前列高亮用列内逐 cell 加类。

## 60. 「两个价格看不明白」→ 标注桶类型 + 参考/实际身份（修订 85，2026-08-15）
- **症状**：用户「搞两个价格让人看不明白,要做标注区分」——分段里的 ¥3.0/1M 不知道是输入价还是输出价;非官方渠道时分段参考价和实际计费价是两回事,没说明。
- **修法**：① 分段文本标注桶类型: `⏱ 高峰 输入 ¥3.0/1M`,非官方渠道加「参考」标记: `⏱ 高峰 参考 输入 ¥3.0/1M`;② 明细弹层新增「实际计费」行: 官方=「按当前时段价」,非官方=「本渠道不计峰谷 · 按基价(空闲价)」;③ 表格首列改「单价(1M)」。
- **教训**：① 展示多组数字时,每个数字都要回答三个问题: **什么桶**(输入/输出)、**什么身份**(参考/实际)、**什么单位**(/1M)——缺一个就「看不明白」;② 「参考价」与「实际计费价」并存时必须显式标注关系,否则用户会把参考价当成自己该付的钱。

## 61. 价格表补全三桶:输入/缓存读/输出（修订 86，2026-08-15）
- **用户需求**：「输入,输出,缓存读,三个都要有价格哦」——峰谷明细表格只有输入/输出两行,缺缓存读。
- **实现**：est.peak 增加 `baseRead/peakRead`（host 从 resolvePrice 的 cacheRead 与 peak.cacheRead 取值,缺省回退基价）;明细表格加「缓存读」行,三桶齐全（DeepSeek 官方收费桶=输入/缓存读/输出,缓存写无收费项）。
- **教训**：① 价格展示的「桶集合」要对照官方计费口径（输入/缓存读/输出）一次列全,别用户点名一个补一个;② 峰值价组里缺失的桶要回退到基价同桶（peak.cacheRead ?? base.cacheRead）,而不是留空。

## 62. 分段缺价格 + 胶囊条件收窄:参考价兜底与「计费∧高峰」规则（修订 87，2026-08-15）
- **症状**：① 用户看到「⏱ 高峰 参考 输入」后面**没有价格**——新会话还没有任何用量/模型,est.priced/unpriced 全空,取不到参考价来源;② 用户要求胶囊背景的条件改为「打开了计费 + 高峰期」,谷期不用管。
- **修法**：① host 参考价来源加兜底:会话模型扫描不到时,依次试 `st.lastModel` → `this.fallbackRoute().model`,第一个能解析出 peak 价组的就用它;② 胶囊背景类 `dsh-seg-peak` 的条件从 `priced∧高峰` 改为 **`billing(计费开关)∧高峰`**(est.peak 新增 `billing: this.peakEnabled`),谷期不再加背景;非官方/未计价仍走低调 `dsh-seg-ref` 参考样式,价格照显。
- **教训**：① 「展示参考价」的数据源要能脱离会话独立兜底（默认模型）——参考价是全局事实,不该依赖会话里恰好有用量;② 用户对视觉规则的口头描述要精确落成布尔表达式:他说的就是「计费开关 ∧ 高峰时段」,别自作主张加渠道条件。

## 63. 峰谷价按模型分组:一个价格表不够,flash/pro 各一组（修订 88，2026-08-15）
- **用户发现**：「这里其实有两个价格呀,一个是 DeepSeek V4 Flash,另外一个是 Pro,话说 Pro 你做了吗?」——Pro 的 peak 价组修订 75 就内置了,但明细表格只按「会话第一个模型」显示了一组,另一组看不到。
- **修法**：host 新增 `peakModelList()`——遍历 DEFAULT_PRICES,把所有 `resolvePrice(peakEnabled:false)` 返回带 `.peak` 的模型(flash/pro,未来其他模型自动纳入)打包成 `est.peak.models`(每组 base/peak 三桶);客户端明细按模型分组渲染,每组一个模型名小标题 + 三桶两列表格;旧单模型字段保留作回退。
- **教训**：① 「这个功能对哪些模型生效」要用**数据驱动**(遍历价表找带 peak 的),而不是写死 flash/pro 两个名字——以后官方加新模型自动出现;② 展示型列表的「分组维度」(按模型)要主动想到,别等用户问「另一个呢」。

## 64. 堆叠分组 → 「占一行左右切换」:用户要的是切换不是堆叠（修订 89，2026-08-15）
- **用户反馈**：把两个模型的价格表堆在一起后,用户说「别,你看能不能直接提供一个按钮啥的,点开详细菜单之后在那里有一个占一行的左右切换」——要 ◀ 模型名 ▶ 一次看一个,不要堆叠。
- **实现**：dock 增加 `peakModelIdx` state(打开峰谷明细时归零);明细里模型区改为**占一整行的切换条**(◀ 按钮 / 模型名居中 / ▶ 按钮,循环切换),下方只渲染当前模型的表格;单模型时退化为模型名小标题。
- **教训**：① 「多个同构数据」的展示,用户默认倾向**切换器**(一次一个)而不是**堆叠**(全部列出)——堆叠占空间且信息过载;② 切换器放「占一行」的显式控件(左右箭头+名称),状态放组件级 state、打开时复位,别依赖外部;③ 上一版堆叠(修订 88)的 models 数据设计不用推翻,切换器只是换了渲染方式——数据驱动列表 + 索引取值,渲染随便换。

## 65. ◀ ▶ 按钮升级为「分段式滑槽」:滑动指示条（修订 90，2026-08-15）
- **用户反馈**：「不能做个滑槽什么的吗」——箭头按钮换成轨道+滑动指示条的分段控件。
- **实现**：`PeakModelSlider` 组件(apply 内定义)——轨道(`dsh-peak-slider`,圆角+边框+内边距)里一个绝对定位的品牌色胶囊指示条(`dsh-peak-slider-thumb`),下方 flex 平分 N 个分段按钮;`useLayoutEffect` 在 curIdx/models 变化后量取当前分段的 `offsetLeft/offsetWidth` 写入 thumb 的 left/width,配合 CSS `transition: left/width .22s` 实现平滑滑动;选中段文字品牌色加粗。单模型时退化模型名小标题。
- **教训**：① 「滑槽/分段控件」的滑动指示条 = 绝对定位 thumb + useLayoutEffect 量取目标位置 + left/width 过渡——量取要在 DOM 更新后(useLayoutEffect),别用 setTimeout 碰运气;② 分段控件内部用 flex 平分、thumb 绝对定位在轨道内(轨道 position:relative),点击目标就是普通 button,无障碍和键盘可用;③ 这种「量位置」的组件逻辑和渲染耦合,封装成独立小组件,别塞进父组件 render 里(峰值函数不能挂 hooks)。

## 66. 滑槽换模型 → 底栏参考价联动（修订 91，2026-08-15）
- **用户反馈**：「滑槽换了模型,那参考输入也要换吧」——明细滑槽切到 Pro 后,底栏 ⏱ 分段还挂着 Flash 的价,两处对不上。
- **修法**：`builders.peak` 从 `estimate.peak.models[peakModelIdx]` 取当前窗口的输入价(不再用 host 的单模型字段),多模型时分段带**短模型名**(Flash/Pro)便于辨认——`⏱ 高峰 参考 Pro 输入 ¥9.0/1M`;单模型时保持原样不带模型名。
- **教训**：① 「弹层里有选择器」时,所有展示该数据的入口(分段/卡片/其他弹层)都要**消费同一个选择状态**,否则必然出现「弹层选 A、外面显示 B」的错位;② 分段文本里加「短模型名」是低成本消歧——用户看到价格时能确认「这是哪个模型的价」。

## 67. 「是哪个时期」:当前高峰窗口高亮（修订 92，2026-08-15）
- **用户反馈**：高峰时段行显示「9:00-12:00 / 14:00-18:00」,既然是高峰期,能不能亮一下具体是哪个窗口。
- **实现**：pricing.js 新增 `currentPeakRangeLabel(date, tz)`(zoneMinutes 定位到 PEAK_RANGES 的索引,返回窗口标签或 null);est.peak 带 `activeRange`;明细「高峰时段」拆成两个 chips,当前所在窗口品牌色胶囊高亮 + 「· 当前」,空闲时段时在「空闲时段」行标「· 当前」。测试:10:00→9:00-12:00、15:30→14:00-18:00、13:00→null。
- **教训**：① 「多个同构时间段/选项,当前是哪个」= 高亮当前项 + 明确标签,别让用户自己对照时钟算;② 窗口定位复用 zoneMinutes(单一时区逻辑),别在客户端另写一套时间判断。

## 68. 滑槽选择「闪回」= 打开时重置索引（修订 93，2026-08-15）
- **症状**：用户「我调成 pro 了,但点一下底栏按钮,结果自动闪回 flash 了」——每次点击 ⏱ 分段重新打开明细,滑槽都回到第一个模型。
- **根因**：修订 89 在 `toggleDetail` 里加了 `if (segId === 'peak') setPeakModelIdx(0)`(打开即归零)——本意是「每次打开回到默认」,实际违背用户预期:选择应持久。
- **修法**：删除该重置;`peakModelIdx` 作为 dock 组件 state 常驻,关闭重开保持所选模型;模型列表变化时 `Math.min(peakModelIdx, len-1)` 钳制兜底(不会越界)。
- **教训**：① 「打开时重置为默认」这类 UX 决定,要么用户明确要求,要么别加——用户对「上次的选择」有强预期,重置=闪回,极其显眼;② 选择状态持久化的兜底就是钳制索引,别用「重置」来防越界。

## 69. 当前列高亮「看不见」:纯颜色加粗在默认主题下≈无（修订 94，2026-08-15）
- **症状**：用户贴表格「还有这一部分,顶部的输入」——当前时段列(高峰)只有颜色+加粗,默认主题下 brand-primary≈黑,和普通文字几乎一样,看不出高亮。
- **修法**：`.dsh-peak-cell-hot` 加 `background: color-mix(brand 14%, transparent)` + 圆角 + 内边距——当前列整列带浅品牌色胶囊底,与窗口 chips 视觉统一。
- **教训**：① 「高亮」必须靠**形状/底/亮度差**建立,不能只靠颜色——中性色主题下「同色系加粗」等于没高亮;② 凡是有「当前/选中」语义的单元格,检查它在最差主题(默认)下的可辨识度,别只在品牌色主题下验收。

## 70. 表格价格列居中:数字对齐比左对齐更整齐（修订 95，2026-08-15）
- **用户反馈**：「这些字样,能不能让它居中啥的」——峰谷表格价格列想居中。
- **实现**：`.dsh-peak-table .dsh-peak-cell:nth-child(3n+2)/(3n+3)`(网格每行 3 个 cell 的第 2/3 列)`text-align:center`——高峰/空闲两列数字居中,桶标签列保持左对齐。
- **教训**：① 数据表格里「数值列居中、标签列左对齐」是默认审美,先按这个来;② CSS grid 的列对齐用 nth-child 按列序选择(每行 cell 数固定时可靠),比给每个 cell 手动加类省事。

## 71. 高亮「不要加粗」:tint+颜色够用,去掉 font-weight（修订 96，2026-08-15）
- **用户反馈**：居中之后说「不是加粗呀」——当前列/窗口 chips 高亮里带的 font-weight 700/600 他不想要,只要居中 + 底色。
- **修法**：`.dsh-peak-cell-hot` 和 `.dsh-peak-range-hot` 去掉 font-weight,保留品牌色 14-16% 背景 tint + 品牌色文字——辨识度靠底色,不靠字重。
- **教训**：① 「高亮」的实现手段(底色/字重/颜色)是正交的,用户点名不要哪种就删哪种;② 加背景 tint 后字重冗余——tint+颜色已经足够区分,别叠三重视觉强调。

## 72. 高亮「不要框,恢复加粗」:视觉手段按用户实测反馈收敛（修订 97，2026-08-15）
- **用户反馈**：先「不要加粗」(修订 96 删了字重),实测后又「这里不要搞什么框,之前加粗就行」「现在加粗就很好」——表格当前列和窗口 chips 都不要背景框,恢复加粗。
- **修法**：`.dsh-peak-cell-hot` 恢复 `font-weight:700` + 品牌色(无背景/圆角/内边距);`.dsh-peak-range-hot` 恢复 `font-weight:600` + 品牌色(无背景/边框);居中保留。
- **教训**：① 视觉强调手段(底色 vs 字重)的取舍**以用户实测反馈为准**,别用「可辨识度理论」替用户做决定——之前担心默认主题下加粗看不清,用户实测觉得加粗正好;② 每次视觉调整都记录用户原话,来回拉扯时以**最新实测反馈**为准,别再按上上轮的结论改。
