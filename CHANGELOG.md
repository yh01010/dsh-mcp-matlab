# CHANGELOG

本插件的版本号只跟随**插件仓库**（`package.json`），与 MATLAB MCP Server、MATLAB MCP Server Toolbox、MATLAB 自身的版本都没有对应关系——那三者的版本见 README 的「兼容性」一节。

## v0.2.0 — 2026-11-17

### 文档修正（v0.1.0 写错的事实）
- 关键配置项表的默认值一列改为标注**宿主默认**，并说明「宿主默认 / 本包模板 / 作者本机」三层差异；`reconnect` 更正为**默认开启**（500ms 起、指数退避到 30s、最多 10 次），原文档写成「关闭」是错的。
- 删掉「MATLAB R2021a 或更新版本」这一没有上游依据的说法，改为「本项目只在 R2025a 上实测过」。
- 安装第 1 步补上 Agentic Toolkit 安装器的真实默认位置 `%USERPROFILE%\.matlab\agentic-toolkits\bin\`，`.local\bin\` 降级为手动下载的示例。
- 版本记录拆成两条线：Server exe 与 Toolbox，不再混用同一个版本号。
- 安装后验证的 `Test-Path` 改为用户目录下的两条候选路径（原来写死了一个本机路径）。

### 新增
- 「显示模式与会话模式」小节：`--matlab-display-mode` 与 `--matlab-session-mode`（Server v0.13.0+）各管什么、`existing` 与 `--matlab-root` 互斥、默认 `auto` 会踩 `no valid MATLAB environments found`。
- 「安装后验证：五层定位」——路径 → 进程 → 握手 → 枚举 → 最小调用，每层可独立判定。
- 「兼容性」三栏表（上游声明 / 本机已实测 / 未验证），含 DSH 版本与验证日期。
- 「本地检查」：`npm run validate` / `npm test` 的用法。
- 模板 `cordis.patch.yml` 增加 `--matlab-session-mode=new`：默认 `auto` 会先连已存在的会话，残留会话时直接失败。

### 变更
- `validate.mjs` 从「在文本里找子串」改为**解析 YAML 再校验结构**（顶层 id/name/config、`serverName` 字符集、`transport`、`command`、`args`、`toolCallTimeoutMs`、`failOnStartupError`、`insert` 递归、重复 id），新增 `--patch <file>` 与 `--root <dir>` 两个参数，并删掉原文里不成立的 `exit 2` 说明。
- 新增 `test/`（`node --test`，5 个用例 + fixtures）与 `.github/workflows/validate.yml`（push/PR 跑 validate + test）。
- `package.json`：`version` 0.1.0 → 0.2.0，新增 `scripts.validate`、`scripts.test` 与 `devDependencies.yaml`。

### 后端升级（本机验证，2026-11-15）
- Server v0.11.4 → **v0.16.1**、Toolbox 0.3.1 → **0.5.0**。`evaluate_matlab_code` 传 `disp(1+1)` 回 `2`；传 `error('...')` 回 `isError: true`（v0.16.0 起 MATLAB 侧报错即 tool error）。
- 升级命令必须带 `--setup-matlab --matlab-root=<安装根> --matlab-session-mode=new`：不带 `--matlab-session-mode=new` 时 `--setup-matlab` 会报 `Failed to get MATLAB Client: no valid MATLAB environments found`。

## v0.1.0 — 2026-09-16

首个版本：把本地 `matlab-mcp-server-windows-x64.exe` 接进 DSH 的纯配置桥接（`cordis.patch.yml` + 文档），不含 MATLAB 与任何二进制。