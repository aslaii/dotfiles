# Repository Guidelines

## Project Structure & Module Organization
- `initial-setup.sh` provisions a baseline Linux workstation, linking dotfiles under `$HOME`. Treat it as the reference for new setup steps.
- `setups/` holds client- or role-specific bootstrap scripts; common helpers live in `setups/functions.sh`.
- `skhd/`, `yabai/`, `tmux/`, and `wsl/` mirror the configs that are symlinked into local machines. Keep platform-specific tweaks in their respective folders.
- `extra/` and `unlock/` store auxiliary scripts and device notes. Update them when adding one-off workflows to avoid drift.

## Build, Test, and Development Commands
- `bash initial-setup.sh`: full workstation bootstrap; run in a fresh WSL or Ubuntu environment.
- `bash setups/<profile>_setup.sh`: run the minimal script needed for a customer or team profile (e.g., `bash setups/goose_setup.sh`).
- `chmod +x <file>` before first run if Git has lost executable bits.

## Coding Style & Naming Conventions
- Shell scripts target Bash; begin with `#!/usr/bin/env bash`, enable `set -e`, and prefer functions for reusable logic.
- Indent with two spaces inside functions and conditionals, matching existing scripts. Use lowercase `snake_case` for function names and environment-specific script filenames.
- Favor idempotent operations (`ln -sfn`, guard `install_if_missing`) so rerunning scripts is safe.

## Testing Guidelines
- Dry-run new commands in an isolated shell before committing. For risky loops or installs, gate them behind explicit user prompts.
- Run `bash -n <script>` and `shellcheck <script>` to catch syntax and safety issues.
- After edits to symlinks or configs, verify they load by sourcing `.zshrc`, restarting `tmux`, or reloading `yabai --restart`.

## Commit & Pull Request Guidelines
- Follow imperative, concise commit subjects (e.g., `Refine wsl zsh aliases`). Prefix with a Conventional Commit type when it clarifies scope (`feat:`, `fix:`).
- Each PR should describe affected machines or workflows, list manual verification steps, and link any issue or request ticket.
- Include before/after snippets for config changes, and mention any scripts that must be rerun.

## Security & Configuration Tips
- Never commit API keys, SSH material, or personal tokens. Keep secrets in system keychains or `.env` files outside this repo.
- Document account switches in `setups/functions.sh` so automations stay traceable, and prefer GitHub CLI `gh auth switch` for credential handling.
