# Dotfiles

Personal configuration for macOS and Debian/Ubuntu-based Linux or WSL.
Application state, installed dependencies, and project tooling stay outside Git.

## Quick Start

```bash
# Clone the repo
git clone https://github.com/aslaii/dotfiles.git ~/dotfiles

# macOS
bash ~/dotfiles/initial-setup-macos.sh

# Linux / WSL
bash ~/dotfiles/initial-setup-linux.sh

# Auto-select the platform and check links without installing anything
bash ~/dotfiles/initial-setup.sh --check
```

Existing valid files and links are preserved. The Linux installer installs shell
essentials, not project databases or application stacks.

## Project tools

Project launchers are restored from the immutable commit in
`scripts/tools-source.json`, not bundled with the current configuration tree:

```bash
node ~/dotfiles/scripts/restore-tools.mjs
node ~/dotfiles/scripts/restore-tools.mjs --check
```

They live under `~/.local/share/dotfiles-tools/`; the shell aliases point there.
Restoration verifies file hashes and refuses to overwrite modified files or write
through symlinks. Local modifications must be retained separately before updating.
The first restore needs network access if the pinned Git objects are absent.

## OMO

The [`omo/`](omo/README.md) directory contains the portable native OMO setup:
model routes, UI preferences, pinned plugins, Bash hooks, and an OMO-owned
Argent rule. Its 96 selected skills restore from a pinned installation source
into OMO's own directory. With Node.js 24+, Bun 1.4+, Git, DCG, and RTK installed:

```bash
npm install -g omo-ai@5.0.0-0.beta.48
bun ~/dotfiles/omo/restore.mjs
```

Authenticate with `/login` and review `/hooks` on the new computer. Credentials
and agent runtime state are excluded.

## Oh My Pi

The `omp/` directory mirrors the portable parts of `~/.omp`:

| Path | Contents |
|------|----------|
| `omp/agent/config.yml` | Model roles, thinking levels, prewalk, fallbacks, two-worker limit, and UI preferences |
| `omp/agent/APPEND_SYSTEM.md` | Main-only orchestration and dispatch/verification policy |
| `omp/agent/agents/*.md` | Portable planner, Terra, verifier, and researcher prompts |
| `omp/agent/skills/omp-prompt/` | OMP-only prompt refinement skill |
| `omp/plugins/package.json` | Installed plugin sources: Ponytail and pi-comment-checker |
| `omp/plugins/bun.lock` | Exact plugin/dependency revisions for reproducible restoration |
| `omp/plugins/omp-plugins.lock.json` | OMP plugin versions, enablement, and feature selections |

On another macOS or Linux computer, install Bun, OMP, and RTK first. The earlier
plugin snapshot was verified with Bun 1.4.0 and OMP 18.1.10; plugins were not
reinstalled during this task. Runtime routing was verified against the currently
installed OMP 18.1.14. Then restore only OMP, without running the rest of the
macOS bootstrap:

```bash
rtk bash ~/dotfiles/initial-setup-macos.sh --omp
bun ~/dotfiles/omp/launch.mjs plugin list
bun ~/dotfiles/omp/launch.mjs --model @default --no-prewalk
```

The OMP-only option uses the default `~/.omp` layout and the existing non-destructive
symlink helper. Existing files and skills are preserved, not overwritten; move any
conflicting files to your own backup before rerunning if you want the repository
versions instead. Bun restores plugins with the active frozen lockfile. Keep the
dotfiles checkout available because the configuration and custom skill are linked.
The normal macOS bootstrap and its `--check` option remain unchanged.

Authenticate separately with `/login` inside OMP on each computer. Model access
depends on that computer's authenticated accounts; the config contains no credentials.

Deployed routing keeps Main on Sol-medium (`@default`) for orchestration,
bounded workers on Sonnet-high (`@task`), difficult workers and planning on
Sol-max (`@slow`/`@planner`), review on Opus-xhigh (`@review`), and verification,
research, or free fallback on Muse Contributor Free-xhigh (`@verify`/`@research`/`@free`). Advisor and
prewalk are off by default; dispatch allows at most two workers and no nested workers.
The free endpoint is promotional; Contributor inputs and history may be used for
training. There is no automatic paid Zen fallback.

Existing sessions keep their old state and rendered prompts. For reliable adoption of
the new policy, run `/advisor off`, select `@default` in `/model`, and start a fresh
continuation; fresh launches use `omp --model @default --no-prewalk` after
loading the updated shell functions.

```text
/skill:omp-prompt feature add CSV export without changing existing filters
/skill:omp-prompt debug white screen after login; RCA only
/skill:omp-prompt continue prepare the unfinished work for a new session
```

Ponytail's skills are supplied by its locked plugin, not duplicated in `agent/skills`.
Credentials, sessions, caches, databases, onboarding/consent state, and machine-local
MCP, LSP, Herdr/Moshi integrations are intentionally excluded. Install those integrations
separately if needed; shared skills from other harnesses are not part of this OMP-only snapshot.

## Symlink Map

> Source of truth: `emit_symlink_map()` in `initial-setup-macos.sh`

| Repo Path | Symlink Target | Tool |
|-----------|----------------|------|
| `macos/zsh/zshrc` | `~/.zshrc` | Zsh config |
| `macos/zsh/zsh/` | `~/.zsh` | Zsh scripts |
| `tmux/tmux.conf` | `~/.tmux.conf` | tmux |
| `codex/AGENTS.md` | `~/AGENTS.md` | Codex CLI |
| `ghostty/config` | `~/Library/Application Support/com.mitchellh.ghostty/config` | Ghostty |
| `codex/` | `~/.config/codex` | Codex CLI |
| `opencode/` | `~/.config/opencode` | OpenCode |
| `claude/` | `~/.claude` | Claude Code |
| `nvim/` | `~/.config/nvim` | Neovim / LazyVim |

## Environment Flags

| Flag | Default | Purpose |
|------|---------|---------|
| `DOTFILES_DIR` | `$HOME/dotfiles` | Location of the cloned dotfiles repo |
| `CONFIG_VARIANT` | `macos` | Selects which zshrc variant to link |

Usage example:

```bash
CONFIG_VARIANT=linux bash ~/dotfiles/initial-setup-linux.sh
```

## Agent isolation

New Zsh sessions route `omo` and `omp` through the repository launchers.
For other shells or automation, invoke them explicitly:

```bash
bash ~/dotfiles/omo/launch.sh
bun ~/dotfiles/omp/launch.mjs
```

For time-critical work, use `omo-fast` or `omp-fast`. Native OMO requests
priority GPT while retaining its Claude SDK OAuth and Muse routing.
OMP requests fast Claude and priority GPT with GPT fallback when Claude is
unavailable. Both allow eight parallel agents; Muse and OpenCode Go models
retain their existing settings, including reasoning.
Normal `omo` and `omp` keep their defaults. Reload an existing shell with
`source ~/.zsh/functions.zsh` before using the new commands.

For other shells:

```bash
bash ~/dotfiles/omo/launch.sh --extension ~/dotfiles/omo/fast.mjs
bun ~/dotfiles/omp/launch.mjs --config ~/dotfiles/omp/fast.yml --extension ~/dotfiles/omp/fast.mjs
```

OMO uses its native model configuration in both launch modes. Its fast extension
adds request-local priority settings without saving them to normal settings.
GPT fallback also carries native priority metadata for session status and
usage accounting. OMO's task row may still omit tier/thinking suffixes after
fallback (upstream issues #6795 and #7934); the row alone does not establish
the serving tier. Restart the OMO process after updating the fast extension.
OMP's guard prevents its native retry from silently dropping Claude fast
mode. Eight is a concurrency limit, not a requirement to run dependent tasks
before their prerequisites finish. Provider access and rate limits still apply.

OMO loads only its owned skill library, native skills, bundled skills, and
active package skill paths. It refuses configured Claude MCP imports. Its own
Ponytail extension remains enabled. Project AGENTS/CLAUDE context files and the
native rules engine retain their normal behavior.

OMP blocks Claude skills, MCP, plugins, and context providers before settings
discovery. The launcher uses the installed package's shipped source CLI under
Bun so the early provider exclusions take effect. This was verified with OMP
18.1.14; it fails closed if the required source layout or exclusions are missing.
Neither launcher patches an installed runtime. Calling raw binaries, including
through `rtk omp`, bypasses these launchers.

Codex defaults to Ponytail full. Its Caveman skills and Cavecrew are disabled
by name without deleting shared files used by other agents.

## Tools

- **Neovim** -- LazyVim-based config with lazy-lock.json for reproducible plugins
- **tmux** -- Terminal multiplexer config
- **Ghostty** -- GPU-accelerated terminal emulator config
- **oh-my-posh** -- Cross-shell prompt with Catppuccin themes
- **Zinit** -- Zsh plugin manager with Turbo mode
- **Claude Code** -- AI assistant config and skills
- **Gemini CLI** -- AI assistant config
- **OpenCode** -- AI assistant config
- **Codex CLI** -- AI assistant config

## Drift Check

Two ways to check whether your symlinks match the expected state:

- **`dotcheck`** -- shell alias available in any Zsh session
- **`bash ~/dotfiles/initial-setup-macos.sh --check`** -- validates all symlinks without modifying anything, exits non-zero if drift detected

## Skills System

Skills provide structured guidance for AI coding assistants. Each skill is a self-contained directory with a `SKILL.md` index and a `references/` subdirectory containing detailed rules.

### Directory Structure

```
skills/              # Repo-global skills (any AI assistant)
claude/skills/       # Claude Code-specific skills
```

### Available Skills

| Skill | Location | Description |
|-------|----------|-------------|
| `fullstack-bridge` | `skills/fullstack-bridge/` | NestJS + React/RN synchronization |
| `react-native` | `claude/skills/react-native/` | Expo Router, TanStack Query, Zustand patterns |
| `pr-standards` | `claude/skills/pr-standards/` | PR size limits, branch naming, review rules |

### Invoking Skills

In Claude Code, use `/skill <name>` to activate a skill. Claude reads the `SKILL.md` file and loads relevant rules from `references/` as needed.

### Creating a New Skill

1. Create directory: `skills/<name>/` (repo-global) or `claude/skills/<name>/` (Claude-specific)
2. Create `SKILL.md` with YAML frontmatter:
   ```yaml
   ---
   name: my-skill
   description: When to use this skill.
   ---
   ```
3. Add detailed rules in `<name>/references/` subdirectory
4. Reference `skills/fullstack-bridge/SKILL.md` as the canonical example

## Neovim Plugin Workflow

1. Open Neovim and run `:Lazy update`
2. Commit `nvim/lazy-lock.json` with the plugin changes
3. On a new machine, `:Lazy sync` restores pinned versions
4. Run `:checkhealth` to verify plugin health

> `nvim/lazy-lock.json` is tracked in git to ensure reproducible plugin installs across machines.

## Cross-References

- `CLAUDE.md` -- AI assistant configuration and project conventions
- `AGENTS.md` -- Shell script conventions and commit style
- `setups/` -- Role-specific setup scripts for client environments
