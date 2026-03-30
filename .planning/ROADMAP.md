# Roadmap: Dotfiles Configuration

## Overview

This milestone hardens a working brownfield dotfiles repo into a reliably reproducible, safe-to-publish, and self-documenting development environment. The work progresses from eliminating active security risks and establishing quality tooling, through declarative package and plugin management, to operational drift detection and shell performance, finishing with documentation that makes the entire system discoverable.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [ ] **Phase 1: Security and Quality Hardening** - Eliminate hardcoded paths, close gitignore gaps, and establish linting/CI baseline before any new work is added
- [ ] **Phase 2: Declarative Package and Plugin Management** - Commit a Brewfile and Neovim lockfile so new-machine setup is fully reproducible without manual intervention
- [ ] **Phase 3: Drift Detection and Shell Performance** - Add a symlink verify mode and audit the Zsh environment so the live machine reliably reflects the repo
- [ ] **Phase 4: Documentation** - Document the bootstrap, tools, and skills system so a fresh machine setup requires no tribal knowledge

## Phase Details

### Phase 1: Security and Quality Hardening
**Goal**: The repo is safe to publish publicly and every shell script is automatically linted on commit and CI
**Depends on**: Nothing (first phase)
**Requirements**: SEC-01, SEC-02, SEC-03, SEC-04, SEC-05, QUAL-01, QUAL-02, QUAL-03, QUAL-04
**Success Criteria** (what must be TRUE):
  1. `grep -rn '/Users/aslaii' $(git ls-files)` returns zero results across all tracked files
  2. `gemini/`, `opencode/`, and `codex/` each have a `.gitignore` that excludes OAuth tokens and session state
  3. Running the setup script on an account other than `aslaii` succeeds without aborting (prompt or env-var path, not hard-fail)
  4. A pre-commit run on any staged `.sh` file triggers ShellCheck and shfmt checks locally
  5. A push to a PR branch triggers the ShellCheck GitHub Actions workflow and reports pass/fail
**Plans**: 4 plans

Plans:
- [x] 01-01-PLAN.md — Fix hardcoded paths in shell files and setup scripts; remove user guard; harden Linux bootstrap
- [x] 01-02-PLAN.md — Create config templates (claude, gemini, codex); create gitignores; wire template processing in bootstrap
- [x] 01-03-PLAN.md — Bulk-replace /Users/aslaii in opencode and gemini framework agent/workflow files
- [ ] 01-04-PLAN.md — Create .pre-commit-config.yaml (ShellCheck + shfmt + gitleaks) and GitHub Actions CI workflow

### Phase 2: Declarative Package and Plugin Management
**Goal**: A fresh machine bootstrap installs the exact same packages and Neovim plugins as the current machine without any manual intervention
**Depends on**: Phase 1
**Requirements**: PKG-01, PKG-02, PKG-03, PKG-04, NVIM-01, NVIM-02
**Success Criteria** (what must be TRUE):
  1. `brew bundle check` passes against the committed `Brewfile` on the current machine
  2. `brew bundle install` on a fresh machine installs all taps, formulae, and casks without referencing deprecated `homebrew/cask-fonts`
  3. `Brewfile.lock.json` is committed and reflects the currently installed package versions
  4. `nvim/lazy-lock.json` is tracked in git and Neovim uses it to install pinned plugin versions on a fresh machine
**Plans**: 2 plans

Plans:
- [ ] 02-01-PLAN.md — Create Brewfile from setup script arrays; fix .gitignore for lazy-lock.json; add .gitattributes
- [ ] 02-02-PLAN.md — Migrate bootstrap script to brew bundle; generate Brewfile.lock.json; verify Neovim lockfile

### Phase 3: Drift Detection and Shell Performance
**Goal**: The developer can verify in seconds that the live machine matches the repo, and the interactive shell starts in under 200ms with a clean plugin order
**Depends on**: Phase 2
**Requirements**: DRIFT-01, DRIFT-02, DRIFT-03, SHELL-01, SHELL-02, SHELL-03, SHELL-04
**Success Criteria** (what must be TRUE):
  1. `./initial-setup-macos.sh --check` exits non-zero and prints each out-of-sync symlink without modifying anything
  2. Running `dotcheck` in any shell session prints a drift report (or "all symlinks OK")
  3. No Powerlevel10k references exist in any tracked file; starship is the only prompt configured
  4. `time zsh -i -c exit` measures below 200ms on the development machine
  5. `nvm` (and Node/npm) is not initialized until the first invocation of `node`, `npm`, or `nvm` in a session
**Plans**: TBD

### Phase 4: Documentation
**Goal**: A developer (including future self on a new machine) can understand the full setup, run it, and extend the AI skills system without reading any source code first
**Depends on**: Phase 3
**Requirements**: DOC-01, DOC-02, DOC-03, DOC-04
**Success Criteria** (what must be TRUE):
  1. `README.md` at repo root documents one-command bootstrap, full symlink map, env flag reference, and skills system overview
  2. `yabai/README.md` documents the SIP disable procedure and scripting-addition sudoers entry needed for yabai to function
  3. `setups/` scripts are documented with the shared `functions.sh` contract so adding a new role script requires no reverse-engineering
  4. The AI skills system convention is documented so a new skill can be added by following the written instructions alone
**Plans**: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Security and Quality Hardening | 0/4 | Not started | - |
| 2. Declarative Package and Plugin Management | 0/2 | Not started | - |
| 3. Drift Detection and Shell Performance | 0/TBD | Not started | - |
| 4. Documentation | 0/TBD | Not started | - |
