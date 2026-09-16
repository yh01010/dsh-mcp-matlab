# dsh-mcp-matlab 插件说明

> [!IMPORTANT]
> **装完不能直接用。** 本插件只是"接线"，它**不含 MATLAB，也不含 MATLAB MCP Server 可执行文件**。从插件市场/命令安装后，你还需要自己准备这两样外部依赖并填好路径，`mcp__matlab__*` 工具才会出现。
>
> - **自己配**：按下面的 [安装后还需要三步](#安装后还需要三步) 做。
> - **让 AI 帮你配**：把 [这段提示词](#让-ai-帮你完成配置) 原样发给你的 DSH 会话，剩下的交给它。
>
> 安装本身不会再让 DSH 崩溃（`failOnStartupError` 已默认 `false`）；配置不对时的表现是"**没有工具**"，而不是"起不来"。

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

（`desktop` 换成你的 profile 名。）安装后**重启 DSH** 生效——但注意：重启后**不会自动出现工具**，还要做完 [安装后还需要三步](#安装后还需要三步)。

也可以把 `dsh-mcp-matlab` 加入 profile 的 `package.json` → `dsh.profile.bundles` 后 `pnpm install`，重启生效。

> 注意：本包**不发布到 npm**，只能从 GitHub 安装。

## 前置条件（必须先准备好）

**这个仓库不包含 MATLAB MCP Server，也不含 MATLAB。** 使用前你需要自己准备：

1. **一个 MATLAB MCP Server 可执行文件**——`matlab-mcp-server-windows-x64.exe`，从 MATLAB MCP Server 官方项目获取（自行下载或编译）。
2. **一个能正常启动的 MATLAB 安装**——且许可证可用。`--matlab-root` 指向它的安装根目录。
3. **正确的路径**——把插件里的占位路径替换成你机器上真实存在的路径（见"配置"）。

没有这三样，只装这个插件是**不会出现工具**的（DSH 本身仍能正常启动，不会因为缺依赖而崩溃）。

## 安装后还需要三步

1. **拿到 MATLAB MCP Server 可执行文件** `matlab-mcp-server-windows-x64.exe`：从 [MathWorks 官方仓库的 Latest Release](https://github.com/matlab/matlab-mcp-server/releases/latest) 下载（或自行编译）。放到一个固定目录，例如 `%USERPROFILE%\.local\bin\`。
2. **确认 MATLAB 可被启动**：MATLAB R2021a 或更新版本，且许可证可用。`--matlab-root` 可以省略——Server 默认从系统 PATH 找第一个 MATLAB；显式指定更稳。
3. **填真实路径并重启**：按 [配置](#配置) 一节在 `$DSH_HOME/cordis.patch.yml` 里覆盖 `command`，重启 DSH，工具列表里应出现 `mcp__matlab__*`。

## 让 AI 帮你完成配置

不想手改配置，就把下面这段原样发给你的 DSH 会话（两处路径换成你自己的）：

```text
请帮我把 DSH 的 MATLAB 插件（dsh-mcp-matlab）配置到可用状态，参考
https://github.com/yh01010/dsh-mcp-matlab 的 README。

现状：插件包已装好，但 mcp__matlab__* 工具没出现，因为
cordis.patch.yml 里还是占位路径。

请依次做：
1. 检查 MATLAB MCP Server 可执行文件是否存在；没有就告诉我从
   https://github.com/matlab/matlab-mcp-server/releases/latest
   下载哪个文件、放到哪里。
2. 用 Test-Path 确认 MATLAB 安装根目录。
3. 编辑 $DSH_HOME/cordis.patch.yml，用「id 覆盖」写法（不要用 insert，
   否则会出现两行同 id，serverName 冲突导致启动中止）填上真实路径：
   command: <exe 的完整路径>
   args 里 --matlab-root=<MATLAB 安装根目录>
4. 提醒我重启 DSH，重启后确认 mcp__matlab__* 工具是否出现。

不要改动插件包内部的 cordis.patch.yml。
```

> 前提：会话要有该文件的写入权限。`$DSH_HOME` 通常在会话工作区之外，可能触发一次权限确认。

## 配置

本插件**刻意不携带任何个人机器路径**，`cordis.patch.yml` 里的 `command`/`args` 是占位符。你必须改成自己机器上的真实路径。

两种接法 **二选一，不要同时用**：

| 你的情况 | `$DSH_HOME/cordis.patch.yml` 里怎么写 |
| --- | --- |
| **已装了插件包**（市场/`dsh plugin add`） | 只写 **id 覆盖**（下面那段 `- id: mcp-matlab`，**不要** `insert`）。包里的 bundle 行已经插入了这一行，覆盖它的 `config` 即可 |
| **没装插件包**，手工接线 | 用 `insert` 把整行插进去（见下方折叠块） |

> [!WARNING]
> 插件包已装、又在 home patch 里 `insert` 同一 id 的行 → 会得到**两行同 id** → 两个 mcp-client 实例抢 `serverName: matlab` → DSH 启动时报 `serverName "matlab" is already in use by another mcp-client instance` 并中止。这是最容易踩的坑。

id 覆盖写法（**装了插件包时用这个**，不会改到仓库文件）：

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
    failOnStartupError: false
```

<details>
<summary>不装插件包时的手工接法（<code>insert</code> 整行）</summary>

```yaml
# $DSH_HOME/cordis.patch.yml
- insert:
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
        failOnStartupError: false
```

这种方式下**不要**再装插件包，否则与上面的坑同源。

</details>

关键配置项：

| 字段 | 含义 | 默认 |
| --- | --- | --- |
| `command` | MATLAB MCP Server 可执行文件 | 占位符（必填） |
| `serverName` | 工具名前缀，profile 内须唯一 | `matlab` |
| `--matlab-root` | MATLAB 安装根目录 | 占位符 |
| `toolCallTimeoutMs` | 单次工具调用超时（ms）。MATLAB 冷启动 + 加载工具箱可能超过 60 秒，故调大 | 60000 |
| `failOnStartupError` | 启动失败时立即抛错，而不是静默缺少工具。**开启会让 DSH 起不来**（每次启动都中止），只在路径已验证后再开 | false |
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
| 看不到 `mcp__matlab__*` 工具 | 最常见：占位路径还没换成真实路径（刚装完就是这个状态）。其余：路径/安装目录错、Server 没起来、patch 没生效 |
| 装完重启后 DSH 起不来 | ① home patch 里 `insert` 了与插件包重复的 `mcp-matlab` 行 → `serverName` 冲突；删掉重复的那条 `insert`。② 你自己把 `failOnStartupError` 开成了 `true` 且路径错；设回 `false` 或改对路径 |
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
