# wsl/zsh/.zsh/aliases.zsh
# Navigation
alias home="cd ~"
alias zshconfig="nvim ~/.zshrc"
alias tmxconfig="nvim ~/.tmux.conf"
alias nvimconfig="nvim ~/.config/nvim/lua/config/lazy.lua"

# Tmux
alias rtm="tmux source-file ~/.tmux.conf"
alias tmx="tmux"
alias tks="tmux kill-server"

# Editor
alias vim="nvim"
alias nf='nvimGoToFiles'
alias ngl='nvimGoToLine'

# Package managers
alias pm='pnpm'
alias mailhog='~/go/bin/MailHog'
alias bat="batcat"

# Work scripts
alias run-work-1="~/wsg_setup.sh"
alias run-work-2="~/dotfiles/setups/reforal_setup.sh"
alias run-work-3="~/dotfiles/setups/tulu_setup.sh"
alias run-work-4="~/job_setup.sh"
alias run-work-5="~/dotfiles/setups/vublox_setup.sh"
alias run-omni="~/dotfiles/setups/omni_setup.sh"
alias run-coden="~/dotfiles/setups/coden_setup.sh"
alias run-resq="~/dotfiles/setups/resq_setup.sh"
alias run-rfl="~/dotfiles/setups/reforal_setup.sh"
alias run-yg="~/dotfiles/setups/yg_setup.sh"
alias run-goose="~/dotfiles/setups/goose_setup.sh"
alias run-auto="~/dotfiles/setups/auto_setup.sh"


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

