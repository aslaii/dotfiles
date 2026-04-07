# Deferred Items — Quick Task 260407-j53

Out-of-scope issues discovered during execution. NOT fixed in this commit per the SCOPE BOUNDARY rule (only auto-fix issues directly caused by the current task's changes).

## DEF-1: `update_codex_theme()` fails on symlinked `~/.codex/config.toml` (pre-existing)

**Severity:** High — silently breaks the entire `sync-ai-cli-theme.sh` chain on any machine where `~/.codex/config.toml` is a symlink (which is the standard dotfiles setup).

**Discovered:** While running runtime verification of the new `update_opencode_theme()` function.

**Pre-existing:** YES — present at base commit `75f21dad16ee8690974e1dabac0f24229c91d4e5` before any changes in this task.

**Symptom:**
```
$ bash scripts/sync-ai-cli-theme.sh
sed: /Users/aslaii/.codex/config.toml: in-place editing only works for regular files
exit=1
```

**Root cause:** `scripts/sync-ai-cli-theme.sh:22` uses BSD `sed -i ''` on `$HOME/.codex/config.toml`, but on macOS dotfiles installs that path is a symlink (`~/.codex/config.toml -> ~/dotfiles/codex/config.toml`). BSD sed refuses in-place editing on symlinks (unlike GNU sed which silently follows them).

**Blast radius:** Because `set -euo pipefail` is enabled, the failure of `update_codex_theme` aborts the script before `update_gemini_theme`, `update_claude_theme`, AND the new `update_opencode_theme` can run. This means **none** of the AI CLI sync functions actually execute on a fresh shell — they have been silently broken on this machine.

**Why not fixed here:**
1. The plan says "Do NOT remove or reorder any existing line" and explicitly limits the action to extending the script with opencode logic
2. The orchestrator constraint says "Execute the plan exactly as written"
3. The fix touches a function (`update_codex_theme`) outside the plan's `files_modified` scope of new opencode work
4. The fix logic itself is debatable (use `realpath`/`readlink -f` to resolve, or pipe-and-rewrite the target file, or switch to a tmp-file pattern like the jq functions) — needs explicit design choice
5. SCOPE BOUNDARY rule: "Only auto-fix issues DIRECTLY caused by the current task's changes. Pre-existing failures in unrelated files are out of scope."

**Suggested fix (one-line, additive):**
```bash
update_codex_theme() {
  local config_path="$HOME/.codex/config.toml"

  if [[ ! -f "$config_path" ]]; then
    return
  fi

  # Resolve symlink so BSD sed -i works (macOS dotfiles install it as a symlink)
  config_path="$(readlink -f "$config_path" 2>/dev/null || echo "$config_path")"

  sed -i '' -E "s/^theme = \".*\"$/theme = \"${codex_theme}\"/" "$config_path"
}
```

But note: this would write to `~/dotfiles/codex/config.toml`, which is a tracked file. That's a separate semantic concern (sync-ai-cli-theme writing to the dotfiles repo at runtime). A safer pattern is to switch `update_codex_theme` to the same `mktemp` + `mv` pattern the jq-based functions use, with the resolved path.

**Recommended follow-up:** File a new quick task — `fix(codex): make sync-ai-cli-theme.sh work with symlinked config.toml` — and decide between the readlink approach and the broader refactor.

**Impact on this task (260407-j53):**
- The new `update_opencode_theme()` function is provably correct in isolation (verified via direct execution — see SUMMARY.md "Functional Verification" section).
- The new `opencode()` shell wrapper is wired correctly.
- However, runtime execution of `bash scripts/sync-ai-cli-theme.sh` will exit 1 at the codex step BEFORE reaching `update_opencode_theme`, so the user-visible bug fix only takes effect once DEF-1 is resolved.
- All static gates from the plan's `<verify>` block (bash -n, zsh -n, shellcheck, 9 grep assertions) pass cleanly.
