#!/usr/bin/env bash

set -euo pipefail

log() {
  printf '
[lsp-setup] %s
' "$1"
}

install_global_tools() {
  log "Installing global development tools via pnpm..."

  # Check if pnpm is installed
  if ! command -v pnpm >/dev/null 2>&1; then
    log "pnpm not found. Install it with 'brew install pnpm', then rerun this script."
    exit 1
  fi

  # TypeScript & LSPs
  pnpm add -g typescript typescript-language-server
  
  # Linting & Formatting
  pnpm add -g eslint prettier vscode-langservers-extracted
  
  # Framework CLIs
  pnpm add -g @nestjs/cli
  
  log "Global tools installed successfully."
}

main() {
  install_global_tools
}

main "$@"
