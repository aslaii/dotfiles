#!/bin/bash

SESSION_NAME="Flexiwork-Query Omega Setup"

echo "Changing Github Credentials to Personal..."
git config --global user.name "Jericho Bermas"
git config --global user.email "jecho.deleon@gmail.com"

# Kill all running node and php artisan processes
echo "Stopping all React and Node processes..."
pkill -f "node"

# Kill processes on specific ports (3000, 3001, 8000)
echo "Ensuring ports 3000 are free..."
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

kill_port 3000

sleep 2

if tmux has-session -t "$SESSION_NAME" 2>/dev/null; then
  echo "Deleting existing tmux session: $SESSION_NAME"
  tmux kill-session -t "$SESSION_NAME"
fi

echo "Starting new tmux session: $SESSION_NAME"

sleep 2
tmux new-session -d -s "$SESSION_NAME" -n Servers

tmux send-keys -t "$SESSION_NAME":Servers.1 "btop" C-m
tmux split-window -h -t "$SESSION_NAME":Servers.1
tmux select-pane -t "$SESSION_NAME":Servers.2

tmux send-keys -t "$SESSION_NAME":Servers.2 "cd ~/work/Flexiwork/query-omega/ && export $(cat .env.dev-test | xargs) && pnpm start" C-m
tmux split-window -v -t "$SESSION_NAME":Servers.2

# Create the Flutter window
tmux new-window -t "$SESSION_NAME" -n React
tmux send-keys -t "$SESSION_NAME":React "cd ~/work/Flexiwork/query-omega/ && clear" C-m

tmux select-window -t "$SESSION_NAME":React

tmux attach -t "$SESSION_NAME"
