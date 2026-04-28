#!/usr/bin/env bash
# Fired when Codex finishes a turn (Stop hook).
# Polite-soft: system notification + soft sound, no focus-steal.
set -euo pipefail

cat >/dev/null

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
