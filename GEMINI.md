# GEMINI.md: Dotfiles Repository Analysis

## Directory Overview

This repository contains personal configuration files (dotfiles) for a macOS development environment. It automates the setup of a new machine and ensures a consistent experience across systems.

The primary tools configured include:
- **Shell:** Zsh, with plugins managed by Zinit, and customized with Starship and oh-my-posh.
- **Terminal:** Ghostty and tmux for terminal multiplexing.
- **Editor:** Neovim, configured with LazyVim.
- **Package Management:** Homebrew is used for installing most of the software.

## Installation and Setup

### Initial macOS Setup
The main script for provisioning a new macOS machine is `initial-setup-macos.sh`.

To run it:
```bash
bash initial-setup-macos.sh
```

This script performs the following actions:
1.  Installs Xcode Command Line Tools.
2.  Installs Homebrew and various formulae and casks.
3.  Symlinks the configuration files from this repository to their correct locations (e.g., `~/.config/nvim`, `~/.zshrc`).
4.  Installs themes and plugins for tools like `tmux`, `btop`, and `oh-my-posh`.
5.  Sets Zsh as the default shell.

### Client-Specific Setups
The `setups/` directory contains scripts for bootstrapping specific project or client environments. For example, `setups/auto_setup.sh` creates a dedicated `tmux` session for a Python project.

## Key Files and Directories

-   `initial-setup-macos.sh`: The main entry point for setting up a new macOS system.
-   `macos/zsh/zshrc`: The main configuration file for Zsh on macOS.
-   `nvim/`: Contains the Neovim configuration based on LazyVim.
-   `tmux/`: Configuration for `tmux`, including the Catppuccin theme.
-   `AGENTS.md`: **Important guidelines for AI agents** interacting with this repository. It covers project structure, commit conventions, and security practices.
-   `codex/config.toml`: Configuration for the Codex CLI, indicating a preference for AI-driven automation.

## Development Conventions

As outlined in `AGENTS.md`, development in this repository should follow these conventions:
-   **Shell Scripts:** Target Bash, use `set -e`, and prefer functions for reusable logic. Use `shellcheck` for linting.
-   **Idempotency:** Scripts should be safe to re-run.
-   **Commits:** Use imperative, concise commit subjects.
-   **Security:** Never commit secrets. Store them in system keychains or external `.env` files.

## Engineering Standards

To maintain a high-quality codebase for React, React Native, and NestJS, all agents must adhere to:

- **SOLID Principles**: 
    - *Single Responsibility*: Group logic into small, focused services/components.
    - *Open/Closed*: Prefer composition and strategy patterns over complex conditionals.
    - *Interface Segregation*: Define narrow interfaces/DTOs for specific use cases.
- **DRY (Don't Repeat Yourself)**: Extract common logic into custom hooks (Frontend) or shared providers/utilities (Backend).
- **Type Safety**: Absolute preference for TypeScript. Avoid `any`. Use strict DTOs for NestJS and Zod/Type interfaces for React.
- **Testing**: Every new feature or bug fix MUST include a corresponding test (Jest for NestJS/React).

## Tooling & Interoperability

### MCP (Model Context Protocol)
- Use the **Filesystem MCP** for deep directory indexing when searching for patterns.
- Configure specialized MCPs in `gemini/settings.json` for external integrations (e.g., Slack, GitHub).

### LSP & CLI Tools
For autonomous codebase management, ensure the following are available in the shell:
- `typescript-language-server`: For TS/JS intelligence.
- `eslint` / `prettier`: For standardizing code style.
- `nest-cli`: For scaffolding and module management.
- `bun` / `pnpm`: Primary package managers.

### AI Agent Workflow (Plan Mode)
- **Strict Read-Only**: While in Plan Mode, you must EXCLUSIVELY use read-only tools. Any attempt to modify files or use write-capable tools (including MCP-based file edits) is prohibited.
- **Goal**: Focus solely on research, strategy, and design.
