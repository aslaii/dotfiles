---
phase: quick
plan: 260402-qnp
type: execute
wave: 1
depends_on: []
files_modified: [opencode/opencode.json]
autonomous: true
requirements: []
must_haves:
  truths:
    - "OpenCode TUI background is transparent, inheriting Ghostty's 0.8 opacity"
  artifacts:
    - path: "opencode/opencode.json"
      provides: "Theme configuration with transparent backgrounds"
      contains: "theme"
  key_links: []
---

<objective>
Make OpenCode's TUI transparent to match the Ghostty terminal's transparency (background-opacity 0.8, background-blur).

Purpose: Visual consistency — OpenCode should look the same as other terminal apps running inside Ghostty.
Output: Updated opencode/opencode.json with theme set to "system" which uses "none" backgrounds, inheriting the terminal's native transparency.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@opencode/opencode.json
</context>

<tasks>

<task type="auto">
  <name>Task 1: Add transparent theme to OpenCode config</name>
  <files>opencode/opencode.json</files>
  <action>
Add `"theme": "system"` as a top-level key in `opencode/opencode.json`. The "system" theme uses `"none"` for background colors, which tells OpenCode to inherit the terminal emulator's background — including Ghostty's 0.8 opacity and blur.

Place the `"theme"` key after `"$schema"` and before `"instructions"` for logical grouping. Do not modify any other settings.
  </action>
  <verify>
    <automated>cat opencode/opencode.json | python3 -c "import sys,json; c=json.load(sys.stdin); assert c.get('theme')=='system', f'Expected theme=system, got {c.get(\"theme\")}'; print('OK: theme is system')"</automated>
  </verify>
  <done>opencode/opencode.json contains "theme": "system" and is valid JSON</done>
</task>

</tasks>

<verification>
- opencode/opencode.json is valid JSON (python3 -c "import json; json.load(open('opencode/opencode.json'))")
- Theme key is set to "system"
- No other settings were modified
</verification>

<success_criteria>
OpenCode inherits Ghostty's terminal transparency when launched, showing the same 0.8 opacity background as other terminal applications.
</success_criteria>

<output>
After completion, create `.planning/quick/260402-qnp-make-opencode-transparent-same-as-other-/260402-qnp-SUMMARY.md`
</output>
