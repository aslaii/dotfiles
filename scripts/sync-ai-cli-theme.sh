#!/usr/bin/env bash

set -euo pipefail

if [[ "$(defaults read -g AppleInterfaceStyle 2>/dev/null || true)" == "Dark" ]]; then
  codex_theme="catppuccin-mocha"
  gemini_theme="Catppuccin Mocha"
  claude_theme="dark"
else
  codex_theme="catppuccin-latte"
  gemini_theme="Catppuccin Latte"
  claude_theme="light"
fi

update_codex_theme() {
  local config_path="$HOME/.codex/config.toml"

  if [[ ! -f "$config_path" ]]; then
    return
  fi

  sed -i '' -E "s/^theme = \".*\"$/theme = \"${codex_theme}\"/" "$config_path"
}

update_gemini_theme() {
  local config_path="$HOME/.gemini/settings.json"
  local tmp_file

  if [[ ! -f "$config_path" ]] || ! command -v jq >/dev/null 2>&1; then
    return
  fi

  tmp_file="$(mktemp)"
  jq \
    --arg theme "$gemini_theme" \
    '.ui.theme = $theme | .ui.autoThemeSwitching = true' \
    "$config_path" >"$tmp_file"
  mv "$tmp_file" "$config_path"
}

update_claude_theme() {
  local config_path="$HOME/.claude/settings.json"
  local tmp_file

  if [[ ! -f "$config_path" ]] || ! command -v jq >/dev/null 2>&1; then
    return
  fi

  tmp_file="$(mktemp)"
  jq \
    --arg theme "$claude_theme" \
    '.theme = $theme' \
    "$config_path" >"$tmp_file"
  mv "$tmp_file" "$config_path"
}

update_codex_theme
update_gemini_theme
update_claude_theme
