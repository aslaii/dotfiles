---
status: complete
phase: 02-declarative-package-and-plugin-management
source: [02-01-SUMMARY.md, 02-02-SUMMARY.md]
started: 2026-03-30T16:00:00Z
updated: 2026-03-31T00:00:00Z
---

## Current Test

[testing complete]

## Tests

### 1. brew bundle check passes
expected: Run `brew bundle check --file=Brewfile` in the repo root. Exits 0, all dependencies satisfied.
result: pass

### 2. No deprecated homebrew/cask-fonts tap
expected: Run `grep -i 'cask-fonts' Brewfile`. Should return no results — the deprecated tap has been removed.
result: pass

### 3. nvim/lazy-lock.json tracked in git
expected: Run `git ls-files nvim/lazy-lock.json`. Should return `nvim/lazy-lock.json` — the file is tracked, not gitignored.
result: pass

### 4. Bootstrap uses brew bundle (no inline arrays)
expected: Run `grep -c 'BREW_FORMULAE\|BREW_CASKS\|BREW_TAPS' initial-setup-macos.sh`. Should return 0 — all inline package arrays have been removed. Then `grep 'brew bundle' initial-setup-macos.sh` should show the new declarative install call.
result: pass

### 5. Brewfile contains all expected packages
expected: Run `wc -l Brewfile` — should have 40+ lines. Spot-check: `grep 'neovim\|tmux\|starship\|ripgrep' Brewfile` should match all four. `grep 'oven-sh/bun' Brewfile` should match (tap was added as fix).
result: pass

### 6. .gitattributes collapses lockfile diffs
expected: Run `cat .gitattributes`. Should contain a line marking `Brewfile.lock.json` as linguist-generated for PR diff collapsing.
result: pass

## Summary

total: 6
passed: 6
issues: 0
pending: 0
skipped: 0
blocked: 0

## Gaps

[none]
