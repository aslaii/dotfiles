#!/bin/bash

# /resq_setup.sh

source "$(dirname "$0")/functions.sh"

# ---- CONFIGURATION ----
SESSION_NAME="Reforal Setup"
PROJECT_ROOT="${1:-$HOME/work/JLabs/reforal}"

ENABLE_BTOP=true
ENABLE_QUEUE_WORK=true
ENABLE_MAILHOG=true

# If you want to exclude certain folders from auto-window creation, list them here (space-separated)
EXCLUDE_FOLDERS="node_modules .git"

# ---- END CONFIGURATION ----

switch_github_account "jco-jlabs" "Jericho Bermas" "jbermas@jlabs.team"

echo "Stopping all Node.js and PHP Artisan processes..."
pkill -f "node"
pkill -f "php artisan"

echo "Ensuring ports 3000, 3001, and 8000 are free..."
kill_port 3000
kill_port 3001
kill_port 8000

sleep 2

if tmux has-session -t "$SESSION_NAME" 2>/dev/null; then
  echo "Deleting existing tmux session: $SESSION_NAME"
  tmux kill-session -t "$SESSION_NAME"
fi

echo "Starting new tmux session: $SESSION_NAME"
sleep 2
tmux new-session -d -s "$SESSION_NAME" -n Servers

# Start Servers window with btop if enabled
if [ "$ENABLE_BTOP" = true ]; then
  tmux send-keys -t "$SESSION_NAME":Servers.1 "btop" C-m
fi

# Split horizontally: create API Server pane (right of btop)
PANE_API=$(tmux split-window -h -t "$SESSION_NAME":Servers.1 -P -F "#{pane_id}")
tmux send-keys -t "$PANE_API" "cd \"$PROJECT_ROOT/reforal-api/\" && php artisan serve" C-m
tmux select-pane -t "$PANE_API" -T "API Server"

# Split vertically: create Web Server pane (below API Server)
PANE_WEB=$(tmux split-window -v -t "$PANE_API" -P -F "#{pane_id}")
tmux send-keys -t "$PANE_WEB" "cd \"$PROJECT_ROOT/reforal-web/\" && nvm use && pnpm start" C-m
tmux select-pane -t "$PANE_WEB" -T "Web Server"

PANE_WEB=$(tmux split-window -v -t "$PANE_WEB" -P -F "#{pane_id}")
tmux send-keys -t "$PANE_WEB" "cd \"$PROJECT_ROOT/reforal-admin/\" && nvm use && pnpm start" C-m
tmux select-pane -t "$PANE_WEB" -T "Web Server"

# Split horizontally: create Queue Work pane (right of API Server) if enabled
if [ "$ENABLE_QUEUE_WORK" = true ]; then
  PANE_QUEUE=$(tmux split-window -v -t "$PANE_API" -P -F "#{pane_id}")
  tmux send-keys -t "$PANE_QUEUE" "cd \"$PROJECT_ROOT/reforal-api/\" && php artisan queue:work" C-m
  tmux select-pane -t "$PANE_QUEUE" -T "Queue Work"
fi

# Split vertically: create Mailhog pane (below Queue Work) if enabled
if [ "$ENABLE_MAILHOG" = true ] && [ -n "$PANE_QUEUE" ]; then
  PANE_MAILHOG=$(tmux split-window -v -t "$PANE_QUEUE" -P -F "#{pane_id}")
  tmux send-keys -t "$PANE_MAILHOG" "mailhog" C-m
  tmux select-pane -t "$PANE_MAILHOG" -T "Mailhog"
fi

# Set Monitoring pane title
tmux select-pane -t "$SESSION_NAME":Servers.1 -T "Monitoring"

# ---- AUTO-CREATE WINDOWS FOR EACH FOLDER ----
for dir in "$PROJECT_ROOT"/*/; do
  folder=$(basename "$dir")
  # Skip excluded folders
  if [[ " $EXCLUDE_FOLDERS " =~ " $folder " ]]; then
    continue
  fi
  # Skip if not a directory
  [ -d "$dir" ] || continue
  # Create a tmux window named after the folder
  tmux new-window -t "$SESSION_NAME" -n "$folder"
  tmux send-keys -t "$SESSION_NAME":"$folder" "cd \"$dir\" && clear" C-m
done

# Focus on the Servers window
tmux select-window -t "$SESSION_NAME":Servers

# Attach to the session
tmux attach -t "$SESSION_NAME"
