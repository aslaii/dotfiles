#!/usr/bin/env bash
# gondoor-link-env — symlink .env files from the canonical gondoor-mono checkout
# into the current workspace copy.
#
# Usage:
#   gondoor-link-env            # run from anywhere inside a gondoor-mono workspace
#   gondoor-link-env <target>   # explicit target workspace root
#
# Source is always: ~/work/mobii/gondoor-mono
set -euo pipefail

SOURCE_ROOT="${GONDOOR_SOURCE:-$HOME/work/mobii/gondoor-mono}"

die() { echo "error: $*" >&2; exit 1; }

[[ -d "$SOURCE_ROOT" ]] || die "source repo not found: $SOURCE_ROOT"

# Resolve target: explicit arg, or walk up from CWD to find gondoor-mono root.
if [[ $# -ge 1 ]]; then
  TARGET_ROOT="$1"
else
  TARGET_ROOT="$PWD"
  while [[ "$TARGET_ROOT" != "/" ]]; do
    if [[ -d "$TARGET_ROOT/apps" && "$(basename "$TARGET_ROOT")" == *gondoor-mono* ]]; then
      break
    fi
    TARGET_ROOT="$(dirname "$TARGET_ROOT")"
  done
  [[ "$TARGET_ROOT" != "/" ]] || die "not inside a gondoor-mono workspace (cd into one or pass target)"
fi

[[ -d "$TARGET_ROOT" ]] || die "target not found: $TARGET_ROOT"
[[ "$(cd "$TARGET_ROOT" && pwd)" != "$(cd "$SOURCE_ROOT" && pwd)" ]] || die "target is the source repo; refusing"

echo "source: $SOURCE_ROOT"
echo "target: $TARGET_ROOT"
echo

linked=0
# Find every .env* file under source (apps/*, packages/*, root) excluding node_modules/.git.
while IFS= read -r src; do
  rel="${src#"$SOURCE_ROOT"/}"
  dest="$TARGET_ROOT/$rel"
  mkdir -p "$(dirname "$dest")"
  ln -sfn "$src" "$dest"
  echo "  linked $rel"
  linked=$((linked + 1))
done < <(find "$SOURCE_ROOT" \
  \( -path '*/node_modules' -o -path '*/.git' -o -path '*/.next' -o -path '*/dist' -o -path '*/build' -o -path '*/.claude/worktrees' -o -path '*/.planning' \) -prune \
  -o -type f \( -name '.env' -o -name '.env.*' \) -print)

echo
echo "done — $linked file(s) symlinked"
