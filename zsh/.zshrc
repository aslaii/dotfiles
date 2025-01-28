export PATH="/opt/homebrew/bin:$PATH"

eval "$(oh-my-posh init zsh --config $(brew --prefix oh-my-posh)/themes/catppuccin.omp.json)"


alias zshconfig="nvim ~/.zshrc"
alias tmxconfig="nvim ~/.tmux.conf"
alias nvimconfig="nvim ~/.config/nvim/lua/config/lazy.lua"
alias rtm="tmux source-file ~/.tmux.conf"
alias vim="nvim"
alias tmx="tmux"

# Work Aliases
alias run-work-1="./wsg_setup.sh"
alias run-work-2="./reforal_setup.sh"
alias run-work-3="./tulu_setup.sh"
alias run-work-4="./job_setup.sh"
alias run-omni="./omni_setup.sh"

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
