#!/usr/bin/env bash

set -euo pipefail

MARKETPLACE="${PSTACK_MARKETPLACE:-$HOME/.claude/plugins/marketplaces/cursor-plugins}"
DOTFILES="${DOTFILES_DIR:-$HOME/dotfiles}"
DEST="$DOTFILES/omp/agent/skills/pstack"
LINK_ROOT="${OPENCODE_SKILLS_DIR:-$HOME/.config/opencode/skills}"
SRC="$MARKETPLACE/pstack/skills"

if [ "${PSTACK_SKIP_PULL:-0}" != "1" ]; then
  if [ -d "$MARKETPLACE/.git" ]; then
    git -C "$MARKETPLACE" pull --ff-only
  else
    echo "warning: $MARKETPLACE is not a git checkout; skipping pull" >&2
  fi
fi

if [ ! -d "$SRC" ]; then
  echo "error: pstack skills not found at $SRC" >&2
  exit 1
fi

mkdir -p "$DEST" "$LINK_ROOT"
rsync -a --delete "$SRC/" "$DEST/"

CURSOR_RULE="~/.cursor/rules/pstack-models.mdc"
OPENCODE_RULE="~/.config/opencode/instructions/pstack-models.md"
grep -rlF "$CURSOR_RULE" "$DEST" | while IFS= read -r file; do
  perl -pi -e "s{\Q$CURSOR_RULE\E}{$OPENCODE_RULE}g" "$file"
done

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

version="$(python3 -c 'import json,sys;print(json.load(open(sys.argv[1]))["version"])' "$MARKETPLACE/pstack/plugin.json" 2>/dev/null || echo unknown)"
count="$(find "$DEST" -mindepth 1 -maxdepth 1 -type d | wc -l | tr -d ' ')"
echo "pstack $version: $count skills synced to $DEST and linked in $LINK_ROOT"
