#!/usr/bin/env bash
# Fired when Claude Code needs user input or tool permission.
# Polite-loud: system notification + alert sound + click-to-focus Ghostty.
set -euo pipefail

# Drain stdin (Claude passes JSON; we don't need it)
cat >/dev/null

terminal-notifier \
  -title "Claude Code" \
  -subtitle "Needs your input" \
  -message "Awaiting permission or response" \
  -sound Glass \
  -group claude-code \
  -activate com.mitchellh.ghostty \
  >/dev/null 2>&1 &

exit 0
