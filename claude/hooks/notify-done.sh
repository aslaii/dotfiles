#!/usr/bin/env bash
# Fired when Claude Code finishes a turn (Stop hook).
# Polite-soft: system notification + soft sound, no focus-steal.
set -euo pipefail

cat >/dev/null

terminal-notifier \
  -title "Claude Code" \
  -subtitle "Done" \
  -message "Task complete" \
  -sound Pop \
  -group claude-code \
  -activate com.mitchellh.ghostty \
  >/dev/null 2>&1 &

exit 0
