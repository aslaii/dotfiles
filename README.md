# Dotfiles

Personal macOS dotfiles -- one command to full productivity.

## Quick Start

```bash
# Clone the repo
git clone https://github.com/aslaii/dotfiles.git ~/dotfiles

# Run the bootstrap (idempotent -- safe to rerun)
bash ~/dotfiles/initial-setup-macos.sh

# Verify symlinks
dotcheck
# or: bash ~/dotfiles/initial-setup-macos.sh --check
```

## OMO

The [`omo/`](omo/README.md) directory contains the portable native OMO setup:
model routes, UI preferences, pinned plugins, Bash hooks, 119 user/shared skills,
and the Argent rule. With Node.js 24+, Bun 1.4+, Git, DCG, and RTK installed:

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
rtk omp plugin list
rtk omp --model @default --no-prewalk
```

The OMP-only option uses the default `~/.omp` layout and the existing non-destructive
symlink helper. Existing files and skills are preserved, not overwritten; move any
conflicting files to your own backup before rerunning if you want the repository
versions instead. Bun restores plugins with the active frozen lockfile. Keep the
dotfiles checkout available because the configuration and custom skill are linked.
The normal macOS bootstrap and its `--check` option remain unchanged.

Authenticate separately with `/login` inside OMP on each computer. Model access
depends on that computer's authenticated accounts; the config contains no credentials.

Deployed routing keeps Main on Astra-medium (`@default`) for orchestration,
bounded workers on Luna-max (`@task`), difficult workers on Terra-max (`@slow`),
planning on Opus-high (`@planner`), review on Sonnet-high (`@review`), and research
or free fallback on Muse Contributor Free-xhigh (`@research`/`@free`). Advisor and
prewalk are off by default; dispatch allows at most two workers and no nested workers.
The free endpoint is promotional; Contributor inputs and history may be used for
training. There is no automatic paid Zen fallback.

Existing sessions keep their old state and rendered prompts. For reliable adoption of
the new policy, run `/advisor off`, select `@default` in `/model`, and start a fresh
continuation; fresh launches use `rtk omp --model @default --no-prewalk`.

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
CONFIG_VARIANT=linux bash ~/dotfiles/initial-setup-macos.sh
```

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
