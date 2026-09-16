# OMP portable configuration

Portable parts of `~/.omp`, restored by the OMP-only installer from the
repository root:

```bash
bash ~/dotfiles/initial-setup-macos.sh --omp
```

The installer restores the portable `agent/` files and plugins, installs RTK's
official global OMP extension, and ensures the pinned public
[`aslaii/rcg`](https://github.com/aslaii/rcg) release plus its stock extension
in the default and existing named profiles.

## Launch profiles

| Command | Overlay | Behaviour |
| --- | --- | --- |
| `omp` | none | Default routing from `agent/config.yml` (the global profile: Claude Opus/Sonnet where `agent/config.yml` names them, no budget guard). |
| `omp-fast` | `fast.yml` + `fast.mjs` | Priority Claude/GPT requests, 32 parallel agents. |
| `omp-budget` (`ompb`) | `budget.yml` | Claude Sonnet 5 first (the $20 subscription's OAuth login), DeepSeek V4.1 Flash on Claude limits, plan Muse Contributor for grunt work, free Zen Muse as backstop. |
| `ompd` | `budget.yml` + `no-claude.yml` | Same plan-hosted profile as `ompb`, with every role (not just `default`) pinned off Claude for the run. |

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

`agent/APPEND_SYSTEM.md` applies to every new OMP session across all launch and
model profiles. Ponytail remains `full` and controls implementation. Caveman
starts in `lite` mode and controls every user-facing response. `stop caveman`
or `normal mode` disables Caveman only for the current session; the next
session starts in `lite` mode again. Caveman boundaries keep normal prose in
code, comments, documentation, commits, and other persisted or third-party
text.

Restart OMP after restoring. Existing sessions retain their prior startup
instructions.

Session lengths are heavily skewed: the median session is ~21 turns, but a
small tail of marathon sessions (plan mode churning, orchestrate fan-out
spinning up dozens of `task`-role subagents) runs into the hundreds of turns
and dominates total turn volume. `omp`'s `--model` CLI flag only overrides
the `default` role (`main.ts` ~1195-1205 in `@oh-my-pi/pi-coding-agent`), so
it cannot protect the Claude window during exactly those marathons — plan
mode (`plan`/`planner`/`review`/`slow`) and fan-out (`task`) keep routing to
Claude regardless. Use `ompb` for ordinary sessions, where a marathon is
unlikely and Claude-first is worth it; switch to `ompd` before or during a
session you expect to run long, so plan mode and orchestrate fan-out stay on
the DeepSeek/Muse tiers instead of draining the $20/mo subscription window.
Plain `omp` is for work that specifically wants the global profile (e.g.
Opus-backed `designer`) instead of either budget-guarded overlay.

The Zsh functions live in `macos/zsh/zsh/functions.zsh`. After restoring, reload
the shell once:

```bash
source ~/.zsh/functions.zsh
```

Other shells call the launcher directly, for example:

```bash
bun ~/dotfiles/omp/launch.mjs --config ~/dotfiles/omp/budget.yml
```

## herdr tracking

Herdr's own OMP integration reports nothing on Herdr 0.9.0: the server silently drops `source="herdr:omp"`, the literal the integration hardcodes. That version also enables the integration inside nested OMP workers, whose exit can remove the root pane's row.
The shared launcher patches the live extension before every OMP start: it changes the source to `custom:omp` and adds the v10 `OMPCODE` nested-process guard when the v9 `enabled()` body is present. Both replacements are no-ops when the integration is absent, already patched, or no longer contains the affected v9 text.
`herdr-title.mjs` is loaded by the same launcher. It reads OMP's stored session
name through the extension API, follows OMP's session-name change callback, and
reports that exact value as `custom:omp` pane metadata; Auto Title then prefers
it over the decorated terminal title. New, resumed, renamed, and generated
session titles update without a Claude integration, and shutdown clears the
metadata.
State (including `blocked`) still comes from Herdr's integration. The launcher keeps the pane alive while OMP runs, releases only that pane's `custom:omp`/`omp` entry with a newer epoch-ms×1000 sequence when the child exits, and handles `SIGINT`, `SIGTERM`, and `SIGHUP` so signal-driven child termination takes the same cleanup path (`SIGTERM` and `SIGHUP` are forwarded; terminal `SIGINT` already reaches the foreground child). `SIGKILL` of the launcher or an unavailable Herdr transport can still leave an entry behind.
Track with `herdr agent list`, `herdr agent read w3:pX --lines 40`, `herdr agent attach`, `herdr agent wait <pane> --until blocked --timeout 600000`; manual control with `herdr pane report-agent ...`.

## omp-budget

`budget.yml` is a `--config` overlay: it overrides only the keys it names and
inherits the rest from `agent/config.yml`. The driving roles
(plan/planner/slow/review/task/advisor/default) run on `anthropic/claude-sonnet-5`
through the $20/mo Claude subscription's OAuth login (`claude-sdk-oauth`,
provider `anthropic` — not Command Code credits). Once that credential's
usage-aware preflight (`retry.usageAwareFallback`) reports it inside its 10%
reserve, those roles fall back automatically to the Command Code $10 plan's
DeepSeek V4.1 Flash tier (`commandcode/deepseek/deepseek-v4.1-flash`, `high`),
then to the plan-hosted `commandcode/meta/muse-spark-1.3-contributor`.

- `designer` stays on `commandcode/deepseek/deepseek-v4.1-flash:max`: it's
  the highest-volume iterative role here and has no concrete need for
  subscription quota.
- `vision` stays on `commandcode/deepseek/deepseek-v4-flash-vision-exp` (the
  plan's dedicated, image-native, image-probe-verified vision model) at
  `high`, falling back to free Muse first, then `deepseek-v4.1-flash:medium`.
- `commandcode/meta/muse-spark-1.3-contributor` also serves
  small/commit/tiny/verify/research/free, falling back to the plan's
  DeepSeek tier and then to the free `opencode-zen` Muse endpoint.
- `opencode-zen/muse-spark-1.3-contributor-free` stays wired only as a
  last-resort backstop across every chain, since the free endpoint
  rate-limits under load.

No budget role or fallback edge reaches OpenAI, GPT, or a paid Zen model.
The Command Code provider no longer sends a forced ZDR header: it is opt-in
on Command Code, most models default to it anyway, and forcing it capped a
model's usable allowance at the plan's default tier.

## ompd

`no-claude.yml` is a second `--config` overlay, layered on top of
`budget.yml` by the `ompd` alias. It repoints every role `budget.yml` gives
to `anthropic/claude-sonnet-5` at the same DeepSeek/Muse tiers `budget.yml`
already uses for its non-Claude roles, so plan mode and orchestrate fan-out
stop touching Claude for the run. It never applies on its own; `ompb`
without `ompd` is unaffected.

## Set up on another machine

1. Restore this repository's OMP files with the installer above, then reload
   the shell, so the `omp-budget` function exists.
2. Sign in to Claude with the $20 subscription's OAuth login: run `/login`
   inside OMP and choose Claude (`claude-sdk-oauth`, provider `anthropic`).
3. Register the Command Code provider's Keychain key (the provider block and
   discovery config in `agent/models.yml` are already tracked and linked by
   the installer):

   ```bash
   security add-generic-password -U -a "$USER" -s commandcode-api-key -w
   ```

4. Sign in to OpenCode Zen for the free Muse endpoint: run `/login` inside OMP
   and choose the OpenCode Zen account.
5. Verify the routing:

   ```bash
   omp-budget --print "Reply with OK and the model id you are running as."
   ```

   It must answer with `anthropic/claude-sonnet-5`. Without the Claude OAuth
   login, or once its usage reserve is hit, the run falls back to
   `commandcode/deepseek/deepseek-v4.1-flash` instead.

## What restores, what does not

| Path | Status |
| --- | --- |
| `agent/config.yml`, `agent/models.yml`, `agent/APPEND_SYSTEM.md`, `agent/agents/`, `agent/skills/`, `agent/rules/` | Tracked; linked by the installer. RTK's OMP extension is generated by the official CLI. |
| Public `rcg` release and generated `extensions/rcg.ts` | Installed and owned by `rcg init --agent omp --global`; not tracked here. |
| `~/.local/bin/comment-checker` | Installed by the macOS bootstrap from the checksummed upstream `v0.8.0` release; not tracked here. |
| `plugins/package.json`, `plugins/*.lock.json` | Tracked; reinstalled by Bun |
| `macos/zsh/zsh/functions.zsh` | Tracked; provides the shell functions |
| Credentials, sessions, caches, databases | Excluded |

