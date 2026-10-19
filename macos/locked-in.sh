#!/usr/bin/env bash
set -euo pipefail

BG_HEX="010515"
HIGHLIGHT="0.066667 0.717647 1.000000 Other"
HERDR_THEME="HaX0R Blue"
BROWSER="Dia"

state="$HOME/.local/state/locked-in"
herdr_cfg="$HOME/.config/herdr/config-gpui.local.toml"
wp_store="$HOME/Library/Application Support/com.apple.wallpaper/Store/Index.plist"
bg_png="$state/bg-$BG_HEX.png"

toggle_dark_reader() {
  pgrep -xq "$BROWSER" || return 0
  compgen -G "$HOME/Library/Application Support/$BROWSER/User Data/*/Extensions/eimadpbcbfnmbkopoojfekhnkhdbieeh" >/dev/null || return 0
  osascript -e "tell application \"$BROWSER\" to activate" \
    -e 'delay 0.3' \
    -e 'tell application "System Events" to keystroke "d" using {option down, shift down}' \
    || echo "Dark Reader toggle failed: grant Accessibility to your terminal in System Settings > Privacy & Security." >&2
}

on() {
  mkdir -p "$state"
  cp "$wp_store" "$state/Index.plist"
  grep -m1 '^theme = ' "$herdr_cfg" >"$state/herdr-theme" || true
  defaults read -g AppleHighlightColor >"$state/highlight" 2>/dev/null || rm -f "$state/highlight"

  [ -f "$bg_png" ] || python3 - "$bg_png" "$BG_HEX" <<'PY'
import struct, sys, zlib
path, hexc = sys.argv[1], sys.argv[2]
w, h = 64, 64
row = b"\x00" + bytes.fromhex(hexc) * w
def chunk(t, d): return struct.pack(">I", len(d)) + t + d + struct.pack(">I", zlib.crc32(t + d))
png = b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", struct.pack(">IIBBBBB", w, h, 8, 2, 0, 0, 0)) \
    + chunk(b"IDAT", zlib.compress(row * h)) + chunk(b"IEND", b"")
open(path, "wb").write(png)
PY
  osascript -e "tell application \"System Events\" to tell every desktop to set picture to POSIX file \"$bg_png\""

  sed -i '' "s/^theme = .*/theme = \"$HERDR_THEME\"/" "$herdr_cfg"
  defaults write -g AppleHighlightColor -string "$HIGHLIGHT"
  toggle_dark_reader
  touch "$state/on"
  echo "locked in"
}

off() {
  cp "$state/Index.plist" "$wp_store"
  killall WallpaperAgent 2>/dev/null || true

  if [ -s "$state/herdr-theme" ]; then
    line=$(sed 's/[&|]/\\&/g' "$state/herdr-theme")
    sed -i '' "s|^theme = .*|$line|" "$herdr_cfg"
  fi
  if [ -f "$state/highlight" ]; then
    defaults write -g AppleHighlightColor -string "$(cat "$state/highlight")"
  else
    defaults delete -g AppleHighlightColor 2>/dev/null || true
  fi
  toggle_dark_reader
  rm -f "$state/on"
  echo "unlocked"
}

case "${1:-toggle}" in
  on) on ;;
  off) off ;;
  toggle) if [ -f "$state/on" ]; then off; else on; fi ;;
  *) echo "usage: $0 [on|off|toggle]" >&2; exit 2 ;;
esac
