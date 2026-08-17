# @kc0ed/dsh-bottom-bar

DSH 底栏统计 + 预估费用插件:把聊天界面最底下那行统计接管过来,做成**能自己组装**的样子——想显示啥显示啥,还能拖拽排序,末尾缀一个**预估费用**,花钱心里有数。


<img width="500" alt="QQ_1786701111767" src="https://github.com/user-attachments/assets/92e20843-573f-4085-8853-c25aa44e3137" />
<img width="500" alt="image" src="https://github.com/user-attachments/assets/93508b29-bbff-4a71-94f6-7cdb4e497ad5" />
<img width="500" alt="image" src="https://github.com/user-attachments/assets/bea9dd19-a70c-4d7c-a9a1-5df683a35d8c" />

## 安装

前提:装了 [pnpm](https://pnpm.io/installation)。然后**一条命令**:

```bash
dsh plugin --profile web add @kc0ed/dsh-bottom-bar
```

- 想装到别的 profile(比如 headless)就把 `web` 换成 profile 名
- 不想走 npm,也可以直接从 GitHub 装:`dsh plugin --profile web add github:kc0ed/dsh-bottom-bar`
- 这条命令会自动:初始化 profile(首次)→ 装包 → 把插件写进 `dsh.profile.bundles` 层清单。**装完啥都不用手改**

装完记得:

1. **彻底退出 DSH 再重启**(`dsh web` 前老进程得死透,刷新页面不算)
2. 浏览器 **Ctrl+Shift+R 硬刷新**——不是没装上,是缓存记性好

卸载:`dsh plugin --profile web remove @kc0ed/dsh-bottom-bar`(依赖和层栈一起清)

> ⚠️ 装了静态包之后,别再同时跑「动态插件」形态,两个实例写同一个账本会打架。

## 它能干点啥

**底栏那行字:**

- 8 个统计段:轮/步、LLM 时长、工具调用时长、首 token 平均、吞吐 tok/s、缓存命中、输入/输出 token、**预估费用**
- 每段可开关、可拖拽排序;按住 **Ctrl 点选**还能批量多选,整批拖走(全选/反选/取消都有)
- 行太长被截断?悬停出黑条看完整行(可设「始终显示」)
- 点任意分段 → 弹出**明细面板**:费用段是逐模型的单价 / 各桶 token / 金额 / 小计 / 总计,其他段是原始数值

**设置 → 底栏(设置页那个区块):**

- **预览区**:改配置的同时实时看效果;悬停还能「预演」未启用的段插进去长啥样
- **价格表**:内置 DeepSeek V4/V3、Claude、OpenAI、Gemini、Kimi、通义等**厂商模板**,新增模型只填输入价,其余按模板自动派生;也支持手动填每个桶(币种可换)
- 配置有 **localStorage 水合**——刷新网页不会闪回默认值
- 「客户端全量 · 权威源」卡片:当前会话四桶用量 + 命中率 + 费用拆分,1s 实时刷新

**钱和账:**

- 用量按「渠道@模型」记账(比如 `opencode-go/deepseek-v4-flash`),同一模型走不同渠道分开算,不吃亏
- 账本落盘在 `~/.dsh/cost-estimate.ledger.json`,**只追加、永不重算**,重启接着记;客户端捎带全量用量持续对账,明细面板和底栏永远一致
- 流式输出时费用实时跳,零等待

## DeepSeek 峰谷定价

DeepSeek 官方 2026-08-17 起实行高峰/空闲两档价(高峰 9:00–12:00 / 14:00–18:00,北京时间,空闲约半价)。插件支持:

- **峰谷计价开关**:开着就按高峰价算钱(目前对 DeepSeek 官方渠道、OpenCode 生效;其他三方网关暂不不套用)
- **峰谷提醒开关**:只显示「⏱ 高峰/空闲」和时段标注,不影响算钱——两个开关互不绑定
- **时区可选**:默认跟随系统,也可以固定 UTC / UTC±N
- 点底栏「⏱ 高峰」分段 → 详情弹层:当前时段、高峰/空闲窗口、三桶(输入/缓存读/输出)价格表,还能**滑杆切换模型**(flash/pro)比价

## 常见问题

- **装了但底栏没变化?** 先 Ctrl+Shift+R;还不行就彻底退出 DSH 再启动——主进程没重启,新插件不会加载
- **价格显示「—」?** 该渠道/模型没有内置价格,去设置页价格表补一个就行
- **费用和官方账单对不上?** 这是**估算**——按会话 token × 单价算的参考值,不包含官方优惠/活动价

## 想改代码 / 反馈

仓库:https://github.com/kc0ed/dsh-bottom-bar
开发、测试、发布流程见 [`docs/DEVELOPMENT.md`](docs/DEVELOPMENT.md);踩坑记录见 [`docs/lessons.md`](docs/lessons.md)。

## 官方文档参考

- [打包与安装插件](https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/user/develop/basic/publish.zh.md)(组合包 / profile / `dsh plugin` / 层顺序 / tarball 与 git 安装)
- [插件配置](https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/user/develop/basic/config.zh.md)(patch 行格式、Schema 校验约定)
- [CLI 行为参考](https://github.com/deepseek-ai/deepseek-harness/blob/master/apps/cli/reference/README.md)(profile 启动、层优先级、`--dump-config`、插件管理 reconcile 语义)

## License

MIT © kc0ed。复刻的官方 UI 零件版权归原作者(DeepSeek)所有,归属与上游版本见代码头同步块。

---

本项目由 DeepSeek V4 Flash 在 DeepSeek Harness 中辅助开发完成。
