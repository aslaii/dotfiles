#!/usr/bin/env bash
# Platform dispatcher for this dotfiles repo.
#
#   bash initial-setup.sh [--check|--help]
#
# Routes to the explicit per-platform bootstrap and forwards all arguments:
#   macOS (Darwin) -> initial-setup-macos.sh
#   Linux / WSL    -> initial-setup-linux.sh
#
# This script itself installs nothing and changes nothing; --check only
# validates symlinks via the platform script. Previously this file was a
# Linux-only apt kitchen sink that overwrote symlinks (ln -sfn) and renamed
# user files (*.bak); that behavior is retired in favor of the
# preserve-existing platform scripts. Role-specific stacks still live in
# setups/ and are untouched by any bootstrap entrypoint.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DOTFILES_DIR="${DOTFILES_DIR:-$SCRIPT_DIR}"
export DOTFILES_DIR

print_usage() {
  cat <<'MSG'
Usage: initial-setup.sh [--check|--help]

Dispatches to the platform bootstrap (all arguments forwarded):

  macOS (Darwin)  -> initial-setup-macos.sh
  Linux / WSL     -> initial-setup-linux.sh
MSG
}

if [[ "${1:-}" == "--help" || "${1:-}" == "-h" ]]; then
  print_usage
  exit 0
fi

case "$(uname -s)" in
  Darwin)
    exec bash "$SCRIPT_DIR/initial-setup-macos.sh" "$@"
    ;;
  Linux)
    exec bash "$SCRIPT_DIR/initial-setup-linux.sh" "$@"
    ;;
  *)
    printf '\n[error] Unsupported platform: %s (expected macOS or Linux/WSL).\n' "$(uname -s)" >&2
    exit 1
    ;;
esac
