# Dotfiles

Personal configuration for macOS and Debian/Ubuntu-based Linux or WSL.
Application state, installed dependencies, and project tooling stay outside Git.

## Quick Start

```bash
# Clone the repo
git clone https://github.com/aslaii/dotfiles.git ~/dotfiles

# macOS
bash ~/dotfiles/initial-setup-macos.sh

# Linux / WSL
bash ~/dotfiles/initial-setup-linux.sh

# Auto-select the platform and check links without installing anything
bash ~/dotfiles/initial-setup.sh --check
```

Existing valid files and links are preserved. The Linux installer installs shell
essentials, not project databases or application stacks.

## Project tools

Project launchers are restored from the immutable commit in
`scripts/tools-source.json`, not bundled with the current configuration tree:

```bash
node ~/dotfiles/scripts/restore-tools.mjs
node ~/dotfiles/scripts/restore-tools.mjs --check
```

They live under `~/.local/share/dotfiles-tools/`; the shell aliases point there.
Restoration verifies file hashes and refuses to overwrite modified files or write
through symlinks. Local modifications must be retained separately before updating.
The first restore needs network access if the pinned Git objects are absent.

## OMO

The [`omo/`](omo/README.md) directory contains the portable native OMO setup:
model routes, UI preferences, pinned plugins, and Bash hooks. OMO loads only
native, bundled, and active-package skills; Xcode work is covered separately
by axe (installed via Homebrew). With Node.js 24+, Bun 1.4+, Git,
and RTK installed:

```bash
npm install -g omo-ai@5.0.0-0.beta.48
bun ~/dotfiles/omo/restore.mjs
```

Authenticate with `/login` and review `/hooks` on the new computer. Credentials
and agent runtime state are excluded.

## Oh My Pi

The `omp/` directory mirrors the portable parts of `~/.omp`:

| Path | Contents |
|------|----------|
| `omp/agent/config.yml` | Model roles, thinking levels, prewalk, fallbacks, two-worker limit, and UI preferences |
| `omp/fast.yml`, `omp/budget.yml` | Opt-in `--config` overlays: fast (priority Claude/GPT, 8-wide) and budget (Claude Sonnet 5 via the $20 subscription first, Command Code $10 plan DeepSeek on Claude limits, free Muse as backstop) |
| `omp/agent/APPEND_SYSTEM.md` | Persistent response modes (Ponytail full, Caveman lite) for every session |
| `omp/agent/agents/*.md` | Portable planner, Terra, verifier, and researcher prompts |
| `omp/agent/skills/omp-prompt/` | OMP-only prompt refinement skill |
| `omp/plugins/package.json` | Installed plugin sources: Ponytail and pi-comment-checker |
| `omp/plugins/bun.lock` | Exact plugin/dependency revisions for reproducible restoration |
| `omp/plugins/omp-plugins.lock.json` | OMP plugin versions, enablement, and feature selections |

Setup, launch profiles, and cross-machine transfer are documented in
[`omp/README.md`](omp/README.md).

On another macOS computer, install Bun, OMP, and RTK first. The bootstrap then
installs pinned public [`aslaii/rcg`](https://github.com/aslaii/rcg) v0.1.1
through its SHA-256-verifying installer and runs
`rcg init --agent omp --global`. The same bootstrap installs the pinned,
checksummed upstream `comment-checker` v0.8.0 binary into `~/.local/bin` for the
`pi-comment-checker` plugin. The earlier plugin snapshot was verified with
Bun 1.4.0 and OMP 18.1.10; plugins were not reinstalled during this task.
Runtime routing was verified against the currently installed OMP 18.1.22.

```bash
rtk bash ~/dotfiles/initial-setup-macos.sh --omp
bun ~/dotfiles/omp/launch.mjs plugin list
bun ~/dotfiles/omp/launch.mjs --model @default --no-prewalk
```

The OMP-only option uses the default `~/.omp` layout and the existing
non-destructive symlink helper. Existing files, skills, and rules are preserved,
not overwritten; move any conflicting files to your own backup before rerunning
if you want the repository versions instead. Bun restores plugins with the
active frozen lockfile. Keep the dotfiles checkout available because the
configuration and custom skill are linked. Xcode and simulator work goes
through `axe` (installed via Homebrew). The normal macOS bootstrap
and its `--check` option remain unchanged.

Authenticate separately with `/login` inside OMP on each computer. Model access
depends on that computer's authenticated accounts; the config contains no credentials.

Deployed routing keeps Main on Sol-medium (`@default`) for orchestration,
bounded workers on Sonnet-high (`@task`), difficult workers and planning on
Sol-max (`@slow`/`@planner`), review on Opus-xhigh (`@review`), and verification,
research, or free fallback on Muse Contributor Free-xhigh (`@verify`/`@research`/`@free`). Advisor and
prewalk are off by default; dispatch allows at most two workers and no nested workers.
The free endpoint is promotional; Contributor inputs and history may be used for
training. There is no automatic paid Zen fallback.

Existing sessions keep their old state and rendered prompts. For reliable adoption of
the new policy, run `/advisor off`, select `@default` in `/model`, and start a fresh
continuation; fresh launches use `omp --model @default --no-prewalk` after
loading the updated shell functions.

```text
/skill:omp-prompt feature add CSV export without changing existing filters
/skill:omp-prompt debug white screen after login; RCA only
/skill:omp-prompt continue prepare the unfinished work for a new session
```

Ponytail's skills are supplied by its locked plugin, not duplicated in `agent/skills`.
Credentials, sessions, caches, databases, onboarding/consent state, and machine-local
MCP, LSP, and Herdr/Moshi integrations are intentionally excluded. Xcode and
simulator work goes through `axe` (installed via Homebrew). Shared
skills from other harnesses are not part of this OMP-only snapshot.

## Symlink Map

> Source of truth: `emit_symlink_map()` in `initial-setup-macos.sh`

| Repo Path | Symlink Target | Tool |
|-----------|----------------|------|
| `macos/zsh/zshrc` | `~/.zshrc` | Zsh config |
| `macos/zsh/zsh/` | `~/.zsh` | Zsh scripts |
| `tmux/tmux.conf` | `~/.tmux.conf` | tmux |
| `codex/AGENTS.md` | `~/AGENTS.md` | Codex CLI |
| `ghostty/config` | `~/Library/Application Support/com.mitchellh.ghostty/config` | Ghostty |
| `codex/` | `~/.config/codex` | Codex CLI |
| `claude/` | `~/.claude` | Claude Code |
| `nvim/` | `~/.config/nvim` | Neovim / LazyVim |

## Environment Flags

| Flag | Default | Purpose |
|------|---------|---------|
| `DOTFILES_DIR` | `$HOME/dotfiles` | Location of the cloned dotfiles repo |
| `CONFIG_VARIANT` | `macos` | Selects which zshrc variant to link |
| `RCG_VERSION` | `v0.1.1` | Immutable public RCG release ensured by exact version |
| `RCG_INSTALL_DIR` | `$HOME/.local/bin` | RCG binary destination |

Usage example:

```bash
CONFIG_VARIANT=linux bash ~/dotfiles/initial-setup-linux.sh
```

## Agent isolation

New Zsh sessions route `omo` and `omp` through the repository launchers.
For other shells or automation, invoke them explicitly:

```bash
bash ~/dotfiles/omo/launch.sh
bun ~/dotfiles/omp/launch.mjs
```

For time-critical work, use `omo-fast` or `omp-fast`. Native OMO requests
priority GPT while retaining its Claude SDK OAuth and Muse routing.
OMP requests fast Claude and priority GPT with GPT fallback when Claude is
unavailable. Both allow eight parallel agents; Muse and OpenCode Go models
retain their existing settings, including reasoning.
Normal `omo` and `omp` keep their defaults. Reload an existing shell with
`source ~/.zsh/functions.zsh` before using the new commands.

For a spend-capped session, use `omp-budget`. It is a `--config` overlay
(`omp/budget.yml`, the same mechanism as `omp-fast`) that runs the driving
roles on `anthropic/claude-sonnet-5` through the $20/mo Claude subscription's
OAuth login first, falling back — once that credential's usage-aware
preflight reports it inside its reserve margin — to the Command Code $10
plan's DeepSeek V4.1 Flash tier, then to the plan-hosted Muse Spark 1.3
Contributor. Vision reads stay on the plan's dedicated image-native vision
model (confirmed with a real image probe), designer and small/verify/research/free
work stay on the plan-hosted Muse Contributor and DeepSeek tier, and the free
OpenCode Zen Muse Contributor endpoint remains wired only as a last-resort
backstop. No budget role can reach OpenAI, GPT, or a paid Zen model, and no
request forces the Command Code ZDR header (opt-in there, and forcing it
caps a model's usable allowance at the plan default).
From other shells:

```bash
bun ~/dotfiles/omp/launch.mjs --config ~/dotfiles/omp/budget.yml
```

For other shells:

```bash
bash ~/dotfiles/omo/launch.sh --extension ~/dotfiles/omo/fast.mjs
bun ~/dotfiles/omp/launch.mjs --config ~/dotfiles/omp/fast.yml --extension ~/dotfiles/omp/fast.mjs
```

OMO uses its native model configuration in both launch modes. Its fast extension
adds request-local priority settings without saving them to normal settings.
GPT fallback also carries native priority metadata for session status and
usage accounting. OMO's task row may still omit tier/thinking suffixes after
fallback (upstream issues #6795 and #7934); the row alone does not establish
the serving tier. Restart the OMO process after updating the fast extension.
OMP's guard prevents its native retry from silently dropping Claude fast
mode. Eight is a concurrency limit, not a requirement to run dependent tasks
before their prerequisites finish. Provider access and rate limits still apply.

OMO loads only its owned skill library, native skills, bundled skills, and
active package skill paths. Xcode and simulator work goes through
`axe` (installed via Homebrew). OMO still refuses configured Claude
MCP imports, and its own Ponytail extension remains enabled. Project
AGENTS/CLAUDE context files and the native rules engine retain their normal
behavior.

OMP blocks Claude skills, MCP, plugins, and context providers before settings
discovery. The launcher uses the installed package's shipped source CLI under
Bun so the early provider exclusions take effect. This was verified with OMP
18.1.14; it fails closed if the required source layout or exclusions are missing.
Neither launcher patches an installed runtime. Calling raw binaries, including
through `rtk omp`, bypasses these launchers.

Codex defaults to Ponytail full. Its Caveman skills and Cavecrew are disabled
by name without deleting shared files used by other agents.

## Tools

- **Neovim** -- LazyVim-based config with lazy-lock.json for reproducible plugins
- **tmux** -- Terminal multiplexer config
- **Ghostty** -- GPU-accelerated terminal emulator config
- **oh-my-posh** -- Cross-shell prompt with Catppuccin themes
- **Zinit** -- Zsh plugin manager with Turbo mode
- **Claude Code** -- AI assistant config and skills
- **Gemini CLI** -- AI assistant config
- **OpenCode** -- AI assistant config
- **Codex CLI** -- AI assistant config

## Drift Check

Two ways to check whether your symlinks match the expected state:

- **`dotcheck`** -- shell alias available in any Zsh session
- **`bash ~/dotfiles/initial-setup-macos.sh --check`** -- validates all symlinks without modifying anything, exits non-zero if drift detected

## Skills System

Skills provide structured guidance for AI coding assistants. Each skill is a self-contained directory with a `SKILL.md` index and a `references/` subdirectory containing detailed rules.

### Directory Structure

```
skills/              # Repo-global skills (any AI assistant)
claude/skills/       # Claude Code-specific skills
```

### Available Skills

| Skill | Location | Description |
|-------|----------|-------------|
| `fullstack-bridge` | `skills/fullstack-bridge/` | NestJS + React/RN synchronization |
| `react-native` | `claude/skills/react-native/` | Expo Router, TanStack Query, Zustand patterns |
| `pr-standards` | `claude/skills/pr-standards/` | PR size limits, branch naming, review rules |
| `axe` | `omp/agent/skills/axe/` | iOS Simulator UI automation (tap, swipe, type, describe-ui) via the AXe CLI |

### Invoking Skills

In Claude Code, use `/skill <name>` to activate a skill. Claude reads the `SKILL.md` file and loads relevant rules from `references/` as needed.

### Creating a New Skill

1. Create directory: `skills/<name>/` (repo-global) or `claude/skills/<name>/` (Claude-specific)
2. Create `SKILL.md` with YAML frontmatter:
   ```yaml
   ---
   name: my-skill
   description: When to use this skill.
   ---
   ```
3. Add detailed rules in `<name>/references/` subdirectory
4. Reference `skills/fullstack-bridge/SKILL.md` as the canonical example

## Neovim Plugin Workflow

1. Open Neovim and run `:Lazy update`
2. Commit `nvim/lazy-lock.json` with the plugin changes
3. On a new machine, `:Lazy sync` restores pinned versions
4. Run `:checkhealth` to verify plugin health

> `nvim/lazy-lock.json` is tracked in git to ensure reproducible plugin installs across machines.

## Cross-References

- `CLAUDE.md` -- AI assistant configuration and project conventions
- `AGENTS.md` -- Shell script conventions and commit style
- `setups/` -- Role-specific setup scripts for client environments
