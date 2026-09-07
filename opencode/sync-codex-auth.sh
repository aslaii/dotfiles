#!/bin/sh
# Point opencode's openai provider at whatever ChatGPT account Codex is logged in as.
set -eu
src="${CODEX_HOME:-$HOME/.codex}/auth.json"
dst="$HOME/.local/share/opencode/auth.json"

exp=$(jq -r '.tokens.access_token | split(".")[1] | gsub("-";"+") | gsub("_";"/") | @base64d | fromjson | .exp' "$src")

cp "$dst" "$dst.bak"
jq --slurpfile s "$src" --argjson exp "$((exp * 1000))" '
  .openai = {
    type: "oauth",
    access: $s[0].tokens.access_token,
    refresh: $s[0].tokens.refresh_token,
    accountId: $s[0].tokens.account_id,
    expires: $exp
  }' "$dst" > "$dst.tmp"
mv "$dst.tmp" "$dst"
chmod 600 "$dst"
echo "opencode openai <- codex account $(jq -r .tokens.account_id "$src")"
