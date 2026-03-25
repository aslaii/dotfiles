#!/usr/bin/env bash

set -euo pipefail

if ! command -v tmux >/dev/null 2>&1; then
  exit 0
fi

plugin_dir="${HOME}/.tmux/plugins/tmux"
theme_conf="${plugin_dir}/catppuccin_tmux.conf"

if [[ ! -f "${theme_conf}" ]]; then
  exit 0
fi

if [[ "$(defaults read -g AppleInterfaceStyle 2>/dev/null || true)" == "Dark" ]]; then
  flavor="mocha"
else
  flavor="latte"
fi

current_flavor="$(tmux show-options -gqv @catppuccin_flavor || true)"

if [[ "${current_flavor}" == "${flavor}" ]]; then
  exit 0
fi

tmux set-option -gq @catppuccin_flavor "${flavor}"
tmux source-file "${theme_conf}"
tmux refresh-client -S
