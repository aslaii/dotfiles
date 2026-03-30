# Feature Research

**Domain:** Personal macOS dotfiles repository (symlink-based, AI-assistant-aware)
**Researched:** 2026-03-30
**Confidence:** HIGH

## Feature Landscape

### Table Stakes (Users Expect These)

Features any mature dotfiles repo must have. Missing these means the repo is incomplete or
unreliable as a machine-bootstrap system.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| One-command bootstrap | Dotfiles exist to eliminate manual setup; a bootstrap script is the entire value prop | LOW | Already exists (`initial-setup-macos.sh`) — quality matters |
| Idempotent setup | Rerunning on an existing machine should never break it | LOW | Already implemented; must be verified for all paths |
| Symlink management | Configs live in repo, not scattered in `~` | LOW | Already implemented in `link_configs()`; needs coverage audit |
| Broken symlink cleanup | Stale symlinks after tool removal corrupt environments silently | LOW | Already implemented in `link_file()` |
| Backup before overwrite | Overwriting real configs without backup destroys data | LOW | Already implemented (`.bak.<timestamp>` pattern) |
| Shell environment (Zsh) | Shell config is foundation for everything else | MEDIUM | Already managed; drift from current Zinit/plugin state is a risk |
| Package list (Homebrew formulae + casks) | Reproducible installs require a canonical package list | LOW | Already in `initial-setup-macos.sh` as arrays; no Brewfile yet |
| Git configuration | Nearly every developer workflow depends on Git being configured | LOW | Not visible in current repo — worth verifying |
| Cross-machine consistency | Value is replication; if two machines diverge, the repo failed | MEDIUM | Depends on symlinks + script being current |
| README / setup instructions | Anyone (including future self) needs to know how to use the repo | LOW | Exists as inline `print_next_steps()` function; a README.md would be better |

### Differentiators (Competitive Advantage)

Features that distinguish a high-quality dotfiles repo from a basic one. These raise the
productivity ceiling and reduce ongoing maintenance burden.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| AI assistant configs (Claude, Gemini, OpenCode, Codex) | Uniquely modern; replicates entire AI coding workflow, not just shell | MEDIUM | Already present; consistency and completeness across tools is the gap |
| Shared CLAUDE.md / AGENTS.md across tools | Single source of truth for coding standards avoids drift between assistants | LOW | Pattern already present; could be formalized further |
| Skills system for AI assistants | Extends AI capabilities beyond defaults; not common in dotfiles repos | MEDIUM | Already present in `claude/skills/` and `skills/`; needs documentation of the convention |
| Role/client setup scripts (`setups/`) | Supports multiple work contexts from a single repo without branching | MEDIUM | Already present; could be more discoverable |
| Setup script health check / verify mode | Detects symlink drift without touching anything; `--check` flag | MEDIUM | Not present; high value for day-to-day confidence |
| Brewfile declarative package manifest | Separate, human-readable package list that `brew bundle` can use | LOW | Not present; current approach (arrays in script) is less composable |
| ShellCheck CI (GitHub Actions) | Catches shell script bugs before they break a new machine setup | LOW | Not present; `shellcheck` is already installed as a formula |
| Update notification on shell startup | Background check for dotfiles changes; prompts without blocking | MEDIUM | Not present; common pattern in mature repos |
| Automated `brew update && brew upgrade` wrapper | Single command to keep packages current; reduces manual maintenance | LOW | Not present; `sync-ai-cli-theme.sh` shows the pattern exists |
| Linux/WSL feature parity tracking | `initial-setup.sh` diverges from macOS over time; tracking gap is high-value | MEDIUM | Linux script exists but is less mature and uses older patterns (lacks `pipefail`, `set -u`) |
| macOS system preferences automation (`defaults write`) | Replicates System Settings state across machines | HIGH | Explicitly out of scope in PROJECT.md; should remain deferred |
| Per-tool version pinning | Reproducibility requires knowing exact versions, not just package names | MEDIUM | Not present; Homebrew does not guarantee version pinning without lock files |
| `Brewfile.lock.json` committed to repo | `brew bundle` produces a lockfile; committing it pins versions for new setups | LOW | Not present; debated in community — useful for new-machine reproducibility |
| Encrypted secrets layer | Sensitive tokens (API keys, `~/.ssh`) committed encrypted with `age` or `git-crypt` | HIGH | Explicitly out of scope in PROJECT.md for good reason; mention as a known pattern |

### Anti-Features (Commonly Requested, Often Problematic)

Features that appear useful but introduce more complexity than they solve for this repo's use case.

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Full dotfile manager (chezmoi / yadm) | Handles templating, encryption, multi-host logic automatically | Adds a mandatory dependency and mental model switch; current symlink approach is transparent and already works | Keep symlinks; add a `verify` mode to the existing script instead |
| Stow (GNU Stow) | Automates symlink creation with package semantics | One more indirection layer; current `link_file()` is already purpose-built and idiomatic | Extend `link_file()` / add a `link_configs --verify` mode |
| Ansible or Nix | Fully declarative system configuration | Massive complexity overhead; neither is necessary when Homebrew + bash scripts already handle the job reliably | Stick with Bash; use Brewfile for package declarations |
| Encrypted secrets in repo | Avoid storing tokens elsewhere | Requires key distribution, rotation strategy, and recovery plan — adds more problems than it solves for a personal repo | Use system keychain (`security` CLI on macOS) or environment-specific `.env` outside repo |
| GUI dotfiles manager / TUI | Visual management of configs | Personal dotfiles are used by one person who knows their own setup; a GUI adds no value over `ls -la ~/.config` | Shell alias `dotcheck` pointing to verify mode is sufficient |
| Auto-push on change | Keeps remote always up to date | Creates noisy commit history, risks pushing sensitive data, bypasses intentional commit workflow | Commit intentionally per conventional commits standard |
| Separate branches per machine | Keeps machine-specific config out of main | Branch divergence is hard to maintain; becomes a rebase burden | Use environment variables (`CONFIG_VARIANT`) or conditional logic in scripts — already done for `SKETCHYBAR` |
| Symlink everything including `~/.ssh` | One repo controls all config | SSH keys must never enter version control even with `.gitignore` protection | Use macOS Keychain + `~/.ssh/config` symlinked but keys excluded explicitly |

## Feature Dependencies

```
[Setup script health check / verify mode]
    └──requires──> [Canonical symlink map in code]
                       └──already exists──> [link_configs() function]

[Brewfile declarative package manifest]
    └──enables──> [brew bundle check] (drift detection for packages)
    └──enables──> [Brewfile.lock.json] (version reproducibility)

[ShellCheck CI]
    └──requires──> [GitHub Actions workflow file]
    └──enhances──> [Linux setup script quality] (catches missing pipefail, set -u)

[AI assistant config consistency]
    └──requires──> [Shared CLAUDE.md / AGENTS.md as single source]
    └──enhances──> [Skills system] (all tools benefit from consistent instructions)

[Update notification on shell startup]
    └──requires──> [Git remote tracking in shell] (background git fetch)
    └──conflicts──> [Slow shell startup] (must be non-blocking / async)

[Role setup scripts discoverability]
    └──enhances──> [README.md / setup instructions] (users need to know they exist)
```

### Dependency Notes

- **Brewfile requires canonical symlink map:** Creating a Brewfile is standalone but verifying package drift via `brew bundle check` becomes most useful once the script-level drift check is also in place — they form a pair.
- **ShellCheck CI enhances Linux setup script:** The Linux `initial-setup.sh` lacks `set -euo pipefail` and uses older patterns; CI will surface this immediately.
- **Update notification conflicts with shell startup speed:** A naive `git fetch` in `.zshrc` adds 500ms+. Mature implementations use a background process writing a cache file, checked synchronously on startup.

## MVP Definition

This is a brownfield repo — "MVP" here means the next milestone's minimum viable improvements.

### Launch With (v1 — Immediate improvements)

- [ ] Setup script verify mode (`--check` flag) — closes the drift detection gap that exists today
- [ ] Brewfile committed to repo — decouples package list from bootstrap logic, enables `brew bundle check`
- [ ] ShellCheck CI via GitHub Actions — prevents script regressions; `shellcheck` already installed
- [ ] Linux setup script hardening (`set -euo pipefail`, bring to parity with macOS script patterns)

### Add After Validation (v1.x — Quality of life)

- [ ] Update notification on shell startup — triggers when dotfiles remote has new commits
- [ ] Brewfile.lock.json committed — pins exact versions for reproducible new-machine setups
- [ ] Skills system convention documented in README — makes the AI assistant setup discoverable

### Future Consideration (v2+)

- [ ] Cross-platform config templating — if Linux usage increases beyond occasional WSL use
- [ ] Per-machine host-specific overrides — only needed if managing 3+ machines with divergent configs
- [ ] Automated `brew upgrade` wrapper — useful but current manual `brew update && brew upgrade` is sufficient

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Setup script verify mode | HIGH | MEDIUM | P1 |
| Brewfile committed to repo | HIGH | LOW | P1 |
| ShellCheck CI (GitHub Actions) | HIGH | LOW | P1 |
| Linux setup script hardening | MEDIUM | LOW | P1 |
| Update notification on shell startup | MEDIUM | MEDIUM | P2 |
| Brewfile.lock.json | MEDIUM | LOW | P2 |
| Skills system documentation | MEDIUM | LOW | P2 |
| Cross-platform templating | LOW | HIGH | P3 |
| Per-machine host overrides | LOW | HIGH | P3 |
| Automated brew upgrade wrapper | LOW | LOW | P3 |

**Priority key:**
- P1: Must have — closes known gaps with high ROI
- P2: Should have — adds polish when core is stable
- P3: Nice to have — defer until P1/P2 is validated

## Reference Analysis

High-quality dotfiles repos from the ecosystem provide useful comparison points.

| Feature | Lissy93/dotfiles | ruchernchong/dotfiles | This repo |
|---------|------------------|-----------------------|-----------|
| One-command bootstrap | Yes (curl pipe bash) | Yes | Yes |
| Idempotent script | Yes | Yes | Yes |
| Brewfile | Yes | Yes | No — arrays in script |
| ShellCheck CI | Yes | Yes | No |
| Symlink verify/drift check | No (uses dotbot) | Yes (sync-checker skill) | No |
| AI assistant configs | No | Partial | Yes — differentiator |
| Role-specific setups | No | No | Yes — differentiator |
| Skills system | No | No | Yes — differentiator |
| Secrets encryption | Yes (git-crypt) | No | Explicitly out of scope |
| Update notifications | No | Yes | No |
| Linux parity | Partial | Yes | Partial |

## Sources

- [Awesome Dotfiles — webpro/awesome-dotfiles](https://github.com/webpro/awesome-dotfiles)
- [Lissy93/dotfiles — feature-rich reference implementation](https://github.com/Lissy93/dotfiles)
- [ruchernchong/dotfiles — cross-platform with sync-checker skill](https://github.com/ruchernchong/dotfiles)
- [Dotfiles — GitHub does dotfiles](https://dotfiles.github.io/)
- [Dotfiles and AI Coding Agents — drmowinckels.io, 2026](https://drmowinckels.io/blog/2026/dotfiles-coding-agents/)
- [Declarative package management with Brewfile — matthiasportzel.com](https://matthiasportzel.com/brewfile/)
- [CI your macOS dotfiles with GitHub Actions — mattorb.com](https://mattorb.com/ci-your-dotfiles-with-github-actions/)
- [ShellCheck GitHub Action — GitHub Marketplace](https://github.com/marketplace/actions/shellcheck)
- [Secret Management Best Practices for Dotfiles — dotfiles.io](https://dotfiles.io/en/guides/secret-management/)
- [dotfiles.github.io utilities list](https://dotfiles.github.io/utilities/)

---
*Feature research for: dotfiles management (macOS, symlink-based, AI-assistant-aware)*
*Researched: 2026-03-30*
