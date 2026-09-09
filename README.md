# dsh-mcp-matlab

DSH plugin: bridge a local MATLAB MCP server into DSH.

Under the hood it relies on the host's built-in [`@deepseek-ai/dsh-mcp-client`](https://www.npmjs.com/package/@deepseek-ai/dsh-mcp-client): one instance connects to one MCP server and registers its tools on `ctx.tools` under `mcp__matlab__<tool>` (e.g. `mcp__matlab__detect_matlab_toolboxes`, `mcp__matlab__evaluate_matlab_code`, `mcp__matlab__run_matlab_file`, `mcp__matlab__run_matlab_test_file`, `mcp__matlab__check_matlab_code`).

> This package is installed from GitHub and is **not published to npm** (`package.json` sets `"private": true`). Install it with `dsh plugin add github:yh01010/dsh-mcp-matlab`, not `npm i`/`pnpm add`. If it is ever published, `private` will be removed and the publish flow documented here.

## Prerequisites

**This repository does not include the MATLAB MCP server.** You must supply it yourself. Before installing:

1. Obtain a `matlab-mcp-server-windows-x64.exe` (build or download it — see the MATLAB MCP server project for how; this repo only wires it into DSH).
2. Have a working MATLAB installation (with the `--matlab-root` directory above).
3. Confirm the server executable path and MATLAB root are correct on **your** machine.
4. (Optional) Confirm MATLAB licensing works for the account that will run the server.

No extra MATLAB toolbox is required for the bridge itself — only what the MCP server needs to run.

## Install

Either command (then restart dsh web):

```sh
dsh plugin --profile desktop add github:yh01010/dsh-mcp-matlab
dsh --profile desktop plugin add github:yh01010/dsh-mcp-matlab
```

Or add the package name `dsh-mcp-matlab` to the profile's `package.json` → `dsh.profile.bundles` and run `pnpm install` in the profile directory.

## Configuration

This package deliberately carries **no personal machine paths**. The `command`/`args` in `cordis.patch.yml` are placeholders — set them to your own MATLAB MCP server executable and MATLAB installation root.

Recommended: override the row by id from your `$DSH_HOME/cordis.patch.yml` (the home user layer outranks bundle rows, so you never edit this repo):

```yaml
# $DSH_HOME/cordis.patch.yml
- id: mcp-matlab
  name: '@deepseek-ai/dsh-mcp-client'
  config:
    serverName: matlab
    transport: stdio
    command: 'C:\Users\<your-username>\.local\bin\matlab-mcp-server-windows-x64.exe'
    args:
      - '--matlab-root=D:\path\to\your\matlab'
      - '--matlab-display-mode=nodesktop'
      - '--disable-telemetry'
    toolCallTimeoutMs: 120000
    failOnStartupError: true
```

**Paths with spaces** — quote them inside the single-quoted string; YAML keeps the whole string:

```yaml
    command: 'C:\Users\<your-username>\matlab mcp\matlab-mcp-server-windows-x64.exe'
```

Settings summary (all per stdio transport; see `@deepseek-ai/dsh-mcp-client`'s schema for the full set):

| Field | Meaning | Default |
| --- | --- | --- |
| `serverName` | tool-name namespace; unique per profile | required |
| `command` | MCP server executable (replace the placeholder) | required |
| `args` | CLI arguments for the server | `[]` |
| `cwd` | working directory for the server process | `""` |
| `toolCallTimeoutMs` | per-tool-call timeout. MATLAB cold start + toolbox load can exceed 60s, so we raise it | `60000` |
| `failOnStartupError` | when `true`, a broken path/root throws on boot instead of silently losing the tools | `false` |
| `reconnect` | `{ enabled, initialDelayMs, maxDelayMs, maxAttempts }` | disabled |

## Verify after restart

After installing and restarting dsh web, confirm the tools actually registered:

1. Look for `mcp__matlab__*` in the session's tool list (or ask the model to list its tools).
2. If they are missing, run a **manual server check** to separate a DSH-config problem from a server problem:

   ```powershell
   # 1. does the executable and MATLAB root exist?
   Test-Path 'C:\Users\<your-username>\.local\bin\matlab-mcp-server-windows-x64.exe'
   Test-Path 'D:\path\to\your\matlab'

   # 2. does the server start on its own? (may take a while on first run)
   & 'C:\Users\<your-username>\.local\bin\matlab-mcp-server-windows-x64.exe' --matlab-root 'D:\path\to\your\matlab' --matlab-display-mode=nodesktop
   ```

If the server starts standalone but the tools still don't appear, the problem is in the DSH wiring (patch/config), not the server.

## Troubleshooting

| Symptom | Likely cause |
| --- | --- |
| No `mcp__matlab__*` tools at all | Path/root wrong, server failed to start, cordis patch not applied, or `serverName` collision (`mcp-client: serverName ... already in use`) |
| Tools visible, but calling one fails with a JSON-Schema error | Model provider rejects the empty parameter schema (see below) |
| Tool call times out | MATLAB cold start / toolbox load longer than `toolCallTimeoutMs` (raise it) |
| DSH fails to boot with the plugin | `failOnStartupError: true` + a bad path/root; fix the path or set it back to `false` |

### Known issue: empty-parameter JSON schema

Some model-side providers (e.g. Alibaba DashScope) strictly validate tool definitions and reject a tool whose parameter schema is empty. Calling such a tool may fail with:

```
InternalError.Algo.InvalidParameter: ... must conform to a valid openai-compatible JSON schema
```

This is a **provider-vs-empty-`inputSchema`** compatibility issue. It concerns the MCP → OpenAI schema conversion layer, not this bridge's wiring. This plugin ships no conversion code and intentionally adds **no** workaround here — if it affects you, first confirm whether the error comes from the model adapter or the provider, then fix it in the relevant component. A normalization like `{ "type": "object", "properties": {}, "additionalProperties": false }` may help, but it belongs where the conversion happens, not in this bridge.

## Uninstall / disable

- Remove: `dsh plugin --profile desktop remove dsh-mcp-matlab` (or drop it from `dsh.profile.bundles` and `pnpm install`), restart.
- Temporarily disable: set `disabled: true` on the `mcp-matlab` row in the profile's `cordis.patch.yml`.

## Add another MCP server

To add a different MCP server, **create a separate plugin** or add it to your **user-level** `$DSH_HOME/cordis.patch.yml` — do not fold unrelated servers into this repo. This repo is scoped to the MATLAB bridge; mixing servers blurs the boundary. Keep `serverName` unique across whichever layer you add it to.

## License

MIT