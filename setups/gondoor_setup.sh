#!/usr/bin/env bash

set -e

# shellcheck source=./functions.sh
source "$(dirname "$0")/functions.sh"

SESSION_NAME="Gondoor"
PROJECT_ROOT="${GONDOOR_PROJECT_ROOT:-$HOME/work/mobii/gondoor-mono}"
FRONTEND_DIR="$PROJECT_ROOT/gondoor"
ADMIN_DIR="$PROJECT_ROOT/gondoor-admin"
BACKEND_DIR="$PROJECT_ROOT/gondoor-be"
BACKEND_SERVER_DIR="$BACKEND_DIR/server"
CLI_PROXY_DIR="$BACKEND_DIR/cli-proxy-api"
AI_TOOL="codex"
AI_TOOL_LABEL="Codex"

RESET_SESSION=false
STOP_WORKSPACE=false

print_help() {
  cat <<EOF
Usage: $(basename "$0") [--reset] [--stop] [--root PATH] [--ai TOOL]

Starts the Gondoor tmux workspace:
- SERVERS window runs shared infrastructure, frontend, backend, and admin
- FE window opens gondoor
- BE window opens Gondoor-BE/server
- ADMIN window opens gondoor-admin
- AI window opens FE, BE, and ADMIN side by side in the selected AI CLI
- MOBII-AI window opens the root mobii directory in the selected AI CLI

Options:
- --reset  Rebuild the tmux session and restart app ports
- --stop   Stop the tmux session, shared Supabase stack, and CLI proxy Docker service
- --ai     Choose the AI CLI to launch in the AI window: codex, claude, or gemini
- --codex  Shortcut for --ai codex
- --claude Shortcut for --ai claude
- --gemini Shortcut for --ai gemini
EOF
}

set_ai_tool() {
  case "$1" in
  codex)
    AI_TOOL="codex"
    AI_TOOL_LABEL="Codex"
    ;;
  claude)
    AI_TOOL="claude"
    AI_TOOL_LABEL="Claude"
    ;;
  gemini)
    AI_TOOL="gemini"
    AI_TOOL_LABEL="Gemini"
    ;;
  *)
    echo "Unsupported AI tool: $1"
    echo "Supported values: codex, claude, gemini"
    exit 1
    ;;
  esac
}

validate_directories() {
  local missing=0

  for dir in "$FRONTEND_DIR" "$ADMIN_DIR" "$BACKEND_DIR" "$BACKEND_SERVER_DIR" "$CLI_PROXY_DIR"; do
    if [ ! -d "$dir" ]; then
      echo "Missing required directory: $dir"
      missing=1
    fi
  done

  if [ "$missing" -ne 0 ]; then
    exit 1
  fi

  if ! command -v "$AI_TOOL" >/dev/null 2>&1; then
    echo "Required AI CLI not found on PATH: $AI_TOOL"
    exit 1
  fi
}

attach_existing_session() {
  if tmux has-session -t "$SESSION_NAME" 2>/dev/null; then
    echo "Attaching to existing tmux session: $SESSION_NAME"
    tmux attach-session -t "$SESSION_NAME"
    exit 0
  fi
}

cleanup_terminal_state() {
  # If tmux aborts mid-session, turn off mouse reporting before returning to the shell.
  printf '\033[?1000l\033[?1002l\033[?1003l\033[?1005l\033[?1006l\033[?1015l\033[?1016l'
  stty sane 2>/dev/null || true
}

cleanup_ports() {
  echo "Freeing Gondoor dev ports..."
  kill_port 3000
  kill_port 3001
  kill_port 3002
}

stop_workspace() {
  if tmux has-session -t "$SESSION_NAME" 2>/dev/null; then
    echo "Stopping tmux session: $SESSION_NAME"
    tmux kill-session -t "$SESSION_NAME"
  else
    echo "No tmux session named $SESSION_NAME is running."
  fi

  echo "Stopping CLI proxy Docker service..."
  (
    cd "$CLI_PROXY_DIR" &&
      docker compose down --remove-orphans
  ) || echo "CLI proxy Docker service was not running or could not be stopped."

  echo "Stopping shared Supabase stack..."
  (
    cd "$FRONTEND_DIR" &&
      pnpm exec supabase stop
  ) || echo "Shared Supabase stack was not running or could not be stopped."
}

create_servers_window() {
  local window_target="$SESSION_NAME:SERVERS"

  tmux send-keys -t "$window_target.1" "cd \"$FRONTEND_DIR\" && pnpm exec supabase start && while true; do clear; echo \"Shared Supabase\"; echo; pnpm exec supabase status; sleep 10; done" C-m
  tmux select-pane -t "$window_target.1" -T "Supabase"
  sleep 0.1

  local frontend_pane
  frontend_pane=$(tmux split-window -h -t "$window_target.1" -P -F "#{pane_id}")
  sleep 0.1
  tmux send-keys -t "$frontend_pane" "cd \"$FRONTEND_DIR\" && pnpm exec next dev --port 3000" C-m
  tmux select-pane -t "$frontend_pane" -T "Frontend"
  sleep 0.1

  local backend_pane
  backend_pane=$(tmux split-window -v -t "$frontend_pane" -P -F "#{pane_id}")
  sleep 0.1
  tmux send-keys -t "$backend_pane" "cd \"$BACKEND_SERVER_DIR\" && until nc -z 127.0.0.1 54321; do echo \"Waiting for shared Supabase...\"; sleep 2; done && \"$BACKEND_DIR\"/scripts/setup-local-supabase.sh && pnpm start:dev" C-m
  tmux select-pane -t "$backend_pane" -T "Backend"
  sleep 0.1

  local admin_pane
  admin_pane=$(tmux split-window -v -t "$window_target.1" -P -F "#{pane_id}")
  sleep 0.1
  tmux send-keys -t "$admin_pane" "cd \"$ADMIN_DIR\" && pnpm exec next dev --port 3002" C-m
  tmux select-pane -t "$admin_pane" -T "Admin"
  sleep 0.1

  local proxy_pane
  proxy_pane=$(tmux split-window -v -t "$admin_pane" -P -F "#{pane_id}")
  sleep 0.1
  tmux send-keys -t "$proxy_pane" "cd \"$CLI_PROXY_DIR\" && docker compose up -d --remove-orphans --no-build && docker compose logs -f --tail=50 cli-proxy-api" C-m
  tmux select-pane -t "$proxy_pane" -T "CLI Proxy"
  sleep 0.1

  tmux select-layout -t "$window_target" tiled >/dev/null
}

create_project_window() {
  local window_name="$1"
  local path="$2"

  tmux new-window -t "$SESSION_NAME" -n "$window_name"
  tmux send-keys -t "$SESSION_NAME:$window_name" "cd \"$path\" && clear" C-m
  tmux select-pane -t "$SESSION_NAME:$window_name.1" -T "$window_name"
}

create_ai_window() {
  local window_target="$SESSION_NAME:AI"

  tmux new-window -t "$SESSION_NAME" -n "AI"
  sleep 0.1

  tmux send-keys -t "$window_target.1" "cd \"$FRONTEND_DIR\" && $AI_TOOL" C-m
  tmux select-pane -t "$window_target.1" -T "FE $AI_TOOL_LABEL"
  sleep 0.1

  local backend_ai_pane
  backend_ai_pane=$(tmux split-window -h -t "$window_target.1" -P -F "#{pane_id}")
  sleep 0.1
  tmux send-keys -t "$backend_ai_pane" "cd \"$BACKEND_SERVER_DIR\" && $AI_TOOL" C-m
  tmux select-pane -t "$backend_ai_pane" -T "BE $AI_TOOL_LABEL"
  sleep 0.1

  local admin_ai_pane
  admin_ai_pane=$(tmux split-window -h -t "$backend_ai_pane" -P -F "#{pane_id}")
  sleep 0.1
  tmux send-keys -t "$admin_ai_pane" "cd \"$ADMIN_DIR\" && $AI_TOOL" C-m
  tmux select-pane -t "$admin_ai_pane" -T "ADMIN $AI_TOOL_LABEL"
  sleep 0.1

  tmux select-layout -t "$window_target" even-horizontal >/dev/null
}

create_mobii_ai_window() {
  local window_name="MOBII-AI"
  tmux new-window -t "$SESSION_NAME" -n "$window_name"
  tmux send-keys -t "$SESSION_NAME:$window_name" "cd \"$PROJECT_ROOT\" && $AI_TOOL" C-m
  tmux select-pane -t "$SESSION_NAME:$window_name.1" -T "MOBII $AI_TOOL_LABEL"
}

while [[ $# -gt 0 ]]; do
  case "$1" in
  --reset)
    RESET_SESSION=true
    ;;
  --stop)
    STOP_WORKSPACE=true
    ;;
  --ai)
    shift
    if [ -z "${1:-}" ]; then
      echo "Missing value for --ai."
      exit 1
    fi
    set_ai_tool "$1"
    ;;
  --codex)
    set_ai_tool "codex"
    ;;
  --claude)
    set_ai_tool "claude"
    ;;
  --gemini)
    set_ai_tool "gemini"
    ;;
  --root)
    shift
    if [ -z "${1:-}" ]; then
      echo "Missing value for --root."
      exit 1
    fi
    PROJECT_ROOT="$1"
    FRONTEND_DIR="$PROJECT_ROOT/gondoor"
    ADMIN_DIR="$PROJECT_ROOT/gondoor-admin"
    BACKEND_DIR="$PROJECT_ROOT/Gondoor-BE"
    BACKEND_SERVER_DIR="$BACKEND_DIR/server"
    CLI_PROXY_DIR="$BACKEND_DIR/cli-proxy-api"
    ;;
  --help | -h)
    print_help
    exit 0
    ;;
  *)
    echo "Unknown option: $1"
    print_help
    exit 1
    ;;
  esac
  shift
done

validate_directories

trap cleanup_terminal_state EXIT INT TERM

if [ "$STOP_WORKSPACE" = true ]; then
  stop_workspace
  exit 0
fi

if [ "$RESET_SESSION" = false ]; then
  attach_existing_session
fi

if tmux has-session -t "$SESSION_NAME" 2>/dev/null; then
  echo "Resetting tmux session: $SESSION_NAME"
  tmux kill-session -t "$SESSION_NAME"
fi

cleanup_ports

echo "Starting tmux session: $SESSION_NAME"
tmux new-session -d -s "$SESSION_NAME" -n "SERVERS"

create_servers_window
create_project_window "FE" "$FRONTEND_DIR"
create_project_window "BE" "$BACKEND_SERVER_DIR"
create_project_window "ADMIN" "$ADMIN_DIR"
create_ai_window
create_mobii_ai_window

tmux select-window -t "$SESSION_NAME:SERVERS"
tmux attach-session -t "$SESSION_NAME"
