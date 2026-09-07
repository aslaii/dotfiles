#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'EOF'
Usage: local_pm2.sh <command> [args]

Local read-only commands:
  status                         PM2 status
  list                           PM2 list
  cwd [app]                      print cwd for app, default backend
  assert-cwd [app] [cwd]         require app cwd to match cwd, default backend $PWD
  describe <app>                 PM2 process details
  logs [lines] [app]             bounded PM2 logs
  errors [lines] [app]           bounded PM2 error logs
  health [port] [path]           local HTTP health check, default 3001 /health/live
  wait [app] [port] [seconds]    wait for PM2 app and health, default backend 3001 120

This helper is local-only. It never SSHes and never mutates PM2 state.
EOF
}

die() {
  echo "error: $*" >&2
  exit 1
}

valid_count() {
  [[ "${1:-}" =~ ^[0-9]+$ ]] && (( "$1" >= 1 && "$1" <= 2000 ))
}

valid_seconds() {
  [[ "${1:-}" =~ ^[0-9]+$ ]] && (( "$1" >= 1 && "$1" <= 1800 ))
}

valid_port() {
  [[ "${1:-}" =~ ^[0-9]+$ ]] && (( "$1" >= 1 && "$1" <= 65535 ))
}

valid_token() {
  [[ "${1:-}" =~ ^[A-Za-z0-9._@:/-]+$ ]] && [[ "${1:0:1}" != "-" ]]
}

pm2_json() {
  pm2 jlist
}

app_cwd() {
  local app="$1"
  valid_token "$app" || die "invalid app token"
  pm2_json | node -e '
const app = process.argv[1];
let input = "";
process.stdin.on("data", chunk => input += chunk);
process.stdin.on("end", () => {
  const list = JSON.parse(input || "[]");
  const matches = list.filter(item => item.name === app);
  if (matches.length === 0) {
    console.error(`error: pm2 app not found: ${app}`);
    process.exit(2);
  }
  for (const item of matches) {
    const env = item.pm2_env || {};
    console.log(`${item.name}\t${env.status || ""}\t${env.pm_cwd || ""}`);
  }
});
' "$app"
}

assert_cwd() {
  local app="$1"
  local expected="$2"
  valid_token "$app" || die "invalid app token"
  expected="$(cd "$expected" && pwd -P)"
  pm2_json | node -e '
const app = process.argv[1];
const expected = process.argv[2];
let input = "";
process.stdin.on("data", chunk => input += chunk);
process.stdin.on("end", () => {
  const list = JSON.parse(input || "[]");
  const matches = list.filter(item => item.name === app);
  if (matches.length === 0) {
    console.error(`error: pm2 app not found: ${app}`);
    process.exit(2);
  }
  const exact = matches.find(item => (item.pm2_env && item.pm2_env.pm_cwd) === expected);
  if (!exact) {
    const seen = matches.map(item => item.pm2_env && item.pm2_env.pm_cwd).filter(Boolean).join(", ");
    console.error(`error: ${app} cwd mismatch; expected ${expected}; saw ${seen || "none"}`);
    process.exit(1);
  }
  console.log(`${app}\t${exact.pm2_env.status || ""}\t${expected}`);
});
' "$app" "$expected"
}

app_online() {
  local app="$1"
  valid_token "$app" || return 1
  pm2_json | node -e '
const app = process.argv[1];
let input = "";
process.stdin.on("data", chunk => input += chunk);
process.stdin.on("end", () => {
  const list = JSON.parse(input || "[]");
  const online = list.some(item => item.name === app && item.pm2_env && item.pm2_env.status === "online");
  process.exit(online ? 0 : 1);
});
' "$app"
}

health_url() {
  local port="$1"
  local path="$2"
  valid_port "$port" || die "port must be 1..65535"
  [[ "$path" == /* ]] || die "path must start with /"
  printf 'http://127.0.0.1:%s%s\n' "$port" "$path"
}

health_check() {
  local port="${1:-3001}"
  local path="${2:-/health/live}"
  local url
  url="$(health_url "$port" "$path")"
  curl -fsS "$url"
  printf '\n'
}

command_name="${1:-}"
shift || true

case "$command_name" in
  status)
    pm2 status
    ;;
  list)
    pm2 list
    ;;
  cwd)
    app_cwd "${1:-backend}"
    ;;
  assert-cwd)
    assert_cwd "${1:-backend}" "${2:-$PWD}"
    ;;
  logs)
    lines="${1:-200}"
    app="${2:-}"
    valid_count "$lines" || die "lines must be 1..2000"
    if [[ -n "$app" ]]; then
      valid_token "$app" || die "invalid app token"
      pm2 logs "$app" --lines "$lines" --nostream
    else
      pm2 logs --lines "$lines" --nostream
    fi
    ;;
  errors)
    lines="${1:-200}"
    app="${2:-}"
    valid_count "$lines" || die "lines must be 1..2000"
    if [[ -n "$app" ]]; then
      valid_token "$app" || die "invalid app token"
      pm2 logs "$app" --err --lines "$lines" --nostream
    else
      pm2 logs --err --lines "$lines" --nostream
    fi
    ;;
  describe)
    app="${1:-}"
    [[ -n "$app" ]] || die "describe requires app"
    valid_token "$app" || die "invalid app token"
    pm2 describe "$app"
    ;;
  health)
    health_check "${1:-3001}" "${2:-/health/live}"
    ;;
  wait)
    app="${1:-backend}"
    port="${2:-3001}"
    timeout="${3:-120}"
    valid_token "$app" || die "invalid app token"
    valid_port "$port" || die "port must be 1..65535"
    valid_seconds "$timeout" || die "seconds must be 1..1800"
    deadline=$((SECONDS + timeout))
    until app_online "$app" && health_check "$port" >/dev/null 2>&1; do
      if (( SECONDS >= deadline )); then
        echo "error: timed out waiting for $app on port $port" >&2
        pm2 status >&2 || true
        pm2 logs "$app" --lines 80 --nostream >&2 || true
        exit 1
      fi
      sleep 2
    done
    echo "ok: $app online and http://127.0.0.1:$port/health/live responds"
    ;;
  ""|-h|--help|help)
    usage
    ;;
  *)
    usage >&2
    die "unknown command: $command_name"
    ;;
esac
