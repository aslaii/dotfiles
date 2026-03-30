---
phase: 02-declarative-package-and-plugin-management
plan: 02
subsystem: infra
tags: [homebrew, brew-bundle, brewfile, bootstrap, neovim, lazy-lock]

# Dependency graph
requires:
  - phase: 02-declarative-package-and-plugin-management
    provides: "Brewfile with all packages declared"
provides:
  - "Bootstrap script using brew bundle install from Brewfile"
  - "SKETCHYBAR toggle via HOMEBREW_BUNDLE_BREW_SKIP env var"
  - "Deprecated tap cleanup (homebrew/cask-fonts)"
  - "Verified nvim/lazy-lock.json tracking and documentation"
affects: [03-drift-detection-and-shell-optimization, 04-documentation-and-onboarding]

# Tech tracking
tech-stack:
  added: [brew-bundle]
  patterns: [declarative-package-management, env-var-skip-pattern]

key-files:
  created: []
  modified: [initial-setup-macos.sh, Brewfile]

key-decisions:
  - "Brewfile.lock.json not committed -- modern Homebrew no longer generates it"
  - "Added oven-sh/bun tap to Brewfile for bun formula availability"
  - "Renamed google-cloud-sdk cask to gcloud-cli (Homebrew rename)"

patterns-established:
  - "HOMEBREW_BUNDLE_BREW_SKIP pattern for optional package skipping"
  - "brew bundle check as idempotency guard before install"

requirements-completed: [PKG-02, PKG-04, NVIM-02]

# Metrics
duration: 4min
completed: 2026-03-30
---

# Phase 02 Plan 02: Bootstrap Migration to brew bundle Summary

**Migrated bootstrap script from inline package arrays to declarative brew bundle install with SKETCHYBAR skip support and Brewfile bug fixes**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-30T15:30:55Z
- **Completed:** 2026-03-30T15:35:01Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- Removed all inline BREW_TAPS, BREW_FORMULAE, BREW_CASKS arrays and their install functions from bootstrap script
- Added ensure_homebrew_packages() using brew bundle install with idempotency check and SKETCHYBAR toggle
- Fixed Brewfile bugs: added missing oven-sh/bun tap, renamed deprecated google-cloud-sdk cask to gcloud-cli
- Verified nvim/lazy-lock.json is tracked, valid JSON, and documented in nvim/AGENTS.md

## Task Commits

Each task was committed atomically:

1. **Task 1: Migrate bootstrap script to brew bundle** - `165fb23` (feat)
2. **Task 2: Brewfile fixes and Neovim lockfile verification** - `c039254` (fix)

## Files Created/Modified
- `initial-setup-macos.sh` - Removed 3 arrays and 3 functions, added ensure_homebrew_packages() with brew bundle
- `Brewfile` - Added oven-sh/bun tap, renamed google-cloud-sdk to gcloud-cli

## Decisions Made
- **Brewfile.lock.json not committed:** Modern Homebrew (4.x) no longer generates Brewfile.lock.json. The plan assumed it would be generated, but the feature has been removed. Since the plan's own research noted it was only a "debug artifact, not a version pin," this is acceptable. The Brewfile itself is the reproducibility guarantee.
- **Added oven-sh/bun tap:** The bun formula requires the oven-sh/bun tap which was missing from the Brewfile created in plan 02-01.
- **Renamed google-cloud-sdk to gcloud-cli:** Homebrew renamed this cask; brew bundle install warned about the deprecation.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Added missing oven-sh/bun tap to Brewfile**
- **Found during:** Task 2 (Brewfile.lock.json generation)
- **Issue:** brew bundle install failed because `bun` formula requires the `oven-sh/bun` tap which was not declared in the Brewfile
- **Fix:** Added `tap "oven-sh/bun"` to Brewfile
- **Files modified:** Brewfile
- **Verification:** brew bundle install completes successfully, brew bundle check passes
- **Committed in:** c039254 (Task 2 commit)

**2. [Rule 1 - Bug] Renamed deprecated google-cloud-sdk cask to gcloud-cli**
- **Found during:** Task 2 (Brewfile.lock.json generation)
- **Issue:** Homebrew renamed google-cloud-sdk to gcloud-cli; brew bundle warned about deprecation
- **Fix:** Changed `cask "google-cloud-sdk"` to `cask "gcloud-cli"` in Brewfile
- **Files modified:** Brewfile
- **Verification:** brew bundle check passes without warnings
- **Committed in:** c039254 (Task 2 commit)

**3. [Deviation] Brewfile.lock.json not generated**
- **Found during:** Task 2
- **Issue:** Modern Homebrew no longer generates Brewfile.lock.json. The plan's must_haves included committing this file.
- **Resolution:** Documented as acceptable -- the plan's own research noted it was "NOT a version-pinning lockfile" and only a "debug artifact." The Brewfile itself is the reproducibility guarantee.
- **Impact:** One must_have artifact not deliverable due to upstream Homebrew changes.

---

**Total deviations:** 2 auto-fixed (2 bugs), 1 documented (upstream feature removal)
**Impact on plan:** Bug fixes were necessary for brew bundle to succeed. Lockfile absence is due to Homebrew removing the feature -- no workaround possible.

## Issues Encountered
None beyond the deviations documented above.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Bootstrap script fully migrated to declarative brew bundle
- All packages installable via single `brew bundle install --file=Brewfile` command
- Ready for Phase 03 (drift detection and shell optimization) which can build on brew bundle check for drift detection

## Self-Check: PASSED

All files exist, all commit hashes verified.

---
*Phase: 02-declarative-package-and-plugin-management*
*Completed: 2026-03-30*
