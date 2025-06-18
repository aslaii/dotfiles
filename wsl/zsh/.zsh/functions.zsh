# wsl/zsh/.zsh/functions.zsh
function displayFZFFiles {
  fzf --preview 'batcat --theme=gruvbox-dark --color=always --style=header,grid --line-range :400 {}'
}

function nvimGoToFiles {
  nvimExists=$(which nvim)
  if [ -z "$nvimExists" ]; then
    return
  fi
  selection=$(displayFZFFiles)
  if [ -n "$selection" ]; then
    nvim "$selection"
  fi
}

function displayRgPipedFzf {
  rg . -n --glob "!.git/" --glob "!vendor/" --glob "!node_modules/" | fzf
}

function nvimGoToLine {
  nvimExists=$(which nvim)
  if [ -z "$nvimExists" ]; then
    return
  fi
  selection=$(displayRgPipedFzf)
  if [ -n "$selection" ]; then
    filename=$(echo $selection | cut -d: -f1)
    line=$(echo $selection | cut -d: -f2)
    nvim "+${line} ${filename}" +"normal zz^"
  fi
}


function ensure_lts_node() {
  # Only run once per session
  if [[ -n "$ENSURE_LTS_NODE_RAN" ]]; then
    return
  fi
  export ENSURE_LTS_NODE_RAN=1

  if command -v nvm >/dev/null 2>&1; then
    local lts_version current_version
    lts_version=$(nvm ls-remote --lts | tail -1 | awk '{print $1}')
    current_version=$(node --version 2>/dev/null)

    # Only install if not present
    if ! nvm ls "$lts_version" | grep -q "$lts_version"; then
      echo "Installing Node.js LTS ($lts_version)..."
      nvm install --lts
    fi

    # Only switch if not already using LTS
    if [[ "$current_version" != "v${lts_version}" ]]; then
      nvm use --lts >/dev/null
    fi
  fi
}
