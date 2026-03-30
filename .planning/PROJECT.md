# Dotfiles Configuration

## What This Is

Personal macOS dotfiles repository managing versioned configurations for development tools (Neovim, tmux, Ghostty, yabai, skhd, SketchyBar) and AI coding assistants (Claude Code, Gemini CLI, OpenCode, Codex CLI). A single bootstrap script (`initial-setup-macos.sh`) symlinks everything into place, bringing a new machine to full productivity in one run.

## Core Value

One-command machine setup that reliably reproduces an opinionated, productive macOS development environment across any new machine.

## Requirements

### Validated

- No hardcoded user paths in tracked files — Phase 1
- AI tool gitignores prevent secret leakage — Phase 1
- Setup script portable (no hardcoded username guard) — Phase 1
- ShellCheck + shfmt pre-commit hooks configured — Phase 1
- GitHub Actions ShellCheck CI workflow — Phase 1
- Linux setup script hardened with `set -euo pipefail` — Phase 1
- Brewfile as single source of truth for packages — Phase 2
- Neovim lazy-lock.json tracked for reproducible plugins — Phase 2
- Symlink drift check mode (`--check` flag + `dotcheck` alias) — Phase 3
- Powerlevel10k/oh-my-posh removed; starship sole prompt — Phase 3
- nvm lazy-loaded; shell plugins optimized with Zinit Turbo — Phase 3
- Setup script symlinks all tool configs to correct locations — existing
- Neovim (LazyVim) configuration managed and versioned — existing
- tmux configuration managed and versioned — existing
- Ghostty terminal configuration managed and versioned — existing
- yabai window manager configuration managed and versioned — existing
- skhd hotkey daemon configuration managed and versioned — existing
- SketchyBar status bar configuration managed and versioned — existing
- Zsh/Zinit shell configuration managed and versioned — existing
- Claude Code settings, skills, and memory managed — existing
- Gemini CLI settings managed — existing
- OpenCode settings managed — existing
- Codex CLI settings managed — existing
- Client/role-specific setup scripts in `setups/` — existing

### Active

- [ ] Setup script covers all current tool directories (no drift)
- [ ] AI assistant configs are complete and consistent across tools
- [ ] Cross-platform support (macOS primary, WSL/Linux secondary)
- [ ] Setup idempotency verified for all symlink targets
- [ ] Shell environment (Zsh/Zinit) plugins and aliases are current
- [ ] Window management (yabai + skhd) keybindings are optimized
- [ ] SketchyBar status bar reflects current workflow needs
- [ ] Neovim plugins and LSP configs are up to date

### Out of Scope

- Secrets or API keys in the repo — security risk
- GUI application preferences (managed by macOS, not dotfiles) — too volatile
- Package manager lists (Homebrew bundle) — separate concern, handled by setup script
- Docker or container configs — not personal dotfiles

## Context

- Repository is brownfield — all tools already configured and in daily use
- `initial-setup-macos.sh` is the primary bootstrap entry point for macOS
- `initial-setup.sh` handles Linux/WSL environments
- `setups/` contains role-specific setup scripts (e.g., client environments)
- Skills system in `claude/skills/` and `skills/` extends AI assistant capabilities
- Shell scripts follow Bash conventions: `set -e`, `snake_case`, 2-space indent
- Conventional commits enforced across all work

## Constraints

- **Shell**: Bash for scripts, Zsh for interactive shell — maintain compatibility
- **Idempotency**: All setup operations must be safe to rerun
- **No secrets**: System keychain or `.env` outside repo only
- **Symlink-based**: Configs live in repo, symlinked to expected locations

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Symlink-based management over stow/chezmoi | Simplicity, transparency, no extra dependencies | Good |
| Per-tool directory structure | Clear separation, easy to understand and maintain | Good |
| AI assistant configs in same repo | Single source of truth for all dev environment state | Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd:transition`):
1. Requirements invalidated? Move to Out of Scope with reason
2. Requirements validated? Move to Validated with phase reference
3. New requirements emerged? Add to Active
4. Decisions to log? Add to Key Decisions
5. "What This Is" still accurate? Update if drifted

**After each milestone** (via `/gsd:complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-03-31 after Phase 3 completion*
