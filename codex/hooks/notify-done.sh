#!/usr/bin/env bash
# Codex top-level notify program.
# Codex spawns this with the JSON payload as the last argument.
# Filter for agent-turn-complete only — other event types are ignored.
set -euo pipefail

payload="${1:-}"
[[ "$payload" == *'"type":"agent-turn-complete"'* ]] || exit 0

ctx=$(basename "$PWD")
if [[ -n "${TMUX:-}" ]]; then
  sess=$(tmux display-message -p -t "${TMUX_PANE:-}" '#S' 2>/dev/null || true)
  [[ -n "$sess" ]] && ctx="$sess - $ctx"
fi

group=$(printf 'codex-%s' "$ctx" | tr -c 'A-Za-z0-9-' '_')

afplay /System/Library/Sounds/Pop.aiff >/dev/null 2>&1 || true

terminal-notifier \
  -title "Codex" \
  -subtitle "Done - $ctx" \
  -message "Task complete" \
  -group "$group" \
  -activate com.mitchellh.ghostty \
  >/dev/null 2>&1 || true

exit 0
