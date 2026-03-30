# Requirements: Dotfiles Configuration

**Defined:** 2026-03-30
**Core Value:** One-command machine setup that reliably reproduces an opinionated, productive macOS development environment

## v1 Requirements

Requirements for this milestone. Each maps to roadmap phases.

### Security

- [x] **SEC-01**: All tracked files contain no hardcoded absolute user paths (`/Users/aslaii`)
- [x] **SEC-02**: `gemini/` directory has a dedicated `.gitignore` excluding OAuth tokens and session state
- [x] **SEC-03**: `opencode/` and `codex/` directories audited for gitignore completeness
- [x] **SEC-04**: `ensure_expected_user` replaced with portable approach (prompt or env var)
- [ ] **SEC-05**: Pre-commit secret detection hook (gitleaks or trufflehog) configured

### Quality Tooling

- [ ] **QUAL-01**: ShellCheck CI runs on all `.sh` files via GitHub Actions
- [ ] **QUAL-02**: `shfmt` added to BREW_FORMULAE and wired as pre-commit hook
- [ ] **QUAL-03**: `.pre-commit-config.yaml` created with ShellCheck + shfmt hooks
- [x] **QUAL-04**: `initial-setup.sh` (Linux) hardened with `set -euo pipefail` and modern patterns

### Package Management

- [ ] **PKG-01**: `Brewfile` committed with all taps, formulae, and casks extracted from setup script
- [ ] **PKG-02**: Bootstrap script updated to use `brew bundle install` instead of inline arrays
- [ ] **PKG-03**: Deprecated `homebrew/cask-fonts` tap reference removed
- [ ] **PKG-04**: `Brewfile.lock.json` committed for version reproducibility

### Drift Detection

- [ ] **DRIFT-01**: `initial-setup-macos.sh --check` mode validates symlinks without modifying anything
- [ ] **DRIFT-02**: `dotcheck` shell alias available for quick drift verification
- [ ] **DRIFT-03**: Verify mode reports missing symlinks, wrong targets, and stale links

### Neovim

- [ ] **NVIM-01**: `lazy-lock.json` tracked in git for reproducible plugin installs
- [ ] **NVIM-02**: Plugin upgrade workflow documented (`:Lazy update` + commit lockfile)

### Shell Performance

- [ ] **SHELL-01**: Powerlevel10k references removed; starship confirmed as sole prompt
- [ ] **SHELL-02**: Zinit plugin load order audited; `zsh-syntax-highlighting` loads last
- [ ] **SHELL-03**: nvm lazy-loaded (init only on first `node`/`npm`/`nvm` invocation)
- [ ] **SHELL-04**: Shell startup time verified < 200ms (`time zsh -i -c exit`)

### Documentation

- [ ] **DOC-01**: Root `README.md` with bootstrap instructions, symlink map, and env flag reference
- [ ] **DOC-02**: `yabai/README.md` with SIP disable procedure and scripting-addition sudoers entry
- [ ] **DOC-03**: `setups/` scripts documented with shared `functions.sh` contract
- [ ] **DOC-04**: Skills system convention documented for AI assistant extensibility

## v2 Requirements

Deferred to future milestone. Tracked but not in current roadmap.

### Cross-Platform

- **XPLAT-01**: Cross-platform config templating for divergent macOS/Linux settings
- **XPLAT-02**: Per-machine host-specific override mechanism

### Shell Modernization

- **SHMOD-01**: Evaluate mise as nvm replacement (2-5x faster, reads `.nvmrc`)
- **SHMOD-02**: Update notification on shell startup (background git fetch, non-blocking)

### Advanced Package Management

- **APKG-01**: Automated `brew update && brew upgrade` wrapper with safety checks
- **APKG-02**: yabai and skhd version pinning (`brew pin`) to prevent macOS-update breakage

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| chezmoi/yadm/stow migration | Current symlink approach is transparent and already works; adds mandatory dependency |
| Ansible or Nix | Massive complexity overhead for a personal repo |
| Encrypted secrets in repo | Requires key distribution and rotation; use system keychain instead |
| GUI/TUI dotfiles manager | Single-user repo; no value over shell commands |
| Auto-push on change | Noisy history, risks pushing sensitive data |
| Separate branches per machine | Branch divergence is unsustainable; use env vars instead |
| macOS system preferences (`defaults write`) | Too volatile; explicitly excluded in PROJECT.md |
| Symlink `~/.ssh` | SSH keys must never enter version control |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| SEC-01 | Phase 1 | Complete |
| SEC-02 | Phase 1 | Complete |
| SEC-03 | Phase 1 | Complete |
| SEC-04 | Phase 1 | Complete |
| SEC-05 | Phase 1 | Pending |
| QUAL-01 | Phase 1 | Pending |
| QUAL-02 | Phase 1 | Pending |
| QUAL-03 | Phase 1 | Pending |
| QUAL-04 | Phase 1 | Complete |
| PKG-01 | Phase 2 | Pending |
| PKG-02 | Phase 2 | Pending |
| PKG-03 | Phase 2 | Pending |
| PKG-04 | Phase 2 | Pending |
| NVIM-01 | Phase 2 | Pending |
| NVIM-02 | Phase 2 | Pending |
| DRIFT-01 | Phase 3 | Pending |
| DRIFT-02 | Phase 3 | Pending |
| DRIFT-03 | Phase 3 | Pending |
| SHELL-01 | Phase 3 | Pending |
| SHELL-02 | Phase 3 | Pending |
| SHELL-03 | Phase 3 | Pending |
| SHELL-04 | Phase 3 | Pending |
| DOC-01 | Phase 4 | Pending |
| DOC-02 | Phase 4 | Pending |
| DOC-03 | Phase 4 | Pending |
| DOC-04 | Phase 4 | Pending |

**Coverage:**
- v1 requirements: 26 total
- Mapped to phases: 26
- Unmapped: 0

---
*Requirements defined: 2026-03-30*
*Last updated: 2026-03-30 after roadmap creation (coarse granularity: 7 categories compressed to 4 phases)*
