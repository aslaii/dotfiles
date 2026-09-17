#!/usr/bin/env bash

set -euo pipefail

DOTFILES_DIR="${DOTFILES_DIR:-$HOME/dotfiles}"
CONFIG_VARIANT="${CONFIG_VARIANT:-macos}"
BREW_BIN=""
BREW_PREFIX=""
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

require_macos() {
  if [[ "$(uname -s)" != "Darwin" ]]; then
    die "This script is intended for macOS only."
  fi

  case "$(uname -m)" in
    arm64) log "Apple Silicon detected; Homebrew uses /opt/homebrew." ;;
    x86_64) log "Intel detected; Homebrew uses /usr/local." ;;
    *) warn "Unsupported macOS architecture: $(uname -m)." ;;
  esac
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
      cat <<'EOF'
if [ -x /opt/homebrew/bin/brew ]; then
  eval "$(/opt/homebrew/bin/brew shellenv)"
elif [ -x /usr/local/bin/brew ]; then
  eval "$(/usr/local/bin/brew shellenv)"
fi
EOF
    } >>"$HOME/.zprofile"
  fi
}

ensure_homebrew_packages() {
  local brewfile="$DOTFILES_DIR/Brewfile"

  if [[ ! -f "$brewfile" ]]; then
    die "Brewfile not found at $brewfile"
  fi

  # Clean up deprecated tap if still present
  brew untap homebrew/cask-fonts 2>/dev/null || true

  # Check if all packages already installed
  if brew bundle check --file="$brewfile" 2>/dev/null; then
    log "All Homebrew packages already installed."
    return
  fi

  log "Installing Homebrew packages from Brewfile..."
  if ! brew bundle install --file="$brewfile" --no-upgrade; then
    warn "Some Brewfile packages may have failed. Check output above."
  fi
}

ensure_rtk_omp_integration() {
  command -v rtk >/dev/null 2>&1 || die "rtk installation failed."
  log "Installing RTK's global OMP integration."
  rtk init -g --agent omp --no-patch
}

ensure_resource_guard() {
  local version="${RCG_VERSION:-v0.1.1}"
  local install_dir="${RCG_INSTALL_DIR:-${HOME}/.local/bin}"
  local binary="${install_dir}/rcg"
  local expected="rcg ${version#v}"
  local installed=""

  if [[ -x "$binary" ]]; then
    installed="$("$binary" --version 2>/dev/null || true)"
  fi
  if [[ "$installed" != "$expected" ]]; then
    log "Installing checksummed RCG ${version} release (found ${installed:-nothing})."
    curl -fsSL "https://raw.githubusercontent.com/aslaii/rcg/${version}/install.sh" |
      RCG_VERSION="$version" RCG_INSTALL_DIR="$install_dir" /bin/sh
  fi

  "$binary" --self-check >/dev/null || die "RCG self-check failed at ${binary}."
  log "Installing RCG's global OMP integration."
  "$binary" init --agent omp --global
}

sha256_file() {
  if command -v sha256sum >/dev/null 2>&1; then
    sha256sum "$1" | cut -d' ' -f1
  else
    shasum -a 256 "$1" | cut -d' ' -f1
  fi
}

ensure_comment_checker() {
  local version="${COMMENT_CHECKER_VERSION:-v0.8.0}"
  local install_dir="${COMMENT_CHECKER_INSTALL_DIR:-${HOME}/.local/bin}"
  local binary="${install_dir}/comment-checker"
  local platform tarball_sha binary_sha url tmp archive actual
  local -r release="https://github.com/code-yeongyu/go-claude-code-comment-checker/releases/download"

  case "$(uname -s)/$(uname -m)" in
    Darwin/arm64 | Darwin/aarch64) platform="darwin_arm64" ;;
    Darwin/x86_64) platform="darwin_amd64" ;;
    Linux/arm64 | Linux/aarch64) platform="linux_arm64" ;;
    Linux/x86_64) platform="linux_amd64" ;;
    *) die "comment-checker ${version} has no build for $(uname -s)/$(uname -m)." ;;
  esac

  case "$platform" in
    darwin_arm64)
      tarball_sha="ac73b76f1ecf9615e859a0a7a00e76f25305563f87a7ee168cdd2e76c8e3855a"
      binary_sha="e0af0bbfc88880fa3466c36a9cd308fb523db06ffacbabdd5cbecb003abaca5e"
      ;;
    darwin_amd64)
      tarball_sha="7408f026ece59fcc90fb7e598364e3c947e1cab277e59c639bf59096822ee4dc"
      binary_sha="19110ef8339e820d8d4ffce34183f15172b6d7ab28d9a75a082d255571fcaa4e"
      ;;
    linux_arm64)
      tarball_sha="213e6d06c3d93c0614cc81ff52d542ad0fb59bc66af9d93c532981e098f18ae6"
      binary_sha="79c4e022563d1ea6d7dd928ec4a5c8c2246300d21c85c27c110f5d2f9770634e"
      ;;
    linux_amd64)
      tarball_sha="0ff026fe244aa0af9567d53b0461c97abf5a50f86ce1ceb5531fd5419497dd4f"
      binary_sha="9c56f9aba193bb16f7cde6a91872661b52388f71a8d8a47623260c3ed4a6c805"
      ;;
  esac

  if [[ -x "$binary" ]] && [[ "$(sha256_file "$binary")" == "$binary_sha" ]]; then
    log "comment-checker ${version} already installed."
    return
  fi

  url="${release}/${version}/comment-checker_${version}_${platform}.tar.gz"
  log "Installing checksummed comment-checker ${version} release (${platform})."
  tmp="$(mktemp -d)"
  if ! curl -fsSL -o "${tmp}/comment-checker.tar.gz" "$url"; then
    rm -rf "$tmp"
    die "Failed to download ${url}."
  fi
  archive="${tmp}/comment-checker.tar.gz"
  actual="$(sha256_file "$archive")"
  if [[ "$actual" != "$tarball_sha" ]]; then
    rm -rf "$tmp"
    die "comment-checker ${version} archive sha256 mismatch for ${platform}: expected ${tarball_sha}, got ${actual}."
  fi

  tar -xzf "$archive" -C "$tmp" comment-checker
  actual="$(sha256_file "${tmp}/comment-checker")"
  if [[ "$actual" != "$binary_sha" ]]; then
    rm -rf "$tmp"
    die "comment-checker ${version} binary sha256 mismatch for ${platform}: expected ${binary_sha}, got ${actual}."
  fi

  mkdir -p "$install_dir"
  install -m 755 "${tmp}/comment-checker" "$binary"
  rm -rf "$tmp"

  "$binary" --help >/dev/null || die "comment-checker failed to run at ${binary}."
  log "comment-checker ${version} installed at ${binary}."
}

link_file() {
  local source="$1"
  local target="$2"

  if [[ ! -e "$source" ]]; then
    warn "Source ${source} missing; skipping link."
    return
  fi

  if [[ -L "$target" && "$(readlink "$target")" == "$source" ]]; then
    log "Link already exists: ${target} -> ${source}"
    return
  fi

  if [[ -L "$target" && ! -e "$target" ]]; then
    log "Replacing broken symlink ${target}."
    rm "$target"
  fi

  if [[ -e "$target" || -L "$target" ]]; then
    warn "Preserving existing ${target}; skipping link to ${source}."
    return
  fi

  mkdir -p "$(dirname "$target")"
  ln -s "$source" "$target"
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

emit_symlink_map() {
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

  echo "${zshrc_source}|${HOME}/.zshrc"
  if [[ -d "$zsh_functions_dir" ]]; then
    echo "${zsh_functions_dir}|${HOME}/.zsh"
  fi
  echo "${DOTFILES_DIR}/git/gitconfig|${HOME}/.gitconfig"
  echo "${DOTFILES_DIR}/git/gitconfig-jecho-swe|${HOME}/.gitconfig-jecho-swe"
  echo "${DOTFILES_DIR}/tmux/tmux.conf|${HOME}/.tmux.conf"
  echo "${DOTFILES_DIR}/codex/AGENTS.md|${HOME}/AGENTS.md"
  echo "${DOTFILES_DIR}/codex/AGENTS.md|${HOME}/.codex/AGENTS.md"
  echo "${DOTFILES_DIR}/codex/hooks.json|${HOME}/.codex/hooks.json"
  echo "${DOTFILES_DIR}/ghostty/config|${ghostty_target}"
  echo "${DOTFILES_DIR}/codex|${config_root}/codex"
  echo "${DOTFILES_DIR}/nvim|${config_root}/nvim"
}

check_link() {
  local source="$1" target="$2"

  if [[ ! -e "$target" && ! -L "$target" ]]; then
    printf 'MISSING: %s\n' "$target"
    return 1
  fi

  if [[ -L "$target" && ! -e "$target" ]]; then
    printf 'STALE: %s -> %s (dead target)\n' "$target" "$(readlink "$target")"
    return 1
  fi

  if [[ -L "$target" ]]; then
    local actual
    actual="$(readlink "$target")"
    if [[ "$actual" != "$source" ]]; then
      printf 'WRONG: %s -> %s (expected %s)\n' "$target" "$actual" "$source"
      return 1
    fi
    printf 'OK: %s -> %s\n' "$target" "$source"
    return 0
  fi

  # Exists but is not a symlink
  printf 'WRONG: %s is not a symlink (expected link to %s)\n' "$target" "$source"
  return 1
}

run_check_mode() {
  local errors=0
  local total=0

  while IFS='|' read -r source target; do
    ((total++))
    if ! check_link "$source" "$target"; then
      ((errors++))
    fi
  done < <(emit_symlink_map)

  echo ""
  if ((errors == 0)); then
    log "All ${total} symlinks OK."
    return 0
  else
    warn "${errors} of ${total} symlinks out of sync."
    return 1
  fi
}

link_configs() {
  local zshrc_source zsh_root zsh_functions_dir
  zshrc_source="$(resolve_config_path)"
  zsh_root="$(dirname "$zshrc_source")"
  zsh_functions_dir="${zsh_root}/zsh"

  if [[ ! -d "$zsh_functions_dir" ]]; then
    warn "Expected zsh functions directory ${zsh_functions_dir} missing; skipping ~/.zsh link."
  fi

  while IFS='|' read -r source target; do
    link_file "$source" "$target"
  done < <(emit_symlink_map)
}

ensure_codex_config() {
  local template="${DOTFILES_DIR}/codex/config.template.toml"
  local config="${DOTFILES_DIR}/codex/config.toml"

  if [[ -f "$config" ]]; then
    log "Codex config already exists."
  elif [[ -f "$template" ]]; then
    cp "$template" "$config"
    log "Created Codex config from template."
  else
    warn "Codex config template missing at ${template}."
  fi
}

ensure_neovim_config() {
  local config_root="${XDG_CONFIG_HOME:-$HOME/.config}"
  mkdir -p "$config_root"

  if [[ ! -d "${DOTFILES_DIR}/nvim" ]]; then
    warn "Neovim config missing at ${DOTFILES_DIR}/nvim; skipping link."
  fi
}

ensure_tpm() {
  if [[ -d "$HOME/.tmux/plugins/tpm" ]]; then
    log "Tmux Plugin Manager already installed."
    return
  fi

  log "Installing Tmux Plugin Manager (TPM)..."
  git clone https://github.com/tmux-plugins/tpm "$HOME/.tmux/plugins/tpm"
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
    url="https://raw.githubusercontent.com/JanDeDobbeleer/oh-my-posh/main/themes/catppuccin_${flavor}.omp.json"
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

  if ((missing == 0)); then
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
- Open a new terminal session so the Homebrew environment and linked dotfiles load correctly.
- Launch tmux, then press prefix (Ctrl-b) followed by I to install plugins through TPM.
MSG
}

main() {
  if [[ "${1:-}" == "--omp" ]]; then
    ensure_dotfiles_dir
    command -v bun >/dev/null 2>&1 || die "Install Bun before restoring OMP plugins."
    ensure_rtk_omp_integration
    ensure_resource_guard
    ensure_comment_checker

    local omp_root="${HOME}/.omp" agent skill manifest
    link_file "${DOTFILES_DIR}/omp/agent/config.yml" "${omp_root}/agent/config.yml"
    link_file "${DOTFILES_DIR}/omp/agent/models.yml" "${omp_root}/agent/models.yml"
    link_file "${DOTFILES_DIR}/omp/agent/APPEND_SYSTEM.md" "${omp_root}/agent/APPEND_SYSTEM.md"
    link_file "${DOTFILES_DIR}/omp/agent/extensions/comment-checker-hashline.ts" "${omp_root}/agent/extensions/comment-checker-hashline.ts"
    for agent in "${DOTFILES_DIR}"/omp/agent/agents/*.md; do
      [[ -f "$agent" ]] || continue
      link_file "$agent" "${omp_root}/agent/agents/$(basename "$agent")"
    done
    for skill in "${DOTFILES_DIR}"/omp/agent/skills/*; do
      link_file "$skill" "${omp_root}/agent/skills/$(basename "$skill")"
    done
    for rule in "${DOTFILES_DIR}"/omp/agent/rules/*.md; do
      [[ -f "$rule" ]] || continue
      link_file "$rule" "${omp_root}/agent/rules/$(basename "$rule")"
    done
    for manifest in package.json bun.lock omp-plugins.lock.json; do
      link_file "${DOTFILES_DIR}/omp/plugins/${manifest}" "${omp_root}/plugins/${manifest}"
    done
    bun install --cwd "${omp_root}/plugins" --frozen-lockfile --concurrent-scripts 2 --network-concurrency 2
    log "OMP files linked where missing; existing files preserved. Plugins restored from the active lockfile."
    return
  fi

  if [[ "${1:-}" == "--check" ]]; then
    require_macos
    ensure_dotfiles_dir
    run_check_mode
    exit $?
  fi

  require_macos
  ensure_dotfiles_dir
  ensure_command_line_tools
  install_homebrew
  ensure_brew_shellenv
  ensure_homebrew_packages
  ensure_rtk_omp_integration
  ensure_resource_guard
  ensure_comment_checker
  command -v agent-browser >/dev/null 2>&1 || die "agent-browser installation failed."
  log "Installing agent-browser browser runtime."
  agent-browser install
  install_oh_my_posh_themes
  install_btop_catppuccin_themes
  ensure_codex_config
  link_configs
  ensure_neovim_config
  ensure_tpm
  ensure_github_auth
  ensure_default_shell
  print_next_steps
}

main "$@"
