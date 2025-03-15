export PATH="/opt/homebrew/bin:$PATH"
export PATH="/Users/jerichobermas/.bun/bin:$PATH"

source $(brew --prefix)/share/zsh-autosuggestions/zsh-autosuggestions.zsh
source $(brew --prefix)/share/zsh-syntax-highlighting/zsh-syntax-highlighting.zsh

eval "$(oh-my-posh init zsh --config $(brew --prefix oh-my-posh)/themes/catppuccin.omp.json)"
eval "$(zoxide init zsh)"
eval "$(starship init zsh)"

alias home="cd ~"
alias ..="cd .."

alias zshconfig="nvim ~/.zshrc"
alias tmxconfig="nvim ~/.tmux.conf"
alias nvimconfig="nvim ~/.config/nvim/lua/config/lazy.lua"
alias rtm="tmux source-file ~/.tmux.conf"
alias vim="nvim"
alias tmx="tmux"
alias venv="source venv/bin/activate"

alias adb="~/platform-tools/adb"

alias nf='nvimGoToFiles'
alias ngl='nvimGoToLine'
alias pm='pnpm'
alias bat="batcat"

# Work Aliases
alias run-wsg="~/wsg_setup.sh"
alias run-reforal="~/reforal_setup.sh"
alias run-vublox="~/vublox_setup.sh"
alias run-tulu="~/tulu_setup.sh"
alias run-explore="~/job_setup.sh"
alias run-omni="~/omni_setup.sh"
alias run-rcb="~/rcb_setup.sh"

 
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
  [ -s "/opt/homebrew/opt/nvm/nvm.sh" ] && \. "/opt/homebrew/opt/nvm/nvm.sh"
  [ -s "/opt/homebrew/opt/nvm/etc/bash_completion.d/nvm" ] && \. "/opt/homebrew/opt/nvm/etc/bash_completion.d/nvm"

export PATH=$PATH:/Users/jerichobermas/.spicetify
export PATH="/opt/homebrew/opt/ruby/bin:$PATH"
export PATH="$HOME/development/flutter/bin:$PATH"
export PATH="/opt/homebrew/opt/openjdk/bin:$PATH"
export PATH="$PATH":"$HOME/.pub-cache/bin"
#export FZF_DEFAULT_OPTS='--color=fg:#f8f8f2,bg:#282a36,hl:#bd93f9 --color=fg+:#f8f8f2,bg+:#44475a,hl+:#bd93f9 --color=info:#ffb86c,prompt:#50fa7b,pointer:#ff79c6 --color=marker:#ff79c6,spinner:#ffb86c,header:#6272a4 --height 80% --layout=reverse --border'
export FZF_DEFAULT_OPTS='--prompt="🔭 " --height 80% --layout=reverse --border'

# Default command
export FZF_DEFAULT_COMMAND='rg --files --no-ignore --hidden --follow --glob "!.git/" --glob "!node_modules/" --glob "!vendor/" --glob "!undo/" --glob "!plugged/"'

# Preview them using bat
export BAT_THEME='gruvbox-dark'


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

# pnpm
export PNPM_HOME="/Users/jerichobermas/Library/pnpm"
case ":$PATH:" in
  *":$PNPM_HOME:"*) ;;
  *) export PATH="$PNPM_HOME:$PATH" ;;
esac
# pnpm end


# Load Angular CLI autocompletion.
source <(ng completion script)
