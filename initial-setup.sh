#!/usr/bin/env bash

set -e

# 1. Update and install essential packages
sudo apt update && sudo apt upgrade -y
sudo apt install -y \
    git \
    zsh \
    fzf \
    bat \
    ripgrep \
    tmux \
    stow \
    curl \
    wget \
    unzip \
    build-essential \
    python3-pip \
    gh

# 2. Install latest Neovim from official PPA
sudo apt install -y software-properties-common
sudo add-apt-repository -y ppa:neovim-ppa/stable
sudo apt update
sudo apt install -y neovim

# 3. GitHub CLI authentication
if ! gh auth status &>/dev/null; then
    echo "Please authenticate with GitHub CLI:"
    gh auth login
fi

# Set global git config
git config --global user.name "Jericho Bermas"
git config --global user.email "jecho.deleon@gmail.com"


# 4. Clone dotfiles repo if not present
if [ ! -d "$HOME/dotfiles" ]; then
    gh repo clone aslaii/dotfiles "$HOME/dotfiles"
fi

# 5. Stow .zshrc from dotfiles/wsl
cd "$HOME/dotfiles"
stow -t "$HOME" wsl

# 6. Install oh-my-posh
if ! command -v oh-my-posh &>/dev/null; then
    curl -s https://ohmyposh.dev/install.sh | bash -s
fi

# 7. Download oh-my-posh theme if not present
mkdir -p "$HOME/.cache/oh-my-posh/themes"
if [ ! -f "$HOME/.cache/oh-my-posh/themes/catppuccin.omp.json" ]; then
    wget -O "$HOME/.cache/oh-my-posh/themes/catppuccin.omp.json" \
        https://raw.githubusercontent.com/catppuccin/oh-my-posh/main/themes/catppuccin.omp.json
fi

# 8. Install bun
if [ ! -d "$HOME/.bun" ]; then
    curl -fsSL https://bun.sh/install | bash
fi

# 9. Install pnpm
if ! command -v pnpm &>/dev/null; then
    curl -fsSL https://get.pnpm.io/install.sh | sh -
fi

# 10. Install nvm
if [ ! -d "$HOME/.nvm" ]; then
    curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
fi

# 11. Install zsh plugins
mkdir -p "$HOME/.zsh"
if [ ! -d "$HOME/.zsh/zsh-autosuggestions" ]; then
    git clone https://github.com/zsh-users/zsh-autosuggestions "$HOME/.zsh/zsh-autosuggestions"
fi
if [ ! -d "$HOME/.zsh/zsh-fast-syntax-highlighting" ]; then
    git clone https://github.com/zdharma-continuum/fast-syntax-highlighting.git "$HOME/.zsh/zsh-fast-syntax-highlighting"
fi

# 12. Set zsh as default shell
if [ "$SHELL" != "$(which zsh)" ]; then
    chsh -s "$(which zsh)"
    echo "Default shell changed to zsh. Please restart your terminal."
fi

# 13. Clone LazyVim config and link to Neovim config directory
if [ ! -d "$HOME/lazyvim" ]; then
    gh repo clone aslaii/lazyvim "$HOME/lazyvim"
fi

# 14. Install lazygit (latest release)
if ! command -v lazygit &>/dev/null; then
    LAZYGIT_VERSION=$(curl -s "https://api.github.com/repos/jesseduffield/lazygit/releases/latest" | grep -Po '"tag_name": "\K.*?(?=")')
    wget "https://github.com/jesseduffield/lazygit/releases/download/${LAZYGIT_VERSION}/lazygit_${LAZYGIT_VERSION#v}_Linux_x86_64.tar.gz" -O /tmp/lazygit.tar.gz
    tar xf /tmp/lazygit.tar.gz -C /tmp
    sudo install /tmp/lazygit /usr/local/bin
    rm /tmp/lazygit /tmp/lazygit.tar.gz
fi


# Remove existing nvim config if it's not a symlink to lazyvim
if [ -e "$HOME/.config/nvim" ] && [ ! -L "$HOME/.config/nvim" ]; then
    echo "Backing up existing Neovim config to ~/.config/nvim.bak"
    mv "$HOME/.config/nvim" "$HOME/.config/nvim.bak"
fi

mkdir -p "$HOME/.config"
if [ ! -L "$HOME/.config/nvim" ]; then
    ln -sfn "$HOME/lazyvim" "$HOME/.config/nvim"
    echo "Linked $HOME/lazyvim to $HOME/.config/nvim"
fi

echo "Setup complete! You may want to restart your terminal."

