# setups/functions.sh
switch_github_account() {
  local desired_account="$1"
  local git_name="$2"
  local git_email="$3"

  current_account=$(gh auth status --json accounts | jq -r '.accounts[] | select(.user.active==true) | .user.login')

  if [[ "$current_account" != "$desired_account" ]]; then
    echo "Switching GitHub account to $desired_account..."
    gh auth switch -h github.com -u "$desired_account"
  else
    echo "Already using GitHub account: $desired_account"
  fi

  git config --global user.name "$git_name"
  git config --global user.email "$git_email"
  echo "Git config set for $git_name <$git_email>"
}

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

nvm_use_project_node() {
  local dir="$1"
  local NODE_VERSION=""
  if [ -f "$dir/.nvmrc" ]; then
    NODE_VERSION=$(cat "$dir/.nvmrc")
  elif [ -f "$dir/package.json" ]; then
    NODE_VERSION=$(jq -r '.engines.node // empty' "$dir/package.json" | sed 's/[^\d\.]//g')
  fi

  if [ -n "$NODE_VERSION" ]; then
    echo "Switching to Node.js version $NODE_VERSION in $dir"
    export NVM_DIR="$HOME/.nvm"
    # shellcheck source=/dev/null
    [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
    nvm install "$NODE_VERSION"
    nvm use "$NODE_VERSION"
    export NODE_VERSION
  else
    echo "No Node version specified in $dir"
  fi
}
