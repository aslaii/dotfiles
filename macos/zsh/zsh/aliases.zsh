# macos/zsh/zsh/aliases.zsh
# Navigation
alias home="cd ~"
alias zshconfig="nvim ~/.zshrc"
alias tmxconfig="nvim ~/.tmux.conf"
alias nvimconfig="nvim ~/.config/nvim/lua/config/lazy.lua"

# Dotfiles
alias dotcheck='bash "$HOME/dotfiles/initial-setup-macos.sh" --check'

# Tmux
alias rtm='command tmux source-file ~/.tmux.conf'
alias tmx='tmux'
alias tks='command tmux detach'
alias tkx='command tmux kill-server'

# Editor
alias vim="nvim"
alias nf='nvimGoToFiles'
alias ngl='nvimGoToLine'

# Package managers
alias pm='pnpm'
alias mailhog='~/go/bin/MailHog'
alias bat="batcat"

# Work scripts
alias rave="~/dotfiles/setups/rave_setup.sh"
alias gondoor="~/dotfiles/setups/gondoor_setup.sh"
alias gondoor-stop="~/dotfiles/setups/gondoor_setup.sh --stop"
alias dotconfig="~/dotfiles/setups/dotconfig_setup.sh"
alias cpr="~/dotfiles/scripts/create-pr.sh"

# Git
alias lg="lazygit"
alias gpod="git pull origin develop"
alias gsw="gh auth switch"

# PHP
alias phpop="php artisan optimize"
alias phprl="php artisan route:list"
alias phpas="php artisan serve"

# Bun
alias bsd="bun start:dev"
alias blf="bun lint -- --fix"

alias x86="arch -x86_64 zsh --login"
alias arm="arch -arm64 zsh --login"

# Python
alias venv="source venv/bin/activate"
alias python="python3"

# btop
alias btop='btop_themed'

# goose
alias goose='cd ~/work/goose/'
