#!/usr/bin/env bash
# Fired when Codex needs user input or tool permission.
# Polite-loud: system notification + alert sound + click-to-focus Ghostty.
set -euo pipefail

cat >/dev/null

ctx=$(basename "$PWD")
if [[ -n "${TMUX:-}" ]]; then
  sess=$(tmux display-message -p -t "${TMUX_PANE:-}" '#S' 2>/dev/null || true)
  [[ -n "$sess" ]] && ctx="$sess - $ctx"
fi

group=$(printf 'codex-%s' "$ctx" | tr -c 'A-Za-z0-9-' '_')

afplay /System/Library/Sounds/Glass.aiff >/dev/null 2>&1 &

terminal-notifier \
  -title "Codex" \
  -subtitle "Needs input - $ctx" \
  -message "Awaiting permission or response" \
  -group "$group" \
  -activate com.mitchellh.ghostty \
  >/dev/null 2>&1 &

exit 0
