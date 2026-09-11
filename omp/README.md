# OMP portable configuration

Portable parts of `~/.omp`, restored by the OMP-only installer from the
repository root:

```bash
rtk bash ~/dotfiles/initial-setup-macos.sh --omp
```

The installer links this directory's `agent/` over `~/.omp/agent`, so
`config.yml`, the agent prompts, the `omp-prompt` skill, and the Argent CLI rule
load automatically. Plugins are reinstalled from the frozen lockfile by Bun.

## Launch profiles

| Command | Overlay | Behaviour |
| --- | --- | --- |
| `omp` | none | Default routing from `agent/config.yml`. |
| `omp-fast` | `fast.yml` + `fast.mjs` | Priority Claude/GPT requests, 8 parallel agents. |
| `omp-budget` | `budget.yml` | Command Code plan plus free Muse only. |

The Zsh functions live in `macos/zsh/zsh/functions.zsh`. After restoring, reload
the shell once:

```bash
source ~/.zsh/functions.zsh
```

Other shells call the launcher directly, for example:

```bash
bun ~/dotfiles/omp/launch.mjs --config ~/dotfiles/omp/budget.yml
```

## omp-budget

`budget.yml` is a `--config` overlay: it overrides only the keys it names and
inherits the rest from `agent/config.yml`. Every model role and every fallback
chain stays on one of two providers:

- `commandcode/deepseek/deepseek-v4.1-flash` (the Command Code $10 plan): `max`
  for planning and review, `high` for task and advisor, `medium` for Main and
  vision.
- `opencode-zen/muse-spark-1.3-contributor-free` (free) for
  small/commit/tiny/verify/research/free, falling back to the plan when the free
  endpoint is unavailable.

No budget role can reach Anthropic, OpenAI, or a paid Zen model.

## Set up on another machine

1. Restore this repository's OMP files with the installer above, then reload the
   shell, so the `omp-budget` function exists.
2. Register the Command Code provider and its Keychain key. `models.yml` is a
   runtime file and is not tracked, so it must be recreated by hand: follow
   sections 1 and 3 of [`../omo/commandcode-provider.md`](../omo/commandcode-provider.md).

   ```bash
   security add-generic-password -U -a "$USER" -s commandcode-api-key -w
   ```

3. Sign in to OpenCode Zen for the free Muse endpoint: run `/login` inside OMP
   and choose the OpenCode Zen account.
4. Verify the routing:

   ```bash
   omp-budget --print "Reply with OK and the model id you are running as."
   ```

   It must answer with `commandcode/deepseek/deepseek-v4.1-flash`. Without the
   provider block or Keychain key that model does not resolve, and the run falls
   back to the free Muse model instead.

## What restores, what does not

| Path | Status |
| --- | --- |
| `agent/config.yml`, `agent/agents/`, `agent/skills/`, `agent/rules/` | Tracked; linked by the installer |
| `budget.yml`, `fast.yml`, `fast.mjs`, `launch.mjs`, `preload.mjs` | Tracked |
| `plugins/package.json`, `plugins/*.lock.json` | Tracked; reinstalled by Bun |
| `macos/zsh/zsh/functions.zsh` | Tracked; provides the shell functions |
| `~/.omp/agent/models.yml` | Runtime; recreate per `omo/commandcode-provider.md` |
| Credentials, sessions, caches, databases | Excluded |
