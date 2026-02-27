#!/usr/bin/env bash

set -euo pipefail

DOTFILES_DIR="${DOTFILES_DIR:-$HOME/dotfiles}"
CONFIG_VARIANT="${CONFIG_VARIANT:-macos}"
BREW_BIN=""
BREW_PREFIX=""
SKETCHYBAR="${SKETCHYBAR:-true}"

BREW_TAPS=(
  "koekeishiya/formulae"
  "FelixKratz/formulae"
  "homebrew/cask-fonts"
)

BREW_FORMULAE=(
  "git"
  "gh"
  "lazygit"
  "neovim"
  "tmux"
  "fzf"
  "ripgrep"
  "bat"
  "zoxide"
  "starship"
  "oh-my-posh"
  "bun"
  "pnpm"
  "nvm"
  "codex"
  "mailhog"
  "redis"
  "postgresql@16"
  "jq"
  "wget"
  "firebase-cli"
  "shellcheck"
  "lua"
  "switchaudio-osx"
  "nowplaying-cli"
  "btop"
  "yabai"
  "skhd"
)

BREW_CASKS=(
  "ghostty"
  "visual-studio-code"
  "font-hack-nerd-font"
  "font-meslo-lg-nerd-font"
  "google-cloud-sdk"
  "sf-symbols"
  "font-sf-mono"
  "font-sf-pro"
)

log() {
  printf '\n[setup] %s\n' "$1"
}

warn() {
  printf '\n[warn] %s\n' "$1" >&2
}

die() {
  printf '\n[error] %s\n' "$1" >&2
  exit 1
}

is_truthy() {
  local value
  value="$(printf '%s' "${1:-}" | tr '[:upper:]' '[:lower:]')"

  case "$value" in
    1|true|y|yes|on)
      return 0
      ;;
  esac

  return 1
}

ensure_expected_user() {
  local expected_user="aslaii"
  local current_user
  current_user="$(id -un)"

  if [[ "$current_user" != "$expected_user" ]]; then
    die "This script must be run as ${expected_user}. Current user: ${current_user}"
  fi

  log "Running as expected user ${expected_user}."
}

require_macos() {
  if [[ "$(uname -s)" != "Darwin" ]]; then
    die "This script is intended for macOS only."
  fi

  if [[ "$(uname -m)" != "arm64" ]]; then
    warn "Apple Silicon (arm64) expected. Continuing, but make sure Homebrew is under /opt/homebrew."
  fi
}

ensure_dotfiles_dir() {
  if [[ ! -d "$DOTFILES_DIR" ]]; then
    die "Dotfiles directory not found at $DOTFILES_DIR. Clone the repo before running this script."
  fi
}

ensure_command_line_tools() {
  if xcode-select -p >/dev/null 2>&1; then
    log "Xcode Command Line Tools already installed."
    return
  fi

  log "Installing Xcode Command Line Tools (respond to the GUI prompt)..."
  if ! xcode-select --install >/dev/null 2>&1; then
    warn "If you saw a dialog that the tools are already installed, you can ignore this warning."
  fi

  until xcode-select -p >/dev/null 2>&1; do
    log "Waiting for Xcode Command Line Tools installation to finish..."
    sleep 20
  done
  log "Xcode Command Line Tools ready."
}

detect_brew() {
  if command -v brew >/dev/null 2>&1; then
    BREW_BIN="$(command -v brew)"
  elif [[ -x /opt/homebrew/bin/brew ]]; then
    BREW_BIN="/opt/homebrew/bin/brew"
  elif [[ -x /usr/local/bin/brew ]]; then
    BREW_BIN="/usr/local/bin/brew"
  else
    BREW_BIN=""
  fi

  if [[ -n "$BREW_BIN" ]]; then
    BREW_PREFIX="$("$BREW_BIN" --prefix)"
  fi
}

install_homebrew() {
  detect_brew
  if [[ -n "$BREW_BIN" ]]; then
    log "Homebrew already installed at $BREW_PREFIX."
    return
  fi

  log "Installing Homebrew..."
  /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

  detect_brew
  if [[ -z "$BREW_BIN" ]]; then
    die "Homebrew installation failed."
  fi
  log "Homebrew installed at $BREW_PREFIX."
}

ensure_brew_shellenv() {
  detect_brew
  if [[ -z "$BREW_BIN" ]]; then
    die "brew command not found after installation."
  fi

  eval "$("$BREW_BIN" shellenv)"

  if [[ ! -f "$HOME/.zprofile" ]] || ! grep -q "brew shellenv" "$HOME/.zprofile"; then
    log "Adding Homebrew shellenv to ~/.zprofile."
    {
      printf '\n'
      printf '%s\n' \
        'if [ -x /opt/homebrew/bin/brew ]; then' \
        '  eval "$(/opt/homebrew/bin/brew shellenv)"' \
        'elif [ -x /usr/local/bin/brew ]; then' \
        '  eval "$(/usr/local/bin/brew shellenv)"' \
        'fi'
    } >>"$HOME/.zprofile"
  fi
}

ensure_brew_taps() {
  local tap
  for tap in "${BREW_TAPS[@]}"; do
    if "$BREW_BIN" tap | grep -q "^${tap}\$"; then
      log "Tap ${tap} already present."
    else
      log "Adding tap ${tap}..."
      if ! "$BREW_BIN" tap "$tap"; then
        warn "Failed to add tap ${tap}. Check Homebrew output."
      fi
    fi
  done
}

install_formulae() {
  local formula
  local formulae=("${BREW_FORMULAE[@]}")

  if is_truthy "$SKETCHYBAR"; then
    formulae+=("sketchybar")
  else
    log "Skipping SketchyBar formula install (SKETCHYBAR=${SKETCHYBAR})."
  fi

  for formula in "${formulae[@]}"; do
    if "$BREW_BIN" list --formula "$formula" >/dev/null 2>&1; then
      log "Formula ${formula} already installed."
    else
      log "Installing formula ${formula}..."
      if ! "$BREW_BIN" install "$formula"; then
        warn "Installation failed for ${formula}."
      fi
    fi
  done
}

install_casks() {
  local cask
  for cask in "${BREW_CASKS[@]}"; do
    if "$BREW_BIN" list --cask "$cask" >/dev/null 2>&1; then
      log "Cask ${cask} already installed."
    else
      log "Installing cask ${cask}..."
      if ! "$BREW_BIN" install --cask "$cask"; then
        warn "Installation failed for ${cask}."
      fi
    fi
  done
}

link_file() {
  local source="$1"
  local target="$2"

  if [[ ! -e "$source" ]]; then
    warn "Source ${source} missing; skipping link."
    return
  fi

  if [[ -L "$target" && ! -e "$target" ]]; then
    log "Removing broken symlink ${target}."
    rm "$target"
  fi

  if [[ -e "$target" && ! -L "$target" ]]; then
    local backup
    backup="${target}.bak.$(date +%s)"
    log "Backing up existing ${target} to ${backup}."
    mv "$target" "$backup"
  fi

  mkdir -p "$(dirname "$target")"
  ln -sfn "$source" "$target"
  log "Linked ${target} -> ${source}"
}

resolve_config_path() {
  local candidate
  candidate="$DOTFILES_DIR/${CONFIG_VARIANT}/zsh/zshrc"
  if [[ -f "$candidate" ]]; then
    echo "$candidate"
    return
  fi

  candidate="$DOTFILES_DIR/wsl/zsh/zshrc"
  if [[ -f "$candidate" ]]; then
    echo "$candidate"
    return
  fi

  die "No zshrc found for variant '${CONFIG_VARIANT}'."
}

link_configs() {
  local zshrc_source zsh_root zsh_functions_dir config_root ghostty_target
  zshrc_source="$(resolve_config_path)"
  zsh_root="$(dirname "$zshrc_source")"
  zsh_functions_dir="${zsh_root}/zsh"
  config_root="${XDG_CONFIG_HOME:-$HOME/.config}"
  if [[ "$(uname -s)" == "Darwin" ]]; then
    ghostty_target="$HOME/Library/Application Support/com.mitchellh.ghostty/config"
  else
    ghostty_target="${config_root}/ghostty/config"
  fi

  link_file "$zshrc_source" "$HOME/.zshrc"
  if [[ -d "$zsh_functions_dir" ]]; then
    link_file "$zsh_functions_dir" "$HOME/.zsh"
  else
    warn "Expected zsh functions directory ${zsh_functions_dir} missing; skipping ~/.zsh link."
  fi
  link_file "$DOTFILES_DIR/tmux/tmux.conf" "$HOME/.tmux.conf"
  link_file "$DOTFILES_DIR/ghostty/config" "$ghostty_target"
  link_file "$DOTFILES_DIR/codex" "${config_root}/codex"
  link_file "$DOTFILES_DIR/yabai" "${config_root}/yabai"
  link_file "$DOTFILES_DIR/skhd" "${config_root}/skhd"
  link_file "$DOTFILES_DIR/opencode" "${config_root}/opencode"
  link_file "$DOTFILES_DIR/claude" "$HOME/.claude"
  if is_truthy "$SKETCHYBAR"; then
    link_file "$DOTFILES_DIR/sketchybar" "${config_root}/sketchybar"
  else
    log "Skipping SketchyBar config link (SKETCHYBAR=${SKETCHYBAR})."
  fi
}

ensure_neovim_config() {
  local config_root="${XDG_CONFIG_HOME:-$HOME/.config}"
  local source="${DOTFILES_DIR}/nvim"
  local target="${config_root}/nvim"

  mkdir -p "$config_root"

  if [[ ! -d "$source" ]]; then
    warn "Neovim config missing at ${source}; skipping link."
    return
  fi

  link_file "$source" "$target"
}

ensure_tpm() {
  if [[ -d "$HOME/.tmux/plugins/tpm" ]]; then
    log "Tmux Plugin Manager already installed."
    return
  fi

  log "Installing Tmux Plugin Manager (TPM)..."
  git clone https://github.com/tmux-plugins/tpm "$HOME/.tmux/plugins/tpm"
}

ensure_batcat_symlink() {
  if command -v batcat >/dev/null 2>&1; then
    return
  fi

  if command -v bat >/dev/null 2>&1; then
    local bat_path
    bat_path="$(command -v bat)"
    log "Creating batcat shim for compatibility."
    ln -sf "$bat_path" "$BREW_PREFIX/bin/batcat"
  else
    warn "bat is not installed; cannot create batcat shim."
  fi
}

install_clasp() {
  if command -v clasp >/dev/null 2>&1; then
    log "clasp already installed."
    return
  fi

  if command -v pnpm >/dev/null 2>&1; then
    log "Installing clasp via pnpm."
    if pnpm add --global @google/clasp; then
      log "Installed clasp via pnpm."
    else
      warn "Failed to install clasp via pnpm."
    fi
    return
  fi

  if command -v npm >/dev/null 2>&1; then
    log "Installing clasp via npm."
    if npm install -g @google/clasp; then
      log "Installed clasp via npm."
    else
      warn "Failed to install clasp via npm."
    fi
    return
  fi

  warn "pnpm/npm not found; install Node tooling (e.g. via nvm) and rerun to install clasp."
}

install_oh_my_posh_themes() {
  if ! command -v oh-my-posh >/dev/null 2>&1; then
    warn "oh-my-posh not found; skipping theme download."
    return
  fi

  local theme_dir
  theme_dir="$("$BREW_BIN" --prefix oh-my-posh)/themes"
  mkdir -p "$theme_dir"

  local flavor url
  for flavor in latte mocha; do
    url="https://raw.githubusercontent.com/catppuccin/oh-my-posh/main/themes/catppuccin_${flavor}.omp.json"
    if [[ ! -f "${theme_dir}/catppuccin_${flavor}.omp.json" ]]; then
      log "Downloading catppuccin ${flavor} theme for oh-my-posh."
      if ! curl -fsSL "$url" -o "${theme_dir}/catppuccin_${flavor}.omp.json"; then
        warn "Failed to fetch oh-my-posh theme ${flavor}."
      fi
    else
      log "oh-my-posh theme ${flavor} already present."
    fi
  done
}

install_btop_catppuccin_themes() {
  local config_root="${XDG_CONFIG_HOME:-$HOME/.config}"
  local theme_dir="${config_root}/btop/themes"
  local url="https://github.com/catppuccin/btop/releases/download/1.0.0/themes.tar.gz"
  local flavors=(
    "catppuccin_latte.theme"
    "catppuccin_frappe.theme"
    "catppuccin_macchiato.theme"
    "catppuccin_mocha.theme"
  )

  mkdir -p "$theme_dir"

  local missing=0 theme
  for theme in "${flavors[@]}"; do
    if [[ ! -f "${theme_dir}/${theme}" ]]; then
      missing=1
      break
    fi
  done

  if (( missing == 0 )); then
    log "Catppuccin themes for btop already installed."
    return
  fi

  local tmp_dir archive
  tmp_dir="$(mktemp -d)"
  archive="${tmp_dir}/themes.tar.gz"

  log "Downloading Catppuccin themes for btop."
  if ! curl -fsSL "$url" -o "$archive"; then
    warn "Failed to download Catppuccin btop themes."
    rm -rf "$tmp_dir"
    return
  fi

  if ! tar -xzf "$archive" -C "$tmp_dir"; then
    warn "Failed to extract Catppuccin btop themes."
    rm -rf "$tmp_dir"
    return
  fi

  if ! cp -f "${tmp_dir}/catppuccin_"*.theme "$theme_dir/"; then
    warn "Failed to copy Catppuccin btop themes."
    rm -rf "$tmp_dir"
    return
  fi

  rm -rf "$tmp_dir"
  log "Installed Catppuccin themes for btop into ${theme_dir}."
}

install_sketchybar_support() {
  local font_dest="$HOME/Library/Fonts/sketchybar-app-font.ttf"
  local font_url="https://github.com/kvndrsslr/sketchybar-app-font/releases/download/v2.0.28/sketchybar-app-font.ttf"
  local marker_dir="$HOME/.local/share/sketchybar"
  local marker_file="${marker_dir}/sbarlua-installed"

  mkdir -p "$marker_dir"

  if [[ -f "$font_dest" ]]; then
    log "SketchyBar app font already present."
  else
    log "Installing SketchyBar app font."
    if ! curl -fsSL "$font_url" -o "$font_dest"; then
      warn "Failed to download SketchyBar app font."
    fi
  fi

  if [[ -f "$marker_file" ]]; then
    log "SbarLua already installed; skipping."
  else
    local tmp_dir
    tmp_dir="$(mktemp -d)"

    if git clone https://github.com/FelixKratz/SbarLua.git "$tmp_dir/SbarLua"; then
      if (cd "$tmp_dir/SbarLua" && make install); then
        log "Installed SbarLua for SketchyBar."
        touch "$marker_file"
      else
        warn "Failed to run 'make install' for SbarLua."
      fi
    else
      warn "Failed to clone SbarLua repository."
    fi

    rm -rf "$tmp_dir"
  fi

  if command -v sketchybar >/dev/null 2>&1; then
    if "$BREW_BIN" services list 2>/dev/null | grep -q "^sketchybar\s"; then
      log "Restarting SketchyBar service via Homebrew."
      if ! "$BREW_BIN" services restart sketchybar; then
        warn "Failed to restart SketchyBar service."
      fi
    else
      log "Starting SketchyBar service via Homebrew."
      if ! "$BREW_BIN" services start sketchybar; then
        warn "Failed to start SketchyBar service."
      fi
    fi
  else
    warn "SketchyBar binary not found; skipping service management."
  fi
}

ensure_gcloud_symlink() {
  local target_dir="$HOME/Google"
  local legacy_dir="${target_dir}/google-cloud-sdk"
  local candidate

  mkdir -p "$target_dir"

  if [[ -d "$legacy_dir" ]]; then
    return
  fi

  local candidates=(
    "$BREW_PREFIX/Caskroom/google-cloud-sdk/latest/google-cloud-sdk"
    "/opt/homebrew/Caskroom/google-cloud-sdk/latest/google-cloud-sdk"
    "/usr/local/Caskroom/google-cloud-sdk/latest/google-cloud-sdk"
    "$BREW_PREFIX/share/google-cloud-sdk"
  )

  for candidate in "${candidates[@]}"; do
    if [[ -d "$candidate" ]]; then
      log "Linking Google Cloud SDK into ${legacy_dir}."
      ln -s "$candidate" "$legacy_dir"
      return
    fi
  done

  warn "Google Cloud SDK installation not found; run 'brew install --cask google-cloud-sdk' if missing."
}

ensure_github_auth() {
  if ! command -v gh >/dev/null 2>&1; then
    warn "GitHub CLI not found; skipping authentication."
    return
  fi

  if gh auth status >/dev/null 2>&1; then
    log "GitHub CLI already authenticated."
  else
    log "Launching GitHub authentication..."
    gh auth login
  fi
}

ensure_default_shell() {
  local current_shell desired_shell
  desired_shell="$(command -v zsh)"
  current_shell="$SHELL"

  if [[ "$current_shell" == "$desired_shell" ]]; then
    log "Default shell already set to zsh."
    return
  fi

  if ! grep -q "^${desired_shell}$" /etc/shells; then
    log "Adding ${desired_shell} to /etc/shells."
    echo "$desired_shell" | sudo tee -a /etc/shells >/dev/null
  fi

  log "Changing default shell to ${desired_shell}."
  chsh -s "$desired_shell"
}

print_next_steps() {
  cat <<'MSG'

[next steps]
- Open System Settings → Privacy & Security → Accessibility and grant access to both yabai and skhd, then run `brew services start yabai` and `brew services start skhd`.
- Run `gcloud init` to finish Google Cloud CLI configuration.
- Open a new terminal session so the Homebrew environment and linked dotfiles load correctly.
- Launch tmux, then press prefix (Ctrl-b) followed by I to install plugins through TPM.
- Complete any client-specific bootstrap scripts under `~/dotfiles/setups/` as needed.
MSG
}

main() {
  require_macos
  ensure_expected_user
  ensure_dotfiles_dir
  ensure_command_line_tools
  install_homebrew
  ensure_brew_shellenv
  ensure_brew_taps
  install_formulae
  install_casks
  ensure_batcat_symlink
  install_clasp
  install_oh_my_posh_themes
  install_btop_catppuccin_themes
  if is_truthy "$SKETCHYBAR"; then
    install_sketchybar_support
  else
    log "Skipping SketchyBar support setup (SKETCHYBAR=${SKETCHYBAR})."
  fi
  ensure_gcloud_symlink
  link_configs
  ensure_neovim_config
  ensure_tpm
  ensure_github_auth
  ensure_default_shell
  print_next_steps
}

main "$@"
