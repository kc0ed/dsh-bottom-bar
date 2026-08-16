# 开发与发布(dsh-bottom-bar 维护者手册)

面向维护者(大概率只有作者一个人)。用户文档在 [README](../README.md)。

## 仓库结构

- `lib/` — 静态包本体:
  - `index.js` — host 半体(`TypertRemoteService` 子类,default export)
  - `client.js` — 客户端半体(同时也是动态镜像的生成源)
  - `pricing.js` + `models_dev_prices.json` — 定价引擎 + 价格表数据(`pricing.js` 运行时 `resolve(__dirname, 'models_dev_prices.json')` 读取,**发布 `files` 必须包含整个 `lib/`**,漏了别人装上就启动失败)
  - `typert.host.js` / `typert.remote-client.js` — Typert 清单。⚠️ 两个文件的 `package:` 字段**必须等于 npm 包名**(typert loader 有所有权校验,改名不改这里 = boot 直接挂)
- `dynamic/` — 动态插件形态(历史遗留;生成器产出,别手改)
- `cordis.patch.yml` — bundle 补丁:往 profile 组合树插插件行(`name:` 必须等于 npm 包名)
- `scripts/` — `static-to-dynamic.cjs`(lib → dynamic 镜像)、`dynamic-to-static.cjs`(反向回写)、`tokenize-colors.cjs`(硬编码色 → 主题 token)
- `docs/lessons.md` — 一路踩坑的教训,写插件前值得一读

## 开发循环

改 `lib/client.js` → `node scripts/static-to-dynamic.cjs lib/client.js dynamic/client.js` 同步镜像 → commit → push → **重启 DSH + Ctrl+Shift+R**。

本机 profile 与仓库是 junction 直连的(`~/.dsh/profiles/web/node_modules/@kc0ed/dsh-bottom-bar` → 仓库),改完重启就是新代码——这是「改完马上生效」的真相。

## 发布新版本

```bash
cd dsh-bottom-bar
npm version patch     # 或 minor / major
npm publish           # 账号必须是 kc0ed(@kc0ed scope 归它管)
```

npm 发布现在强制 2FA:看到 "Press ENTER to open in the browser..." 就**按回车 → 浏览器里授权 → 等命令自己结束**(退出码 0 才算成,提示符带 `?1` 就是失败了,重来)。

### 发布前必做体检(漏了别人装完就挂)

1. **`npm pack --dry-run`** — 核对 Tarball Contents,`lib/` 全文件必须在(尤其 `pricing.js`、`models_dev_prices.json`;`files` 白名单已改为 `["lib", "cordis.patch.yml"]`,lib 加新文件不用再维护清单)
2. **端到端安装测试**(临时 DSH_HOME,不碰本机配置):

   ```powershell
   $env:DSH_HOME = "$env:TEMP\dsh-reltest"
   dsh --profile web --dump-config           # 初始化 + 治愈 node_modules 回退层
   dsh plugin --profile web add ./xxx.tgz    # 或 add @kc0ed/dsh-bottom-bar(registry 源)
   dsh --profile web --port 0                # 真实 boot:30s 内不崩、输出 "dsh web: http://..." 即通过
   ```

   ⚠️ `dsh plugin add` 对**含空格/中文的路径**会把参数拆烂(底层 `spawnSync shell:true`)——tarball 先复制到无空格路径再 add。

## 改名/换 scope 必查清单

npm 包名改动要同步六处,漏一处就装不上或 boot 挂:

1. `package.json` `name`(加 `publishConfig.access: "public"`)
2. `cordis.patch.yml` 的 `name:`
3. profile `package.json` 的依赖键 + `dsh.profile.bundles` 清单
4. `pnpm-lock.yaml`(跑一次 `pnpm install`)
5. `node_modules` 链接(scoped 要建 `node_modules/@kc0ed/` 子目录;junction 手术用 `node fs.symlinkSync(target, path, 'junction')`,PowerShell New-Item 对空格+中文路径不稳定)
6. typert 三处 `package:` 字段(`lib/typert.host.js`、`lib/typert.remote-client.js`、`lib/client.js` 内联 TYPERT_REMOTE)——**typert loader 校验所有权,不改 = boot 挂**

descriptor 的 `id`/`typeSymbol` 前缀(`dsh-bottom-bar#...`)是两端一致的线标识,与 npm 名无关,不用改。

## 已知环境坑

- pnpm 对含空格/中文的 `link:` 路径会造坏 junction;重建用 node `fs.symlinkSync`
- 运行中的 DSH 进程占着旧链接时删不掉(`fs.rmSync` 静默失败)——重启后补删
- `dsh plugin add` 相对路径 spec 按**调用目录**锚定;裸目录 spec 建 junction(实时同步),`file:` 是拷贝式(改代码不生效)
