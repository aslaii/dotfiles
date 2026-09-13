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

# Git
alias lg="lazygit"
alias gpod="git pull origin develop"
alias gsw="gh auth switch"

alias x86="arch -x86_64 zsh --login"
alias arm="arch -arm64 zsh --login"

# Python
alias venv="source venv/bin/activate"
alias python="python3"

# btop
alias btop='btop_themed'

# OMP
alias ompb="omp-budget"
alias ompd='ompb --config "$HOME/dotfiles/omp/no-claude.yml"'
