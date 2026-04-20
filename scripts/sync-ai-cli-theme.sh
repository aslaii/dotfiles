#!/usr/bin/env bash

set -euo pipefail

if [[ "$(defaults read -g AppleInterfaceStyle 2>/dev/null || true)" == "Dark" ]]; then
	codex_theme="catppuccin-mocha"
	gemini_theme="Catppuccin Mocha"
	claude_theme="dark"
	gsd_theme="catppuccin-mocha"
	opencode_mode="dark"
else
	codex_theme="catppuccin-latte"
	gemini_theme="Catppuccin Latte"
	claude_theme="light"
	gsd_theme="catppuccin-latte"
	opencode_mode="light"
fi

script_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
repo_root="$(cd -- "${script_dir}/.." && pwd)"

update_codex_theme() {
	local config_path="$HOME/.codex/config.toml"

	if [[ ! -f "$config_path" ]]; then
		return
	fi

	# BSD sed cannot edit symlinks in place — resolve to the real path first
	# so dotfiles symlinks (e.g. ~/.codex/config.toml -> dotfiles/codex/config.toml)
	# keep working without breaking the link.
	if [[ -L "$config_path" ]]; then
		config_path="$(python3 -c 'import os, sys; print(os.path.realpath(sys.argv[1]))' "$config_path")"
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

install_gsd_themes() {
	local theme_source_dir="${repo_root}/gsd/themes"
	local theme_target_dir="$HOME/.gsd/agent/themes"

	if [[ ! -d "$theme_source_dir" ]]; then
		return
	fi

	mkdir -p "$theme_target_dir"
	cp -f "$theme_source_dir"/catppuccin-*.json "$theme_target_dir"/
}

update_gsd_theme() {
	local config_path="$HOME/.gsd/agent/settings.json"
	local tmp_file

	if [[ ! -f "$config_path" ]] || ! command -v jq >/dev/null 2>&1; then
		return
	fi

	tmp_file="$(mktemp)"
	jq \
		--arg theme "$gsd_theme" \
		'.theme = $theme' \
		"$config_path" >"$tmp_file"
	mv "$tmp_file" "$config_path"
}

update_opencode_theme() {
	local config_path="$HOME/.local/state/opencode/kv.json"
	local tmp_file

	if [[ ! -f "$config_path" ]] || ! command -v jq >/dev/null 2>&1; then
		return
	fi

	tmp_file="$(mktemp)"
	jq \
		--arg mode "$opencode_mode" \
		'.theme_mode = $mode' \
		"$config_path" >"$tmp_file"
	mv "$tmp_file" "$config_path"
}

update_codex_theme
update_gemini_theme
update_claude_theme
install_gsd_themes
update_gsd_theme
update_opencode_theme
