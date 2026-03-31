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

## Cross-References

- `CLAUDE.md` -- AI assistant configuration and project conventions
- `AGENTS.md` -- Shell script conventions and commit style
- `setups/` -- Role-specific setup scripts for client environments
