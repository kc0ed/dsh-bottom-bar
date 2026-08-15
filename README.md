# dsh-bottom-bar

嗯……简单说,这就是那个「底栏统计 + 预估费用」插件。

你在 DSH 聊天界面最底下看到的那一行统计(轮数 / 时长 / 吞吐 / token / 费用那些),本来官方有一行,但太素了,咱把它接管过来,换成了**能自己组装**的版本——8 个统计段,想显示啥显示啥,还能拖拽排序,末尾缀一个**预估费用**,花钱心里有数。

(对,截图是早期版本的,现在好看多了,懒得换图,意思到了就行。)

<img width="500" alt="QQ_1786701111767" src="https://github.com/user-attachments/assets/92e20843-573f-4085-8853-c25aa44e3137" />
<img width="500" alt="image" src="https://github.com/user-attachments/assets/93508b29-bbff-4a71-94f6-7cdb4e497ad5" />

## 现在到哪一步了(2026-08-15 版)

已经迭代到 **修订 71** 了,一路从「能跑」干到「好看」:

- ✅ **静态包**是正式形态:写进 DSH 配置后自动加载,重启不丢(你现在装的就是它)
- ✅ **账本持久化**:用量只追加、永不重算,重启从账本恢复接着记
- ✅ **主题跟随**:弹层、光效、高亮全走官方 token,切什么主题自动变色,绝不写死
- ✅ **速度**:底栏 1s 心跳、设置面板 1s 刷新、弹层秒出
- ⏸️ 动态插件是历史形态(会话里跑的),除非调试否则别碰——**两个实例同时写一个账本会打架**

## 它能干点啥(人话版)

**底栏那行字:**

- 8 个统计段:轮/步、LLM 时长、工具调用时长、首 token 平均、吞吐 tok/s、缓存命中、输入/输出 token、**预估费用**
- 每段可开关、可拖拽排序;按住 **Ctrl 点选**还能批量多选,整批拖走(有悬浮条提示,全选/反选/取消都安排上了)
- 行太长被截断?悬停出黑条看完整行(可设「始终显示」)
- 点任意分段 → 弹出**明细面板**:费用段是逐模型的单价 / 各桶 token / 金额 / 小计 / 总计,其他段是原始数值

**设置 → 底栏(设置页那个区块):**

- **预览区**:改配置的同时实时看效果;悬停还能「预演」未启用的段插进去长啥样,不点不生效
- **价格表**:内置 DeepSeek V4/V3、Claude、OpenAI、Gemini、Kimi、通义等**厂商模板**,新增模型只填输入价,其余按模板自动派生;也支持手动填每个桶(币种可换、缓存桶可留空)
- 配置有 **localStorage 水合**——手动刷新网页不会闪回默认值
- 底部「客户端全量 · 权威源」卡片:当前会话四桶用量 + 命中率 + 费用拆分,1s 实时刷新

**钱和账:**

- 用量按「渠道@模型」记账(比如 `opencode-go/deepseek-v4-flash`),同一模型走不同渠道分开算,不吃亏
- 账本落盘在 `~/.dsh/cost-estimate.ledger.json`,**只追加、永不重算**;客户端捎带全量用量持续对账,明细面板和底栏永远一致
- 流式输出时费用实时跳,零等待

## 安装(静态包,三步,别慌)

1. 进 profile 目录(如 `$DSH_HOME/profiles/web`),执行 `pnpm add <本仓库路径>`。
   ⚠️ 路径带空格的话 pnpm 会给你造个坏的 junction——直接手动 `New-Item -ItemType Junction` 指回仓库,别在 pnpm 上死磕。
2. 打开该 profile 的 `package.json`,把 `"dsh-bottom-bar"` 塞进 `dsh.profile.bundles` 数组:

   ```json
   "dsh": { "profile": { "bundles": ["@deepseek-ai/dsh-base", "@deepseek-ai/dsh-web-app", "dsh-bottom-bar"] } }
   ```

3. 用你平时的启动方式重启,比如 `npx -y @deepseek-ai/dsh web`(就是 127.0.0.1:3080 那个)。完了,插件行由 bundle patch 自动插入,host face 自动 contribute,客户端自挂载。

> ⚠️ 浏览器如果还是旧样子,按 **Ctrl+Shift+R 硬刷新**——不是没装上,是缓存记性好。
> ⚠️ 静态包生效后别再跑动态插件,两个实例写同一个账本会打架。

## 仓库结构(好奇的话)

- `lib/` — 静态包本体:`index.js`(host,`TypertRemoteService` 子类)+ `client.js`(客户端,同时是动态版的生成源)+ `typert.host.js` / `typert.remote-client.js`
- `dynamic/` — 动态插件形态(历史遗留;`client.js` 是生成器产出的,别手改)
- `cordis.patch.yml` — 往 profile 里插插件行的补丁
- `scripts/` — `static-to-dynamic.cjs`(lib → dynamic 镜像)、`dynamic-to-static.cjs`(反向回写)、`tokenize-colors.cjs`(把写死的颜色批量换成主题 token,谁再写死色就跑一遍)
- `docs/lessons.md` — 一路踩坑的教训,40+ 条,写插件前值得一读

## 开发循环(改完代码的正确姿势)

改 `lib/client.js` → `node scripts/static-to-dynamic.cjs lib/client.js dynamic/client.js` 同步镜像 → commit → push → 重启 DSH + Ctrl+Shift+R。就这,没了。

(仓库是 junction 直连的,改完重启就是新代码——这就是「改完马上生效」的真相。)

## 官方文档参考

- [打包与安装插件](https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/user/develop/basic/publish.zh.md)(组合包 / profile / `dsh plugin` / 层顺序 / tarball 与 git 安装)
- [插件配置](https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/user/develop/basic/config.zh.md)(patch 行格式、Schema 校验约定)
- [CLI 行为参考](https://github.com/deepseek-ai/deepseek-harness/blob/master/apps/cli/reference/README.md)(profile 启动、层优先级、`--dump-config`、插件管理 reconcile 语义)

## License

MIT © kc0ed。复刻的官方 UI 零件版权归原作者(DeepSeek)所有,归属与上游版本见代码头同步块。

---

本项目由 DeepSeek V4 Flash 在 DeepSeek Harness 中辅助开发完成。
