#!/usr/bin/env bash
# scripts/install-shell-tools.sh
# Minimal installer for the tools macos/zsh/zshrc expects.
# Neovim/LazyVim is intentionally excluded — set up separately.

set -euo pipefail

log() { printf '\n[install] %s\n' "$1"; }

if [[ "$(uname -s)" != "Darwin" ]]; then
  echo "This script is macOS-only." >&2
  exit 1
fi

if ! command -v brew >/dev/null 2>&1; then
  log "Homebrew not found. Install it first: https://brew.sh"
  exit 1
fi

# --- Homebrew packages ---
BREW_PACKAGES=(
  fnm          # Node version manager (fast, replaces nvm)
  lazygit      # git TUI (used by `lg` alias)
  oh-my-posh   # shell prompt theme engine
  zoxide       # smarter `cd`, learns frequent dirs
  bat          # `cat` with syntax highlighting, used by fzf preview
  fzf          # fuzzy finder, powers Ctrl+R and file/line jump
  ripgrep      # `rg`, backs FZF_DEFAULT_COMMAND
)

log "Installing Homebrew packages: ${BREW_PACKAGES[*]}"
brew install "${BREW_PACKAGES[@]}"

# --- Bun (not on Homebrew core, official installer) ---
if ! command -v bun >/dev/null 2>&1; then
  log "Installing bun"
  curl -fsSL https://bun.sh/install | bash
else
  log "bun already installed, skipping"
fi

# --- pnpm (via corepack, ships with Node once fnm installs one) ---
if ! command -v pnpm >/dev/null 2>&1; then
  log "Installing pnpm via standalone script"
  curl -fsSL https://get.pnpm.io/install.sh | sh -
else
  log "pnpm already installed, skipping"
fi

log "Done. Restart your shell (or 'exec zsh') to pick up fnm/pnpm/bun PATH entries."
