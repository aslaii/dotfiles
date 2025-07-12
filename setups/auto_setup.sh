#!/bin/bash

SESSION_NAME="Just Setup"

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

tmux send-keys -t "$SESSION_NAME":Servers.2 "cd ~/dotfiles/auto/ && (deactivate 2>/dev/null || true) && venv && python src/main.py" C-m
tmux split-window -v -t "$SESSION_NAME":Servers.2

tmux new-window -t "$SESSION_NAME" -n Python
tmux send-keys -t "$SESSION_NAME":Python "cd ~/dotfiles/auto/ && clear && nvim" C-m

tmux select-window -t "$SESSION_NAME":Python

tmux attach -t "$SESSION_NAME"
