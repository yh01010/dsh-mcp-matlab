# dsh-mcp-matlab

DSH plugin: bridge a local MATLAB MCP server into DSH.

Under the hood it relies on the host's built-in [`@deepseek-ai/dsh-mcp-client`](https://www.npmjs.com/package/@deepseek-ai/dsh-mcp-client): one instance connects to one MCP server and registers its tools on `ctx.tools` under `mcp__matlab__<tool>` (e.g. `mcp__matlab__detect_matlab_toolboxes`, `mcp__matlab__evaluate_matlab_code`).

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
```

Settings summary:

| Field | Meaning |
| --- | --- |
| `serverName` | tool-name namespace; unique per profile |
| `command` | MCP server executable (replace the placeholder) |
| `args` | CLI arguments for the server |
| `toolCallTimeoutMs` | per-tool-call timeout; raise it if MATLAB cold start exceeds it |

## Uninstall / disable

- Remove: `dsh plugin --profile desktop remove dsh-mcp-matlab` (or drop it from `dsh.profile.bundles` and `pnpm install`), restart.
- Temporarily disable: set `disabled: true` on the `mcp-matlab` row in the profile's `cordis.patch.yml`.

## Add another MCP server

Append another `insert` row to this repo's `cordis.patch.yml` (same shape as `mcp-github` used to be in `$DSH_HOME/cordis.patch.yml`); keep `serverName` unique.

## Known issue

If the model-side provider (e.g. Alibaba DashScope) strictly validates tools with an empty parameter schema, calling MATLAB tools may fail with:
`InternalError.Algo.InvalidParameter: ... must conform to a valid openai-compatible JSON schema`.
This is a provider-vs-empty-`inputSchema` compatibility issue, unrelated to how this plugin is packaged.

## License

MIT