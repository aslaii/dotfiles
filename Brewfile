# Brewfile -- Dotfiles standard packages
# Source of truth for all Homebrew-managed packages
# Usage: brew bundle install --file=Brewfile
# Skip sketchybar: HOMEBREW_BUNDLE_BREW_SKIP="sketchybar" HOMEBREW_BUNDLE_TAP_SKIP="FelixKratz/formulae"
#
# NOTE: Brewfile.lock.json is NOT a version-pinning lockfile.
# It is a Homebrew debug artifact. The Brewfile itself is the reproducibility guarantee.

# ── Taps ──────────────────────────────────────────
tap "koekeishiya/formulae"       # yabai, skhd (window management)
tap "FelixKratz/formulae"        # sketchybar (status bar)
tap "oven-sh/bun"                # bun JavaScript runtime

# ── Development ───────────────────────────────────
brew "git"
brew "gh"
brew "lazygit"
brew "neovim"
brew "tmux"
brew "lua"
brew "jq"
brew "wget"

# ── Shell ─────────────────────────────────────────
brew "fzf"
brew "ripgrep"
brew "bat"
brew "zoxide"
brew "starship"
brew "btop"

# ── Node.js ───────────────────────────────────────
brew "nvm"
brew "bun"
brew "pnpm"

# ── Services ──────────────────────────────────────
brew "redis"
brew "postgresql@16"
brew "mailhog"
brew "firebase-cli"

# ── Quality Tooling ──────────────────────────────
brew "shellcheck"
brew "shfmt"
brew "pre-commit"
brew "gitleaks"

# ── SketchyBar Dependencies ─────────────────────
brew "switchaudio-osx"
brew "nowplaying-cli"

# ── Window Management ────────────────────────────
brew "yabai"
brew "skhd"
brew "sketchybar"

# ── Casks ─────────────────────────────────────────
cask "codex"
cask "ghostty"
cask "visual-studio-code"
cask "gcloud-cli"
cask "sf-symbols"

# ── Fonts (in Homebrew core, no tap needed) ──────
cask "font-hack-nerd-font"
cask "font-meslo-lg-nerd-font"
cask "font-sf-mono"
cask "font-sf-pro"
