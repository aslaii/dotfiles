#!/usr/bin/env bash
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
IFS= read -r ARGENT_VERSION <"$HERE/version"
[[ "$ARGENT_VERSION" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]] || {
  printf 'argent/install: invalid version pin: %s\n' "$ARGENT_VERSION" >&2
  exit 1
}
command -v npm >/dev/null 2>&1 || {
  printf 'argent/install: npm is required\n' >&2
  exit 127
}

installed=""
if command -v argent >/dev/null 2>&1; then
  installed="$(argent --version 2>/dev/null || true)"
  installed="${installed##* }"
  installed="${installed#v}"
fi
if [[ "$installed" != "$ARGENT_VERSION" ]]; then
  npm install -g "@swmansion/argent@$ARGENT_VERSION"
  hash -r
fi

installed="$(argent --version 2>/dev/null || true)"
installed="${installed##* }"
installed="${installed#v}"
[[ "$installed" == "$ARGENT_VERSION" ]] || {
  printf 'argent/install: expected %s after install, found %s\n' "$ARGENT_VERSION" "${installed:-nothing}" >&2
  exit 1
}

argent telemetry disable >/dev/null
node "$HERE/remove-mcp.mjs" \
  "${HOME:?HOME is required}/.omo/agent/mcp.json" \
  "$HOME/.omo/agent/.mcp.json" \
  "$HOME/.omp/agent/mcp.json" \
  "$HOME/.omp/agent/.mcp.json"
printf 'Argent %s installed for CLI-only use; telemetry disabled, MCP not configured.\n' "$ARGENT_VERSION"
