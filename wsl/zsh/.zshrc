# /wsl/zsh/.zshrc
# --- OS Detection ---
IS_MAC=false
IS_LINUX=false
IS_WSL=false

case "$(uname)" in
  Darwin*) IS_MAC=true ;;
  Linux*)
    IS_LINUX=true
    grep -qi microsoft /proc/version && IS_WSL=true
    ;;
esac

# --- Path Setup ---
export PATH="$HOME/.local/bin:$PATH"
export PATH="$HOME/.bun/bin:$PATH"

if $IS_MAC; then
  export PATH="/opt/homebrew/bin:$PATH"
  export PATH="/opt/homebrew/opt/ruby/bin:$PATH"
  export PATH="/opt/homebrew/opt/openjdk/bin:$PATH"
  export PATH="$HOME/development/flutter/bin:$PATH"
  export PATH="$PATH:$HOME/.pub-cache/bin"
  export PATH="$HOME/.spicetify:$PATH"
elif $IS_WSL; then
  export PATH="$PATH:/mnt/c/Program Files/Git/mingw64/bin"
fi

# --- NVM Setup ---
export NVM_DIR="$HOME/.nvm"
if $IS_MAC; then
  [ -s "/opt/homebrew/opt/nvm/nvm.sh" ] && source "/opt/homebrew/opt/nvm/nvm.sh"
  [ -s "/opt/homebrew/opt/nvm/etc/bash_completion.d/nvm" ] && source "/opt/homebrew/opt/nvm/etc/bash_completion.d/nvm"
else
  export NVM_AUTO_USE=true
  export NVM_AUTO_INSTALL=true
fi

# --- Oh My Posh Prompt ---
if $IS_MAC && command -v brew >/dev/null 2>&1; then
  eval "$(oh-my-posh init zsh --config $(brew --prefix oh-my-posh)/themes/catppuccin.omp.json)"
else
  eval "$(oh-my-posh init zsh --config ~/.cache/oh-my-posh/themes/catppuccin.omp.json)"
fi

# --- Zinit Plugin Manager ---
if [ ! -f "$HOME/.zinit/bin/zinit.zsh" ]; then
  mkdir -p "$HOME/.zinit"
  git clone https://github.com/zdharma-continuum/zinit.git "$HOME/.zinit/bin"
fi
source "$HOME/.zinit/bin/zinit.zsh"

# --- Plugins ---
zinit light zsh-users/zsh-autosuggestions
zinit light zdharma-continuum/fast-syntax-highlighting
zinit light zsh-users/zsh-history-substring-search
zinit light lukechilds/zsh-nvm

# --- Source Aliases and Functions ---
[ -f "$HOME/.zsh/aliases.zsh" ] && source "$HOME/.zsh/aliases.zsh"
[ -f "$HOME/.zsh/functions.zsh" ] && source "$HOME/.zsh/functions.zsh"

if [[ $- == *i* ]]; then
  ensure_lts_node
fi


# --- Bun & pnpm ---
export BUN_INSTALL="$HOME/.bun"
export PATH="$BUN_INSTALL/bin:$PATH"
if $IS_MAC; then
  export PNPM_HOME="$HOME/Library/pnpm"
else
  export PNPM_HOME="$HOME/.local/share/pnpm"
fi
case ":$PATH:" in
  *":$PNPM_HOME:"*) ;;
  *) export PATH="$PNPM_HOME:$PATH" ;;
esac

# --- FZF & Bat ---
if command -v fzf >/dev/null 2>&1; then
  export FZF_DEFAULT_OPTS='--prompt="🔭 " --height 80% --layout=reverse --border'
  export FZF_DEFAULT_COMMAND='rg --files --no-ignore --hidden --follow --glob "!.git/" --glob "!node_modules/" --glob "!vendor/" --glob "!undo/" --glob "!plugged/"'
  export BAT_THEME='gruvbox-dark'
  # Use fzf for Ctrl+R
  bindkey '^R' fzf-history-widget
  fzf-history-widget() {
    local selected
    selected=$(fc -l 1 | awk '{$1=""; print substr($0,2)}' | fzf --tac +s --query="$LBUFFER")
    if [[ -n $selected ]]; then
      LBUFFER=$selected
      zle redisplay
    fi
  }
  zle -N fzf-history-widget
fi

# --- Key Bindings ---
bindkey '^[[A' history-substring-search-up
bindkey '^[[B' history-substring-search-down

# --- Starship & Zoxide ---
if command -v starship >/dev/null 2>&1; then
  eval "$(starship init zsh)"
fi
if command -v zoxide >/dev/null 2>&1; then
  eval "$(zoxide init zsh)"
fi

# --- Angular CLI Autocompletion ---
if command -v ng >/dev/null 2>&1; then
  source <(ng completion script)
fi


