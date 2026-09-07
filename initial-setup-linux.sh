#!/usr/bin/env bash
# Linux/WSL bootstrap for this dotfiles repo.
#
#   bash initial-setup-linux.sh           # full setup (apt + links, Linux only)
#   bash initial-setup-linux.sh --check   # validate symlinks only, no changes
#   bash initial-setup-linux.sh --help    # usage
#
# Safe by design: existing files are never overwritten, moved, or renamed.
# link_file only creates a link when the target is absent; anything already
# present (regular file, directory, or differently-pointed symlink) is kept
# and reported, so reruns are idempotent. --check never installs, downloads,
# or mutates anything: it only reads the symlink map below.
#
# Env knobs (same convention as initial-setup-macos.sh):
#   DOTFILES_DIR    location of this repo (default: script's directory)
#   CONFIG_VARIANT  zsh variant dir to link: wsl (default) or linux (alias)

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DOTFILES_DIR="${DOTFILES_DIR:-$SCRIPT_DIR}"
CONFIG_VARIANT="${CONFIG_VARIANT:-wsl}"

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

is_wsl() {
  [[ -f /proc/version ]] && grep -qi microsoft /proc/version 2>/dev/null
}

require_linux() {
  if [[ "$(uname -s)" != "Linux" ]]; then
    die "This script is intended for Linux/WSL only. On macOS use initial-setup-macos.sh."
  fi

  if is_wsl; then
    log "WSL detected; linking the wsl/ configs."
  else
    log "Native Linux detected."
  fi
}

ensure_dotfiles_dir() {
  if [[ ! -d "$DOTFILES_DIR" ]]; then
    die "Dotfiles directory not found at $DOTFILES_DIR. Clone the repo before running this script."
  fi
}

# Never overwrites: existing targets of any kind are preserved.
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
  local variant="$CONFIG_VARIANT"
  if [[ "$variant" == "linux" ]]; then
    variant="wsl"
  fi

  local candidate
  candidate="$DOTFILES_DIR/${variant}/zsh/zshrc"
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

# Source of truth for the Linux/WSL symlink map (mirrors the macOS script's
# layout, but points at the wsl/ configs so WSL tuning is preserved).
emit_symlink_map() {
  local zshrc_source zsh_root zsh_functions_dir config_root ghostty_target
  zshrc_source="$(resolve_config_path)"
  zsh_root="$(dirname "$zshrc_source")"
  zsh_functions_dir="${zsh_root}/zsh"
  config_root="${XDG_CONFIG_HOME:-$HOME/.config}"
  ghostty_target="${config_root}/ghostty/config"

  echo "${zshrc_source}|${HOME}/.zshrc"
  if [[ -d "$zsh_functions_dir" ]]; then
    echo "${zsh_functions_dir}|${HOME}/.zsh"
  fi
  echo "${DOTFILES_DIR}/wsl/tmux.conf|${HOME}/.tmux.conf"
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
    total=$((total + 1))
    if ! check_link "$source" "$target"; then
      errors=$((errors + 1))
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

install_if_missing() {
  local missing=()
  local pkg
  for pkg in "$@"; do
    if dpkg -s "$pkg" >/dev/null 2>&1; then
      log "$pkg is already installed."
    else
      missing+=("$pkg")
    fi
  done

  if ((${#missing[@]} > 0)); then
    log "Installing: ${missing[*]}"
    sudo apt install -y "${missing[@]}"
  fi
}

ensure_shell_essentials() {
  if ! command -v apt >/dev/null 2>&1; then
    die "apt not found; this bootstrap supports Debian/Ubuntu-based systems."
  fi

  log "Updating package lists..."
  sudo apt update
  install_if_missing \
    git zsh fzf bat ripgrep tmux curl wget unzip build-essential \
    jq neovim gh
}

ensure_tpm() {
  if [[ -d "$HOME/.tmux/plugins/tpm" ]]; then
    log "Tmux Plugin Manager already installed."
    return
  fi

  log "Installing Tmux Plugin Manager (TPM)..."
  git clone https://github.com/tmux-plugins/tpm "$HOME/.tmux/plugins/tpm"
}

ensure_default_shell() {
  local desired_shell
  desired_shell="$(command -v zsh || true)"
  if [[ -z "$desired_shell" ]]; then
    warn "zsh not found; skipping default-shell change."
    return
  fi

  if [[ "${SHELL:-}" == "$desired_shell" ]]; then
    log "Default shell already set to zsh."
    return
  fi

  log "Changing default shell to ${desired_shell}."
  if ! chsh -s "$desired_shell"; then
    warn "Could not change the default shell; run: chsh -s ${desired_shell}"
  fi
}

print_next_steps() {
  cat <<'MSG'

[next steps]
- Open a new terminal session so the linked dotfiles load correctly.
- Launch tmux, then press prefix (Ctrl-b) followed by I to install plugins through TPM.
MSG
}

print_usage() {
  cat <<'MSG'
Usage: initial-setup-linux.sh [--check|--help]

  (no flag)  Full Linux/WSL setup: apt shell essentials, TPM, symlinks.
             Existing files are always preserved, never overwritten.
  --check    Validate symlinks only. No installs, downloads, or changes.
  --help     Show this message.
MSG
}

main() {
  case "${1:-}" in
    --check)
      ensure_dotfiles_dir
      run_check_mode
      ;;
    --help | -h)
      print_usage
      ;;
    "")
      require_linux
      ensure_dotfiles_dir
      ensure_shell_essentials
      link_configs
      ensure_tpm
      ensure_default_shell
      print_next_steps
      ;;
    *)
      die "Unknown option '$1'. See --help."
      ;;
  esac
}

if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
  main "$@"
fi
