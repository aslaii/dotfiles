# setups/ — Role Scripts

Project-specific bootstrap scripts that set up development environments for different projects. Each script creates a tmux session with the right windows, directories, and tools.

## functions.sh

Shared utility functions available to all role scripts. Source with `. ./functions.sh` or `. "$(dirname "$0")/functions.sh"`.

### `switch_github_account`

```bash
switch_github_account <account_name> <git_name> <git_email>
```

- Checks the currently active GitHub CLI account via `gh auth status`
- Switches to `<account_name>` with `gh auth switch` if not already active
- Sets `git config --global user.name` and `user.email` to the provided values
- Use at the start of a role script to ensure the right identity for commits and PRs

### `kill_port`

```bash
kill_port <port_number>
```

- Kills any process listening on the specified TCP port
- Uses `lsof -ti tcp:<port>` to find the PID and `kill -9` to terminate
- Silently succeeds if no process is using the port

### `nvm_use_project_node`

```bash
nvm_use_project_node <directory>
```

- Reads `.nvmrc` from the given directory (falls back to `package.json` `engines.node`)
- Sources nvm and runs `nvm install` + `nvm use` to switch to the correct Node version
- Prints a message if no Node version is specified in the directory

## Scripts

| Script | Purpose | Uses functions.sh |
|--------|---------|-------------------|
| `auto_setup.sh` | Creates a tmux session "Just Setup" for the `~/auto/` Python project with btop monitoring | No |
| `dotconfig_setup.sh` | Creates a tmux session "dotconfig" for dotfiles editing with a Codex pane | No |
| `gondoor_setup.sh` | Gondoor monorepo bootstrap with Supabase, frontend, backend, admin, and AI tool windows | Yes |
| `goose_setup.sh` | Gooselaw project bootstrap with btop, dev servers, and per-project Codex windows | Yes |
| `lsp_setup.sh` | Installs global CLI tools (TypeScript, ESLint, Prettier, NestJS CLI) via pnpm | No |
| `rave_setup.sh` | Rave/Mobii project bootstrap with btop and per-project Gemini windows | Yes |

### Script Details

**gondoor_setup.sh** supports CLI flags:
- `--reset` — Rebuild the tmux session and restart app ports
- `--stop` — Stop the session and shared Supabase stack
- `--ai codex|claude|gemini` — Choose the AI CLI for the AI window
- `--root PATH` — Override the project root directory

**goose_setup.sh** and **rave_setup.sh** support:
- `--root PATH` — Override the project root directory
- `--filter TERM` — Filter available projects by name
- Positional arguments to select specific project subdirectories
- Interactive project selection when no arguments are provided

## Adding a New Role Script

```bash
#!/bin/bash
# <project>_setup.sh — Bootstrap <project> development environment

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "$SCRIPT_DIR/functions.sh"

# Switch to the right GitHub account (if needed)
# switch_github_account "account" "Your Name" "your@email.com"

# Set up Node version (if needed)
# nvm_use_project_node "/path/to/project"

# Create tmux session
SESSION_NAME="<project>"
tmux new-session -d -s "$SESSION_NAME" -c "/path/to/project"

# Add windows as needed
# tmux new-window -t "$SESSION_NAME" -n "editor" -c "/path/to/project"

# Attach
tmux attach-session -t "$SESSION_NAME"
```

Save as `setups/<project>_setup.sh` and make executable with `chmod +x`.
