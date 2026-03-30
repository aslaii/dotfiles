# Project Research Summary

**Project:** macOS Dotfiles Modernization
**Domain:** Personal macOS dotfiles — symlink-based, AI-assistant-aware (brownfield)
**Researched:** 2026-03-30
**Confidence:** HIGH

## Executive Summary

This is a brownfield dotfiles repository with a working foundation (one-command bootstrap, idempotent symlink layer, per-tool directory structure) that has accumulated technical debt and is missing several quality-of-life features that mature repos in the ecosystem treat as standard. The core architecture — symlink-based management with a Bash bootstrap script, per-tool directories, and feature-flag gating via env vars — is the right approach for a single-user macOS setup and should be retained. The recommended path forward is incremental hardening rather than wholesale migration to a dotfile manager like chezmoi.

The three highest-impact improvements are: (1) committing a `Brewfile` to decouple package declarations from bootstrap logic, (2) adding a `--check` verify mode to detect symlink drift without touching anything, and (3) setting up ShellCheck CI on GitHub Actions to prevent script regressions before they reach a new machine. These are low-cost, high-value changes that the existing tooling (shellcheck is already installed, GitHub Actions is already used for PRs) supports immediately.

The biggest risks are hardcoded absolute paths (`/Users/aslaii`) baked into tracked config files — particularly `claude/settings.json` and MCP server definitions — and the absence of per-directory `.gitignore` files in AI tool subdirectories (specifically `gemini/`). Both create silent failure modes: the path issue breaks hooks on any account rename or second machine; the missing gitignore creates a plausible path to committing OAuth tokens or session state. These must be addressed in the first phase before any new features are added.

## Key Findings

### Recommended Stack

The existing stack is sound and should be preserved. Bash for bootstrap scripts, Zsh with Zinit for the interactive shell, and Homebrew for package management are all the right choices. The only actionable stack change in the near term is adding `shfmt v3.13.0+` (the first version with Zsh parser support) and the `pre-commit` framework to wire ShellCheck and shfmt as git hooks. Long-term, `mise` is the recommended replacement for `nvm` (2-5x faster, reads `.nvmrc`), but this is a future-phase consideration. Powerlevel10k should be removed in favor of `starship` (already in the stack) since the p10k maintainer has confirmed life-support status.

**Core technologies:**
- Bash 5.x: bootstrap scripts — no external runtime dependency, already in use with `set -euo pipefail`
- Zsh + Zinit v3.14.0: interactive shell — Turbo mode provides 50-80% faster startup; Zinit is actively maintained
- Homebrew 4.x: package management — `brew bundle` is now a built-in, enables declarative Brewfile
- ShellCheck 0.10.x: shell linting — already installed, needs CI wiring
- shfmt v3.13.0: shell formatting — first version with Zsh support, add to BREW_FORMULAE
- starship: shell prompt — already in stack; replace Powerlevel10k references
- pre-commit 3.x: hook orchestration — wires ShellCheck + shfmt on staged files

### Expected Features

The repo already covers all table stakes (one-command bootstrap, idempotent script, symlink management with backup-on-collision, broken symlink cleanup). The gaps are in quality and reliability tooling that the ecosystem treats as baseline for a well-maintained repo.

**Must have (table stakes — gaps to close):**
- Brewfile committed to repo — decouples package list from script logic; enables `brew bundle check` for drift detection
- ShellCheck CI via GitHub Actions — prevents script regressions; shellcheck already installed
- Setup script verify mode (`--check` flag) — detects symlink drift without modifying anything
- Linux setup script hardening — `set -euo pipefail` parity with macOS script

**Should have (differentiators already present, needs polish):**
- AI assistant configs (Claude, Gemini, OpenCode, Codex) — uniquely modern; consistency and gitignore completeness is the gap
- Shared CLAUDE.md / AGENTS.md as cross-tool source of truth — pattern present, needs enforcement
- Skills system for AI assistants — present in `claude/skills/` and `skills/`; needs discoverability documentation
- Role-specific setup scripts (`setups/`) — present; needs discoverability in README

**Should have (not yet present):**
- Update notification on shell startup — background git fetch, non-blocking; warns when dotfiles remote has new commits
- Brewfile.lock.json committed — pins exact versions for reproducible new-machine setups

**Defer (v2+):**
- Cross-platform config templating — only if Linux usage increases materially
- Per-machine host-specific overrides — only needed when managing 3+ machines with divergent configs
- chezmoi migration — only if cross-machine templating becomes a hard requirement

### Architecture Approach

The existing architecture follows the correct per-tool directory pattern with a clean layered bootstrap (platform guard → packages → assets → symlinks → plugins → external services). The symlink map is well-defined and covers all tools. Two scaling bottlenecks exist today: the hardcoded username check (`ensure_expected_user: aslaii`) and hardcoded `/Users/aslaii` paths in tracked JSON files. Both break immediately on any account or machine change and should be addressed before the repo can be treated as reliably portable.

**Major components:**
1. Bootstrap entry point (`initial-setup-macos.sh`) — orchestrates all phases in order with idempotent guards
2. Symlink layer (`link_file()`, `link_configs()`) — maps repo paths to home/XDG paths with backup-on-collision safety
3. Per-tool config directories (`nvim/`, `tmux/`, `claude/`, etc.) — each tool owns exactly its config
4. Platform variant directories (`macos/zsh/`, `wsl/zsh/`) — platform selection at link time, not runtime
5. Role-specific workspace launchers (`setups/`) — tmux session launchers sourcing shared `functions.sh`
6. AI assistant configs (`claude/`, `gemini/`, `opencode/`, `codex/`) — versioned first-class tool configs

### Critical Pitfalls

1. **Hardcoded `/Users/aslaii` in tracked files** — replace with `$HOME` in all shell contexts; for JSON configs that cannot expand env vars, generate the config section from a template during bootstrap using `envsubst`. Verify with `grep -rn '/Users/' $(git ls-files)` returning zero results.

2. **Missing `.gitignore` in `gemini/` directory** — `claude/` correctly excludes `state.json`, OAuth tokens, and session state; `gemini/` relies solely on the root `.gitignore`. Add a dedicated `gemini/.gitignore` immediately. Apply same audit to `opencode/` and `codex/`.

3. **`nvim/lazy-lock.json` excluded from git** — without a committed lockfile, Neovim gets the latest plugin commits on every fresh machine, making the config non-reproducible. Either track `lazy-lock.json` (low-noise — only changes on explicit `:Lazy update`) or pin every plugin to a `commit` or `tag` in the spec.

4. **yabai breaking on macOS updates** — pin yabai and skhd with `brew pin yabai skhd` to prevent unintended upgrades. Check yabai GitHub issues before any macOS update. Document the SIP disable procedure and scripting-addition sudoers entry in `yabai/README.md`.

5. **Zinit plugin ordering causing completion failures** — load `zsh-syntax-highlighting` last, after `compinit`. Use `zinit cdreplay -q` for deferred `compdef` calls. Profile with `time zsh -i -c exit`; target <200ms. Eager nvm init adds 200-400ms — lazy-load nvm.

## Implications for Roadmap

Based on research, suggested phase structure:

### Phase 1: Security and Path Hardening
**Rationale:** Hardcoded paths and missing gitignores are active risks that compound with every new file added. These must be resolved before any new features or additional AI tool configs are added to the repo. No new work should introduce the same class of issue.
**Delivers:** A repo that is safe to publish publicly and usable on any account without silent failures.
**Addresses:** Pitfalls 1, 2 (hardcoded paths, secret leakage), Architecture scaling bottlenecks
**Avoids:** OAuth token commits, hook failures on new machines, username-locked portability
**Tasks:**
- Replace all `/Users/aslaii` literals in tracked files with `$HOME`/`~` or template generation
- Add `.gitignore` to `gemini/`, audit `opencode/` and `codex/` for completeness
- Replace `ensure_expected_user` hard-fail with a confirmation prompt or remove it
- Add `gitleaks` or `trufflehog` as a pre-commit check

### Phase 2: Quality Tooling (Linting, CI, and Formatting)
**Rationale:** ShellCheck CI and shfmt are low-cost, high-value additions that pay dividends on every future change. Installing them now surfaces existing issues (especially in `initial-setup.sh` which lacks `set -euo pipefail`) and prevents regressions. The pre-commit framework is the right orchestration layer.
**Delivers:** Automated lint and format checks on every commit; CI validation on every push; `initial-setup.sh` brought to macOS script parity.
**Addresses:** Features: ShellCheck CI, Linux script hardening; Stack: shfmt, pre-commit
**Avoids:** Script regressions that break new machine setups silently
**Tasks:**
- Add `shfmt` and `pre-commit` to BREW_FORMULAE
- Create `.pre-commit-config.yaml` wiring ShellCheck + shfmt
- Create GitHub Actions workflow for ShellCheck on all `.sh` files
- Harden `initial-setup.sh` with `set -euo pipefail` and modern patterns

### Phase 3: Brewfile and Package Drift Detection
**Rationale:** Extracting the package list from the bootstrap script into a `Brewfile` decouples concerns, enables `brew bundle check` for drift detection, and unlocks `Brewfile.lock.json` for version reproducibility. This is a standalone, low-risk change with immediate utility.
**Delivers:** A committed `Brewfile` that replaces inline arrays; `brew bundle check` usable for drift; optionally a committed `Brewfile.lock.json`.
**Addresses:** Features: Brewfile declarative manifest, Brewfile.lock.json; eliminates `homebrew/cask-fonts` deprecated tap reference
**Tasks:**
- Extract BREW_TAPS, BREW_FORMULAE, BREW_CASKS arrays into `Brewfile`
- Update bootstrap script to call `brew bundle install`
- Remove deprecated `homebrew/cask-fonts` tap reference
- Commit `Brewfile.lock.json`

### Phase 4: Symlink Verify Mode and Drift Detection
**Rationale:** The `--check` flag closes the gap between "the script ran once" and "the current machine matches the repo." This is the primary day-to-day utility improvement — running it after a `git pull` tells you exactly what is out of sync.
**Delivers:** `initial-setup-macos.sh --check` mode that reports symlink drift without modifying anything; optional shell alias `dotcheck` for quick daily use.
**Addresses:** Features: Setup script verify mode (P1), configuration drift pitfall
**Avoids:** Silent drift between repo and live machine; stale configs on fresh machine bootstrap
**Tasks:**
- Add `--check` flag to `initial-setup-macos.sh` that validates symlinks without creating or replacing them
- Add `dotcheck` shell alias sourced from `macos/zsh/zsh/aliases.zsh`
- Optionally add a `precmd` hook or tmux status widget for uncommitted dotfile changes

### Phase 5: Neovim Determinism and Plugin Lockfile
**Rationale:** Tracking `lazy-lock.json` is a one-line gitignore change that eliminates an entire class of "works on my machine" breakage for Neovim. Address this as its own phase to keep scope contained.
**Delivers:** Reproducible Neovim plugin installs on every new machine; `lazy-lock.json` tracked and updated on intentional `:Lazy update` runs.
**Addresses:** Pitfall 5 (non-reproducible Neovim installs), arch component: nvim/
**Tasks:**
- Remove `nvim/lazy-lock.json` from `.gitignore`
- Commit current lockfile
- Document `:Lazy update` + commit lockfile as the intentional upgrade workflow

### Phase 6: Shell Performance and Zinit Audit
**Rationale:** Shell startup performance and Zinit plugin ordering issues are latent — they manifest when new plugins are added or on macOS upgrades. Auditing the plugin tree now, removing Powerlevel10k references, and confirming lazy nvm loading prevents these from surfacing unexpectedly.
**Delivers:** `time zsh -i -c exit` < 200ms verified; Powerlevel10k references removed in favor of starship; nvm lazy-loaded; Zinit plugin order documented.
**Addresses:** Stack: starship over Powerlevel10k; Pitfall 7 (Zinit ordering); Performance trap (eager nvm)
**Tasks:**
- Remove any Powerlevel10k references; confirm starship is sole prompt
- Audit Zinit plugin order; ensure `zsh-syntax-highlighting` loads last
- Implement lazy nvm loading (only init when `node`/`npm`/`nvm` first invoked)
- Profile startup time; document baseline in a comment

### Phase 7: Documentation and Discoverability
**Rationale:** The AI assistant config structure, skills system, and role-specific setups are genuine differentiators that are invisible without documentation. A README.md is a prerequisite for the repo being useful to future self on a new machine setup.
**Delivers:** `README.md` covering setup instructions, feature overview, skills system convention, and role setups; `yabai/README.md` documenting SIP procedure.
**Addresses:** Features: README/setup instructions (table stakes), skills system documentation (P2)
**Tasks:**
- Write `README.md` with one-command bootstrap, symlink map, env flag reference, skills system overview
- Write `yabai/README.md` with SIP disable procedure and scripting-addition sudoers entry
- Document `setups/` scripts and the `functions.sh` shared utilities contract

### Phase Ordering Rationale

- Phases 1-2 are sequenced first because they eliminate active risks (secret leakage, broken hooks) and establish the quality baseline that all subsequent changes are measured against.
- Phase 3 (Brewfile) is independent but placed after CI so the new file is immediately linted and checked.
- Phase 4 (verify mode) builds on the clean script baseline from Phase 2.
- Phase 5 (Neovim lockfile) is a standalone, low-dependency change placed mid-sequence.
- Phase 6 (shell performance) is deferred until the structural work is done — optimizing a script that still has hardcoded paths is premature.
- Phase 7 (docs) is last by convention: document what is stable, not what is in flux.

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 4 (Verify mode):** The `--check` implementation pattern for symlink verification has several viable approaches (dry-run flag, separate function, separate script). A short planning spike to decide the interface contract is recommended.
- **Phase 6 (Zinit audit):** Zinit's Turbo mode interaction with `compinit` and `cdreplay` is documented but subtle. If startup profiling reveals regressions, `zpmod source-study` output needs interpretation — flag for deeper shell performance research if issues surface.

Phases with standard patterns (skip research-phase):
- **Phase 2 (ShellCheck CI):** Well-documented. Official `ludeeus/action-shellcheck` GitHub Action, pre-commit framework hooks, and shfmt usage are all straightforward.
- **Phase 3 (Brewfile):** `brew bundle` documentation is official and comprehensive. Extraction from arrays is mechanical.
- **Phase 5 (Neovim lockfile):** Single `.gitignore` edit + commit. No research needed.
- **Phase 7 (Docs):** Content-only work; no technical uncertainty.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | MEDIUM | Core tooling (Bash, Zsh, Homebrew) verified against official sources. Powerlevel10k life-support status is from GitHub issues, not an official announcement. mise performance figures from community benchmark, not first-party. |
| Features | HIGH | Feature gaps identified directly from inspecting the actual repo against ecosystem reference implementations. Prioritization is based on observable gaps, not inference. |
| Architecture | HIGH | Architecture research derived directly from reading `initial-setup-macos.sh` and the actual repo structure. Patterns documented are what the code already implements. |
| Pitfalls | HIGH | Pitfalls 1-2 (hardcoded paths, missing gitignore) verified by grepping the actual tracked files. Pitfall 5 (lazy-lock.json) verified from `.gitignore` contents. Others are well-documented ecosystem patterns with multiple independent sources. |

**Overall confidence:** HIGH

### Gaps to Address

- **mise adoption timeline:** The recommendation to evaluate mise over nvm is well-supported but the migration path from the existing `lukechilds/zsh-nvm` pattern has not been prototyped. Treat as future-phase; do not block Phase 6 on it.
- **`opencode/` and `codex/` gitignore completeness:** Research identified `gemini/` as the clearest gap. `opencode/` and `codex/` need the same audit during Phase 1 execution — their gitignore state was not fully verified at research time.
- **MCP server config generation approach:** The right mechanism for generating `claude/settings.json` (or equivalent) from a template with `$HOME` substitution during bootstrap is not specified. Two valid approaches exist: `envsubst` at bootstrap time, or a separate `settings.template.json` that the setup script processes. The choice affects the Phase 1 implementation plan and should be decided before work begins.

## Sources

### Primary (HIGH confidence)
- `/Users/aslaii/dotfiles/initial-setup-macos.sh` — bootstrap phases, symlink map, feature flags verified from source
- `/Users/aslaii/dotfiles/initial-setup.sh` — Linux script parity gaps identified from source
- [Homebrew Bundle docs](https://docs.brew.sh/Brew-Bundle-and-Brewfile) — built-in status, `homebrew/cask-fonts` deprecation
- [shfmt releases (mvdan/sh)](https://github.com/mvdan/sh/releases) — v3.13.0 Zsh support confirmed
- [ShellCheck pre-commit hook](https://github.com/koalaman/shellcheck-precommit) — official hook
- [lazy.nvim Lockfile Documentation](https://lazy.folke.io/usage/lockfile) — lockfile behavior verified

### Secondary (MEDIUM confidence)
- [chezmoi official site](https://www.chezmoi.io/) — feature comparison and migration cost
- [Zinit releases (zdharma-continuum)](https://github.com/zdharma-continuum/zinit/releases) — v3.14.0 confirmed
- [Powerlevel10k Issue #2690](https://github.com/romkatv/powerlevel10k/issues/2690) — life-support status
- [Lissy93/dotfiles](https://github.com/Lissy93/dotfiles) — reference implementation feature comparison
- [dotfiles.io — Secret Management Best Practices](https://dotfiles.io/en/guides/secret-management/)
- [Mise vs nvm comparison — Better Stack](https://betterstack.com/community/guides/scaling-nodejs/nvm-vs-mise/)
- [yabai Disabling SIP Wiki](https://github.com/koekeishiya/yabai/wiki/Disabling-System-Integrity-Protection)

### Tertiary (LOW confidence)
- [Dotfiles for AI-Assisted Development — Dylan Bochman (2026)](https://dylanbochman.com/blog/2026-01-25-dotfiles-for-ai-assisted-development/) — AI config versioning rationale
- WebSearch: dotfiles cross-platform patterns 2025 — supporting context only

---
*Research completed: 2026-03-30*
*Ready for roadmap: yes*
