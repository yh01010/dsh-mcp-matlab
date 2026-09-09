# dsh-mcp-matlab 插件说明

## 这是什么

`dsh-mcp-matlab` 是一个 **DSH（DeepSeek Harness）桥接插件**，用来把本地安装的 MATLAB MCP Server 接入 DSH，让你能在 DSH 会话里直接调用 MATLAB。

**它不是 MATLAB MCP Server 本身，也不包含 MATLAB**。它只负责"接线"：启动你本地的 `matlab-mcp-server-windows-x64.exe`，把它暴露的工具注册成 DSH 的 `mcp__matlab__*` 工具。真正执行 MATLAB 代码的是那个 Server 和它背后的 MATLAB。

底层使用 DSH 宿主自带的 `@deepseek-ai/dsh-mcp-client`，本插件只是提供一份配置（`cordis.patch.yml`）。

## 功能

接入后，你会得到 5 个 `mcp__matlab__*` 工具：

| 工具名 | 作用 |
| --- | --- |
| `mcp__matlab__evaluate_matlab_code` | 在 MATLAB 会话中执行一段代码，返回命令行输出 |
| `mcp__matlab__run_matlab_file` | 执行一个 `.m` 脚本文件，返回输出 |
| `mcp__matlab__run_matlab_test_file` | 用 MATLAB `runtests` 运行测试文件，返回测试结果 |
| `mcp__matlab__check_matlab_code` | 用 MATLAB Code Analyzer 对 `.m` 脚本做静态检查（不改文件） |
| `mcp__matlab__detect_matlab_toolboxes` | 列出当前 MATLAB 已安装的版本和工具箱 |

## 安装

```sh
dsh plugin --profile desktop add github:yh01010/dsh-mcp-matlab
```

（`desktop` 换成你的 profile 名。）安装后**重启 DSH** 生效。

也可以把 `dsh-mcp-matlab` 加入 profile 的 `package.json` → `dsh.profile.bundles` 后 `pnpm install`，重启生效。

> 注意：本包**不发布到 npm**，只能从 GitHub 安装。

## 前置条件（必须先准备好）

**这个仓库不包含 MATLAB MCP Server，也不含 MATLAB。** 使用前你需要自己准备：

1. **一个 MATLAB MCP Server 可执行文件**——`matlab-mcp-server-windows-x64.exe`，从 MATLAB MCP Server 官方项目获取（自行下载或编译）。
2. **一个能正常启动的 MATLAB 安装**——且许可证可用。`--matlab-root` 指向它的安装根目录。
3. **正确的路径**——把插件里的占位路径替换成你机器上真实存在的路径（见"配置"）。

没有这三样，只装这个插件是**起不来、也不会出现工具**的。

## 配置

本插件**刻意不携带任何个人机器路径**，`cordis.patch.yml` 里的 `command`/`args` 是占位符。你必须改成自己机器上的真实路径。

推荐在你本机的 `$DSH_HOME/cordis.patch.yml`（用户级覆盖，优先级高于插件的 bundle 行）里覆盖，这样不用改插件仓库：

```yaml
# $DSH_HOME/cordis.patch.yml
- id: mcp-matlab
  name: '@deepseek-ai/dsh-mcp-client'
  config:
    serverName: matlab
    transport: stdio
    command: 'C:\Users\<你的用户名>\.local\bin\matlab-mcp-server-windows-x64.exe'
    args:
      - '--matlab-root=D:\path\to\your\matlab'
      - '--matlab-display-mode=nodesktop'
      - '--disable-telemetry'
    toolCallTimeoutMs: 120000
    failOnStartupError: true
```

关键配置项：

| 字段 | 含义 | 默认 |
| --- | --- | --- |
| `command` | MATLAB MCP Server 可执行文件 | 占位符（必填） |
| `serverName` | 工具名前缀，profile 内须唯一 | `matlab` |
| `--matlab-root` | MATLAB 安装根目录 | 占位符 |
| `toolCallTimeoutMs` | 单次工具调用超时（ms）。MATLAB 冷启动 + 加载工具箱可能超过 60 秒，故调大 | 60000 |
| `failOnStartupError` | 启动失败时立即抛错，而不是静默缺少工具 | false |
| `reconnect` | 断线重连策略 | 关闭 |

**路径含空格**：在 YAML 单引号字符串里直接写整串即可，例如：

```yaml
    command: 'C:\Users\<你的用户名>\matlab mcp\matlab-mcp-server-windows-x64.exe'
```

## 安装后验证

1. 重启 DSH 后，看工具列表里是否出现 `mcp__matlab__*`。
2. 若没有，先手动确认 Server 和 MATLAB 路径存在、Server 能独立启动：

   ```powershell
   Test-Path 'C:\Users\<你的用户名>\.local\bin\matlab-mcp-server-windows-x64.exe'
   Test-Path 'D:\path\to\your\matlab'
   ```

   Server 能独立启动但工具仍不出现，说明问题在 DSH 接线（patch/配置），不在 Server。

## 兼容性：不同 MATLAB 版本

**本插件与 MATLAB 版本无关**——它不检查版本，只把 `--matlab-root` 传给 Server。所以从插件角度，任何装好可用 MATLAB 的版本都能接。

真正决定兼容性的是 **MATLAB MCP Server 本体**：

- 已在 **MATLAB R2025a**（25.1.0.2943329）+ **MATLAB MCP Server Toolbox 0.3.1** 下实测通过（`evaluate_matlab_code` 正确返回 `1+1=2`、`pi*2=6.2832`；`detect_matlab_toolboxes` 列出 100+ 工具箱）。
- 该 MCP Server Toolbox 自身标记为 R2026a，但能正常驱动 R2025a，说明它**跨主版本兼容**。
- 但不保证所有版本：过老的 MATLAB（如 R2019 之前）或实验性版本，可能因 MCP Server 用到的 MATLAB API 不存在而受限。**只能实测确认**，插件无法预知。

## 排障

| 现象 | 可能原因 |
| --- | --- |
| 看不到 `mcp__matlab__*` 工具 | 路径/安装目录错、Server 没起来、patch 没生效、`serverName` 冲突 |
| 工具可见但调用报 JSON Schema 错误 | 模型供应商（如阿里 DashScope）不接受空参数 schema |
| 工具调用超时 | MATLAB 冷启动/加载工具箱超过 `toolCallTimeoutMs`（调大它） |
| DSH 因该插件无法启动 | `failOnStartupError: true` + 路径错；改路径或设回 false |

## 已知问题：空参数 JSON Schema

某些模型供应商（如阿里云 DashScope）会严格校验工具定义、拒绝空参数 schema 的工具。此时调用 MATLAB 工具可能报：

```
InternalError.Algo.InvalidParameter: ... must conform to a valid openai-compatible JSON schema
```

这是**供应商 vs 空 inputSchema** 的兼容问题，发生在 MCP → OpenAI schema 的转换层，和本插件的接线无关。本插件不含转换代码，因此**故意不在这里加绕过修复**——若你遇到，先确认错误来自模型适配层还是供应商，再到对应组件修。

## 移除

```sh
dsh plugin --profile desktop remove dsh-mcp-matlab
```

（或从 `dsh.profile.bundles` 移除后 `pnpm install`），重启生效。想临时停用，可在 profile 的 `cordis.patch.yml` 里给 `mcp-matlab` 行加 `disabled: true`。

## 许可证

MIT

## 说明来源

本说明基于作者本机实测：MATLAB R2025a（25.1.0.2943329）、MATLAB MCP Server Toolbox 0.3.1、`matlab-mcp-server-windows-x64.exe`。
