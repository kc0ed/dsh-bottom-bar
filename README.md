# dsh-bottom-bar

DSH 底栏统计行插件（可组装 + 预估费用）：接管 `conversation.composer.dock` 的 stats cell，把官方统计行换成可配置的组装行，并在末尾追加**预估费用**标注（按模型 id 匹配价格表，支持 USD/CNY 多币种）。

<img width="500" alt="QQ_1786701111767" src="https://github.com/user-attachments/assets/92e20843-573f-4085-8853-c25aa44e3137" />
<img width="500" alt="image" src="https://github.com/user-attachments/assets/4d349b04-39bd-46ea-a2b3-d1ad982873f8" />


## 仓库结构

- `lib/` — **静态固化包**（可安装：junction + cordis.patch.yml，见下方安装）
- `dynamic/` — **当前正在运行的动态插件源码**（开发版，唯一实测过；与静态包逻辑同步，见 [dynamic/README.md](dynamic/README.md)）
- `scripts/static-to-dynamic.cjs` — 从静态 `lib/client.js` 生成动态 `dynamic/client.js` 的同步工具
- `docs/lessons.md` — 开发教训 20 条（槽位回退、RPC 取消风暴、持久化缓存等）

## 功能

- **8 个统计段**可开关、可拖拽排序（拖动时显示放置指示线，落点 FLIP 动画）：轮/步、LLM 时长、工具调用时长、首 token 平均、吞吐 tok/s、缓存命中、输入/输出 token、**预估费用**
- **费用实时跳动**：流式输出时预估费用随 token 实时增长（折叠底账 + 当前轮投影增量，客户端即时计价，零 RPC 等待）
- **点击分段弹出明细面板**：费用段显示逐模型单价 / 各桶 tokens / 金额 / 小计 / 总计；其他段显示原始数值
- **截断黑条**（官方 Tooltip 同款）：行溢出时悬停显示完整行，可设"始终显示"
- **费用精度**开关（紧凑 / 4 位小数）
- **价格表**（设置页底部，默认折叠）：内置 DeepSeek 系列；新增模型只填输入价，输出 / 缓存读 / 缓存写按 **5× / 0.1× / 1.25×** 自动派生，可再改；缓存桶可留空（=该模型无此桶，计费回退输入价）
- **性能**：折叠结果两级缓存（内存 5s + 磁盘 5min 持久化），页面刷新 / 切会话 / 重启后秒出，不反复重算

## 安装

前提：DSH 的 web profile（`dsh web`）。

**一键安装**（推荐，幂等）：把仓库放到 `<profile>/packages/dsh-bottom-bar`，然后：

```powershell
powershell -ExecutionPolicy Bypass -File scripts/install-profile.ps1
```

脚本自动完成：① 把 `dsh-bottom-bar` 加入 profile 的 `package.json` 依赖（`file:./packages/dsh-bottom-bar`）→ ② `pnpm install` 生成 profile `node_modules` 链接 → ③ 确保 `cordis.patch.yml` 里有 `bottom-bar` 行。然后**重启 `dsh web`** 即自动加载。

**手动安装**：

1. 把本包放进 profile 的 packages 目录（或任意目录）：

   ```
   ~/.dsh/profiles/web/packages/dsh-bottom-bar/
   ```

2. 让 profile 的 `node_modules` 能解析到它（二选一）：

   - pnpm（推荐，官方 workspace 方式）：在 profile 的 `package.json` 加 `"dsh-bottom-bar": "file:./packages/dsh-bottom-bar"`，然后 `pnpm install`
   - Windows junction：`mklink /J "<profile>\node_modules\dsh-bottom-bar" "<packages>\dsh-bottom-bar"`

3. 在 profile 的 `cordis.patch.yml` 追加一行（挂到根配置的列表行）：

   ```yaml
   - insert:
       - id: bottom-bar
         name: dsh-bottom-bar
   ```

   验证：`node dsh web --dump-config` 能看到 `bottom-bar → dsh-bottom-bar`。

4. 重启 `dsh web`。

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

- **接管方式**：`conversation.composer.dock` 是 session 作用域 list 槽，以 `id: 'stats'` 与官方同 id 替换（该槽位是唯一接缝；接管组件绝不返回 null，否则槽位会回退官方实现）
- **复刻来源**：StatsLine 与 Tooltip 1:1 复刻自 `@deepseek-ai/dsh-client-ui-conversation@0.1.0-rc.6` 与 `@deepseek-ai/dsh-client-ui-primitives`（上游版本、行号、升级后同步步骤见 `lib/client.js` 头部同步块）
- **Host 半体**：`bottomBar` Remote 服务（`TypertRemoteService`），提供 estimate / config / prices RPC；预估基于 `sessionQuery.readSession` 全量折叠重算（无状态、自愈、同 turn+step 替换语义）
- **实时增量**：展示 = 折叠底账 + max(0, cost(当前轮投影) − cost(折叠时最后样本))——投影是"直接记录"的当前轮用量，客户端即时计价
- **开发教训**：20 条实测踩坑记录见 [docs/lessons.md](docs/lessons.md)（槽位回退、RPC 取消风暴、latest-wins 节流、持久化缓存等）

## License

MIT © kc0ed。复刻的官方 UI 零件版权归原作者（DeepSeek）所有，归属与上游版本见代码头同步块。

---

本项目由 DeepSeek V4 Flash 在 DeepSeek Harness 中辅助开发完成。
