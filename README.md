# dsh-bottom-bar

DSH 底栏统计行插件（可组装 + 预估费用）：接管 `conversation.composer.dock` 的 stats cell，把官方统计行换成可配置的组装行，并在末尾追加**预估费用**标注（按模型 id 匹配价格表，支持 USD/CNY 多币种）。

<img width="500" alt="QQ_1786701111767" src="https://github.com/user-attachments/assets/92e20843-573f-4085-8853-c25aa44e3137" />
<img width="500" alt="image" src="https://github.com/user-attachments/assets/4d349b04-39bd-46ea-a2b3-d1ad982873f8" />


## 仓库结构

- `lib/` — **静态固化包**（Host + Client 半体，可安装，见下方安装）
- `cordis.patch.yml` — **组合包配置层**（由 `dsh.bundle` 声明，`dsh plugin add` 自动挂载进 profile 层栈）
- `dynamic/` — **当前正在运行的动态插件源码**（开发版，唯一实测过；与静态包逻辑同步，见 [dynamic/README.md](dynamic/README.md)）
- `scripts/static-to-dynamic.cjs` — 从静态 `lib/client.js` 生成动态 `dynamic/client.js` 的同步工具
- `docs/lessons.md` — 开发教训 25 条（槽位回退、RPC 取消风暴、持久化缓存、树内约束等）

## 功能

- **8 个统计段**可开关、可拖拽排序（拖动时显示放置指示线，落点 FLIP 动画）：轮/步、LLM 时长、工具调用时长、首 token 平均、吞吐 tok/s、缓存命中、输入/输出 token、**预估费用**
- **费用实时跳动**：流式输出时预估费用随 token 实时增长（折叠底账 + 当前轮投影增量，客户端即时计价，零 RPC 等待）
- **点击分段弹出明细面板**：费用段显示逐模型单价 / 各桶 tokens / 金额 / 小计 / 总计；其他段显示原始数值
- **截断黑条**（官方 Tooltip 同款）：行溢出时悬停显示完整行，可设"始终显示"
- **费用精度**开关（紧凑 / 4 位小数）
- **价格表**（设置页底部，默认折叠）：内置 DeepSeek 系列；新增模型只填输入价，输出 / 缓存读 / 缓存写按 **5× / 0.1× / 1.25×** 自动派生，可再改；缓存桶可留空（=该模型无此桶，计费回退输入价）
- **性能**：折叠结果两级缓存（内存 5s + 磁盘 5min 持久化），页面刷新 / 切会话 / 重启后秒出，不反复重算

## 安装（教程）

### 前置

- 已安装 DSH（`dsh web` 能启动，`dsh` 命令在 PATH 中）
- `pnpm`（`dsh plugin` 转发 pnpm，`npm i -g pnpm` 即可）

### 概念速览（30 秒）

DSH 的插件安装建立在两个概念上（官方文档：[打包与安装插件](https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/user/develop/basic/publish.zh.md)）：

- **组合包（bundle）**：附带配置层的 npm 包。本插件在 `package.json` 里声明了 `dsh.bundle`，指向本仓库根部的 `cordis.patch.yml`（一行 `- insert: {id: bottom-bar, name: dsh-bottom-bar}`）。
- **profile**：`$DSH_HOME/profiles/web`（通常 `C:\Users\<你>\.dsh\profiles\web`），描述一份可启动组合。它的 manifest 里 `dsh.profile.bundles` 是**层栈**。

`dsh plugin --profile <name> <pnpm 参数>` 是官方插件管理命令（转发 pnpm），并且**每次成功后自动 reconcile 层栈**：声明了 `dsh.bundle` 的依赖自动进栈，移除依赖自动出栈 —— 装 / 卸都**不需要手改任何配置文件**。

生效配置按层组合：组合包层（按 bundles 顺序）→ profile 的 `cordis.patch.yml` → home 级 `$DSH_HOME/cordis.patch.yml` → `--patch` overlay。

### 官方安装（推荐，两条命令）

把仓库放进 **profile 树内**（原因见下文"树内约束"），然后交给官方命令：

```powershell
# 1. 把仓库放进 profile 树内（推荐直接 clone 到这里，git pull 方便）
git clone https://github.com/kc0ed/dsh-bottom-bar "$env:USERPROFILE\.dsh\profiles\web\packages\dsh-bottom-bar"

# 2. 安装（在 profile 目录执行）
cd "$env:USERPROFILE\.dsh\profiles\web"
dsh plugin --profile web add ./packages/dsh-bottom-bar
```

`dsh plugin add` 把依赖装进 profile 的 `node_modules`（裸目录 spec = link: 协议，pnpm 建 **junction** 指向仓库，git pull 后内容实时同步），并自动把它追加进 `dsh.profile.bundles` 层栈 —— **不需要手改任何配置文件**。

验证（不必启动服务）：

```powershell
dsh web --dump-config    # 应看到 "# == dsh-bottom-bar" 层
```

重启 `dsh web` 生效。

> 全新机器第一次运行会自动初始化 profile（终端出现 `dsh: initialized profile web` 提示属正常现象）。

### 更新

```powershell
git -C "$env:USERPROFILE\.dsh\profiles\web\packages\dsh-bottom-bar" pull
# junction 内容实时同步；若 package.json 的依赖声明变了，重跑 add 刷新锁文件
dsh plugin --profile web add ./packages/dsh-bottom-bar
```

> ⚠️ 不要用 `file:` 协议安装（`dsh plugin add file:./packages/...`）：它是**拷贝式**，内容变更时 pnpm 报 "Already up to date" 不更新（旧版本踩过的坑）。裸目录 spec（`add ./packages/...`，即 link: 协议）才是 junction，实时同步。

### 卸载

```powershell
dsh plugin --profile web remove dsh-bottom-bar
```

依赖与层栈同时移除，干净利落。

### 为什么必须"树内拷贝"（血泪）

Host 半体运行时 `import '@deepseek-ai/dsh-typert-protocol'` 与 `'@deepseek-ai/cordis'`，Node 从包的**真实位置**向上找 node_modules。profile 树内 parent-walk 能到达 `$DSH_HOME/profiles/node_modules` 的安装回退链接层（含全部 `@deepseek-ai` 包）；而树外仓库（例如 `link:` 指向桌面上的 clone）解析不到 → `MODULE_NOT_FOUND` → **dsh web 启动即挂（打不开）**。

官方教程的 `add ./插件目录`（link:）对无依赖插件没问题，但本插件 Host 半体有 `@deepseek-ai` 依赖，所以包的真实位置必须在 profile 树内。（**tarball 安装不受此限**：`pnpm pack` 后 `dsh plugin add ./xxx.tgz`，依赖随包一起装进 profile 的 `node_modules`，可放任意位置 —— 适合做 GitHub Release 分发。）

### 故障排查

| 症状 | 原因 | 处理 |
|---|---|---|
| `dsh web` 打不开 / `MODULE_NOT_FOUND` | 包的真实位置在 profile 树外 | 卸载后按官方安装重装（clone 到树内） |
| `JSON.parse ... Unexpected token` | profile `package.json` 被写入 BOM | 用 UTF-8 无 BOM 重写（VS Code / node） |
| `must be a top-level YAML array` | `cordis.patch.yml` 只剩注释（空文件解析为 null） | 在文件末尾补一行 `[]` |
| 改了代码网页没变化 | 拷贝式安装（`file:`）滞留旧内容 | 改用裸目录 spec（junction）+ 重启 `dsh web` |
| `--dump-config` 没有 bottom-bar 层 | 未 add，或 bundles 被移除 | 重新执行 `dsh plugin --profile web add`；确认 `dsh.profile.bundles` 含 `dsh-bottom-bar` |

## 使用

设置 → **底栏**：

- 段开关 / 拖拽排序 / ↑↓ 换序、效果预览（悬停字段高亮）
- 输入/缓存口径（separate = 纯未命中输入 + 命中 token 数；combined = 官方口径 + 命中率）
- 黑条行为（auto = 仅截断时显示 / always）、费用精度（compact / full）
- 价格表（最底部折叠）：增删模型、改价、恢复默认

配置文件（settings 文档同目录）：

- `cost-estimate.composition.json`：段组装 + 价格表（version 4）
- `cost-estimate.estimates.json`：预估结果磁盘缓存（可删，自动重建）

## 内置价格说明

- 内置官方 DeepSeek V4 价格（2026-08-14 官方价格页，CNY / 1M tokens）：
  - `deepseek-v4-flash`：输入（缓存未命中）1 / 缓存命中 0.02 / 输出 2
  - `deepseek-v4-pro`：输入（缓存未命中）3 / 缓存命中 0.025 / 输出 6
- `deepseek-chat` / `deepseek-reasoner` 已随官方下架移除（2026-08-14）
- 缓存写无官方价，flash / pro 均按缓存命中同价内置（设置页可改；清空 = 无此桶，按输入价计费）
- ⚠️ 官方计划 2026-08-17 00:00 起改为峰谷定价（空闲时段为高峰一半），暂未实现
- 其他模型在设置页按需添加（新增只填输入价，输出 / 缓存读 / 缓存写按 5× / 0.1× / 1.25× 自动派生）

## 架构

- **安装方式**：官方组合包机制 —— `package.json` 声明 `dsh.bundle` → `dsh plugin add` 自动进 `dsh.profile.bundles` 层栈（见上方安装教程）
- **接管方式**：`conversation.composer.dock` 是 session 作用域 list 槽，以 `id: 'stats'` 与官方同 id 替换（该槽位是唯一接缝；接管组件绝不返回 null，否则槽位会回退官方实现）
- **复刻来源**：StatsLine 与 Tooltip 1:1 复刻自 `@deepseek-ai/dsh-client-ui-conversation@0.1.0-rc.6` 与 `@deepseek-ai/dsh-client-ui-primitives`（上游版本、行号、升级后同步步骤见 `lib/client.js` 头部同步块）
- **Host 半体**：`bottomBar` Remote 服务（`TypertRemoteService`），提供 estimate / config / prices RPC；预估基于 `sessionQuery.readSession` 全量折叠重算（无状态、自愈、同 turn+step 替换语义）
- **实时增量**：展示 = 折叠底账 + max(0, cost(当前轮投影) − cost(折叠时最后样本))——投影是"直接记录"的当前轮用量，客户端即时计价
- **开发教训**：24 条实测踩坑记录见 [docs/lessons.md](docs/lessons.md)（槽位回退、RPC 取消风暴、latest-wins 节流、持久化缓存、树内约束等）

## 官方文档参考

- [打包与安装插件](https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/user/develop/basic/publish.zh.md)（组合包 / profile / `dsh plugin` / 层顺序 / tarball 与 git 安装）
- [插件配置](https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/user/develop/basic/config.zh.md)（patch 行格式、Schema 校验约定）
- [CLI 行为参考](https://github.com/deepseek-ai/deepseek-harness/blob/master/apps/cli/reference/README.md)（profile 启动、层优先级、`--dump-config`、插件管理 reconcile 语义）

## License

MIT © kc0ed。复刻的官方 UI 零件版权归原作者（DeepSeek）所有，归属与上游版本见代码头同步块。

---

本项目由 DeepSeek V4 Flash 在 DeepSeek Harness 中辅助开发完成。
