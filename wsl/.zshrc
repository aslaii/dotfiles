export PATH=$PATH:/home/user/.local/bin


eval "$(oh-my-posh init zsh --config ~/.cache/oh-my-posh/themes/catppuccin.omp.json)"

source ~/.zsh/zsh-autosuggestions/zsh-autosuggestions.zsh
source ~/.zsh/zsh-fast-syntax-highlighting/fast-syntax-highlighting.plugin.zsh
source ~/.zsh/zsh-history-substring-search/zsh-history-substring-search.zsh

# Bind up/down to substring search
bindkey '^[[A' history-substring-search-up
bindkey '^[[B' history-substring-search-down

if command -v fzf >/dev/null 2>&1; then
  export FZF_DEFAULT_OPTS="--height 40% --layout=reverse --border"
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
  zle     -N   fzf-history-widget
fi


function displayFZFFiles {
    echo $(fzf --preview 'batcat --theme=gruvbox-dark --color=always --style=header,grid --line-range :400 {}')
}

function nvimGoToFiles {
    nvimExists=$(which nvim)
    if [ -z "$nvimExists" ]; then
      return;
    fi;

    selection=$(displayFZFFiles);
    if [ -z "$selection" ]; then
        return;
    else
        nvim $selection;
    fi;
}

function displayRgPipedFzf {
    echo $(rg . -n --glob "!.git/" --glob "!vendor/" --glob "!node_modules/" | fzf);
}

function nvimGoToLine {
    nvimExists=$(which nvim)
    if [ -z "$nvimExists" ]; then
      return;
    fi
    selection=$(displayRgPipedFzf)
    if [ -z "$selection" ]; then
      return;
    else 
        filename=$(echo $selection | cut -d: -f1)
        line=$(echo $selection | cut -d: -f2)
        nvim $(printf "+%s %s" $line $filename) +"normal zz^";
    fi
}


alias  home="cd ~"

alias zshconfig="nvim ~/.zshrc"
alias tmxconfig="nvim ~/.tmux.conf"
alias nvimconfig="nvim ~/.config/nvim/lua/config/lazy.lua"
alias rtm="tmux source-file ~/.tmux.conf"
alias vim="nvim"
alias tmx="tmux"
alias nf='nvimGoToFiles'
alias ngl='nvimGoToLine'
alias pm='pnpm'
alias mailhog='~/go/bin/MailHog'
alias bat="batcat"

# Work Aliases
alias run-work-1="~/wsg_setup.sh"
alias run-work-2="~/dotfiles/setups/reforal_setup.sh"
alias run-work-3="~/dotfiles/setups/tulu_setup.sh"
alias run-work-4="~/job_setup.sh"
alias run-work-5="~/dotfiles/setups/vublox_setup.sh"
alias run-omni="~/omni_setup.sh"
alias run-coden="~/dotfiles/setups/coden_setup.sh"

# Git Aliases
alias lg="lazygit"
alias gpod="git pull origin develop"

# Tmux Aliases
alias tks="tmux kill-server"


# PHP Aliases
alias phpop="php artisan optimize"
alias phprl="php artisan route:list"
alias phpas="php artisan serve"

alias bsd="bun start:dev"
alias blf="bun lint -- --fix"

export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
[ -s "$NVM_DIR/bash_completion" ] && \. "$NVM_DIR/bash_completion"

export PATH="$PATH:/mnt/c/Program Files/Git/mingw64/bin"

#export FZF_DEFAULT_OPTS='--color=fg:#f8f8f2,bg:#282a36,hl:#bd93f9 --color=fg+:#f8f8f2,bg+:#44475a,hl+:#bd93f9 --color=info:#ffb86c,prompt:#50fa7b,pointer:#ff79c6 --color=marker:#ff79c6,spinner:#ffb86c,header:#6272a4 --height 80% --layout=reverse --border'
export FZF_DEFAULT_OPTS='--prompt="🔭 " --height 80% --layout=reverse --border'

# Default command
export FZF_DEFAULT_COMMAND='rg --files --no-ignore --hidden --follow --glob "!.git/" --glob "!node_modules/" --glob "!vendor/" --glob "!undo/" --glob "!plugged/"'

# Preview them using bat
export BAT_THEME='gruvbox-dark'



# bun completions
[ -s "/home/user/.bun/_bun" ] && source "/home/user/.bun/_bun"

# bun
export BUN_INSTALL="$HOME/.bun"
export PATH="$BUN_INSTALL/bin:$PATH"

# pnpm
export PNPM_HOME="/home/user/.local/share/pnpm"
case ":$PATH:" in
  *":$PNPM_HOME:"*) ;;
  *) export PATH="$PNPM_HOME:$PATH" ;;
esac
# pnpm end
