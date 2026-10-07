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

## Comment checker (hashline gap fill)

`~/.omp/plugins/package.json` already installs `pi-comment-checker`
(djdembeck's), which blocks `write` and detects `edit`/`apply_patch` results
via `EditToolDetails.oldText`/`newText`. Two gaps remained even with that
package installed: `oldText`/`newText` are dropped (`snapshotsPruned: true`)
once a file crosses the snapshot size threshold, and the installed package's
fallback has no path back to the change once that happens.

`agent/extensions/comment-checker-hashline.ts` closes both by falling back to
parsing `EditToolDetails.diff` (` N|`/`-N|`/`+N|` line-tagged format) into
added/removed text when the full snapshot is pruned, then running the same
pinned `comment-checker` binary (`~/.local/bin/comment-checker`, override via
`OMP_COMMENT_CHECKER_BIN`) against just the changed lines. It only listens for
`edit`/`apply_patch`/`multiedit`; `write` already works through the installed
package.

The extension must also be present in the live `~/.omp/agent/extensions/`
directory, and `extension-module:comment-checker-hashline` must not appear
under `disabledExtensions` in the live `config.yml`. Restart OMP or run
`/reload` after installing or enabling it.

Hashline checking runs **after** the edit: it appends the checker warning
and repository policy to the tool result and sends a steering message.
It does not block or roll back the mutation. The agent must remove the
unnecessary comment. This is separate from the installed plugin's
pre-execution blocking of `write`.

Verified on the personal machine and SSH JR using OMP's SDK, normal extension
discovery, production headless initialization, and real wrapped tools:
an unnecessary-comment write was rejected without creating a file; a clean
write succeeded; a hashline edit on a 3,000-line file with
`snapshotsPruned: true` returned the comment warning and repository policy;
clean edits and removal of the flagged comment returned no comment warning.
The smoke runs used temporary files and a session-only hashline mode override,
not model-generated tool calls.

## Launch profiles

| Command | Overlay | Behaviour |
| --- | --- | --- |
| `omp` | none | GPT-6.1 Sol medium by default. `omp --prewalk` starts Main on Claude Opus 5.5 high and targets Sol medium. No personal overlay; subagents retain the machine's global routing. |
| `omp-fast` | `fast.yml` + `fast.mjs` | Priority Claude/GPT requests, 32 parallel agents. |
| `omp-budget` (`ompb`) | `budget.yml` | Claude Sonnet 5 first (the $20 subscription's OAuth login), OpenCode Go DeepSeek V4.1 Flash on Claude limits, Go Muse Contributor for grunt work. |
| `ompd` | `budget.yml` + `no-claude.yml` | Same plan-hosted profile as `ompb`, with every role (not just `default`) pinned off Claude for the run. |
| `omp-gpt` | `gpt.yml` | Every role on `openai-codex/gpt-5.6-*`, no non-GPT primary anywhere. |
| `omp-union` | `union-only.yml` | Every role on the free `openrouter/stealth/union-alpha` model, free-only fallback chain. |
| `omp-personal` (`ompp`) | `personal.yml` | GPT-6.1 Sol medium by default; `ompp --prewalk` starts Main on Claude Opus 5.5 high and targets Sol medium. The overlay's existing subagent roles stay unchanged. |

On both the personal machine and JR, explicit `--prewalk` adds
`--model @plan --prewalk-into @default` before user arguments, so explicit
model/target overrides still win. Plain launches keep prewalk off.
The native handoff happens after Main's first `edit`/`write` following its todo
list, not after a delegated worker's edit. If Main only delegates, it stays on
Opus; subagents use their own configured roles before and after the handoff.
Enabling `prewalk.enabled` globally does not activate the shell's starting-model
and target overrides; pass `--prewalk` explicitly for the Opus-to-Sol route.
Credentials remain machine-local; changing JR's Claude login does not change
this routing. Claude and Codex accounts must have access to the selected models;
existing fallbacks can select another model when access is denied or usage is
exhausted.

### Default model routing

The personal machine and JR use the same roles and agent overrides:

- Main: Anthropic Claude Opus 5.5, medium.
- Small tasks (`smol`, `research`, `tiny`, `commit`; scout and sonic):
  Codex GPT-6 Luna, low, with `tier.openai: priority`.
- Implementation subagents (`task`): Codex GPT-6.1 Sol, high. Subagents run
  in parallel, so keeping them off Claude stops them from draining the Claude
  quota that the main session needs.
- Review, verify, vision and advisor: Anthropic Claude Sonnet 5.5.
- Planning and heavy reasoning: Anthropic Claude Opus 5.5, high.
- At most eight subagents run concurrently.

OMP registers `gpt-6-luna`, not `gpt-6-luna-fast`. Fast mode is the
priority service tier, inherited by subagents. This family-level setting
also makes Sol requests priority; Claude keeps its standard tier.

Claude roles fall back to Codex GPT-6.1 Sol before one OpenCode Go model.
`task` instead falls back to Claude Sonnet 5.5:

| Roles | GPT fallback | Terminal Go fallback |
| --- | --- | --- |
| `task` | Sonnet 5.5 high (Claude) | DeepSeek V4.1 Flash high |
| `review` | Sol high | GLM 5.3 Flash high |
| `plan`, `planner`, `slow` | Sol high | GLM 5.3 Flash max |
| `verify`, `vision` | Sol medium | DeepSeek V4.1 Flash high |
| `advisor` | Sol medium | GLM 5.3 Flash high |

Main still falls back directly to DeepSeek high. Small roles retain GLM low;
commit retains Muse Spark 1.3 Contributor medium. The `free` role uses Go Muse
directly with no fallback. No chain retries another model on the same provider,
and Space Bunny is not selected. The opt-in overlays above retain their own routing.

The task fit is a conservative judgment, not a measured OMP quality ranking.
On October 5, 2026, [Artificial Analysis measured DeepSeek V4.1 Flash at max](https://artificialanalysis.ai/models/deepseek-v4-1-flash)
at Intelligence Index 39 and about 213 output tokens/s; [GLM 5.3 Flash](https://artificialanalysis.ai/models/glm-5-3-flash)
scored 42 at about 51 tokens/s. That favors DeepSeek for execution latency and
GLM for review and reasoning; these are not OpenCode Go endpoint measurements,
and DeepSeek's max scores do not establish its high-effort performance.

Recent OMP Go-model checks establish connectivity, not coding quality. The
September 25 OMO comparison session reports useful DeepSeek repository mapping
and implementation, but also defects corrected after independent review.
Comparable completed GLM/Muse work is sparse in the inspected transcripts.
Keep independent verification when using these terminal fallbacks.

No exact Contributor-tier quality benchmark was found. Standard Muse max
scores are not transferable: [Contributor does not support max reasoning](https://dev.meta.ai/docs/reasoning.md).
[Meta's direct Contributor tier permits training on prompts and completions](https://dev.meta.ai/docs/pricing-rate-limits.md);
whether OpenCode Go overrides that policy is unverified. Muse is therefore
not promoted to critical planning or review roles.

JR keeps its machine-specific skills, display settings, and concurrency.
Restart existing sessions to load the new routing; configuration changes do
not forcibly switch an already running session or worker.

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

Install the official OMP integration on each machine:

```bash
herdr integration install omp
herdr integration status
```

The installed v10 extension owns lifecycle reporting; OMP does not supply a
built-in reporter. Keep `extension-module:herdr-omp-agent-state` out of
`disabledExtensions`. Plain `omp` explicitly loads only that extension and the
two comment-checker extensions (`comment-checker-hashline.ts` and the
`pi-comment-checker` plugin entry) while retaining `--no-extensions` for
unrelated extensions. The shared launcher also
loads the installed reporter explicitly, alongside the title extension.
Reload the shell after changing its wrapper; restart OMP or run `/reload` to
load an enabled extension in an existing session.

The shared launcher retains the `custom:omp` source compatibility patch for
source-entry launches. Native binary launches can report with the official
`herdr:omp` source on Herdr 0.9.3.
The v10 integration already has the `OMPCODE` guard against nested workers;
the launcher no longer patches that guard.
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
usage-aware preflight (`retry.usageAwareFallback`) reports it exhausted,
those roles fall back automatically to OpenCode Go DeepSeek V4.1 Flash
(`opencode-go/deepseek-v4.1-flash`, `high`), then to
`opencode-go/muse-spark-1.3-contributor`.

- `designer` stays on `opencode-go/deepseek-v4.1-flash:max`: it's
  the highest-volume iterative role here and has no concrete need for
  subscription quota.
- `vision` stays on image-capable `opencode-go/deepseek-v4.1-flash` at `high`.
- `opencode-go/muse-spark-1.3-contributor` also serves
  small/commit/tiny/verify/research/free, falling back to the plan's
  DeepSeek tier. OpenCode Zen's free endpoint rejects non-OpenCode clients,
  so it is not a fallback.

No budget role or fallback edge reaches OpenAI, GPT, Command Code, or a paid Zen model.

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
3. Sign in to OpenCode Go inside OMP with `/login`, or import an existing
   Go API key. The Go model registry is built into OMP.

4. Verify the routing:

   ```bash
   omp-budget --print "Reply with OK and the model id you are running as."
   ```

   It must answer with `anthropic/claude-sonnet-5`. Without the Claude OAuth
   login, or once its quota is exhausted, the run falls back to
   `opencode-go/deepseek-v4.1-flash` instead.

## What restores, what does not

| Path | Status |
| --- | --- |
| `agent/config.yml`, `agent/models.yml`, `agent/agents/`, `agent/skills/`, `agent/rules/` | Tracked; linked by the installer. RTK's OMP extension is generated by the official CLI. |
| Public `rcg` release and generated `extensions/rcg.ts` | Installed and owned by `rcg init --agent omp --global`; not tracked here. |
| `~/.local/bin/comment-checker` | Installed by the macOS bootstrap from the checksummed upstream `v0.8.0` release; not tracked here. |
| `plugins/package.json`, `plugins/*.lock.json` | Tracked; reinstalled by Bun |
| `macos/zsh/zsh/functions.zsh` | Tracked; provides the shell functions |
| Credentials, sessions, caches, databases | Excluded |

