#!/bin/bash

SESSION_NAME="Tulu Setup"

# Kill all running node and php artisan processes
echo "Stopping all Node.js and PHP Artisan processes..."
pkill -f "node"
pkill -f "php artisan"

# Kill processes on specific ports (3000, 3001, 8000)
echo "Ensuring ports 3000, 3001, and 8000 are free..."
kill_port() {
  PORT=$1
  echo "Freeing up port $PORT..."
  PID=$(lsof -ti tcp:$PORT)
  if [ -n "$PID" ]; then
    kill -9 $PID
    echo "Killed process $PID on port $PORT"
  else
    echo "Port $PORT is already free"
  fi
}

# Free up ports 3000, 3001, and 8000
kill_port 3000
kill_port 3001
kill_port 8000
kill_port 5173

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

# Create panes and run the commands in the Servers window
tmux send-keys -t "$SESSION_NAME":Servers.1 "btop" C-m
tmux split-window -h -t "$SESSION_NAME":Servers.1
tmux select-pane -t "$SESSION_NAME":Servers.2

# Split the bottom half into four vertical panes
tmux send-keys -t "$SESSION_NAME":Servers.2 "cd ~/work/tulu/tulu-api && npm run start:dev" C-m
tmux split-window -v -t "$SESSION_NAME":Servers.2

tmux send-keys -t "$SESSION_NAME":Servers.3 "cd ~/work/tulu/tulu-web && npm run dev -- --port 5173" C-m
tmux split-window -v -t "$SESSION_NAME":Servers.3

# tmux send-keys -t "$SESSION_NAME":Servers.4 "cd ~/work/wsg-pdf && PORT=3001 BROWSER=none bun start" C-m
# tmux split-window -v -t "$SESSION_NAME":Servers.4
#
# tmux send-keys -t "$SESSION_NAME":Servers.5 "mailhog" C-m
# tmux split-window -v -t "$SESSION_NAME":Servers.5
#
# tmux select-pane -t "$SESSION_NAME":Servers.2
# tmux split-window -h -t "$SESSION_NAME":Servers.2
#
# tmux select-pane -t "$SESSION_NAME":Servers.6
# tmux split-window -h -t "$SESSION_NAME":Servers.6

tmux select-pane -T "Monitoring" -t "$SESSION_NAME":Servers.1
tmux select-pane -T "API Server" -t "$SESSION_NAME":Servers.2
tmux select-pane -T "Web Server" -t "$SESSION_NAME":Servers.3
# tmux select-pane -T "Admin Server" -t "$SESSION_NAME":Servers.4
# tmux select-pane -T "Mailhog" -t "$SESSION_NAME":Servers.5
# tmux select-pane -T "Queue Work" -t "$SESSION_NAME":Servers.6
# tmux select-pane -T "Extra Pane 2" -t "$SESSION_NAME":Servers.7

# Create the API window
tmux new-window -t "$SESSION_NAME" -n API
tmux send-keys -t "$SESSION_NAME":API "cd ~/work/tulu/tulu-api && clear" C-m

# Create the Portal window
tmux new-window -t "$SESSION_NAME" -n Web
tmux send-keys -t "$SESSION_NAME":Web "cd ~/work/tulu/tulu-web && clear" C-m

# # Create the PDF window
# tmux send-keys -t "$SESSION_NAME":PDF "cd ~/work/wsg-pdf && clear" C-m
# tmux new-window -t "$SESSION_NAME" -n PDF

# Focus on the API window
tmux select-window -t "$SESSION_NAME":Servers

# Attach to the session
tmux attach -t "$SESSION_NAME"
