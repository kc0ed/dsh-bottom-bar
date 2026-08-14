# dsh-bottom-bar

DSH 底栏统计行插件（可组装 + 预估费用）：接管 `conversation.composer.dock` 的 stats cell，把官方统计行换成可配置的组装行，并在末尾追加**预估费用**标注（按模型 id 匹配价格表，支持 USD/CNY 多币种）。

<img width="500" alt="QQ_1786701111767" src="https://github.com/user-attachments/assets/92e20843-573f-4085-8853-c25aa44e3137" />
<img width="500" alt="image" src="https://github.com/user-attachments/assets/4d349b04-39bd-46ea-a2b3-d1ad982873f8" />

## ⚠️ 当前状态（2026-08-14）

**静态固化包（`lib/`）尚未完成，暂不可安装。**

真实启动验证发现硬伤：Host 半体在 loader boot 下报 `service "bottomBar" has been registered`（干净环境可复现、单次 apply 却正常，机制未定位）；且官方 Remote 服务插件需要 `./typert` + `./remote` 产物同步给客户端，本包缺失——即使 boot 修好客户端也无法激活。**按旧版 README 安装会导致 `dsh web` 启动失败（打不开）**，请勿安装。

**当前唯一可用形态 = 动态插件**：在 DSH 会话中作为 `code.host` / `code.client` 运行（见 [dynamic/README.md](dynamic/README.md)）。静态包修复完成后会更新本文档并恢复安装说明。

## 仓库结构

- `lib/` — 静态固化包源码（**未完成，仅作动态版生成基底与后续修复用**；`lib/client.js` 是动态客户端 `dynamic/client.js` 的机械生成源）
- `dynamic/` — **当前可用形态：动态插件源码**（host + client 半体，会话内运行）
- `scripts/static-to-dynamic.cjs` — 从 `lib/client.js` 生成 `dynamic/client.js` 的同步工具（注意：`ctx.slots`/`ctx.locale` 不可改写为自由变量，见生成器头注释）
- `docs/lessons.md` — 开发教训 25+ 条（槽位回退、RPC 取消风暴、持久化缓存、树内约束、静态包 boot 坑、动态客户端服务访问等）

## 功能

- **8 个统计段**可开关、可拖拽排序（拖动时显示放置指示线，落点 FLIP 动画）：轮/步、LLM 时长、工具调用时长、首 token 平均、吞吐 tok/s、缓存命中、输入/输出 token、**预估费用**
- **费用实时跳动**：流式输出时预估费用随 token 实时增长（折叠底账 + 当前轮投影增量，客户端即时计价，零 RPC 等待）
- **点击分段弹出明细面板**：费用段显示逐模型单价 / 各桶 tokens / 金额 / 小计 / 总计；其他段显示原始数值
- **截断黑条**（官方 Tooltip 同款）：行溢出时悬停显示完整行，可设"始终显示"
- **费用精度**开关（紧凑 / 4 位小数）
- **价格表**（设置页底部，默认折叠）：内置 DeepSeek 系列；新增模型只填输入价，输出 / 缓存读 / 缓存写按 **5× / 0.1× / 1.25×** 自动派生，可再改；缓存桶可留空（=该模型无此桶，计费回退输入价）
- **性能**：折叠结果两级缓存（内存 5s + 磁盘 5min 持久化），页面刷新 / 切会话 / 重启后秒出，不反复重算

## 使用（动态插件形态）

在 DSH 会话里让 agent 把 `dynamic/host.js` 与 `dynamic/client.js` 定义为动态插件（`code.host` / `code.client`）并运行即可；配置与预估持久化在 settings 文档同目录（`cost-estimate.composition.json` / `cost-estimate.estimates.json`），会话重启后重跑插件即恢复。

设置 → **底栏**：

- 段开关 / 拖拽排序 / ↑↓ 换序、效果预览（悬停字段高亮）
- 输入/缓存口径（separate = 纯未命中输入 + 命中 token 数；combined = 官方口径 + 命中率）
- 黑条行为（auto = 仅截断时显示 / always）、费用精度（compact / full）
- 价格表（最底部折叠）：增删模型、改价、恢复默认

## 静态固化包（未完成 · 修复清单）

若后续修复，需要：

1. **Host boot 修复**：定位并消除 loader boot 下的 `service "bottomBar" has been registered`（疑似对象插件 + apply 内手动 `new Service` 与官方类插件模式的差异；官方带 Remote 的插件均为 Service 子类作 default export，如 `dsh-goal`）
2. **typert/remote 产物**：参考官方插件（`dsh-goal` 的 `lib/typert.host.js` / `lib/typert.remote-client.js` + package.json 的 `./typert` / `./remote` exports）补齐，客户端才能解析 `remote.bottomBar`
3. **Host 逻辑同步**：静态 `lib/index.js` 落后于动态版（价格表缺 deepseek-v4-pro 等）
4. **真实 boot 验证**：固化后必须用干净环境真实启动（`dsh --profile web --port <空闲端口>`）验证，不能再只验 import/dump-config

## 官方文档参考

- [打包与安装插件](https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/user/develop/basic/publish.zh.md)（组合包 / profile / `dsh plugin` / 层顺序 / tarball 与 git 安装）
- [插件配置](https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/user/develop/basic/config.zh.md)（patch 行格式、Schema 校验约定）
- [CLI 行为参考](https://github.com/deepseek-ai/deepseek-harness/blob/master/apps/cli/reference/README.md)（profile 启动、层优先级、`--dump-config`、插件管理 reconcile 语义）

## License

MIT © kc0ed。复刻的官方 UI 零件版权归原作者（DeepSeek）所有，归属与上游版本见代码头同步块。

---

本项目由 DeepSeek V4 Flash 在 DeepSeek Harness 中辅助开发完成。
