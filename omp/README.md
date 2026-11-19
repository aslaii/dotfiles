# OMP portable configuration

Portable parts of `~/.omp`, restored by the OMP-only installer from the
repository root:

```bash
bash ~/dotfiles/initial-setup-macos.sh --omp
```

OMP runs vanilla: plain `omp`, no shell wrapper, launcher, preload, overlay, or
custom extension. Only configuration, agent prompts, rules, skills, and plugin
manifests are tracked. Authenticate each provider with `/login` inside OMP; the
config contains no credentials.

## Model routing

`agent/config.yml` spreads roles across four subscriptions so no single quota
carries everything:

| Role | Model | Pool |
| --- | --- | --- |
| `default` | `anthropic/claude-opus-5-5:medium` | Claude Max |
| `plan`, `planner` | `anthropic/claude-fable-5-2:high` | Claude Fable weekly limit (separate) |
| `slow` (`terra`) | `openai-codex/gpt-6.2-sol:high` | Codex |
| `task` | `opencode-go/glm-5.3:high` | OpenCode Go |
| `review` (`reviewer`, `security-reviewer`) | `anthropic/claude-sonnet-5-5:high` | Claude Max |
| `verify` (`verifier`) | `openai-codex/gpt-6.1-terra:medium` | Codex |
| `vision`, `advisor`, `research` (`researcher`) | `antigravity-cli/gemini-4-hydrogen:medium` | Antigravity |
| `smol` (`scout`) | `opencode-go/deepseek-v4.1-flash:low` | OpenCode Go |
| `tiny` (`sonic`), `commit`, `memory` | `opencode-go/glm-5.3-flash:low` | OpenCode Go |

- Every role has a cross-provider `retry.fallbackChains` entry, keyed by role
  only: `provider/*` keys would outrank role chains.
- `task.agentModelOverrides` is the single place agents get their model; agent
  files carry no `model:` line.
- `task.prewalk` is off, so subagents never hand edits to the `smol` model.
- OpenCode Go models accept only `low`, `high`, and `max` thinking.
- Gemini 4 Neon works in `agy` 1.5.12 but is missing from OMP 19.0.0's built-in
  `antigravity-cli` roster, and `gemini-4-carbon` is listed but rejected. Switch
  `vision`, `advisor`, and `research` to `antigravity-cli/gemini-4-neon:high`
  once `omp models antigravity-cli` lists it.

## Isolation

`disabledProviders` blocks `agent-plugins`, `claude`, `claude-md`,
`claude-plugins`, and `mcp-json`, so OMP ignores Claude Code config, Claude
marketplace plugins (pstack agents), portable agent plugins, repository
`CLAUDE.md`, and repository `.mcp.json`. OMP enforces this list natively.

## Resource guard

RCG is maintained and released from
[`aslaii/rcg`](https://github.com/aslaii/rcg), not duplicated in this
repository. The macOS bootstrap ensures the exact immutable `RCG_VERSION`,
reinstalling when the binary is missing or its reported version differs. The
public installer verifies release SHA-256 and archive paths before installing
without `sudo`. The default is `v0.1.1`; `RCG_INSTALL_DIR` overrides
`~/.local/bin`.

`rcg -- <shell command>` exits 0 to allow, 2 with an actionable reason to block,
and 64 for invalid CLI usage. `rcg status` reports current kernel pressure,
conservative available RAM and its adaptive floor, load per logical CPU, and
representative broad/targeted decisions without starting work.
`RCG_SIMULATE_PRESSURE=warn|low-available|critical|cpu` may only raise observed
pressure for deterministic integration checks.

Kernel WARN is advisory and passes silently. CRITICAL, or conservative
`(free + inactive) * pageSize` RAM below `min(10% of physical RAM, 4 GiB)`,
blocks broad and targeted expensive work. The 10% floor adapts through 32 GiB
and the 4 GiB cap avoids excessive reserves on large-memory Macs. CPU alone
blocks only broad checks
when one-minute load reaches 1.5 per logical CPU. Metric failures pass with a
diagnostic. The policy does not use used-memory percentage, compressed,
speculative/purgeable double counting, swap occupancy, percentiles, or history.

`rcg init --agent omp --global` installs an owned stock extension in the default
agent directory (respecting `PI_CODING_AGENT_DIR`) and existing named profiles.
It refuses unrelated or modified extensions. The extension uses `RCG_BIN` when
set, otherwise PATH then `~/.local/bin/rcg`; it blocks Bash only on exit 2 and
fails open otherwise. Leading RTK rewrites are recognized in either extension
order, and OMP children inherit the loaded extension.

## Comment checker

The `pi-comment-checker` plugin is only a wrapper: it resolves the pinned
upstream native binary at `~/.local/bin/comment-checker`. The macOS bootstrap
installs the checksummed upstream `v0.8.0` release there, reinstalling it when
the binary is missing or its SHA-256 no longer matches the pin.
`COMMENT_CHECKER_VERSION` and `COMMENT_CHECKER_INSTALL_DIR` override the
version and the destination.

Without the binary the plugin warns once per session and silently skips every
check. With it, the plugin blocks `write` and `edit` calls that introduce
unnecessary comments (the binary exits 2, and the plugin returns the reported
comments as the block reason); `skipCommentCheck: true` in a tool input bypasses
the check. The binary is the same artifact OMO already installs through
`@code-yeongyu/comment-checker@0.8.0`, but that npm copy lands inside OMO's own
package tree, which is not on the plugin's search path, hence the separate copy
in `~/.local/bin`.

## Persistent response modes

`agent/skills/caveman/SKILL.md` vendors only the upstream core `caveman` skill
from release `v2.6.0` (commit
`b82c0ad42c2bedc1f2cd78e414dadfaffbaaeec3`). No separate SimpleEnglish,
ASD-STE100, Cavecrew, Caveman proxy, MCP shrink, statusline, `caveman-*` skill,
or hook is installed.

Restart OMP after restoring.

## herdr tracking

Install the official OMP integration on each machine; OMP loads it as a normal
extension:

```bash
herdr integration install omp
herdr integration status
```

Keep `extension-module:herdr-omp-agent-state` out of `disabledExtensions`.

## What restores, what does not

| Path | Status |
| --- | --- |
| `agent/config.yml`, `agent/agents/`, `agent/skills/`, `agent/rules/` | Tracked; linked by the installer. RTK's OMP extension is generated by the official CLI. |
| Public `rcg` release and generated `extensions/rcg.ts` | Installed and owned by `rcg init --agent omp --global`; not tracked here. |
| `~/.local/bin/comment-checker` | Installed by the macOS bootstrap from the checksummed upstream `v0.8.0` release; not tracked here. |
| `plugins/package.json`, `plugins/*.lock.json` | Tracked; reinstalled by Bun |
| Credentials, sessions, caches, databases | Excluded |
