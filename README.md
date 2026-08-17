# @kc0ed/dsh-bottom-bar

DSH 底栏统计 + 预估费用插件:把聊天界面最底下那行统计接管过来,做成**能自己组装**的样子——想显示啥显示啥,还能拖拽排序,末尾缀一个**预估费用**,花钱心里有数。


<img width="500" alt="QQ_1786701111767" src="https://github.com/user-attachments/assets/92e20843-573f-4085-8853-c25aa44e3137" />
<img width="500" alt="image" src="https://github.com/user-attachments/assets/93508b29-bbff-4a71-94f6-7cdb4e497ad5" />
<img width="500" alt="image" src="https://github.com/user-attachments/assets/bea9dd19-a70c-4d7c-a9a1-5df683a35d8c" />

## 安装

### 0. 前置(两条都要有,缺一不可)

```bash
# ① Node.js(用它装下面两个)
# ② pnpm —— dsh plugin 是 pnpm 转发器,没它必挂:
npm i -g pnpm
# ③ dsh 命令行(有就跳过):
npm i -g @deepseek-ai/dsh
```

装完**重开一个新的终端**(PATH 才生效),验证:

```bash
pnpm -v        # 能打印版本号 = OK
dsh --version  # 能打印版本号 = OK
```

### 1. 方式一:npm 稳定版(推荐,省心)

```bash
dsh plugin --profile web add @kc0ed/dsh-bottom-bar
```

- 跟随 npm 发布节奏(发新版才更新),**稳定**,不折腾
- 缺点:GitHub 有新改动时,要等发版才能拿到(可能慢一两天)
- 更新到最新版:

```bash
dsh plugin --profile web update @kc0ed/dsh-bottom-bar
```

### 2. 方式二:GitHub 直装(类似 nightly,永远最新)

```bash
dsh plugin --profile web add github:kc0ed/dsh-bottom-bar
```

- 直接拉仓库 main 分支,**代码推到 GitHub 即可用**,不等发版
- 缺点:可能吃到刚提交还没充分测试的改动;且可能触发 pnpm 的 git 构建审批(见下方「常见坑-3」)
- 更新:`git pull` 后重跑一次 add 即可(或 `cd ~/.dsh/profiles/web && pnpm update github:kc0ed/dsh-bottom-bar`)

### 3. 装完(两种方式都一样)

1. **彻底退出 DSH 再重启**(`dsh web` 前老进程得死透,刷新页面不算)
2. 浏览器 **Ctrl+Shift+R 硬刷新**——不是没装上,是缓存记性好
3. 想装到别的 profile(如 headless)就把 `web` 换成 profile 名

卸载:`dsh plugin --profile web remove @kc0ed/dsh-bottom-bar`(依赖和层栈一起清)

### 常见坑

1. **`'pnpm' 不是内部或外部命令`** → pnpm 没装,或装完没重开终端。先 `npm i -g pnpm`,重开终端,`pnpm -v` 验证再继续。
2. **命令报「不是内部或外部命令」且命令看起来残缺** → 大概率是终端粘贴把长命令拆碎了。**一行一行手敲**,注意:`@kc0ed` 中间是**数字 0**(不是字母 O)。
3. **`pnpm failed` + 提示 allowBuilds(git 方式常见)** → pnpm 10 默认拦截 git 依赖的构建脚本,需要显式批准:
   1. 看报错里打印的 **exact key**(引号里那串,形如 `github.com/kc0ed/dsh-bottom-bar`)
   2. 编辑 `~/.dsh/profiles/web/pnpm-workspace.yaml`,加:

      ```yaml
      allowBuilds:
        <exact-key>: "dsh"
      ```

   3. 保存后重跑第 1/2 步的 add 命令。
4. **装完底栏没变化** → 先 Ctrl+Shift+R;还不行就彻底退出 DSH 再启动。

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
