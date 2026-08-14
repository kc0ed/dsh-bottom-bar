# 动态插件形式（cost-2 · 当前正在运行的开发版）

这是 harness 会话里正在运行的动态插件 `cost-2`（最新包 pkg-60）的源码：

- `host.js`：Host 半体——`harness.handle` 注册 `estimate-cost` / `get-composition` / `set-composition` / `reset-composition` / `get-prices` / `set-price` / `remove-price` / `reset-prices`
- `client.js`：Client 半体——`slots` 注册底栏（`conversation.composer.dock` id `stats`）与设置页（`settings.section`），`host.call` 调 Host

`client.js` 由 [`scripts/static-to-dynamic.cjs`](../scripts/static-to-dynamic.cjs) 从 [`lib/client.js`](../lib/client.js) **机械变换生成**（`__ModuleLoader__` 包装 → Cordis 插件对象、`insertCss` → `styles`、`ctx.slots/ctx.locale` → `slots/locale`、`remote.X` → `host.call`），保证与静态包零抄写误差。

## 与静态包（lib/）的关系

| | 动态插件（本目录） | 静态包（lib/） |
|---|---|---|
| 形态 | Cordis 动态插件（会话内 define/run） | npm 风格静态包（`dsh.bundle` → `cordis.patch.yml`，`dsh plugin add` 自动挂载进层栈） |
| RPC | `harness.handle` / `host.call` | `ctx.remote.bottomBar`（TypertRemoteService） |
| 状态 | **开发版 / 当前正在运行（唯一实测过）** | 固化版，下次启动生效 |

两边的头部"修订记录"逐条对应（修订 9–16）。**升级 DSH 或改功能时**：先改静态包 `lib/`（含官方零件复刻同步块），再跑

```
node scripts/static-to-dynamic.cjs <lib/client.js>
```

重新生成 `dynamic/client.js`；Host 半体（`lib/index.js` ↔ `dynamic/host.js`）因形态差异大（类 + Remote 装饰器 vs 闭包 + harness.handle）需手工同步。

## 加载动态版（开发调试）

在 DSH 会话里把 `host.js` / `client.js` 作为 `code.host` / `code.client` 定义动态插件即可，与静态包功能一致。
