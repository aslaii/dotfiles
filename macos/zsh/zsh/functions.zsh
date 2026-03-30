# macos/zsh/zsh/functions.zsh
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
  if [[ -n "$ENSURE_LTS_NODE_RAN" ]]; then
    return
  fi
  export ENSURE_LTS_NODE_RAN=1

  if command -v nvm >/dev/null 2>&1; then
    local lts_version current_version
    lts_version=$(nvm ls-remote --lts | tail -1 | awk '{print $1}')
    current_version=$(node --version 2>/dev/null)

    if ! nvm ls "$lts_version" | grep -q "$lts_version"; then
      echo "Installing Node.js LTS ($lts_version)..."
      nvm install --lts
    fi

    if [[ "$current_version" != "v${lts_version}" ]]; then
      nvm use --lts >/dev/null
    fi
  fi
}

function set_shell_theme() {
  local defaults_result
  defaults_result="$(defaults read -g AppleInterfaceStyle 2>/dev/null || true)"
  if [[ "$defaults_result" == "Dark" ]]; then
    export BAT_THEME="Catppuccin-Mocha"
  else
    export BAT_THEME="Catppuccin-Latte"
  fi
}

function btop_themed() {
  local BTOP_CONFIG="$HOME/.config/btop/btop.conf"
  local theme_name

  if [ ! -f "$BTOP_CONFIG" ]; then
    command btop "$@"
    return
  fi

  if [[ "$(defaults read -g AppleInterfaceStyle 2>/dev/null)" == "Dark" ]]; then
    theme_name="catppuccin_mocha"
  else
    theme_name="catppuccin_latte"
  fi

  sed -i '' "s/color_theme = \".*\"/color_theme = \"${theme_name}\"/" "$BTOP_CONFIG"

  command btop "$@"
}

function ensure_gemini_api_key() {
  local gemini_env_file="$HOME/.gemini/.env"
  local gemini_dir="$HOME/.gemini"

  if [ -f "$gemini_env_file" ]; then
    return
  fi

  if [ ! -d "$gemini_dir" ]; then
    mkdir -p "$gemini_dir"
  fi

  local api_key
  echo "Please enter your Gemini API key:"
  read -s api_key

  if [ -n "$api_key" ]; then
    echo "GEMINI_API_KEY=$api_key" > "$gemini_env_file"
    echo "Gemini API key saved to $gemini_env_file"
  else
    echo "No API key entered. Skipping."
  fi
}

function sync_ai_cli_theme() {
  local sync_script="$HOME/dotfiles/scripts/sync-ai-cli-theme.sh"

  if [ -x "$sync_script" ]; then
    "$sync_script" >/dev/null 2>&1
  fi
}

function codex() {
  sync_ai_cli_theme
  command codex "$@"
}

function gemini() {
  sync_ai_cli_theme
  command gemini "$@"
}

function claude() {
  sync_ai_cli_theme
  command claude "$@"
}
