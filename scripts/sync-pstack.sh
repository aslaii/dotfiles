#!/usr/bin/env bash
# Vendor upstream pstack for OpenCode and re-apply the OpenCode ports from opencode/pstack-ports.patch.
#
#   sync-pstack.sh               update to the marketplace's pstack. If a port no longer applies,
#                                exit 2 and leave the vendored tree untouched.
#   sync-pstack.sh --force       update anyway; hunks that don't apply go to opencode/pstack-rejects/
#                                to port by hand, then run --save-ports.
#   sync-pstack.sh --save-ports  record the current edits in the vendored tree and agents as the ports patch.

set -euo pipefail

MARKETPLACE="${PSTACK_MARKETPLACE:-$HOME/.claude/plugins/marketplaces/cursor-plugins}"
DOTFILES="${DOTFILES_DIR:-$HOME/dotfiles}"
DEST="$DOTFILES/omp/agent/skills/pstack"
AGENTS_DEST="$DOTFILES/opencode/agents"
AGENTS=(poteto-agent comment-sicko)
PORTS="$DOTFILES/opencode/pstack-ports.patch"
REJECTS="$DOTFILES/opencode/pstack-rejects"
VERSION_FILE="$DEST/.pstack-version"
LINK_ROOT="${OPENCODE_SKILLS_DIR:-$HOME/.config/opencode/skills}"
MODE="${1:-sync}"

if [ "${PSTACK_SKIP_PULL:-0}" != "1" ] && [ "$MODE" != "--save-ports" ]; then
  if [ -d "$MARKETPLACE/.git" ]; then
    git -C "$MARKETPLACE" pull --ff-only
  else
    echo "warning: $MARKETPLACE is not a git checkout; skipping pull" >&2
  fi
fi

if [ ! -d "$MARKETPLACE/pstack/skills" ]; then
  echo "error: pstack skills not found at $MARKETPLACE/pstack/skills" >&2
  exit 1
fi

version="$(python3 -c 'import json,sys;print(json.load(open(sys.argv[1]))["version"])' "$MARKETPLACE/pstack/plugin.json")"
vendored="$(cat "$VERSION_FILE" 2>/dev/null || echo none)"
work="$(mktemp -d)"
trap 'rm -rf "$work"' EXIT

stage_upstream() {
  local dir="$1"
  mkdir -p "$dir/agents"
  rsync -a "$MARKETPLACE/pstack/skills/" "$dir/skills/"
  for agent in "${AGENTS[@]}"; do
    cp "$MARKETPLACE/pstack/agents/$agent.md" "$dir/agents/"
  done
  local cursor_rule="~/.cursor/rules/pstack-models.mdc"
  local opencode_rule="~/.config/opencode/instructions/pstack-models.md"
  grep -rlF "$cursor_rule" "$dir" | while IFS= read -r file; do
    perl -pi -e "s{\Q$cursor_rule\E}{$opencode_rule}g" "$file"
  done
}

if [ "$MODE" = "--save-ports" ]; then
  if [ "$vendored" != "$version" ]; then
    echo "error: the vendored tree is pstack $vendored but the marketplace has $version; sync first" >&2
    exit 1
  fi
  stage_upstream "$work/a"
  mkdir -p "$work/b/agents"
  rsync -a --exclude .pstack-version "$DEST/" "$work/b/skills/"
  for agent in "${AGENTS[@]}"; do
    cp "$AGENTS_DEST/$agent.md" "$work/b/agents/"
  done
  set +e
  (cd "$work" && diff -ruN a b) > "$PORTS"
  diff_status=$?
  set -e
  # diff exits 1 when the trees differ, which is the normal case here.
  if [ "$diff_status" -gt 1 ]; then
    echo "error: diff failed while saving ports" >&2
    exit 1
  fi
  rm -rf "$REJECTS"
  echo "saved $(grep -c '^+++ ' "$PORTS") ported files for pstack $version to $PORTS"
  exit 0
fi

stage_upstream "$work/tree"
if ! (cd "$work/tree" && patch -p1 --forward --batch --no-backup-if-mismatch < "$PORTS") > "$work/patch.log" 2>&1; then
  rejected="$(cd "$work/tree" && find . -name '*.rej' | sed 's|^\./||' | sort)"
  if [ "$MODE" != "--force" ]; then
    echo "error: OpenCode ports no longer apply cleanly to pstack $version. OpenCode stays on pstack $vendored." >&2
    echo "Rejected: $(echo "$rejected" | tr '\n' ' ')" >&2
    echo "Run $0 --force to update and collect the rejects in $REJECTS." >&2
    exit 2
  fi
  rm -rf "$REJECTS"
  mkdir -p "$REJECTS"
  (cd "$work/tree" && find . -name '*.rej' -print0 | xargs -0 -I{} rsync -R {} "$REJECTS/")
  find "$work/tree" -name '*.rej' -delete
  echo "warning: these hunks did not apply; port them by hand, then run $0 --save-ports:" >&2
  echo "$rejected" | sed "s|^|  $REJECTS/|" >&2
fi

mkdir -p "$DEST" "$LINK_ROOT" "$AGENTS_DEST"
rsync -a --delete "$work/tree/skills/" "$DEST/"
for agent in "${AGENTS[@]}"; do
  cp "$work/tree/agents/$agent.md" "$AGENTS_DEST/$agent.md"
done
echo "$version" > "$VERSION_FILE"

for dir in "$DEST"/*/; do
  id="$(basename "$dir")"
  ln -sfn "${dir%/}" "$LINK_ROOT/$id"
done

for link in "$LINK_ROOT"/*; do
  if [ -L "$link" ] && [ ! -e "$link" ]; then
    target="$(readlink "$link")"
    case "$target" in
      "$DEST"/*) rm "$link" ;;
    esac
  fi
done

count="$(find "$DEST" -mindepth 1 -maxdepth 1 -type d | wc -l | tr -d ' ')"
echo "pstack $version: $count skills synced to $DEST and linked in $LINK_ROOT (was $vendored)"
