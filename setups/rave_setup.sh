#!/bin/bash

# mobii_setup.sh

# ---- External Functions & Configuration ----
# Ensure functions.sh is in the same directory or provide the correct path.
source "$(dirname "$0")/functions.sh"

SESSION_BASE_NAME="Rave Setup"
SESSION_NAME="$SESSION_BASE_NAME"
DEFAULT_PROJECT_ROOT="${GOOSE_PROJECT_ROOT:-$HOME/work/mobii/}" # Allow override via env var
PROJECT_ROOT="$DEFAULT_PROJECT_ROOT"
FILTER_TERM=""
CLI_FOLDERS=()

# --- Toggles for server startup ---
ENABLE_BTOP=true

# --- Auto-window configuration ---
# Folders to exclude from auto-window creation in "all" mode.
EXCLUDE_FOLDERS="node_modules .git"

# ==============================================================================
# ---- HELPER FUNCTIONS ----
# ==============================================================================

# Cleans up previous processes without touching tmux sessions
cleanup() {
  echo "🛑 Stopping all Node.js and PHP Artisan processes..."
  pkill -f "node" >/dev/null 2>&1
  pkill -f "php artisan" >/dev/null 2>&1

  echo "🔓 Ensuring key ports are free..."
  kill_port 3000
  kill_port 3001
  kill_port 8000
  sleep 1
}

# Finds an available tmux session name so we can keep prior runs intact
choose_session_name() {
  local candidate="$SESSION_BASE_NAME"
  local index=2

  while tmux has-session -t "$candidate" 2>/dev/null; do
    candidate="$SESSION_BASE_NAME $index"
    ((index++))
  done

  if [ "$candidate" != "$SESSION_BASE_NAME" ]; then
    echo "🧷 Existing tmux session detected. Using new session name: $candidate"
  fi

  SESSION_NAME="$candidate"
}

# Creates the base tmux session
start_base_session() {
  echo "🚀 Starting new tmux session: $SESSION_NAME"
  tmux new-session -d -s "$SESSION_NAME" -n "SERVERS"
  sleep 1
}

# Creates the main "SERVERS" window with btop and dev servers
create_servers_window() {
  local window_target="$SESSION_NAME:SERVERS"
  local current_pane_id
  current_pane_id=$(tmux list-panes -t "$window_target" -F "#{pane_id}")

  # Start btop if enabled
  if [ "$ENABLE_BTOP" = true ]; then
    tmux send-keys -t "$current_pane_id" "btop" C-m
    tmux select-pane -t "$current_pane_id" -T "Monitoring"
    # Split for the next pane
    current_pane_id=$(tmux split-window -h -t "$current_pane_id" -P -F "#{pane_id}")
  fi
}

# Creates a special focused layout for a single project
create_focused_window() {
  local project_name=$1
  local project_path="$PROJECT_ROOT/$project_name"
  local window_target="$SESSION_NAME:SERVERS" # We'll reuse the first window

  # Start btop
  tmux send-keys -t "$window_target.1" "btop" C-m
  tmux select-pane -t "$window_target.1" -T "Monitoring"

  # Split horizontally for the project
  local project_pane=$(tmux split-window -h -t "$window_target.1" -P -F "#{pane_id}")
  tmux send-keys -t "$project_pane" "cd \"$project_path\" && nvim" C-m
  tmux select-pane -t "$project_pane" -T "$project_name"
}

# Creates a new tmux window for a given project folder
create_project_window() {
  local project_name=$1
  local project_path="$PROJECT_ROOT/$project_name"

  # Skip if not a directory
  [ -d "$project_path" ] || return

  tmux new-window -t "$SESSION_NAME" -n "$project_name"
  tmux send-keys -t "$SESSION_NAME:$project_name" "cd \"$project_path\" && clear" C-m

  # Split horizontally
  local right_pane=$(tmux split-window -h -t "$SESSION_NAME:$project_name" -P -F "#{pane_id}")
  tmux send-keys -t "$right_pane" "cd \"$project_path\" && gemini" C-m
  tmux select-pane -t "$right_pane" -T "Codex" # Title for the right pane

  tmux select-pane -t "$SESSION_NAME:$project_name.1" -T "Shell" # Title for the left pane
}

# ==============================================================================
# ---- SCRIPT LOGIC ----
# ==============================================================================

# --- Parse CLI Arguments ---
while [[ $# -gt 0 ]]; do
  case "$1" in
  --root)
    shift
    if [ -z "${1:-}" ]; then
      echo "❌ Missing value for --root option."
      exit 1
    fi
    PROJECT_ROOT="$1"
    ;;
  --filter)
    shift
    if [ -z "${1:-}" ]; then
      echo "❌ Missing value for --filter option."
      exit 1
    fi
    FILTER_TERM="$1"
    ;;
  --help | -h)
    echo "Usage: $(basename "$0") [--root PATH] [--filter TERM] [project ...]"
    exit 0
    ;;
  --)
    shift
    while [[ $# -gt 0 ]]; do
      CLI_FOLDERS+=("$1")
      shift
    done
    break
    ;;
  *)
    CLI_FOLDERS+=("$1")
    ;;
  esac
  shift || break
done

# Ensure project root always has a trailing slash for consistent path joins
PROJECT_ROOT="${PROJECT_ROOT%/}/"

# Change to the project directory first to simplify paths
cd "$PROJECT_ROOT" || {
  echo "❌ Project root not found: $PROJECT_ROOT"
  exit 1
}

# --- Determine Mode & Target Folders ---
TARGET_FOLDERS=()
MODE="all"
NEEDS_INTERACTIVE=true

# Build the list of available projects up front
AVAILABLE_PROJECTS=()
while IFS= read -r line; do
  folder="$line"
  if [[ " $EXCLUDE_FOLDERS " =~ " $folder " ]]; then
    continue
  fi
  AVAILABLE_PROJECTS+=("$folder")
done < <(find . -mindepth 1 -maxdepth 1 -type d \
  -not \( -name "node_modules" -o -name ".git" \) |
  sed 's|^\./||' | sort)

if [ ${#CLI_FOLDERS[@]} -gt 0 ]; then
  VALID_FOLDERS=()
  INVALID_FOLDERS=()
  for entry in "${CLI_FOLDERS[@]}"; do
    if [ -d "$entry" ]; then
      VALID_FOLDERS+=("$entry")
    else
      INVALID_FOLDERS+=("$entry")
    fi
  done

  if [ ${#VALID_FOLDERS[@]} -gt 0 ]; then
    TARGET_FOLDERS=("${VALID_FOLDERS[@]}")
    if [ ${#TARGET_FOLDERS[@]} -eq 1 ]; then
      MODE="focused"
    else
      MODE="multiple"
    fi
    if [ -z "$FILTER_TERM" ]; then
      NEEDS_INTERACTIVE=false
    fi
    for missing in "${INVALID_FOLDERS[@]}"; do
      echo "⚠️  Warning: Folder '$missing' not found. Skipping."
    done
  else
    if [ -z "$FILTER_TERM" ] && [ ${#CLI_FOLDERS[@]} -eq 1 ]; then
      FILTER_TERM="${CLI_FOLDERS[0]}"
    else
      echo "⚠️  No valid project names provided. Switching to interactive mode."
    fi
  fi
fi

if [ -n "$FILTER_TERM" ]; then
  NEEDS_INTERACTIVE=true
fi

# Prepare filtered project list for interactive mode
FILTERED_PROJECTS=()
if [ -n "$FILTER_TERM" ]; then
  filter_normalized=$(printf '%s' "$FILTER_TERM" | tr '[:upper:]' '[:lower:]')
  for folder in "${AVAILABLE_PROJECTS[@]}"; do
    folder_normalized=$(printf '%s' "$folder" | tr '[:upper:]' '[:lower:]')
    if [[ "$folder_normalized" == *"$filter_normalized"* ]]; then
      FILTERED_PROJECTS+=("$folder")
    fi
  done
else
  FILTERED_PROJECTS=("${AVAILABLE_PROJECTS[@]}")
fi

if [ "$NEEDS_INTERACTIVE" = true ]; then
  DIRS=("${FILTERED_PROJECTS[@]}")
  if [ ${#DIRS[@]} -eq 0 ]; then
    if [ -n "$FILTER_TERM" ]; then
      echo "❌ No projects matched filter '$FILTER_TERM'. Exiting."
    else
      echo "❌ No projects available. Exiting."
    fi
    exit 1
  fi

  echo "🗂️  Select project(s) to open:"
  if [ -n "$FILTER_TERM" ]; then
    echo "  Filter applied: '$FILTER_TERM'"
  fi
  if [ -n "$FILTER_TERM" ]; then
    echo "  [all] Open all matching projects (default behavior)"
  else
    echo "  [all] Open all projects (default behavior)"
  fi
  for i in "${!DIRS[@]}"; do
    printf "  [%2d] %s\n" "$((i + 1))" "${DIRS[$i]}"
  done

  read -p "➡️  Enter choice(s) (e.g., 2, 5, 8 or 'all'): " user_choice

  if [[ -z "$user_choice" || "$user_choice" == "all" ]]; then
    MODE="all"
    TARGET_FOLDERS=("${DIRS[@]}")
  else
    IFS=',' read -ra CHOICES <<<"$user_choice"
    for choice in "${CHOICES[@]}"; do
      choice=$(echo "$choice" | xargs)
      if [[ "$choice" =~ ^[0-9]+$ ]] && [ "$choice" -ge 1 ] && [ "$choice" -le "${#DIRS[@]}" ]; then
        TARGET_FOLDERS+=("${DIRS[$((choice - 1))]}")
      else
        echo "⚠️  Invalid selection: '$choice'. Skipping."
      fi
    done

    if [ ${#TARGET_FOLDERS[@]} -eq 0 ]; then
      echo "❌ No valid projects selected. Exiting."
      exit 1
    elif [ ${#TARGET_FOLDERS[@]} -eq 1 ]; then
      MODE="focused"
    else
      MODE="multiple"
    fi
  fi
fi

# --- Execute Main Actions ---
switch_github_account "aslaii" "Jericho Bermas" "jecho.deleon@gmail.com"
cleanup
choose_session_name
start_base_session

case "$MODE" in
"all")
  if [ -n "$FILTER_TERM" ]; then
    echo "🚀 Mode: ALL. Setting up servers and matching projects: ${TARGET_FOLDERS[*]}"
  else
    echo "🚀 Mode: ALL. Setting up full server environment and all project windows."
  fi
  create_servers_window
  for project in "${TARGET_FOLDERS[@]}"; do
    create_project_window "$project"
  done
  ;;

"focused")
  project="${TARGET_FOLDERS[0]}"
  echo "🔎 Mode: FOCUSED. Setting up a minimal view for '$project'."
  # Disable servers for a clean focused layout
  ENABLE_CLIENT_PORTAL=false ENABLE_CREATE_HC_LETTER=false ENABLE_PARSE_HC=false
  create_focused_window "$project"
  create_project_window "$project" # Also create its own dedicated window
  ;;

"multiple")
  echo "🎯 Mode: MULTIPLE. Opening servers and selected projects: ${TARGET_FOLDERS[*]}"
  create_servers_window
  for project in "${TARGET_FOLDERS[@]}"; do
    create_project_window "$project"
  done
  ;;
esac

# --- Finalize and Attach ---
echo "✅ Setup complete. Attaching to session..."
tmux select-window -t "$SESSION_NAME:SERVERS"
tmux attach-session -t "$SESSION_NAME"
