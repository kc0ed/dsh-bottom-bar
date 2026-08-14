# dsh-bottom-bar · profile 一键安装脚本（幂等，可重复执行）
# ──
# 做什么：
#   1) 把 dsh-bottom-bar 加进 profile 的 package.json 依赖（file:./packages/dsh-bottom-bar）
#   2) pnpm install —— 生成 <profile>/node_modules/dsh-bottom-bar 链接（官方 workspace 方式）
#   3) 确保 cordis.patch.yml 里有 bottom-bar 行（无则追加）
# 然后重启 dsh web 即自动加载（插件 + 配置都自动读）。
#
# 用法：
#   powershell -ExecutionPolicy Bypass -File scripts/install-profile.ps1
#   powershell -ExecutionPolicy Bypass -File scripts/install-profile.ps1 -ProfileDir "D:\path\to\profile"
#
# 前置：把本仓库（或至少 lib/package.json 所在的 dsh-bottom-bar 目录）放到
#       <profile>/packages/dsh-bottom-bar 下。
param(
  [string]$ProfileDir = "$env:USERPROFILE\.dsh\profiles\web",
  [string]$PackageName = "dsh-bottom-bar"
)

$ErrorActionPreference = "Stop"
$packageJsonPath = Join-Path $ProfileDir "package.json"
$patchPath = Join-Path $ProfileDir "cordis.patch.yml"
$pkgDir = Join-Path $ProfileDir "packages\$PackageName"

Write-Host "==> profile: $ProfileDir"

# 0) 前置检查
if (-not (Test-Path $pkgDir)) {
  Write-Host "!! 没找到包目录 $pkgDir —— 请先把仓库放到 profile 的 packages/ 下" -ForegroundColor Red
  exit 1
}

# 1) package.json 依赖
$pkg = Get-Content $packageJsonPath -Raw | ConvertFrom-Json
if (-not $pkg.dependencies) { $pkg | Add-Member -NotePropertyName "dependencies" -NotePropertyValue @{} -Force }
if ($pkg.dependencies.$PackageName) {
  Write-Host "==> 依赖已存在: $PackageName = $($pkg.dependencies.$PackageName)"
} else {
  $pkg.dependencies | Add-Member -NotePropertyName $PackageName -NotePropertyValue "file:./packages/$PackageName" -Force
  $pkg | ConvertTo-Json -Depth 8 | Set-Content $packageJsonPath -Encoding utf8
  Write-Host "==> 已加入依赖: $PackageName = file:./packages/$PackageName"
}

# 2) pnpm install（生成 node_modules 链接；幂等，重复执行无副作用）
$link = Join-Path $ProfileDir "node_modules\$PackageName"
if (Test-Path $link) {
  Write-Host "==> node_modules 链接已存在: $link"
} else {
  Write-Host "==> pnpm install ..."
  pnpm install --dir $ProfileDir
  if ($LASTEXITCODE -ne 0) { Write-Host "!! pnpm install 失败" -ForegroundColor Red; exit 1 }
}
if (-not (Test-Path $link)) { Write-Host "!! 链接未生成: $link" -ForegroundColor Red; exit 1 }

# 3) cordis.patch.yml 的 bottom-bar 行（幂等追加）
$patchText = ""
if (Test-Path $patchPath) { $patchText = Get-Content $patchPath -Raw -Encoding utf8 }
if ($patchText -match "(?m)^\s*- insert:\s*$" -and $patchText -match "(?m)^\s+- id: $PackageName\s*$") {
  Write-Host "==> patch 行已存在"
} else {
  $block = "`n# dsh-bottom-bar：自动挂载底栏统计插件（安装脚本写入）`n- insert:`n    - id: $PackageName`n      name: '$PackageName'`n"
  Add-Content -Path $patchPath -Value $block -Encoding utf8
  Write-Host "==> 已写入 patch 行（id: $PackageName）"
}

Write-Host ""
Write-Host "==> 完成！重启 dsh web 即自动加载（插件 + ~/.dsh/cost-estimate.composition.json 配置自动读取）。" -ForegroundColor Green
Write-Host "    验证：node dsh web --dump-config | findstr bottom-bar"
