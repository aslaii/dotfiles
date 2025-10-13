# wsl/zsh/zsh/functions.zsh
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

function set_shell_theme() {
  local omp_flavor
  if [[ "$(defaults read -g AppleInterfaceStyle 2>/dev/null)" == "Dark" ]]; then
    omp_flavor="mocha"
    export BAT_THEME="Catppuccin-Mocha"
  else
    omp_flavor="latte"
    export BAT_THEME="Catppuccin-Latte"
  fi

  local omp_config_path
  if $IS_MAC; then
    omp_config_path="$(brew --prefix oh-my-posh)/themes/catppuccin_${omp_flavor}.omp.json"
  else
    omp_config_path="$HOME/.cache/oh-my-posh/themes/catppuccin_${omp_flavor}.omp.json"
  fi

  if [ -f "$omp_config_path" ]; then

    local omp_script
    omp_script=$(oh-my-posh init zsh --config "$omp_config_path")
    local omp_exit_code=$?

    if [[ ${omp_exit_code} -eq 0 && -n "${omp_script}" ]]; then
      source <(echo "${omp_script}")
    fi
  fi
}

function btop_themed() {
  local BTOP_CONFIG="$HOME/.config/btop/btop.conf"
  local theme_name

  # First, check if the btop config file exists
  if [ ! -f "$BTOP_CONFIG" ]; then
    # If no config, just run btop normally
    command btop "$@"
    return
  fi

  # Check for macOS Dark Mode to choose the theme
  if [[ "$(defaults read -g AppleInterfaceStyle 2>/dev/null)" == "Dark" ]]; then
    theme_name="catppuccin_mocha"
  else
    theme_name="catppuccin_latte"
  fi

  # Use sed to replace the color_theme line in the config file
  # The '-i ''' syntax is correct for the version of sed on macOS
  sed -i '' "s/color_theme = \".*\"/color_theme = \"${theme_name}\"/" "$BTOP_CONFIG"

  # Finally, launch the real btop command, passing along any arguments
  command btop "$@"
}
