#!/usr/bin/env bash

set -euo pipefail

usage() {
  cat <<'EOF'
Usage: create-pr.sh [--dry-run] [additional context...]

Options:
  --dry-run   Generate and print title/body only, do not create PR.
  -h, --help  Show this help.
EOF
}

require_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Missing required command: $1" >&2
    exit 1
  fi
}

dry_run=false
extra_context=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --dry-run)
      dry_run=true
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      extra_context="${extra_context}${extra_context:+ }$1"
      shift
      ;;
  esac
done

require_cmd git
require_cmd codex
require_cmd jq
require_cmd rg
if [[ "$dry_run" != true ]]; then
  require_cmd gh
fi

if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  echo "Not inside a git repository." >&2
  exit 1
fi

branch="$(git branch --show-current)"
if [[ -z "$branch" ]]; then
  echo "Unable to determine current branch." >&2
  exit 1
fi

if [[ "$branch" == "staging" ]]; then
  echo "Current branch is 'staging'. Create/switch to a feature branch first." >&2
  exit 1
fi

if git diff --staged --quiet; then
  echo "No staged changes found. Stage changes before creating a PR." >&2
  exit 1
fi

schema_file="$(mktemp)"
output_file="$(mktemp)"
prompt_file="$(mktemp)"

cleanup() {
  rm -f "$schema_file" "$output_file" "$prompt_file"
}
trap cleanup EXIT

cat >"$schema_file" <<'JSON'
{
  "type": "object",
  "required": ["title", "body"],
  "additionalProperties": false,
  "properties": {
    "title": {
      "type": "string",
      "minLength": 1
    },
    "body": {
      "type": "string",
      "minLength": 1
    }
  }
}
JSON

staged_diff="$(git diff --staged)"

cat >"$prompt_file" <<EOF
Generate a pull request title and body from the staged diff.

Hard requirements:
- Return valid JSON matching the output schema only.
- Title format: [type] Short description
- Allowed types: feature, fix, refactor, chore, hotfix
- Body must use exactly this structure:
  ## Summary

  ## Changes
  - Added:
  - Updated:
  - Removed:

  ## Reason

  ## Testing
  - [ ] Unit tests added/updated
  - [ ] Manual testing steps: ...

  ## Screenshots (if UI)
- Never include any AI attribution text.
- Keep content concise and specific to this diff.

Current branch: ${branch}
Additional user context: ${extra_context:-"(none)"}

Staged diff:
\`\`\`diff
${staged_diff}
\`\`\`
EOF

codex exec \
  --sandbox read-only \
  --output-schema "$schema_file" \
  --output-last-message "$output_file" \
  - <"$prompt_file"

title="$(jq -r '.title' "$output_file")"
body="$(jq -r '.body' "$output_file")"

if ! [[ "$title" =~ ^\[(feature|fix|refactor|chore|hotfix)\]\  ]]; then
  echo "Generated title does not match required format: $title" >&2
  exit 1
fi

if printf '%s\n%s\n' "$title" "$body" | rg -n "Generated with Claude Code|Co-Authored-By: Claude|Generated with|Co-Authored-By:.*(Claude|Codex|AI)" -S >/dev/null; then
  echo "Generated content includes forbidden AI attribution text." >&2
  exit 1
fi

printf '\nProposed PR Title:\n%s\n' "$title"
printf '\nProposed PR Body:\n%s\n' "$body"

if [[ "$dry_run" == true ]]; then
  exit 0
fi

printf '\nCreate PR now with gh? [y/N]: '
read -r answer
if [[ ! "$answer" =~ ^[Yy]$ ]]; then
  echo "Cancelled."
  exit 0
fi

gh pr create --title "$title" --body "$body"
