# Architecture Research

**Domain:** Personal dotfiles / developer environment management
**Researched:** 2026-03-30
**Confidence:** HIGH

## Standard Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                     Entry Points                                 │
│  ┌──────────────────────┐  ┌────────────────────────────┐        │
│  │ initial-setup-macos  │  │   initial-setup.sh (Linux) │        │
│  │       .sh            │  │   / WSL variant            │        │
│  └──────────┬───────────┘  └──────────────┬─────────────┘        │
│             │                             │                      │
├─────────────┴─────────────────────────────┴──────────────────────┤
│                     Bootstrap Phases                             │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐         │
│  │ Platform │  │ Package  │  │ Symlink  │  │ Services │         │
│  │  Guard   │  │ Install  │  │  Layer   │  │ & Auth   │         │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘         │
│       │             │             │              │               │
├───────┴─────────────┴─────────────┴──────────────┴───────────────┤
│                   Config Source Tree (repo)                      │
│  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐          │
│  │macos/│ │ wsl/ │ │nvim/ │ │tmux/ │ │skhd/ │ │ ...  │          │
│  │ zsh/ │ │ zsh/ │ │      │ │      │ │yabai/│ │      │          │
│  └──┬───┘ └──┬───┘ └──┬───┘ └──┬───┘ └──┬───┘ └──┬───┘          │
│     │        │        │        │        │        │               │
├─────┴────────┴────────┴────────┴────────┴────────┴───────────────┤
│                  Symlink Resolution Layer                        │
│  repo path ──── ln -sfn ────> expected home/XDG path            │
├─────────────────────────────────────────────────────────────────┤
│               Platform Runtime (not in repo)                    │
│  ~/.zshrc   ~/.tmux.conf   ~/.config/nvim   ~/.claude   etc.    │
└─────────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility | Typical Implementation |
|-----------|----------------|------------------------|
| Bootstrap entry point | Platform detection, orchestrate all phases in order | `initial-setup-macos.sh`, `initial-setup.sh` |
| Platform guard | Abort early on wrong OS/user, detect arch | `require_macos`, `ensure_expected_user` |
| Package manager layer | Install Homebrew, taps, formulae, casks | Idempotent check-before-install loops |
| Symlink layer | Map repo paths to expected home/XDG paths | `link_file()` with backup-on-collision logic |
| Service layer | Start daemons, auth external CLIs | `brew services`, `gh auth login`, MCP registration |
| Platform variant configs | OS/environment-specific shell and tool configs | `macos/zsh/`, `wsl/zsh/` directories |
| Tool configs | Self-contained per-tool configuration | `nvim/`, `tmux/`, `sketchybar/`, `yabai/`, etc. |
| AI assistant configs | Settings, skills, hooks, memory for AI CLIs | `claude/`, `gemini/`, `opencode/`, `codex/` |
| Role-specific setups | Client/project workspace launchers | `setups/*.sh` scripts |
| Shared utilities | Functions reused across setup scripts | `setups/functions.sh` |

## Recommended Project Structure

The repo's current structure already follows the best-practice per-tool directory layout:

```
dotfiles/
├── initial-setup-macos.sh   # Primary macOS entry point
├── initial-setup.sh         # Linux/WSL entry point
├── macos/                   # macOS-variant shell configs
│   └── zsh/
│       ├── zshrc            # Main shell config
│       └── zsh/             # Sourced modules (aliases.zsh, functions.zsh)
├── wsl/                     # Linux/WSL-variant shell configs
│   └── zsh/
├── nvim/                    # Neovim / LazyVim config
├── tmux/                    # tmux config
├── ghostty/                 # Terminal emulator config
├── yabai/                   # Window manager config
├── skhd/                    # Hotkey daemon config
├── sketchybar/              # Status bar config
├── claude/                  # Claude Code settings, skills, memory
├── gemini/                  # Gemini CLI settings
├── opencode/                # OpenCode settings
├── codex/                   # Codex CLI config
├── setups/                  # Role/project-specific workspace scripts
│   ├── functions.sh         # Shared utilities (kill_port, switch_github_account)
│   ├── gondoor_setup.sh     # Per-project tmux workspace launcher
│   ├── dotconfig_setup.sh   # Dotfiles workspace launcher
│   └── ...
└── scripts/                 # Repo-wide utility scripts
    ├── create-pr.sh
    └── sync-ai-cli-theme.sh
```

### Structure Rationale

- **Per-tool directories:** Each tool owns exactly its config. No file belongs to two directories. Makes it obvious what to edit and safe to symlink an entire directory.
- **Platform variant directories (`macos/`, `wsl/`):** Platform-specific shell config lives in namespaced directories. The bootstrap script selects the correct one via `CONFIG_VARIANT` or `resolve_config_path()`. Avoids runtime `if [[ IS_MAC ]]` branches inside the config files themselves.
- **`setups/`:** Role/client workspace launchers are not dotfiles — they are workflow scripts that happen to live here. Keeping them separate from per-tool configs prevents accidental symlinking.
- **AI configs alongside tool configs:** Treats AI CLIs as first-class development tools. The skills and memory files are versioned state, not ephemeral data.

## Architectural Patterns

### Pattern 1: Idempotent Check-Before-Act

**What:** Every operation (install, link, service start) checks current state first and no-ops if already in the desired state.

**When to use:** All bootstrap operations — package install, symlink creation, service registration, auth steps.

**Trade-offs:** Adds verbosity (each function has a guard clause), but makes the script safe to rerun on existing machines, which is the primary use case after pulling updates.

**Example:**
```bash
link_file() {
  local source="$1" target="$2"

  # Guard: broken symlink → remove, then relink
  [[ -L "$target" && ! -e "$target" ]] && rm "$target"

  # Guard: real file exists → back up, then relink
  if [[ -e "$target" && ! -L "$target" ]]; then
    mv "$target" "${target}.bak.$(date +%s)"
  fi

  mkdir -p "$(dirname "$target")"
  ln -sfn "$source" "$target"
}
```

### Pattern 2: Backup-on-Collision Symlink Management

**What:** When a real (non-symlink) file already exists at a target path, rename it to `<target>.bak.<timestamp>` before creating the symlink, preserving the user's existing config.

**When to use:** The `link_file()` helper — applied to every symlink target.

**Trade-offs:** Leaves backup files on disk. The timestamp suffix ensures reruns don't overwrite previous backups. Preferable to silent overwrite, which destroys user data.

### Pattern 3: Feature-Flag Gating via Environment Variables

**What:** Optional components (e.g., SketchyBar) are controlled by env vars with truthy/falsy checks rather than hardcoded presence. The same script works for machines without a status bar.

**When to use:** Any component not universally applicable: window manager, status bar, role-specific tools.

**Trade-offs:** Adds `SKETCHYBAR="${SKETCHYBAR:-true}"` boilerplate at the top; caller must document available flags. Better than separate scripts per variant.

**Example:**
```bash
SKETCHYBAR="${SKETCHYBAR:-true}"

if is_truthy "$SKETCHYBAR"; then
  install_sketchybar_support
  link_file "$DOTFILES_DIR/sketchybar" "${config_root}/sketchybar"
fi
```

### Pattern 4: Platform-Variant Config Selection

**What:** Shell configs live in named platform directories (`macos/zsh/zshrc`, `wsl/zsh/zshrc`). The bootstrap script resolves which variant to use at link time, not at shell startup. The resolved path is then a static symlink.

**When to use:** Any config that differs meaningfully between macOS and Linux/WSL — mainly shell environment, PATH setup, and package-manager paths.

**Trade-offs:** Requires maintaining separate files per platform. Simpler than runtime OS detection inside a single shared zshrc with many conditionals.

### Pattern 5: Role-Specific Workspace Launchers

**What:** `setups/<project>_setup.sh` scripts create opinionated tmux sessions with named windows and panes for a specific project. They source shared `functions.sh` for reusable helpers (port killing, GitHub account switching, Node version selection).

**When to use:** Recurrent multi-project/multi-pane workflows. Not for one-off setups.

**Trade-offs:** Tightly coupled to a specific project layout. Worth the coupling because the script codifies context that otherwise lives in memory.

## Data Flow

### Bootstrap Installation Flow

```
User runs: bash initial-setup-macos.sh
    |
    v
[Platform guard] — abort if wrong OS or user
    |
    v
[Prerequisite layer]
  Xcode CLI Tools -> Homebrew -> Shell env
    |
    v
[Package install layer]
  Taps -> Formulae -> Casks -> compatibility shims
    |
    v
[Asset download layer]
  Themes (oh-my-posh, btop, Catppuccin)
  SketchyBar font + SbarLua (if SKETCHYBAR=true)
    |
    v
[Symlink layer]  <-- reads from repo on disk
  link_configs() maps each repo dir -> home/XDG path
  ensure_neovim_config() links nvim/
    |
    v
[Plugin bootstrap layer]
  TPM (Tmux Plugin Manager)
    |
    v
[External service layer]
  Claude MCP server registration
  GitHub CLI authentication
  Default shell change (chsh)
    |
    v
[Print next steps] — manual actions that can't be automated
```

### Config Resolution Flow (Shell Startup)

```
~/.zshrc (symlink)
    -> dotfiles/macos/zsh/zshrc
        -> sources ~/.zsh/aliases.zsh  (symlink to dotfiles/macos/zsh/zsh/aliases.zsh)
        -> sources ~/.zsh/functions.zsh
        -> initializes Zinit plugin manager
        -> loads Zsh plugins (autosuggestions, syntax highlighting, nvm)
        -> calls ensure_gemini_api_key, set_shell_theme, sync_ai_cli_theme
```

### Symlink Map (repo → system)

| Repo path | System path |
|-----------|-------------|
| `macos/zsh/zshrc` | `~/.zshrc` |
| `macos/zsh/zsh/` | `~/.zsh/` |
| `tmux/tmux.conf` | `~/.tmux.conf` |
| `ghostty/config` | `~/Library/Application Support/com.mitchellh.ghostty/config` |
| `nvim/` | `~/.config/nvim/` |
| `yabai/` | `~/.config/yabai/` |
| `skhd/` | `~/.config/skhd/` |
| `sketchybar/` | `~/.config/sketchybar/` |
| `opencode/` | `~/.config/opencode/` |
| `codex/` | `~/.config/codex/` |
| `claude/` | `~/.claude/` |
| `codex/AGENTS.md` | `~/AGENTS.md` |

### Key Data Flows

1. **New machine setup:** Clone repo -> run `initial-setup-macos.sh` -> all packages installed, all symlinks created, services started. One command.
2. **Config update:** Edit file in repo -> commit -> pull on another machine -> re-running bootstrap re-creates any symlinks that may have drifted.
3. **Role-specific workspace:** Run `setups/<client>_setup.sh` -> tmux session with pre-configured windows for that project's stack.
4. **Theme sync:** `sync_ai_cli_theme` shell function (sourced from `functions.zsh`) propagates the active Catppuccin flavor to all AI CLI configs at shell startup.

## Scaling Considerations

Dotfiles repos scale by adding machines, not users. The relevant scale axis is "how many machines / configurations does this repo need to support."

| Scale | Architecture Adjustments |
|-------|--------------------------|
| 1 machine (current) | Single bootstrap script, hardcoded username guard is acceptable |
| 2-3 machines (same OS) | Parameterize `DOTFILES_DIR` and `CONFIG_VARIANT`; already done |
| Multi-role (personal + work) | Feature-flag gating for work tools; `setups/` for per-client workspace scripts |
| macOS + Linux/WSL | Separate `macos/` and `wsl/` variant directories + `initial-setup.sh` |
| Fully general / shareable | Remove `ensure_expected_user` check; externalize secrets; consider chezmoi for templating |

### Scaling Priorities

1. **First bottleneck:** Hardcoded username (`ensure_expected_user: aslaii`). Breaks immediately on any other user. Extract to env var or remove the guard if portability is wanted.
2. **Second bottleneck:** Hardcoded filesystem path in MCP registration (`/Users/aslaii`). Must be parameterized to `$HOME` for portability.

## Anti-Patterns

### Anti-Pattern 1: Monolithic Single-File Config

**What people do:** Put all shell config (aliases, functions, exports, plugins) directly in `.zshrc`.

**Why it's wrong:** File becomes hundreds of lines long, hard to audit, slow to source (no lazy loading), and cannot be conditionally sourced per platform.

**Do this instead:** Split into `aliases.zsh`, `functions.zsh`, and source them from a thin `zshrc`. Use platform variant directories (`macos/zsh/`, `wsl/zsh/`) rather than runtime OS detection inside the file.

### Anti-Pattern 2: Symlinks Without Backup-on-Collision

**What people do:** Run `ln -sfn` directly without checking if a real file already exists at the target path.

**Why it's wrong:** On first run on a pre-configured machine, silently overwrites existing configs. The user loses work with no recovery path.

**Do this instead:** Use a `link_file()` helper that backs up real files to `<path>.bak.<timestamp>` and only replaces symlinks.

### Anti-Pattern 3: Non-Idempotent Scripts

**What people do:** Script runs once cleanly but breaks on rerun because it tries to re-create things that already exist (Homebrew tap add errors, git clone into existing directory, etc.).

**Why it's wrong:** Breaks `git pull && bash setup.sh` update workflows. Machine diverges from repo over time if the script can't be safely rerun.

**Do this instead:** Every install step guards with `if already installed: log and skip`. Every symlink step guards as above. Every auth step checks current auth state first.

### Anti-Pattern 4: Platform Detection Inside Config Files

**What people do:** Single `zshrc` with `if [[ "$(uname)" == "Darwin" ]]; then ... fi` blocks scattered throughout.

**Why it's wrong:** The zshrc becomes a maze of conditionals, harder to reason about, and slower to source. Testing one platform's behavior requires being on that platform.

**Do this instead:** Platform-specific config lives in separate files selected at link time (`macos/zsh/zshrc`, `wsl/zsh/zshrc`). The bootstrap script does the selection; the config file assumes its platform.

### Anti-Pattern 5: Role Scripts Without Shared Utilities

**What people do:** Copy-paste `kill_port`, `switch_github_account`, and `nvm_use_project_node` into each workspace script.

**Why it's wrong:** Changes to the utility must be applied in N places. Scripts diverge from each other.

**Do this instead:** Extract shared helpers into `setups/functions.sh` and `source "$(dirname "$0")/functions.sh"` at the top of each script.

### Anti-Pattern 6: AI Config Without Version Control

**What people do:** Configure AI assistants (Claude, Gemini, Codex) manually, with settings living only in `~/.claude` / `~/.gemini`, outside any repo.

**Why it's wrong:** Settings, custom instructions, skills, and MCP configurations are lost on machine wipe or when setting up a second machine.

**Do this instead:** Include AI assistant config directories in the dotfiles repo and symlink them alongside other tool configs.

## Integration Points

### External Services

| Service | Integration Pattern | Notes |
|---------|---------------------|-------|
| Homebrew | Detect before install; `brew shellenv` written to `.zprofile` | Supports both ARM (`/opt/homebrew`) and Intel (`/usr/local`) paths |
| GitHub CLI | `gh auth status` check before `gh auth login` | Interactive; cannot be fully automated |
| Claude MCP servers | `claude mcp get <name>` check before `claude mcp add` | Requires `claude` CLI to be on PATH first |
| Catppuccin themes | Curl-download at install time; cached on disk | `oh-my-posh`, `btop` themes fetched from GitHub releases |
| SketchyBar font + SbarLua | Curl + git clone + `make install`; marker file prevents rerun | Marker at `~/.local/share/sketchybar/sbarlua-installed` |
| Tmux Plugin Manager | Git clone if not present; plugins installed manually on first launch | Documented in `print_next_steps` |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| Bootstrap script <-> repo configs | Bootstrap reads repo tree, creates symlinks | No dynamic coupling; pure filesystem |
| zshrc <-> zsh modules | `source` calls to `~/.zsh/*.zsh` | Symlinked from `macos/zsh/zsh/`; loaded at shell startup |
| Workspace scripts <-> shared functions | `source "$(dirname "$0")/functions.sh"` | Scripts must be run from their directory or use `$0`-relative paths |
| AI CLI tools <-> their configs | Each CLI reads its own directory (`~/.claude`, `~/.gemini`, etc.) | Entirely managed by the respective tools; dotfiles repo just owns the source files |
| Bootstrap script <-> feature flags | Env var injection (`SKETCHYBAR`, `CONFIG_VARIANT`) | Caller sets vars before running script; documented in script header |

## Build Order (Dependencies Between Components)

The following represents the strict dependency order for a clean machine setup. Phase N cannot begin until Phase N-1 completes successfully.

```
Phase 1: Prerequisites
  Xcode Command Line Tools
    -> required by: git, Homebrew build system

Phase 2: Package Manager
  Homebrew
    -> required by: all formulae and casks
  Homebrew shellenv (written to ~/.zprofile)
    -> required by: formulae to be on PATH

Phase 3: Package Installation
  Taps (koekeishiya/formulae, FelixKratz/formulae)
    -> required by: yabai, skhd, sketchybar formulae
  Formulae (git, neovim, tmux, yabai, skhd, ...)
  Casks (ghostty, fonts, google-cloud-sdk)
  Compatibility shims (batcat symlink)

Phase 4: Asset Download
  oh-my-posh themes
  btop Catppuccin themes
  SketchyBar font + SbarLua (if SKETCHYBAR=true)
    -> all independent of each other; can be parallelized

Phase 5: Symlink Creation
  link_configs()     -- shell, tmux, ghostty, yabai, skhd, opencode, claude
  ensure_neovim_config()
    -> requires: Phase 3 complete (directories must exist for some targets)

Phase 6: Plugin Bootstrap
  ensure_tpm()       -- git clone TPM
    -> requires: git (Phase 3), tmux symlink (Phase 5)

Phase 7: External Service Registration
  setup_claude_mcp_servers()
    -> requires: claude CLI on PATH (Phase 3), npm/npx available
  ensure_github_auth()
    -> requires: gh CLI (Phase 3)
  ensure_default_shell()
    -> requires: zsh (Phase 3), zshrc symlink (Phase 5)

Phase 8: Print Manual Steps
  Accessibility permissions for yabai/skhd (cannot be automated on macOS)
  gcloud init
  tmux TPM plugin install (Ctrl-b I)
```

## Sources

- Actual implementation in `/Users/aslaii/dotfiles/initial-setup-macos.sh` — HIGH confidence
- Actual implementation in `/Users/aslaii/dotfiles/initial-setup.sh` — HIGH confidence
- [dotfiles.github.io — Bootstrap repositories](https://dotfiles.github.io/bootstrap/) — MEDIUM confidence
- [ArchWiki — Dotfiles](https://wiki.archlinux.org/title/Dotfiles) — MEDIUM confidence
- [awesome-dotfiles](https://github.com/webpro/awesome-dotfiles) — MEDIUM confidence
- [Dotfiles 2025: Boot Fast, Adapt Smarter](https://blog.heliomedeiros.com/posts/2025-05-27-dotfiles-evolution/) — MEDIUM confidence
- [Dotbot — bootstrap tool](https://github.com/anishathalye/dotbot) — MEDIUM confidence (idempotency patterns)
- WebSearch: dotfiles cross-platform patterns 2025 — LOW confidence (supporting evidence only)

---
*Architecture research for: personal dotfiles / developer environment management*
*Researched: 2026-03-30*
