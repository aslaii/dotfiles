---
phase: 02-declarative-package-and-plugin-management
plan: 01
subsystem: infra
tags: [homebrew, brewfile, gitignore, gitattributes, neovim, lazy-lock]

requires:
  - phase: 01-security-and-quality-hardening
    provides: shellcheck, shfmt, pre-commit, gitleaks added to BREW_FORMULAE
provides:
  - Brewfile as single source of truth for Homebrew packages
  - .gitattributes for lockfile diff collapsing
  - Fixed nvim/lazy-lock.json tracking (no gitignore conflict)
affects: [02-02-PLAN, initial-setup-macos.sh]

tech-stack:
  added: [Brewfile (Homebrew Bundle)]
  patterns: [HOMEBREW_BUNDLE_BREW_SKIP for conditional packages]

key-files:
  created: [Brewfile, .gitattributes]
  modified: [.gitignore]

key-decisions:
  - "codex placed as cask (not formula) based on brew info verification"
  - "HOMEBREW_BUNDLE_BREW_SKIP pattern for optional sketchybar instead of conditional Brewfile logic"

patterns-established:
  - "Brewfile categories: Taps, Development, Shell, Node.js, Services, Quality Tooling, SketchyBar Dependencies, Window Management, Casks, Fonts"
  - "HOMEBREW_BUNDLE_BREW_SKIP/TAP_SKIP env vars for optional packages"

requirements-completed: [PKG-01, PKG-03, NVIM-01]

duration: 1min
completed: 2026-03-30
---

# Phase 2 Plan 1: Brewfile and Gitignore Fixes Summary

**Brewfile created as declarative Homebrew package manifest with all 31 formulae, 9 casks, 2 taps; lazy-lock.json gitignore conflict resolved**

## Performance

- **Duration:** 1 min
- **Started:** 2026-03-30T15:26:15Z
- **Completed:** 2026-03-30T15:27:26Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- Created Brewfile at repo root with all packages extracted from initial-setup-macos.sh arrays
- Removed deprecated homebrew/cask-fonts tap (fonts now in Homebrew core)
- Fixed nvim/lazy-lock.json gitignore conflict so tracking is explicit
- Added .gitattributes to collapse Brewfile.lock.json diffs in PRs

## Task Commits

Each task was committed atomically:

1. **Task 1: Create Brewfile from setup script arrays** - `43038d0` (feat)
2. **Task 2: Fix .gitignore for lazy-lock.json and add .gitattributes** - `ca8f9d2` (fix)

## Files Created/Modified
- `Brewfile` - Declarative Homebrew package manifest with all taps, formulae, and casks
- `.gitignore` - Removed nvim/lazy-lock.json entry to fix tracking conflict
- `.gitattributes` - Marks Brewfile.lock.json as linguist-generated for PR diff collapsing

## Decisions Made
- **codex as cask:** `brew info codex` confirmed it installs to Caskroom, so placed under casks instead of formulae (plan anticipated this possibility)
- **SKIP pattern:** Used HOMEBREW_BUNDLE_BREW_SKIP env var pattern for optional sketchybar, keeping Brewfile unconditional

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] codex moved from formulae to casks**
- **Found during:** Task 1 (Brewfile creation)
- **Issue:** Plan listed codex in BREW_FORMULAE array but `brew info codex` shows it is a cask (installed in Caskroom)
- **Fix:** Placed as `cask "codex"` instead of `brew "codex"`
- **Files modified:** Brewfile
- **Verification:** `brew info codex` confirms Caskroom installation
- **Committed in:** 43038d0

---

**Total deviations:** 1 auto-fixed (1 bug fix)
**Impact on plan:** Necessary correction for Brewfile accuracy. No scope creep.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Known Stubs
None - all data is wired from the actual setup script arrays.

## Next Phase Readiness
- Brewfile ready for Plan 02 to wire `brew bundle install --file=Brewfile` into initial-setup-macos.sh
- .gitattributes in place for when Brewfile.lock.json is generated

---
*Phase: 02-declarative-package-and-plugin-management*
*Completed: 2026-03-30*
