# CLAUDE.md — Dotfiles Repository

## Purpose
Personal macOS dotfiles managed as versioned directories, each symlinked into their expected home
location by `initial-setup-macos.sh`. Bringing a new machine up is one script run.

## Directory Map

| Directory | Symlink target | Tool |
|-----------|---------------|------|
| `claude/` | `~/.claude` | Claude Code |
| `gemini/` | `~/.gemini` | Gemini CLI |
| `opencode/` | `~/.config/opencode` | OpenCode |
| `codex/` | `~/.config/codex` | Codex CLI |
| `nvim/` | `~/.config/nvim` | Neovim / LazyVim |
| `tmux/` | `~/.tmux.conf` (file) | tmux |
| `ghostty/` | `~/Library/Application Support/com.mitchellh.ghostty/config` | Ghostty |
| `yabai/` | `~/.config/yabai` | yabai |
| `skhd/` | `~/.config/skhd` | skhd |
| `sketchybar/` | `~/.config/sketchybar` | SketchyBar |
| `macos/` | various zsh files | Zsh / Zinit |

## Setup

```bash
bash initial-setup-macos.sh
```

Idempotent — safe to rerun. Existing configs are backed up with a `.bak.<timestamp>` suffix.

## Universal Engineering Standards

These apply across all projects touched from this machine:

- **SOLID**: Single responsibility, open/closed via composition, interface segregation with narrow DTOs.
- **DRY**: Extract at ≥2 usages — hooks (frontend), shared utilities (backend), barrel exports.
- **TypeScript strict**: No `any`. Infer types from Zod schemas. Strict DTOs at boundaries.
- **Conventional Commits**: `type(scope): subject` — `feat`, `fix`, `chore`, `refactor`, `test`, `docs`, `perf`, `build`, `ci`.
- **Test coverage**: ≥80% for new code. Unit + integration. No committing red tests.
- **Security**: No secrets in repo. Use system keychain or `.env` outside version control.

## Skills System

Skills live in `skills/` (repo-global) and `claude/skills/` (Claude-specific).
Each skill has a `SKILL.md` with YAML frontmatter and `references/` subdirectory.

Available skills:
- `skills/fullstack-bridge/` — NestJS ↔ React/RN sync
- `claude/skills/react-native/` — Expo Router, TanStack Query, Zustand, forms, i18n, RN Paper
- `claude/skills/pr-standards/` — PR size limits, branch naming, description template, review rules, merge strategy

## Cross-references

- `AGENTS.md` — shell script conventions, commit style, security rules (authoritative for this repo)
- `claude/CLAUDE.md` — Claude-specific workflows valid across **all** projects (plan mode, bug protocol, etc.)
- `GEMINI.md` — Gemini CLI context for this repo

<!-- GSD:project-start source:PROJECT.md -->
## Project

**Dotfiles Configuration**

Personal macOS dotfiles repository managing versioned configurations for development tools (Neovim, tmux, Ghostty, yabai, skhd, SketchyBar) and AI coding assistants (Claude Code, Gemini CLI, OpenCode, Codex CLI). A single bootstrap script (`initial-setup-macos.sh`) symlinks everything into place, bringing a new machine to full productivity in one run.

**Core Value:** One-command machine setup that reliably reproduces an opinionated, productive macOS development environment across any new machine.

### Constraints

- **Shell**: Bash for scripts, Zsh for interactive shell — maintain compatibility
- **Idempotency**: All setup operations must be safe to rerun
- **No secrets**: System keychain or `.env` outside repo only
- **Symlink-based**: Configs live in repo, symlinked to expected locations
<!-- GSD:project-end -->

<!-- GSD:stack-start source:research/STACK.md -->
## Technology Stack

## Recommended Stack
### Core Technologies
| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| Bash | 5.x (system/Homebrew) | Bootstrap scripts (`initial-setup-macos.sh`) | POSIX-portable, no extra runtime. Scripts already use `set -euo pipefail` convention. Keep as-is. |
| Zsh | 5.9+ (system macOS) | Interactive shell | macOS default since Catalina; existing Zinit plugin tree is invested here. |
| Zinit (zdharma-continuum) | v3.14.0 | Zsh plugin manager | Currently active (April 2025 release). Provides Turbo mode for 50-80% faster startup — no comparable alternative offers this. Already in use. |
| Homebrew | 4.x (4.5+ for Bundle improvements) | macOS package manager + Brewfile | Canonical macOS package manager. `brew bundle` is now a first-class built-in (no tap needed). |
| ShellCheck | 0.10.x | Shell script linting | De-facto standard. Catches subtle quoting bugs, deprecated constructs, SC2 rules. Already in BREW_FORMULAE. |
| shfmt | v3.13.0 | Shell script formatting | Canonical formatter for sh/bash/zsh. v3.13.0 (March 2026) adds Zsh parser support — directly relevant. Install via `brew install shfmt`. |
| starship | latest | Shell prompt | Actively maintained, Rust-based, cross-shell. Already in Homebrew list. Powerlevel10k is on life support (maintainer confirmed, Issue #2690/#2932) — starship is the safe long-term bet. |
### Supporting Libraries / Tools
| Library / Tool | Version | Purpose | When to Use |
|----------------|---------|---------|-------------|
| Homebrew Bundle (`brew bundle`) | built-in (Homebrew 4.x) | Declarative package list (Brewfile) | Replace individual array lists in bootstrap script; enables `brew bundle check` for drift detection |
| bats-core | 1.x | Bash Automated Testing System | Unit-test idempotency guards, symlink creation logic, helper functions in setup scripts |
| pre-commit | 3.x | Git hook management | Coordinate ShellCheck + shfmt checks on every commit without manual invocation |
| shellcheck-precommit | v0.10.0 | Pre-commit hook for ShellCheck | Use with `pre-commit` framework; catches issues before CI |
| GitHub Actions (`actions/checkout` + `ludeeus/action-shellcheck`) | current | CI linting on every push | Validates all `.sh` files via ShellCheck in a macOS or ubuntu runner — catches regressions before they reach a new machine setup |
| mise (mise-en-place) | latest | Polyglot version manager (Node/Ruby/Python) | Replacement candidate for `nvm` — 2-5x faster, reads `.nvmrc`/`.tool-versions`, single binary. Not yet in the repo; evaluate in a future phase. |
### Development Tools
| Tool | Purpose | Notes |
|------|---------|-------|
| shellcheck | Lint all `.sh` and sourced zsh files | Run with `shellcheck -x` to follow `source` directives; configure via `.shellcheckrc` |
| shfmt | Format shell scripts | `shfmt -i 2 -ci` for Google-style 2-space indent; add `.editorconfig` to drive it automatically |
| bats-core | Test bootstrap logic | Install with `brew install bats-core`; write tests in `tests/` |
| pre-commit | Hook orchestration | `.pre-commit-config.yaml` at repo root wires ShellCheck + shfmt on staged files |
| gh CLI | GitHub Actions / PR workflow | Already in Homebrew list; used for CI inspection |
## Installation
# Linting and formatting (add to BREW_FORMULAE in initial-setup-macos.sh)
# Hook framework (Python-based, install via pip or pipx)
# Initialize hooks after cloning repo
## Alternatives Considered
| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| Symlink-based (current) | **chezmoi** v2.70.0 | If cross-machine templating becomes a hard requirement (work vs. personal machine with different SSH keys, secrets). chezmoi adds templates, password manager integration, whole-file encryption. The tradeoff is every file gets a `dot_` prefix rename, requiring `chezmoi` to be installed before files are usable. For a single-user, single-OS repo like this one, chezmoi's overhead exceeds its benefit. |
| Symlink-based (current) | **GNU Stow** | If you want package-level granularity (link only `nvim/` on one machine, skip `sketchybar/` on another). Stow is lighter than chezmoi but less powerful. The existing per-tool directory structure maps well to Stow packages — migration cost is low if selective installs become needed. |
| Symlink-based (current) | **yadm** | If the primary goal is reducing setup script complexity by replacing the bash symlink loop with a Git-aware wrapper. Yadm's templating had external dependency issues (envptl/j2cli both went unmaintained); less compelling now. |
| Zinit (zdharma-continuum) | **zsh-unplugged** / manual sourcing | If Zinit's complexity becomes a maintenance burden. `zsh-unplugged` is a minimal plugin loader (~30 lines). Tradeoff: lose Turbo-mode lazy loading. |
| Zinit (zdharma-continuum) | **sheldon** | A modern, TOML-configured Rust plugin manager. More maintainable config format than Zinit's DSL, but smaller community and no Turbo equivalent. |
| nvm (current) | **mise** | Mise replaces nvm + asdf + direnv in one binary. Reads `.nvmrc`, `.tool-versions`. 2-5x faster env switching. Recommended for any new setup; existing nvm is still correct and working. |
| starship (current) | **oh-my-posh** | Oh My Posh is slightly faster out-of-the-box and has a richer Windows story. On macOS-only setups starship is simpler to configure and has a larger community. |
| pre-commit framework | Manual git hooks in `.git/hooks/` | Only if you cannot install Python. Pre-commit's hook framework is far easier to share across contributors and pin to specific tool versions. |
## What NOT to Use
| Avoid | Why | Use Instead |
|-------|-----|-------------|
| **Powerlevel10k** | Maintainer confirmed "life support" (Issues #2690, #2932). No new features; macOS system Zsh compatibility issues anticipated as macOS upgrades. | starship (already in stack) |
| **zplug** | Last release 2017; unmaintained. No security patches. | Zinit (already in stack) |
| **oh-my-zsh** as primary plugin manager | High startup overhead without Turbo mode. Tempting for its plugin ecosystem, but every plugin is eagerly loaded. | Zinit with `zinit light` for lightweight loading |
| **Homebrew taps for built-in commands** | `koekeishiya/formulae` is still needed for yabai/skhd; `FelixKratz/formulae` for sketchybar. But `homebrew/cask-fonts` is deprecated — Cask fonts are now in core. Remove this tap reference to avoid warnings. | Remove `homebrew/cask-fonts` from BREW_TAPS array |
| **nvm via `lukechilds/zsh-nvm` plugin** | This Zinit plugin lazy-loads nvm but adds another indirection layer. nvm is already sourced directly in `.zshrc`. Having both is redundant and can cause double-initialization. | Remove `zinit light lukechilds/zsh-nvm` if nvm is already sourced above it |
| **Secrets in `.zshrc` or any dotfile** | The repo is (or will be) public. `.env` files, API tokens, and credentials must never be committed. | macOS Keychain (`security` CLI) or 1Password CLI (`op`) for secrets in scripts |
## Stack Patterns by Variant
- Keep symlink-based approach. It's transparent, debuggable with `ls -la`, and has zero external dependencies at runtime.
- Add ShellCheck + shfmt + bats-core for quality without adding management overhead.
- Migrate to chezmoi 2.70.0.
- Use chezmoi templates (`{{ if eq .chezmoi.hostname "work-mac" }}`) to branch per machine.
- chezmoi's one-liner install (`sh -c "$(curl -fsLS get.chezmoi.io)" -- init --apply $GITHUB_USERNAME`) keeps new-machine bootstrap fast.
- chezmoi handles `{{ .chezmoi.os }}` branching natively.
- GNU Stow works on Linux without modification — the symlink structure is already compatible.
- Audit Zinit plugin load order; move heavy plugins behind `zinit wait lucid` (Turbo mode).
- Replace nvm (shell function that adds ~150ms) with mise — mise activates in ~5ms.
- Profile with `zsh -i -c exit` measured 10 times; target <100ms.
## Version Compatibility
| Package | Compatible With | Notes |
|---------|-----------------|-------|
| shfmt v3.13.0 | Zsh, Bash, sh, mksh | v3.13.0 is the first version with a Zsh parser — use this version or newer for formatting `.zshrc` files |
| Zinit v3.14.0 | Zsh 5.x | Requires `git` at install time; clones from GitHub |
| ShellCheck 0.10.x | Bash 3.x–5.x, sh, dash, ksh | Use `# shellcheck shell=bash` directive in scripts that don't have a shebang |
| bats-core 1.x | Bash 3.2+ | macOS system Bash is 3.2 (GPL license reason); bats-core works with it |
| pre-commit 3.x | Python 3.9+ | macOS system Python is 3.x; pre-commit manages its own virtual envs per hook |
| Homebrew 4.5+ | macOS 12 Monterey+ | `brew bundle` is now built-in; remove `Homebrew/homebrew-bundle` tap if referenced anywhere |
## Sources
- [chezmoi official site](https://www.chezmoi.io/) — version 2.70.0 confirmed, feature set verified
- [chezmoi comparison table](https://www.chezmoi.io/comparison-table/) — chezmoi vs yadm vs bare git feature matrix
- [shfmt releases (mvdan/sh)](https://github.com/mvdan/sh/releases) — v3.13.0 confirmed as latest stable (March 2026), Zsh support added
- [Zinit releases (zdharma-continuum)](https://github.com/zdharma-continuum/zinit/releases) — v3.14.0 released April 2025, actively maintained
- [Powerlevel10k Issue #2690](https://github.com/romkatv/powerlevel10k/issues/2690) — maintainer "life support" confirmation (MEDIUM confidence, GitHub issue)
- [Homebrew Bundle docs](https://docs.brew.sh/Brew-Bundle-and-Brewfile) — built-in status confirmed, `homebrew/cask-fonts` deprecation (HIGH confidence)
- [ShellCheck pre-commit hook](https://github.com/koalaman/shellcheck-precommit) — official hook, v0.10.0 (HIGH confidence)
- [Gbergatto dotfiles tool comparison](https://gbergatto.github.io/posts/tools-managing-dotfiles/) — YADM/chezmoi/stow/bare-git tradeoffs (MEDIUM confidence, community blog)
- [Mise vs nvm comparison — Better Stack](https://betterstack.com/community/guides/scaling-nodejs/nvm-vs-mise/) — performance figures (MEDIUM confidence, verified against mise docs)
- [Starship prompt](https://starship.rs/) — cross-shell, Rust-based, actively maintained (HIGH confidence)
<!-- GSD:stack-end -->

<!-- GSD:conventions-start source:CONVENTIONS.md -->
## Conventions

Conventions not yet established. Will populate as patterns emerge during development.
<!-- GSD:conventions-end -->

<!-- GSD:architecture-start source:ARCHITECTURE.md -->
## Architecture

Architecture not yet mapped. Follow existing patterns found in the codebase.
<!-- GSD:architecture-end -->

<!-- GSD:workflow-start source:GSD defaults -->
## GSD Workflow Enforcement

Before using Edit, Write, or other file-changing tools, start work through a GSD command so planning artifacts and execution context stay in sync.

Use these entry points:
- `/gsd:quick` for small fixes, doc updates, and ad-hoc tasks
- `/gsd:debug` for investigation and bug fixing
- `/gsd:execute-phase` for planned phase work

Do not make direct repo edits outside a GSD workflow unless the user explicitly asks to bypass it.
<!-- GSD:workflow-end -->

<!-- GSD:profile-start -->
## Developer Profile

> Profile not yet configured. Run `/gsd:profile-user` to generate your developer profile.
> This section is managed by `generate-claude-profile` -- do not edit manually.
<!-- GSD:profile-end -->
