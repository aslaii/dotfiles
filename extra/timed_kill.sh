#!/bin/bash

# Usage: ./timed_kill.sh <hours|test>
# Example: ./timed_kill.sh 2
#          ./timed_kill.sh test

APP_NAME="Upwork"

if [[ $# -ne 1 ]]; then
  echo "Usage: $0 <hours|test>"
  exit 1
fi

if [[ "$1" == "test" ]]; then
  TOTAL_SECONDS=10
  echo "Test mode: Timer set for 10 seconds."
else
  HOURS="$1"
  # Check if HOURS is a positive integer
  if ! [[ "$HOURS" =~ ^[0-9]+$ ]] || [[ "$HOURS" -le 0 ]]; then
    echo "Error: Hours must be a positive integer."
    exit 1
  fi
  TOTAL_SECONDS=$((HOURS * 60 * 60))
  echo "Timer started for $HOURS hour(s) to terminate $APP_NAME."
fi

echo "Press Ctrl+C to cancel."

while [ $TOTAL_SECONDS -gt 0 ]; do
  HOURS_LEFT=$((TOTAL_SECONDS / 3600))
  MINUTES_LEFT=$(((TOTAL_SECONDS % 3600) / 60))
  SECONDS_LEFT=$((TOTAL_SECONDS % 60))
  printf "\rTime left: %02d:%02d:%02d" $HOURS_LEFT $MINUTES_LEFT $SECONDS_LEFT
  sleep 1
  TOTAL_SECONDS=$((TOTAL_SECONDS - 1))
done

echo -e "\nTime's up! Terminating $APP_NAME..."
killall "$APP_NAME" 2>/dev/null
echo -e "\nTime's up! Forcefully terminating $APP_NAME and related processes..."

# Try all known process names
killall -9 "$APP_NAME" 2>/dev/null
killall -9 "Upwork Helper" 2>/dev/null
killall -9 "Upwork Helper GPU" 2>/dev/null
killall -9 "Upwork Helper (Renderer)" 2>/dev/null

# As a catch-all (kills all matching processes with 'Upwork' in the command line)
pkill -9 -f Upwork

if [[ $? -eq 0 ]]; then
  echo "$APP_NAME and related processes forcefully terminated."
else
  echo "No running process named $APP_NAME found."
fi

if [[ $? -eq 0 ]]; then
  echo "$APP_NAME terminated."
else
  echo "No running process named $APP_NAME found."
fi
