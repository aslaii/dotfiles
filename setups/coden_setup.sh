#!/bin/bash

# /coden_setup.sh

source "$(dirname "$0")/functions.sh"

SESSION_NAME="Coden Setup"

switch_github_account "jco-jlabs" "Jericho Bermas" "jbermas@jlabs.team"

# Kill all running node and php artisan processes
echo "Stopping all Node.js and PHP Artisan processes..."
pkill -f "node"
pkill -f "php artisan"

# Kill processes on specific ports (3000, 3001, 8000)
echo "Ensuring ports 3000, 3001, and 8000 are free..."

# Free up ports 3000, 3001, and 8000
kill_port 3000
kill_port 3001
kill_port 8000

# Give some time to ensure processes are fully terminated
sleep 2

# Check if the tmux session already exists and kill it
if tmux has-session -t "$SESSION_NAME" 2>/dev/null; then
  echo "Deleting existing tmux session: $SESSION_NAME"
  tmux kill-session -t "$SESSION_NAME"
fi

# Create a new tmux session
echo "Starting new tmux session: $SESSION_NAME"

sleep 2
tmux new-session -d -s "$SESSION_NAME" -n Servers

# Start Servers window with btop
tmux new-session -d -s "$SESSION_NAME" -n Servers
tmux send-keys -t "$SESSION_NAME":Servers.1 "btop" C-m

# Split horizontally: create API Server pane (right of btop)
PANE_API=$(tmux split-window -h -t "$SESSION_NAME":Servers.1 -P -F "#{pane_id}")
tmux send-keys -t "$PANE_API" "cd ~/work/JLabs/coden/coden-api/ && php artisan serve" C-m

# Split horizontally: create Queue Work pane (right of API Server)
PANE_QUEUE=$(tmux split-window -v -t "$PANE_API" -P -F "#{pane_id}")
tmux send-keys -t "$PANE_QUEUE" "cd ~/work/JLabs/coden/coden-api/ && php artisan queue:work" C-m

# Split vertically: create Web Server pane (below API Server)
PANE_WEB=$(tmux split-window -v -t "$PANE_API" -P -F "#{pane_id}")
tmux send-keys -t "$PANE_WEB" "cd ~/work/JLabs/coden/coden-portal/ && pnpm dev" C-m

# Split vertically: create Mailhog pane (below Queue Work)
PANE_MAILHOG=$(tmux split-window -v -t "$PANE_QUEUE" -P -F "#{pane_id}")
tmux send-keys -t "$PANE_MAILHOG" "mailhog" C-m

# (Optional) Set pane titles for clarity
tmux select-pane -t "$SESSION_NAME":Servers.1 -T "Monitoring"
tmux select-pane -t "$PANE_API" -T "API Server"
tmux select-pane -t "$PANE_QUEUE" -T "Queue Work"
tmux select-pane -t "$PANE_WEB" -T "Web Server"
tmux select-pane -t "$PANE_MAILHOG" -T "Mailhog"

# Create the API window
tmux new-window -t "$SESSION_NAME" -n API
tmux send-keys -t "$SESSION_NAME":API "cd ~/work/JLabs/coden/coden-api/ && clear" C-m

# Create the Portal window
tmux new-window -t "$SESSION_NAME" -n Portal
tmux send-keys -t "$SESSION_NAME":Portal "cd ~/work/JLabs/coden/coden-portal/ && clear" C-m

# tmux new-window -t "$SESSION_NAME" -n Admin
# tmux send-keys -t "$SESSION_NAME":Admin "cd ~/work/JLabs/yg/yg-admin && clear" C-m

# Create the PDF window
# tmux new-window -t "$SESSION_NAME" -n PDF
# tmux send-keys -t "$SESSION_NAME":PDF "cd ~/work/wsg-pdf && clear" C-m
#
# Focus on the API window
tmux select-window -t "$SESSION_NAME":Servers

# Attach to the session
tmux attach -t "$SESSION_NAME"
