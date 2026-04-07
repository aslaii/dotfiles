---
quick_id: 260407-iml
type: execute
status: complete
completed_at: "2026-04-07"
commit: a69a686
files_created:
  - opencode/tui.json
files_modified: []
requirements:
  - QUICK-260407-iml
---

# Quick Task 260407-iml: Switch OpenCode TUI Theme to Catppuccin

## One-liner

Created `opencode/tui.json` selecting the bundled `catppuccin` theme so OpenCode auto-switches Latte/Mocha in lockstep with Ghostty, fixing unreadable grey-on-white panels in light mode.

## What Changed

- **Created** `opencode/tui.json` (4 lines) — minimal two-key payload: `$schema` + `theme: "catppuccin"`.
- No other files touched. `opencode/opencode.json` left untouched (upstream migrated `theme` out of it). No setup script changes needed because `~/.config/opencode -> dotfiles/opencode` is a directory symlink, so the new file is live immediately.

## Why

OpenCode previously had no theme set anywhere (the `theme` key was migrated out of `opencode.json` upstream and `tui.json` did not exist). It fell back to a system default whose light variant rendered grey text on white panels — unreadable. Ghostty already auto-switches `dark:Catppuccin Mocha,light:Catppuccin Latte`; the bundled OpenCode `catppuccin` theme contains both Latte and Mocha palettes and is auto-swapped via `CliRenderEvents.THEME_MODE`. A single-file two-key config gets OpenCode to mirror Ghostty.

## Verification

Automated verification from PLAN.md Task 1 `<verify>` block passed:

```
$ test -f opencode/tui.json && python3 -c "import json; d=json.load(open('opencode/tui.json')); assert d['theme']=='catppuccin'; assert d['\$schema']=='https://opencode.ai/tui.json'; print('OK')" && test -f $HOME/.config/opencode/tui.json && python3 -c "import json; assert json.load(open('$HOME/.config/opencode/tui.json'))['theme']=='catppuccin'; print('symlink OK')"
OK
symlink OK
```

Confirms: file exists, valid JSON, correct theme value, schema set, AND the file is reachable through the existing directory symlink at `~/.config/opencode/tui.json` (no setup script changes required).

`git diff --stat opencode/` confirmed only `opencode/tui.json` was added — zero collateral damage to `opencode.json` or anything else.

## Manual Smoke Test (recommended, non-blocking)

- Launch `opencode` in light mode → panels render with Catppuccin Latte (cream background, dark text — readable).
- Toggle macOS appearance to dark → panels switch to Catppuccin Mocha automatically without restarting OpenCode.

## Deviations from Plan

None — plan executed exactly as written.

## Commit

`a69a686` — `feat(opencode): set tui theme to catppuccin for ghostty parity`

## Self-Check: PASSED

- `opencode/tui.json` exists at expected path — FOUND
- Commit `a69a686` exists in git log — FOUND
- `~/.config/opencode/tui.json` resolves through symlink and contains `theme: catppuccin` — FOUND
