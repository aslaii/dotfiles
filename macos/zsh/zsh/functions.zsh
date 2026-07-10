# macos/zsh/zsh/functions.zsh
function displayFZFFiles {
  fzf --preview 'bat --theme=gruvbox-dark --color=always --style=header,grid --line-range :400 {}'
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

function set_shell_theme() {
  local defaults_result omp_flavor omp_theme_filename
  defaults_result="$(defaults read -g AppleInterfaceStyle 2>/dev/null || true)"
  if [[ "$defaults_result" == "Dark" ]]; then
    omp_flavor="mocha"
    omp_theme_filename="catppuccin_mocha.omp.json"
    export BAT_THEME="Catppuccin-Mocha"
  else
    omp_flavor="latte"
    omp_theme_filename="catppuccin_latte.omp.json"
    export BAT_THEME="Catppuccin-Latte"
  fi

  if ! command -v oh-my-posh >/dev/null 2>&1; then
    return
  fi

  local omp_config_path
  if $IS_MAC && command -v brew >/dev/null 2>&1; then
    omp_config_path="$(brew --prefix oh-my-posh)/themes/${omp_theme_filename}"
  else
    omp_config_path="$HOME/.cache/oh-my-posh/themes/${omp_theme_filename}"
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
