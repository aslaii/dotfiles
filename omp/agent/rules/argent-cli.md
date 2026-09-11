---
description: CLI-only transport override for Argent
alwaysApply: true
---

# Argent CLI-only transport

This rule supersedes every MCP-specific transport instruction in the Argent
rule and skills. The absence of `mcp__argent__*` tools is expected and does not
mean Argent is unavailable.

- Check availability once with `command -v argent` and `argent --version`.
- Discover tools with `argent tools`; inspect a schema before first use with
  `argent tools describe <tool>`.
- Interpret every Argent instruction to call `<tool>` as a Bash invocation of
  `argent run <tool>`. Use normal flags for scalars and `--args '<json>'` or
  `--<field>-json '<json>'` for structured input.
- Add `--json` when the result will drive another action. Use `--out <path>` for
  image results, then inspect that saved image with the agent's read tool.
- Keep using `argent flow`, `argent server`, `argent config`, and the other
  dedicated CLI subcommands where the upstream skill names them.
- Never run `argent init`, `argent install`, or `argent mcp`; this dotfiles
  setup deliberately does not register an MCP server.

`argent run` uses the same tool schemas and shared native tool-server as MCP,
so the existing device-selection, accessibility-tree, tapping, waiting,
profiling, flow, and cleanup rules still apply unchanged.
