#!/usr/bin/env bash

set -e

# Helper function to install apt packages only if not already installed
install_if_missing() {
  for pkg in "$@"; do
    if ! dpkg -s "$pkg" &>/dev/null; then
      echo "Installing $pkg..."
      sudo apt install -y "$pkg"
    else
      echo "$pkg is already installed."
    fi
  done
}

# 1. Update and upgrade
sudo apt update && sudo apt upgrade -y

# 2. Install essential packages
install_if_missing \
  git zsh fzf bat ripgrep tmux stow curl wget unzip build-essential \
  python3-pip gh php php-cli php-mbstring php-xml php-curl php-zip \
  php-gd php-pgsql php-sqlite3 php-bcmath php-intl php-json php-readline \
  postgresql postgresql-contrib libpq-dev redis-server golang-go software-properties-common

# 3. Install Composer globally to ~/.local/bin
if ! command -v composer &>/dev/null; then
  mkdir -p "$HOME/.local/bin"
  EXPECTED_SIGNATURE="$(wget -q -O - https://composer.github.io/installer.sig)"
  php -r "copy('https://getcomposer.org/installer', 'composer-setup.php');"
  ACTUAL_SIGNATURE="$(php -r "echo hash_file('sha384', 'composer-setup.php');")"
  if [ "$EXPECTED_SIGNATURE" = "$ACTUAL_SIGNATURE" ]; then
    php composer-setup.php --quiet --install-dir="$HOME/.local/bin" --filename=composer
    echo "Composer installed successfully"
  else
    echo 'ERROR: Invalid Composer installer signature'
    rm composer-setup.php
    exit 1
  fi
  rm composer-setup.php
else
  echo "Composer is already installed."
fi

# 4. Install MailHog (latest release)
if [ ! -f "$HOME/go/bin/MailHog" ]; then
  mkdir -p "$HOME/go/bin"
  MAILHOG_URL=$(curl -s https://api.github.com/repos/mailhog/MailHog/releases/latest |
    grep browser_download_url |
    grep linux_amd64 |
    cut -d '"' -f 4)
  wget "$MAILHOG_URL" -O "$HOME/go/bin/MailHog"
  chmod +x "$HOME/go/bin/MailHog"
else
  echo "MailHog is already installed."
fi

# 5. Install latest Neovim from official PPA
if ! command -v nvim &>/dev/null || [[ "$(nvim --version | head -n1)" != *"0.10"* ]]; then
  if ! grep -q "^deb .*$" /etc/apt/sources.list.d/neovim-ppa-unstable.list 2>/dev/null; then
    sudo add-apt-repository -y ppa:neovim-ppa/unstable
    sudo apt update
  fi
  install_if_missing neovim
else
  echo "Neovim is already installed."
fi

# 6. GitHub CLI authentication
if ! gh auth status &>/dev/null; then
  echo "Please authenticate with GitHub CLI:"
  gh auth login
fi

# 7. Set global git config
git config --global user.name "Jericho Bermas"
git config --global user.email "jecho.deleon@gmail.com"

# 8. Clone dotfiles repo if not present
if [ ! -d "$HOME/dotfiles" ]; then
  gh repo clone aslaii/dotfiles "$HOME/dotfiles"
fi

# 9. Stow .zshrc and .tmux.conf from dotfiles/wsl
cd "$HOME/dotfiles" || {
  echo "dotfiles dir not found!"
  exit 1
}

for file in .zshrc .tmux.conf; do
  # Remove broken symlinks
  if [ -L "$HOME/$file" ] && [ ! -e "$HOME/$file" ]; then
    echo "Removing broken symlink $HOME/$file"
    rm "$HOME/$file"
  fi
  # Backup regular files
  if [ -e "$HOME/$file" ] && [ ! -L "$HOME/$file" ]; then
    echo "Backing up $HOME/$file to $HOME/${file}.bak"
    mv "$HOME/$file" "$HOME/${file}.bak"
  fi
done

stow -t "$HOME" wsl

# 10. Install oh-my-posh
if ! command -v oh-my-posh &>/dev/null; then
  curl -s https://ohmyposh.dev/install.sh | bash -s
else
  echo "oh-my-posh is already installed."
fi

# 11. Download oh-my-posh theme if not present
mkdir -p "$HOME/.cache/oh-my-posh/themes"
if [ ! -f "$HOME/.cache/oh-my-posh/themes/catppuccin.omp.json" ]; then
  wget -O "$HOME/.cache/oh-my-posh/themes/catppuccin.omp.json" \
    https://raw.githubusercontent.com/catppuccin/oh-my-posh/main/themes/catppuccin.omp.json
else
  echo "Oh My Posh theme already present."
fi

# 12. Install bun
if [ ! -d "$HOME/.bun" ]; then
  curl -fsSL https://bun.sh/install | bash
else
  echo "bun is already installed."
fi

# 13. Install pnpm
if ! command -v pnpm &>/dev/null; then
  curl -fsSL https://get.pnpm.io/install.sh | sh -
else
  echo "pnpm is already installed."
fi

# 14. Install nvm
if [ ! -d "$HOME/.nvm" ]; then
  curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
else
  echo "nvm is already installed."
fi

# 15. Install zsh plugins
mkdir -p "$HOME/.zsh"
if [ ! -d "$HOME/.zsh/zsh-autosuggestions" ]; then
  git clone https://github.com/zsh-users/zsh-autosuggestions "$HOME/.zsh/zsh-autosuggestions"
else
  echo "zsh-autosuggestions already installed."
fi
if [ ! -d "$HOME/.zsh/zsh-fast-syntax-highlighting" ]; then
  git clone https://github.com/zdharma-continuum/fast-syntax-highlighting.git "$HOME/.zsh/zsh-fast-syntax-highlighting"
else
  echo "zsh-fast-syntax-highlighting already installed."
fi

# 16. Set zsh as default shell
if [ "$SHELL" != "$(which zsh)" ]; then
  chsh -s "$(which zsh)"
  echo "Default shell changed to zsh. Please restart your terminal."
fi

# 17. Clone LazyVim config and link to Neovim config directory
if [ ! -d "$HOME/lazyvim" ]; then
  gh repo clone aslaii/lazyvim "$HOME/lazyvim"
else
  echo "LazyVim repo already present."
fi

# 18. Install lazygit (latest release)
if ! command -v lazygit &>/dev/null; then
  LAZYGIT_VERSION=$(curl -s "https://api.github.com/repos/jesseduffield/lazygit/releases/latest" | grep -Po '"tag_name": "\K.*?(?=")')
  wget "https://github.com/jesseduffield/lazygit/releases/download/${LAZYGIT_VERSION}/lazygit_${LAZYGIT_VERSION#v}_Linux_x86_64.tar.gz" -O /tmp/lazygit.tar.gz
  tar xf /tmp/lazygit.tar.gz -C /tmp
  sudo install /tmp/lazygit /usr/local/bin
  rm /tmp/lazygit /tmp/lazygit.tar.gz
else
  echo "lazygit is already installed."
fi

# 19. Link LazyVim to Neovim config
if [ -e "$HOME/.config/nvim" ] && [ ! -L "$HOME/.config/nvim" ]; then
  echo "Backing up existing Neovim config to ~/.config/nvim.bak"
  mv "$HOME/.config/nvim" "$HOME/.config/nvim.bak"
fi

mkdir -p "$HOME/.config"
if [ ! -L "$HOME/.config/nvim" ]; then
  ln -sfn "$HOME/lazyvim" "$HOME/.config/nvim"
  echo "Linked $HOME/lazyvim to $HOME/.config/nvim"
else
  echo "Neovim config already linked."
fi

echo "Setup complete! You may want to restart your terminal."
