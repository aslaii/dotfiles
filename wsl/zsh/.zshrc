# Path setup
export PATH="$HOME/.local/bin:$PATH"
export PATH="$PATH:/mnt/c/Program Files/Git/mingw64/bin"

# Oh My Posh prompt
eval "$(oh-my-posh init zsh --config ~/.cache/oh-my-posh/themes/catppuccin.omp.json)"

# --- Zinit Plugin Manager ---
if [[ ! -f "$HOME/.zinit/bin/zinit.zsh" ]]; then
  mkdir -p "$HOME/.zinit"
  git clone https://github.com/zdharma-continuum/zinit.git "$HOME/.zinit/bin"
fi
source "$HOME/.zinit/bin/zinit.zsh"

# --- Plugins ---
export NVM_AUTO_USE=true
export NVM_AUTO_INSTALL=true
zinit light lukechilds/zsh-nvm
zinit light zsh-users/zsh-autosuggestions
zinit light zdharma-continuum/fast-syntax-highlighting
zinit light zsh-users/zsh-history-substring-search

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

# --- Bun & pnpm ---
[ -s "$HOME/.bun/_bun" ] && source "$HOME/.bun/_bun"
export BUN_INSTALL="$HOME/.bun"
export PATH="$BUN_INSTALL/bin:$PATH"
export PNPM_HOME="$HOME/.local/share/pnpm"
case ":$PATH:" in
  *":$PNPM_HOME:"*) ;;
  *) export PATH="$PNPM_HOME:$PATH" ;;
esac

# --- Custom Aliases ---
[ -f "$HOME/.zsh/aliases.zsh" ] && source "$HOME/.zsh/aliases.zsh"

# --- Custom Functions ---
[ -f "$HOME/.zsh/functions.zsh" ] && source "$HOME/.zsh/functions.zsh"

