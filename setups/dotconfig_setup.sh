#!/bin/bash

# setup for dotconfig tmux session

SESSION="dotconfig"
SESSION_PATH="$HOME/dotfiles"

tmux has-session -t $SESSION 2>/dev/null

if [ $? != 0 ]; then
  # Create a new session and window
  tmux new-session -d -s $SESSION -c "$SESSION_PATH"

  # Split the window horizontally
  tmux split-window -h -t "${SESSION}:0" -c "$SESSION_PATH"

  # Configure left pane (shell)
  tmux send-keys -t "${SESSION}:0.0" "clear" C-m
  tmux select-pane -t "${SESSION}:0.0" -T "Shell"

  # Configure right pane (gemini)
  tmux send-keys -t "${SESSION}:0.1" "gemini" C-m
  tmux select-pane -t "${SESSION}:0.1" -T "Gemini"

  # Focus the shell pane for the user
  tmux select-pane -t "${SESSION}:0.0"
fi

tmux attach-session -t $SESSION