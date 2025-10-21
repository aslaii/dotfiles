#!/bin/bash

# setup for dotconfig tmux session

SESSION="dotconfig"
SESSION_PATH="$HOME/dotfiles"

tmux has-session -t $SESSION 2>/dev/null

if [ $? != 0 ]; then
  tmux new-session -d -s $SESSION -c "$SESSION_PATH"
  tmux split-window -h -t "${SESSION}:0" -c "$SESSION_PATH"
  tmux send-keys -t "${SESSION}:0.0" "clear" C-m
  tmux select-pane -t "${SESSION}:0.0" -T "Shell"
  tmux send-keys -t "${SESSION}:0.1" "codex" C-m
  tmux select-pane -t "${SESSION}:0.1" -T "Gemini"
  tmux select-pane -t "${SESSION}:0.0"
fi

tmux attach-session -t $SESSION

