# OMP portable configuration

Portable parts of `~/.omp`, restored by the OMP-only installer from the
repository root:

```bash
rtk bash ~/dotfiles/initial-setup-macos.sh --omp
```

The installer links this directory's `agent/` over `~/.omp/agent`, so
`config.yml`, `models.yml` (the Command Code plan catalog), the agent
prompts, the `omp-prompt` skill, and the Argent CLI rule load automatically.
Plugins are reinstalled from the frozen lockfile by Bun.

## Launch profiles

| Command | Overlay | Behaviour |
| --- | --- | --- |
| `omp` | none | Default routing from `agent/config.yml` (the global profile: Claude Opus/Sonnet where `agent/config.yml` names them, no budget guard). |
| `omp-fast` | `fast.yml` + `fast.mjs` | Priority Claude/GPT requests, 8 parallel agents. |
| `omp-budget` (`ompb`) | `budget.yml` | Claude Sonnet 5 first (the $20 subscription's OAuth login), DeepSeek V4.1 Flash on Claude limits, plan Muse Contributor for grunt work, free Zen Muse as backstop. |
| `ompd` | `budget.yml` + `no-claude.yml` | Same plan-hosted profile as `ompb`, with every role (not just `default`) pinned off Claude for the run. |

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

herdr's own OMP integration reports nothing on herdr 0.9.0: the server silently drops `source="herdr:omp"`, the literal the integration hardcodes.
The `--omp` installer step patches that literal to `custom:omp` in the live extension file (no-op without herdr, idempotent, re-applied after reinstall/update).
With the patch, state (including `blocked`) comes from the integration — no launcher-side reporting needed.
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
| `agent/config.yml`, `agent/models.yml`, `agent/agents/`, `agent/skills/`, `agent/rules/` | Tracked; linked by the installer |
| `budget.yml`, `no-claude.yml`, `fast.yml`, `fast.mjs`, `launch.mjs`, `preload.mjs` | Tracked |
| `plugins/package.json`, `plugins/*.lock.json` | Tracked; reinstalled by Bun |
| `macos/zsh/zsh/functions.zsh` | Tracked; provides the shell functions |
| Credentials, sessions, caches, databases | Excluded |

