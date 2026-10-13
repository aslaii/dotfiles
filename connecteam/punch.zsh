#!/bin/zsh
# Connecteam time clock autopilot: drives the web Time Clock with agent-browser,
# scheduled by launchd. Every action checks the current clock state first, so
# reruns and manual phone punches are harmless.
#
#   punch.zsh login          one-time headed login (OTP); session is persisted
#   punch.zsh install        load the launchd agent (Mon-Fri at SCHEDULE times)
#   punch.zsh uninstall      unload it
#   punch.zsh status         print current state: idle | shift | break
#   punch.zsh in|break|back|out   perform one transition now
#   punch.zsh off [DATE]     skip a day (YYYY-MM-DD, default today)
#   punch.zsh auto           what launchd runs: picks the slot due right now
set -u
export PATH=/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin

SCRIPT=${0:A} # resolve here: inside functions $0 is the function name
URL='https://app.connecteam.com/#/punchclock/punchclock/16733037/17553390/19822940'
SESSION=connecteam
LABEL=com.aslaii.connecteam
PLIST=$HOME/Library/LaunchAgents/$LABEL.plist
LOG_DIR=$HOME/Library/Logs
SKIP_FILE=$HOME/.config/connecteam/skip-days
MAX_LATE_MIN=20 # launchd replays missed slots on wake; older than this is skipped
typeset -A SCHEDULE=(in 08:00 break 12:00 back 13:00 out 17:00)

STATE_JS='(() => {
  if (location.hash.includes("Login")) return "login";
  if (document.querySelector("[data-testid=automation-clock-out-button]")) return "shift";
  if (document.querySelector(".clock-out-button")) return "break";
  if (document.querySelector("[class*=clock-in-section-module__clockIn] button")) return "idle";
  return "loading";
})()'

log() { print -r -- "$(date '+%F %T') $*"; }
notify() { log "$1"; osascript -e "display notification \"$1\" with title \"Connecteam\"" 2>/dev/null; }
ab() { agent-browser --session $SESSION --restore --restore-save auto "$@"; }

state() { ab eval "$STATE_JS" 2>/dev/null | tr -d '"'; }
wait_state() { ab wait --fn "$STATE_JS === \"$1\"" >/dev/null; }

end_current() { ab click '.clock-out-button' >/dev/null && wait_state idle; }
start_shift() { ab click '[class*=clock-in-section-module__clockIn] button' >/dev/null && wait_state shift; }
start_break() {
  ab click '[data-testid=automation-start-manual-break-button]' >/dev/null &&
    ab wait '.select-manual-break-inline-sidebar .tag-item' >/dev/null &&
    ab find first '.select-manual-break-inline-sidebar .tag-item' click >/dev/null &&
    wait_state break
}

fail() {
  local shot=$LOG_DIR/connecteam-$(date +%Y%m%d-%H%M%S).png
  ab screenshot "$shot" >/dev/null 2>&1
  notify "FAILED: $1 (screenshot: $shot)"
  exit 1
}

punch() {
  local action=$1 s
  ab open "$URL" >/dev/null || fail "$action: cannot open Connecteam"
  ab wait --fn "$STATE_JS !== \"loading\"" >/dev/null || fail "$action: time clock did not load"
  s=$(state)
  [[ $s == login ]] && fail "$action: logged out, run: punch.zsh login"

  case $action:$s in
    in:shift | break:break | back:shift | out:idle) log "$action: already $s" ;;
    in:idle) start_shift || fail "in: start shift" ;;
    break:shift) { end_current && start_break; } || fail "break: end shift / start break" ;;
    back:break) { end_current && start_shift; } || fail "back: end break / start shift" ;;
    out:shift | out:break) end_current || fail "out: end $s" ;;
    *) fail "$action: unexpected state '$s'" ;;
  esac
  log "$action: now $(state)"
}

auto() {
  local today=$(date +%F) now action hm
  (( $(date +%u) <= 5 )) || { log "auto: weekend, skip"; return; }
  [[ -f $SKIP_FILE ]] && grep -qx "$today" "$SKIP_FILE" && { log "auto: $today is off, skip"; return; }
  now=$(( $(date +%H) * 60 + $(date +%M) ))
  for action hm in ${(kv)SCHEDULE}; do
    local due=$(( ${hm%:*} * 60 + ${hm#*:} ))
    if (( now >= due && now - due < MAX_LATE_MIN )); then
      punch $action
      return
    fi
  done
  notify "auto: no slot due at $(date +%H:%M) (Mac asleep at punch time?), skipped"
}

install() {
  local intervals='' action hm day
  for action hm in ${(kv)SCHEDULE}; do
    for day in 1 2 3 4 5; do
      intervals+="<dict><key>Weekday</key><integer>$day</integer><key>Hour</key><integer>$(( ${hm%:*} ))</integer><key>Minute</key><integer>$(( ${hm#*:} ))</integer></dict>"
    done
  done
  mkdir -p "${PLIST:h}" "$LOG_DIR"
  cat >"$PLIST" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
<key>Label</key><string>$LABEL</string>
<key>ProgramArguments</key><array><string>/bin/zsh</string><string>$SCRIPT</string><string>auto</string></array>
<key>StartCalendarInterval</key><array>$intervals</array>
<key>StandardOutPath</key><string>$LOG_DIR/connecteam.log</string>
<key>StandardErrorPath</key><string>$LOG_DIR/connecteam.log</string>
</dict></plist>
EOF
  launchctl bootout gui/$UID/$LABEL 2>/dev/null
  launchctl bootstrap gui/$UID "$PLIST" && log "installed $PLIST, log: $LOG_DIR/connecteam.log"
}

case ${1:-} in
  in | break | back | out) trap 'ab close >/dev/null 2>&1' EXIT; punch $1 ;;
  auto) trap 'ab close >/dev/null 2>&1' EXIT; auto ;;
  status) trap 'ab close >/dev/null 2>&1' EXIT; ab open "$URL" >/dev/null && ab wait --fn "$STATE_JS !== \"loading\"" >/dev/null; state ;;
  login)
    agent-browser --session $SESSION close >/dev/null 2>&1
    ab --headed open "$URL" >/dev/null
    read '?Log in in the browser window, then press Enter... '
    ab close >/dev/null ;;
  off) mkdir -p "${SKIP_FILE:h}" && print -r -- "${2:-$(date +%F)}" >>"$SKIP_FILE" && log "off: ${2:-$(date +%F)}" ;;
  install) install ;;
  uninstall) launchctl bootout gui/$UID/$LABEL; rm -f "$PLIST" ;;
  *) sed -n '2,13p' "$0"; exit 2 ;;
esac
