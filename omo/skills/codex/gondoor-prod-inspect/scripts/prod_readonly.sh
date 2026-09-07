#!/usr/bin/env bash
set -euo pipefail

HOST="${GONDOOR_PROD_HOST:-64.23.164.65}"
USER_NAME="${GONDOOR_PROD_USER:-root}"
KEY="${GONDOOR_PROD_KEY:-$HOME/.ssh/do_gondoor}"
TARGET="${USER_NAME}@${HOST}"

usage() {
  cat <<'EOF'
Usage: prod_readonly.sh <command> [args]

Read-only commands:
  status                    PM2 status and list
  logs [lines] [app]         bounded PM2 logs
  errors [lines] [app]       bounded PM2 error logs
  describe <app>             PM2 process details
  health                     uptime, memory, disk, PM2 status
  journal <unit> [lines]     bounded systemd logs

Environment overrides:
  GONDOOR_PROD_HOST, GONDOOR_PROD_USER, GONDOOR_PROD_KEY
EOF
}

die() {
  echo "error: $*" >&2
  exit 1
}

valid_count() {
  [[ "${1:-}" =~ ^[0-9]+$ ]] && (( "$1" >= 1 && "$1" <= 2000 ))
}

valid_token() {
  [[ "${1:-}" =~ ^[A-Za-z0-9._@:/-]+$ ]] && [[ "${1:0:1}" != "-" ]]
}

ssh_readonly() {
  ssh \
    -i "$KEY" \
    -o IdentitiesOnly=yes \
    -o BatchMode=yes \
    -o ConnectTimeout=10 \
    "$TARGET" \
    "$1"
}

command_name="${1:-}"
shift || true

case "$command_name" in
  status)
    ssh_readonly 'pm2 status'
    ;;
  logs)
    lines="${1:-200}"
    app="${2:-}"
    valid_count "$lines" || die "lines must be 1..2000"
    if [[ -n "$app" ]]; then
      valid_token "$app" || die "invalid app token"
      ssh_readonly "pm2 logs $app --lines $lines --nostream"
    else
      ssh_readonly "pm2 logs --lines $lines --nostream"
    fi
    ;;
  errors)
    lines="${1:-200}"
    app="${2:-}"
    valid_count "$lines" || die "lines must be 1..2000"
    if [[ -n "$app" ]]; then
      valid_token "$app" || die "invalid app token"
      ssh_readonly "pm2 logs $app --err --lines $lines --nostream"
    else
      ssh_readonly "pm2 logs --err --lines $lines --nostream"
    fi
    ;;
  describe)
    app="${1:-}"
    [[ -n "$app" ]] || die "describe requires app"
    valid_token "$app" || die "invalid app token"
    ssh_readonly "pm2 describe $app"
    ;;
  health)
    ssh_readonly 'uptime; free -h; df -h; pm2 status'
    ;;
  journal)
    unit="${1:-}"
    lines="${2:-200}"
    [[ -n "$unit" ]] || die "journal requires unit"
    valid_token "$unit" || die "invalid unit token"
    valid_count "$lines" || die "lines must be 1..2000"
    ssh_readonly "journalctl -u $unit -n $lines --no-pager"
    ;;
  ""|-h|--help|help)
    usage
    ;;
  *)
    usage >&2
    die "unknown command: $command_name"
    ;;
esac
