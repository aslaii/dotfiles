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
