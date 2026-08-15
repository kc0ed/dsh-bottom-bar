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
