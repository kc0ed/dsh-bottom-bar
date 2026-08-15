# dsh-bottom-bar

DSH 底栏统计行插件（可组装 + 预估费用）：接管 `conversation.composer.dock` 的 stats cell，把官方统计行换成可配置的组装行，并在末尾追加**预估费用**标注（按模型 id 匹配价格表，支持 USD/CNY 多币种）。

<img width="500" alt="QQ_1786701111767" src="https://github.com/user-attachments/assets/92e20843-573f-4085-8853-c25aa44e3137" />
<img width="500" alt="image" src="https://github.com/user-attachments/assets/4d349b04-39bd-46ea-a2b3-d1ad982873f8" />

## ✅ 当前状态（2026-08-15）

**静态固化包已修复并通过干净环境真实 boot 验证**（`dsh --profile web` 独立 `$DSH_HOME` + 独立端口，HTTP 200 正常服务；旧硬伤 `service "bottomBar" has been registered` 已消除）。两种形态：

- **静态包（推荐，写进 DSH 配置后自动加载）**：`lib/` + typert 产物 + bundle patch（见下方「安装」）。Host 为官方类插件模式（`TypertRemoteService` default export），客户端在 apply 里运行时 `$mount` 自己的 Remote contribution（预构建的 dsh-api-remotes 不含本包，必须自挂载）。
- **动态插件**（历史形态）：会话内 `code.host` / `code.client` 运行（见 [dynamic/README.md](dynamic/README.md)），DSH 重启后需重跑。

功能（两形态一致）：增量计费（`session/event` 实时流 O(1) 追加）+ **自研持久化账本**（官方 `~/.dsh/cost-estimate.ledger.json`：投影基线 → 事件追加 → `session/flush` 落盘 → 重启恢复，永不全量重算）+ **持续对账**（客户端捎带全量用量 → 实时投影 → 冷快照，自动追平）+ **渠道/模型归因**（如 `opencode-go/deepseek-v4-flash`）+ **设置页「客户端全量（权威源）」面板**（四桶/命中率/费用拆分，每 3s 刷新）+ 诊断通道。

## 安装（静态包）

把本仓库作为 **profile bundle** 写入 DSH 配置（与 dsh-base / dsh-web-app 同一机制）：

1. 安装依赖：在目标 profile 目录（如 `$DSH_HOME/profiles/web`）执行 `pnpm add <本仓库路径>`（或手动把仓库放进 profile 的 node_modules）。
2. 编辑该 profile 的 `package.json`，把 `"dsh-bottom-bar"` 追加进 `dsh.profile.bundles` 数组：

   ```json
   "dsh": { "profile": { "bundles": ["@deepseek-ai/dsh-base", "@deepseek-ai/dsh-web-app", "dsh-bottom-bar"] } }
   ```

3. 重启 `dsh --profile web`。插件行由 bundle patch（`cordis.patch.yml` 的 `- insert:`）自动插入；host face 由 `dsh-typert-loader` 在挂载时自动 import `./typert` 并 contribute；客户端自 `$mount` 后底栏与设置页即可用。

> ⚠️ 静态包生效后请勿再跑动态插件，避免两个实例同时写同一账本文件。

## 仓库结构

- `lib/` — 静态固化包源码（**已完成，可安装**：`index.js` host 类插件 + `client.js` 静态客户端（ModuleLoader，同时是动态 client 的生成源）+ `typert.host.js` / `typert.remote-client.js` 产物）
- `dynamic/` — 动态插件源码（会话内运行形态；`client.js` 由生成器从 lib/client.js 产出，勿手改）
- `cordis.patch.yml` — profile bundle patch（`- insert:` 插入插件行）
- `scripts/static-to-dynamic.cjs` — 从 `lib/client.js` 生成 `dynamic/client.js` 的同步工具（注意：`ctx.slots`/`ctx.locale` 不可改写为自由变量，见生成器头注释）
- `scripts/dynamic-to-static.cjs` — 反向同步：把运行中的动态 client 变回静态 `lib/client.js`（修订注释自动追加），配合正向生成器做**往返一致验证**
- `docs/lessons.md` — 开发教训 30+ 条（槽位回退、RPC 取消风暴、持久化缓存、树内约束、静态包 boot 坑、动态客户端服务访问、增量账本、沙箱 workspaceRoot、渠道归因等）

## 功能

- **8 个统计段**可开关、可拖拽排序（拖动时显示放置指示线，落点 FLIP 动画）：轮/步、LLM 时长、工具调用时长、首 token 平均、吞吐 tok/s、缓存命中、输入/输出 token、**预估费用**
- **自研持久化账本**（修订 20/28/30-32）：用量按「渠道/模型」增量记账，落盘到官方 `~/.dsh/cost-estimate.ledger.json`（写入带会话 danger 权限 stamp；旧工作区文件只作迁移源）——投影基线 + 事件追加、`session/flush` 同步落盘，**重启恢复继续追加，永不全量重算**；历史归因可自动愈合；**持续对账**（客户端捎带 `useProjection('tokenUsage')` 四桶 → 实时投影 → 冷快照）自动把差额补进账本，明细面板与底栏永远一致
- **渠道感知**（修订 27/29）：同一模型 id 经不同渠道（如 opencode-go / 免费渠道）分别记账，归因键 = 渠道/模型（旧 @ 分隔自动归一）；价格按模型 id 查（支持未来按渠道覆盖）
- **费用实时跳动**：流式输出时预估费用随 token 实时增长（折叠底账 + 当前轮投影增量，客户端即时计价，零 RPC 等待）
- **点击分段弹出明细面板**：费用段显示逐模型单价 / 各桶 tokens / 金额 / 小计 / 总计；其他段显示原始数值
- **截断黑条**（官方 Tooltip 同款）：行溢出时悬停显示完整行，可设"始终显示"
- **费用精度**开关（紧凑 / 4 位小数）
- **价格表**（设置页底部，默认折叠）：内置 DeepSeek 系列；新增模型只填输入价，输出 / 缓存读 / 缓存写按 **5× / 0.1× / 1.25×** 自动派生，可再改；缓存桶可留空（=该模型无此桶，计费回退输入价）
- **性能**：折叠结果两级缓存（内存 5s + 磁盘 5min 持久化），页面刷新 / 切会话 / 重启后秒出，不反复重算

## 使用（动态插件形态）

在 DSH 会话里让 agent 把 `dynamic/host.js` 与 `dynamic/client.js` 定义为动态插件（`code.host` / `code.client`）并运行即可；配置与账本持久化在官方 `~/.dsh`（`cost-estimate.composition.json` / `cost-estimate.ledger.json`），会话重启后重跑插件即恢复。

设置 → **底栏**：

- 段开关 / 拖拽排序 / ↑↓ 换序、效果预览（悬停字段高亮）
- 输入/缓存口径（separate = 纯未命中输入 + 命中 token 数；combined = 官方口径 + 命中率）
- 黑条行为（auto = 仅截断时显示 / always）、费用精度（compact / full）
- 价格表（最底部折叠）：增删模型、改价、恢复默认

## 静态固化包（已完成 · 2026-08-15）

已按官方类插件模式重写并验证：`export default BottomBarService extends TypertRemoteService`（Remote 标记 = 方法名，host gateway SRC 发现 + `dsh-typert-loader` 自动 contribute `./typert` FaceModel 双通道路由）；存储改 node:fs/promises 直写官方 `~/.dsh`（主进程无沙箱）；`lib/typert.host.js`（FaceModel）+ `lib/typert.remote-client.js`（TYPERT_REMOTE，客户端自 `$mount`，codec 用透传 schema 免 zod 依赖）+ `cordis.patch.yml`（bundle `- insert:`）。逻辑与动态版同步到修订 36。

## 官方文档参考

- [打包与安装插件](https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/user/develop/basic/publish.zh.md)（组合包 / profile / `dsh plugin` / 层顺序 / tarball 与 git 安装）
- [插件配置](https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/user/develop/basic/config.zh.md)（patch 行格式、Schema 校验约定）
- [CLI 行为参考](https://github.com/deepseek-ai/deepseek-harness/blob/master/apps/cli/reference/README.md)（profile 启动、层优先级、`--dump-config`、插件管理 reconcile 语义）

## License

MIT © kc0ed。复刻的官方 UI 零件版权归原作者（DeepSeek）所有，归属与上游版本见代码头同步块。

---

本项目由 DeepSeek V4 Flash 在 DeepSeek Harness 中辅助开发完成。
