---
quick_id: 260407-iml
type: execute
wave: 1
depends_on: []
files_modified:
  - opencode/tui.json
autonomous: true
requirements:
  - QUICK-260407-iml
must_haves:
  truths:
    - "OpenCode TUI uses the catppuccin theme instead of system default"
    - "Catppuccin auto-switches between Latte (light) and Mocha (dark) based on system appearance, mirroring Ghostty"
    - "The previously unreadable grey-on-white panels are gone because Latte palette is applied in light mode"
    - "Re-running setup or pulling on a fresh machine produces the same theme (file is committed and lives inside the symlinked opencode/ dir)"
  artifacts:
    - path: "opencode/tui.json"
      provides: "OpenCode TUI theme selection"
      contains: '"theme": "catppuccin"'
  key_links:
    - from: "opencode/tui.json"
      to: "$HOME/.config/opencode/tui.json"
      via: "directory symlink ~/.config/opencode -> dotfiles/opencode"
      pattern: "test -f $HOME/.config/opencode/tui.json"
    - from: "opencode/tui.json theme=catppuccin"
      to: "OpenCode CliRenderEvents.THEME_MODE handler"
      via: "OpenCode auto-loads catppuccin.json bundled theme and swaps light/dark variant on system appearance change"
      pattern: '"theme"\s*:\s*"catppuccin"'
---

<objective>
Switch the OpenCode TUI from the system default theme to the bundled `catppuccin` theme so it auto-switches between Latte (light) and Mocha (dark) in lockstep with Ghostty, eliminating the unreadable grey-on-white panels in light mode.

Purpose: The user's Ghostty config already auto-switches `dark:Catppuccin Mocha,light:Catppuccin Latte`. OpenCode currently has no `theme` set anywhere (the key was migrated out of `opencode.json` upstream and `tui.json` does not yet exist), so it falls back to a system default whose light variant renders grey text on white panels — unreadable. The OpenCode catppuccin theme bundles both Latte and Mocha and is auto-swapped by `CliRenderEvents.THEME_MODE`, so a single-line config aligns OpenCode with Ghostty.

Output: One new committed file `opencode/tui.json` containing the catppuccin theme selection. The directory symlink `~/.config/opencode -> dotfiles/opencode` makes it active immediately with no setup script changes.
</objective>

<execution_context>
Quick task — single file creation. No discovery, no research, no execution helpers needed beyond git commit.
</execution_context>

<context>
@.planning/PROJECT.md
@AGENTS.md

<investigation_summary>
The orchestrator has already verified the entire situation. Do NOT re-investigate:

1. **Symlink:** `~/.config/opencode` is a *directory* symlink to `/Users/aslaii/dotfiles/opencode`. Any new file in `opencode/` automatically appears under `~/.config/opencode/`. No `ln -sfn` step required, no `initial-setup-macos.sh` change required.

2. **Current state:**
   - `opencode/tui.json` does NOT exist on disk (was previously untracked, stashed away during a cleanup).
   - `opencode/opencode.json` is committed and has NO `theme` key — upstream OpenCode migrated TUI theme out of `opencode.json` into a dedicated `tui.json` schema.
   - `opencode/.gitignore` correctly ignores `oh-my-opencode.json` (runtime cache only).

3. **Theme bundle:** OpenCode ships `catppuccin` as a single bundled theme file (`packages/opencode/src/cli/cmd/tui/context/theme/catppuccin.json`) containing BOTH `lightX` (Latte) and `darkX` (Mocha) palettes. The exact theme name is `"catppuccin"`.

4. **Auto-switching:** OpenCode's TUI listens to `CliRenderEvents.THEME_MODE` (`theme.tsx:396-400`) and applies the matching dark/light variant of the active theme whenever system appearance changes. Selecting `catppuccin` is sufficient — no additional config keys needed.

5. **Ghostty parity (`ghostty/config:1`):**
   ```
   theme = dark:Catppuccin Mocha,light:Catppuccin Latte
   background-opacity = 1
   ```
   Note: opacity is already 1, so the previous transparency rationale (quick task 260402-qnp) is obsolete and has no bearing on this task.

6. **Schema constraint:** `tui.json` schema rejects `additionalProperties` — do NOT attempt to override individual colors, only set `theme`.
</investigation_summary>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Create opencode/tui.json selecting the bundled catppuccin theme</name>
  <files>opencode/tui.json</files>
  <action>
Create a new file at `opencode/tui.json` (the directory symlink `~/.config/opencode -> dotfiles/opencode` will make it live immediately — no separate symlink step required).

Exact file contents (must match byte-for-byte; trailing newline included):

```json
{
  "$schema": "https://opencode.ai/tui.json",
  "theme": "catppuccin"
}
```

Constraints:
- Theme value MUST be exactly `"catppuccin"` (lowercase, no variant suffix). OpenCode auto-swaps the bundled `lightX`/`darkX` palettes in that single theme based on `CliRenderEvents.THEME_MODE`, mirroring Ghostty's `dark:Catppuccin Mocha,light:Catppuccin Latte`.
- Do NOT add any other keys (e.g., custom colors, palette overrides). The `tui.json` schema rejects `additionalProperties` and the file will fail to load.
- Do NOT modify `opencode/opencode.json` — upstream migrated the theme key out of it; adding it back would be ignored at best and rejected at worst.
- Do NOT create any custom theme files under `opencode/themes/` — `catppuccin` is bundled with OpenCode.
- Do NOT touch `initial-setup-macos.sh`, `setups/`, or any shell script — the directory-level symlink already exposes the file.

Use the Write tool to create the file.
  </action>
  <verify>
    <automated>test -f opencode/tui.json && python3 -c "import json,sys; d=json.load(open('opencode/tui.json')); assert d.get('theme')=='catppuccin', f'theme is {d.get(\"theme\")!r}, expected catppuccin'; assert d.get('\$schema')=='https://opencode.ai/tui.json', f'schema is {d.get(\"\$schema\")!r}'; print('OK')" && test -f "$HOME/.config/opencode/tui.json" && python3 -c "import json; assert json.load(open('$HOME/.config/opencode/tui.json'))['theme']=='catppuccin'; print('symlink OK')"</automated>
  </verify>
  <done>
- `opencode/tui.json` exists, is valid JSON, and contains exactly `{"$schema": "https://opencode.ai/tui.json", "theme": "catppuccin"}`.
- `~/.config/opencode/tui.json` resolves to the new file (proves the directory symlink propagated it).
- `opencode/opencode.json` is unchanged (no `theme` key added, no other modifications).
- No other files in the repo modified.
  </done>
</task>

</tasks>

<verification>
After Task 1 completes:

1. JSON validity + theme value:
   ```bash
   python3 -c "import json; d=json.load(open('opencode/tui.json')); assert d['theme']=='catppuccin'; print(d)"
   ```
2. Symlink propagation:
   ```bash
   test -f "$HOME/.config/opencode/tui.json" && cat "$HOME/.config/opencode/tui.json"
   ```
3. No collateral damage:
   ```bash
   git diff --stat opencode/
   ```
   Should show ONLY `opencode/tui.json` as new (and no modifications to `opencode.json`).

Manual smoke test (recommended once after commit, NOT a blocking gate):
- Launch `opencode` in light mode → panels render with Catppuccin Latte (cream background, dark text — readable).
- Toggle macOS appearance to dark → panels switch to Catppuccin Mocha automatically without restarting OpenCode.
</verification>

<success_criteria>
- `opencode/tui.json` committed to the repo with the exact two-key payload above.
- The file is automatically active via the existing `~/.config/opencode` directory symlink (verified by `test -f $HOME/.config/opencode/tui.json`).
- OpenCode TUI uses the `catppuccin` theme and auto-switches Latte/Mocha in sync with Ghostty when system appearance changes.
- The grey-on-white unreadable light-mode regression is resolved.
- Zero changes to `opencode.json`, `initial-setup-macos.sh`, `setups/`, or any other file.
</success_criteria>

<output>
After completion, the executor commits with a Conventional Commit message such as:

```
feat(opencode): set tui theme to catppuccin for ghostty parity

Adds opencode/tui.json selecting the bundled catppuccin theme so the
OpenCode TUI auto-switches between Latte (light) and Mocha (dark) to
mirror Ghostty's dark:Catppuccin Mocha,light:Catppuccin Latte config.
Fixes unreadable grey-on-white panels in light mode (system default
fallback). Picked up automatically via the existing ~/.config/opencode
directory symlink — no setup script changes needed.
```

No SUMMARY.md needed for a quick task; the commit message is the record.
</output>
