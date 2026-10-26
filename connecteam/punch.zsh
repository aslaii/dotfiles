#!/bin/zsh
# Connecteam time clock autopilot: drives the web Time Clock with agent-browser,
# scheduled by launchd. Every action checks the current clock state first, so
# reruns and manual phone punches are harmless.
#
#   punch.zsh login          one-time headed login (OTP); session is persisted
#   punch.zsh install        load the launchd agent (Mon-Fri at SCHEDULE times)
#   punch.zsh uninstall      unload it
#   punch.zsh status         print current state: idle | shift | break | login | denied
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
STATE_DIR=$HOME/.local/state/connecteam
MAX_LATE_MIN=20 # launchd replays missed slots on wake; older than this is skipped
PIN=(14.961239 120.759291) # punch location (home, Apalit); every punch reports exactly this
CHROME='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' # brew install --cask google-chrome
typeset -A SCHEDULE=(in 08:00 break 12:00 back 13:00 out 17:00)

STATE_JS='(() => {
  if (location.hash.includes("Login")) return "login";
  // Shift and break share the "End" button; the label above it differs:
  // "Work time on Shift" vs "<break name> - Unpaid".
  const end = document.querySelector("[data-testid=automation-clock-out-button]");
  if (end) {
    let card = end;
    while (card && !card.innerText.includes("Today\u0027s clock")) card = card.parentElement;
    const label = (card?.innerText ?? "").split("Today\u0027s clock")[1]?.split("\nEnd")[0] ?? "";
    return /break/i.test(label) ? "break" : "shift";
  }
  if (document.querySelector("[class*=clock-in-section-module__clockIn] button")) return "idle";
  if (performance.getEntriesByType("resource").some(r =>
    r.name.includes("/api/Creator/User/Current/") && [401, 403].includes(r.responseStatus))) return "denied";
  return "loading";
})()'
# Over CDP, on the Connecteam tab: send the User-Agent of normal (headed)
# Chrome, since headless Chrome reports "HeadlessChrome" while its brands and
# client hints are already the real Google Chrome ones; allow geolocation for
# the tab's browser context and pin it to PIN; reload so every request uses
# both; read both back from the page. Prints "pinned <lat>,<lng> <ua>" and stays
# connected, because Chrome drops overrides when the session detaches.
# (agent-browser's `set geo` targets a different context and gets denied, and
# its --user-agent flag empties the brands and Sec-CH-UA headers.)
PIN_JS='const [url, lat, lng] = process.argv.slice(1), w = new WebSocket(url), pending = {};
let id = 0, loaded;
const call = (method, params = {}, sessionId) => new Promise(r => {
  pending[++id] = r; w.send(JSON.stringify({id, method, params, sessionId})); });
const die = msg => { console.log("error " + msg); process.exit(1); };
const evaluate = async (s, expression) =>
  (await call("Runtime.evaluate", {expression, awaitPromise: true, returnByValue: true}, s)).result?.result?.value;
w.onmessage = e => {
  const m = JSON.parse(e.data);
  if (m.method === "Page.loadEventFired") loaded?.(); else pending[m.id]?.(m);
};
w.onerror = () => die("cdp connect");
w.onclose = () => process.exit(0); // browser closed at script exit
w.onopen = async () => {
  const t = (await call("Target.getTargets")).result.targetInfos
    .find(t => t.type === "page" && t.url.startsWith("https://app.connecteam.com/"));
  if (!t) die("no connecteam tab");
  const s = (await call("Target.attachToTarget", {targetId: t.targetId, flatten: true})).result.sessionId;
  const ua = await evaluate(s, `navigator.userAgentData.getHighEntropyValues(
    ["architecture", "bitness", "model", "platformVersion", "fullVersionList", "wow64"])
    .then(h => ({...h, userAgent: navigator.userAgent.replace("HeadlessChrome/", "Chrome/")}))`);
  if (!ua?.brands?.some(b => b.brand === "Google Chrome")) die("not Google Chrome: " + JSON.stringify(ua?.brands));
  const {userAgent, ...metadata} = ua;
  for (const [method, params, sid] of [
    ["Emulation.setUserAgentOverride", {userAgent, platform: "MacIntel", userAgentMetadata: metadata}, s],
    ["Browser.grantPermissions", {origin: "https://app.connecteam.com", permissions: ["geolocation"], browserContextId: t.browserContextId}],
    ["Emulation.setGeolocationOverride", {latitude: +lat, longitude: +lng, accuracy: 10}, s],
    ["Page.enable", {}, s],
  ]) if ((await call(method, params, sid)).error) die(method);
  const reloaded = new Promise(r => loaded = r);
  await call("Page.reload", {}, s);
  await reloaded;
  const pageUa = await evaluate(s, "navigator.userAgent");
  if (pageUa !== userAgent) die("page UA " + pageUa);
  const got = await evaluate(s, `new Promise(r => navigator.geolocation.getCurrentPosition(
    p => r(p.coords.latitude + "," + p.coords.longitude), e => r("error " + e.message), {timeout: 15000, maximumAge: 0}))`);
  if (got !== `${+lat},${+lng}`) die("page sees " + got);
  console.log("pinned " + got + " " + pageUa);
};'

log() { print -r -- "$(date '+%F %T') $*"; }
notify() { log "$1"; osascript -e "display notification \"$1\" with title \"Connecteam\"" 2>/dev/null; }
ab() {
  agent-browser --session $SESSION --restore --restore-save auto --executable-path "$CHROME" \
    --args --disable-blink-features=AutomationControlled "$@"
}

state() { ab eval "$STATE_JS" 2>/dev/null | tr -d '"'; }
wait_state() { ab wait --fn "$STATE_JS === \"$1\"" >/dev/null; }
# Starts the pin holder as a coprocess; it exits when the browser closes.
# Must run in the main shell (not $(...)) so the holder outlives the call.
pin_geo() {
  coproc $HOME/.bun/bin/bun -e "$PIN_JS" "$(ab get cdp-url 2>/dev/null | grep '^ws')" $PIN
  read -p -t 30 PIN_LINE
  [[ $PIN_LINE == pinned* ]]
}

# Clicks go through the DOM: right after a punch, a mid-animation container or
# the "Break summary" dialog overlaps the buttons and swallows pointer clicks.
press() { ab wait "$1" >/dev/null && ab eval "document.querySelector('$1').click()" >/dev/null; }
# Ending a break opens a "Break summary" dialog that must be approved.
APPROVE_JS='[...document.querySelectorAll("button")].find(b => b.innerText.trim() === "Approve break")'
approve_pending() { ab eval "$APPROVE_JS?.click()" >/dev/null; }
# The dialog animates in and can close on its own; click it if present, then
# require it to be gone.
approve_break() { ab wait 3000 >/dev/null; approve_pending; ab wait --fn "!$APPROVE_JS" >/dev/null; }

end_current() { press '.clock-out-button' && wait_state idle; }
end_break() { end_current && approve_break; }
start_shift() { press '[class*=clock-in-section-module__clockIn] button' && wait_state shift; }
start_break() {
  press '[data-testid=automation-start-manual-break-button]' &&
    press '.select-manual-break-inline-sidebar .tag-item' &&
    wait_state break
}

fail() {
  local shot=$LOG_DIR/connecteam-$(date +%Y%m%d-%H%M%S).png
  ab screenshot "$shot" >/dev/null 2>&1
  notify "FAILED: $1 (screenshot: $shot)"
  exit 1
}

open_clock() {
  local attempt
  for attempt in 1 2 3; do
    ab open "$URL" >/dev/null && return 0
    log "navigation: attempt $attempt/3 failed"
    ab close >/dev/null 2>&1
    (( attempt < 3 )) && sleep $(( attempt * 5 ))
  done
  return 1
}

punch() {
  trap 'ab close >/dev/null 2>&1' EXIT
  local action=$1 s
  open_clock || fail "$action: cannot open Connecteam after 3 attempts"
  pin_geo || fail "$action: location/user agent not set (${PIN_LINE:-no reply})"
  log "$action: $PIN_LINE"
  ab wait --fn "$STATE_JS !== \"loading\"" >/dev/null || fail "$action: time clock did not load"
  s=$(state)
  [[ $s == login ]] && fail "$action: logged out, run: punch.zsh login"
  [[ $s == denied ]] && fail "$action: Connecteam denied API access (401/403); run: punch.zsh login"
  approve_pending # a break summary left open by a manual or failed punch

  case $action:$s in
    in:shift | break:break | back:shift | out:idle) log "$action: already $s" ;;
    in:idle) start_shift || fail "in: start shift" ;;
    break:shift) { end_current && start_break; } || fail "break: end shift / start break" ;;
    break:idle) start_break || fail "break: start break" ;; # shift already ended, e.g. a failed earlier run
    back:idle) start_shift || fail "back: start shift" ;; # break already ended, e.g. a failed earlier run
    back:break) { end_break && start_shift; } || fail "back: end break / start shift" ;;
    out:shift) end_current || fail "out: end shift" ;;
    out:break) end_break || fail "out: end break" ;;
    *) fail "$action: unexpected state '$s'" ;;
  esac
  s=$(state)
  local expected=shift
  [[ $action == break ]] && expected=break
  [[ $action == out ]] && expected=idle
  [[ $s == $expected ]] || fail "$action: expected $expected, got '$s'"
  log "$action: now $s"
}

auto() {
  local today=$(date +%F) now action hm
  (( $(date +%u) <= 5 )) || { log "auto: weekend, skip"; return; }
  [[ -f $SKIP_FILE ]] && grep -qx "$today" "$SKIP_FILE" && { log "auto: $today is off, skip"; return; }
  now=$(( $(date +%H) * 60 + $(date +%M) ))
  for action hm in ${(kv)SCHEDULE}; do
    local due=$(( ${hm%:*} * 60 + ${hm#*:} ))
    if (( now >= due && now - due < MAX_LATE_MIN )); then
      [[ -f $STATE_DIR/$today-$action ]] && return 0
      mkdir -p "$STATE_DIR" || return 1
      punch $action || return $?
      touch "$STATE_DIR/$today-$action"
      return $?
    fi
  done
  return 0
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
<key>StartInterval</key><integer>60</integer>
<key>StandardOutPath</key><string>$LOG_DIR/connecteam.log</string>
<key>StandardErrorPath</key><string>$LOG_DIR/connecteam.log</string>
</dict></plist>
EOF
  launchctl bootout gui/$UID/$LABEL 2>/dev/null
  launchctl bootstrap gui/$UID "$PLIST" && log "installed $PLIST, log: $LOG_DIR/connecteam.log"
}

[[ $ZSH_EVAL_CONTEXT == toplevel ]] || return 0

case ${1:-} in
  in | break | back | out) punch $1 ;;
  auto) auto ;;
  status) trap 'ab close >/dev/null 2>&1' EXIT; open_clock && ab wait --fn "$STATE_JS !== \"loading\"" >/dev/null && state ;;
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
