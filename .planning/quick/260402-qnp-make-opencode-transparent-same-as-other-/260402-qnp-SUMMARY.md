---
phase: quick
plan: 260402-qnp
subsystem: config
tags: [opencode, theme, transparency, ghostty]

requires: []
provides:
  - OpenCode TUI transparent background via "system" theme
affects: []

tech-stack:
  added: []
  patterns: []

key-files:
  created: []
  modified: [opencode/opencode.json]

key-decisions:
  - "Used 'system' theme which sets backgrounds to 'none', inheriting terminal transparency"

patterns-established: []

requirements-completed: []

duration: 1min
completed: 2026-04-02
---

# Quick Task 260402-qnp: Make OpenCode Transparent Summary

**OpenCode TUI set to "system" theme for transparent backgrounds inheriting Ghostty's 0.8 opacity**

## Performance

- **Duration:** 1 min
- **Started:** 2026-04-02T19:34:00Z
- **Completed:** 2026-04-02T19:35:00Z
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments
- Added `"theme": "system"` to opencode/opencode.json for terminal-native transparency
- OpenCode now inherits Ghostty's background-opacity (0.8) and background-blur settings

## Task Commits

Each task was committed atomically:

1. **Task 1: Add transparent theme to OpenCode config** - `a1d0232` (feat)

## Files Created/Modified
- `opencode/opencode.json` - Added "theme": "system" top-level key after "$schema"

## Decisions Made
- Used "system" theme which sets background colors to "none", allowing the terminal emulator's native background (including transparency) to show through

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## Self-Check: PASSED
