#!/bin/zsh
# No real browser, punches, notifications, or launchd changes.
set -eu
source "${0:A:h}/punch.zsh"
scratch=$(mktemp -d)
trap 'rm -rf "$scratch"' EXIT
STATE_DIR=$scratch/state
SKIP_FILE=$scratch/skip-days
LOG_DIR=$scratch
log() { print -r -- "$*"; }
notify() { log "$*"; }
sleep() { :; }

typeset -i opens=0 failures=2
ab() {
  if [[ $1 == open ]]; then
    (( opens += 1 ))
    (( opens > failures ))
  else
    return 0
  fi
}
open_clock
[[ $opens == 3 ]] || { print -u2 'FAIL: navigation must recover after two connection failures'; exit 1; }
opens=0 failures=99
if open_clock; then
  print -u2 'FAIL: permanent connection failure must return nonzero'; exit 1
fi
[[ $opens == 3 ]]
print 'PASS: navigation retries recover and stop after three attempts'

functions[real_punch]=$functions[punch]
open_clock() { return 0; }
pin_geo() { PIN_LINE='test only'; }
state() { print "$clock_state"; }
approve_pending() { :; }
end_break() { clock_state=idle; }
start_shift() { clock_state=shift; }
clock_state=denied
if ( real_punch back ); then
  print -u2 'FAIL: denied API access must not be treated as a successful punch'; exit 1
fi
clock_state=break
( real_punch back )
clock_state=idle
( real_punch back )
start_shift() { return 0; }
if ( real_punch back ); then
  print -u2 'FAIL: a punch must not succeed without the expected final state'; exit 1
fi
print 'PASS: partial break recovery succeeds; unconfirmed transitions fail'

typeset -i hour=13 minute=0 weekday=1 punches=0 broken=1
date() {
  case $1 in
    +%F) print 2026-10-26 ;; +%u) print $weekday ;;
    +%H) print $hour ;; +%M) print $minute ;; +%H:%M) print "$hour:$minute" ;;
    *) command date "$@" ;;
  esac
}
punch() { (( punches += 1 )); (( broken == 0 )); }
if auto; then
  print -u2 'FAIL: failed punch must remain retryable'; exit 1
fi
[[ ! -f $STATE_DIR/2026-10-26-back ]]
minute=1 broken=0
auto
[[ $punches == 2 && -f $STATE_DIR/2026-10-26-back ]]
auto
[[ $punches == 2 ]] || { print -u2 'FAIL: completed punches must not repeat'; exit 1; }
print 'PASS: next scheduler tick recovers a failed punch and deduplicates success'

minute=20
rm "$STATE_DIR/2026-10-26-back"
auto
[[ $punches == 2 ]]
minute=1 weekday=6
auto
[[ $punches == 2 ]]
weekday=1
print 2026-10-26 > "$SKIP_FILE"
auto
[[ $punches == 2 ]]
rm "$SKIP_FILE"
hour=14
auto
[[ $punches == 2 ]]
print 'PASS: late slots, weekends, skipped days, and times outside slots do not punch'

PLIST=$scratch/agent.plist
launchctl() { return 0; }
install
/usr/bin/plutil -lint "$PLIST"
[[ $(/usr/libexec/PlistBuddy -c 'Print :StartInterval' "$PLIST") == 60 ]]
print 'PASS: installed launchd configuration checks every minute'
