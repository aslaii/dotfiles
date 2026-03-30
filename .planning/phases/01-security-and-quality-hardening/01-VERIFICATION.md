---
phase: 01-security-and-quality-hardening
verified: 2026-03-30T15:04:37Z
status: gaps_found
score: 7/9 must-haves verified
re_verification: false
gaps:
  - truth: "grep -rn '/Users/aslaii' $(git ls-files) returns zero results across all tracked files"
    status: failed
    reason: "5 tracked non-planning files still contain /Users/aslaii: claude/settings.json (4 occurrences), codex/config.toml (10 occurrences), gemini/settings.json (5 occurrences), gemini/extensions/extension-enablement.json (2 occurrences), tmux/tmux.conf (2 occurrences). The gitignore entries were added for settings.json and config.toml but git rm --cached was never run, so git still tracks these files with their hardcoded paths."
    artifacts:
      - path: "claude/settings.json"
        issue: "Still tracked by git, contains 4 hardcoded /Users/aslaii paths in hook commands. gitignore entry exists (claude/.gitignore) but file was never untracked."
      - path: "gemini/settings.json"
        issue: "Still tracked by git, contains 5 hardcoded /Users/aslaii paths in hook commands and MCP arg. gitignore entry exists (gemini/.gitignore) but file was never untracked."
      - path: "codex/config.toml"
        issue: "Still tracked by git, contains 10 hardcoded /Users/aslaii paths (runtime [projects.] entries + hook command). gitignore entry exists (codex/.gitignore) but file was never untracked."
      - path: "gemini/extensions/extension-enablement.json"
        issue: "Still tracked by git, contains 2 hardcoded /Users/aslaii paths. gemini/.gitignore includes 'extensions/extension-enablement.json' but file was never untracked."
      - path: "tmux/tmux.conf"
        issue: "Still tracked by git, contains 2 hardcoded /Users/aslaii paths in status-right and run-shell commands. This file was outside plan scope but fails the phase success criterion."
    missing:
      - "Run git rm --cached claude/settings.json codex/config.toml gemini/settings.json gemini/extensions/extension-enablement.json to stop tracking these files"
      - "Replace hardcoded /Users/aslaii paths in tmux/tmux.conf with $HOME equivalent or add tmux/ to root .gitignore after conversion"
  - truth: "Generated config files are gitignored so they never get committed again"
    status: partial
    reason: "Gitignore rules were added correctly but the currently-tracked versions of claude/settings.json, codex/config.toml, gemini/settings.json, and gemini/extensions/extension-enablement.json are still in the git index. .gitignore does not remove already-tracked files from git — git rm --cached is required."
    artifacts:
      - path: "claude/settings.json"
        issue: "In git index despite claude/.gitignore containing 'settings.json' entry"
      - path: "codex/config.toml"
        issue: "In git index despite codex/.gitignore containing 'config.toml' entry"
      - path: "gemini/settings.json"
        issue: "In git index despite gemini/.gitignore containing 'settings.json' entry"
      - path: "gemini/extensions/extension-enablement.json"
        issue: "In git index despite gemini/.gitignore containing 'extensions/extension-enablement.json' entry"
    missing:
      - "git rm --cached claude/settings.json codex/config.toml gemini/settings.json gemini/extensions/extension-enablement.json"
      - "Commit the removal so these files are no longer in git history going forward"
---

# Phase 01: Security and Quality Hardening — Verification Report

**Phase Goal:** The repo is safe to publish publicly and every shell script is automatically linted on commit and CI
**Verified:** 2026-03-30T15:04:37Z
**Status:** gaps_found
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths (from ROADMAP.md Success Criteria)

| #  | Truth | Status | Evidence |
|----|-------|--------|----------|
| 1  | `grep -rn '/Users/aslaii' $(git ls-files)` returns zero results | ✗ FAILED | 5 tracked non-planning files still contain hardcoded paths: claude/settings.json, codex/config.toml, gemini/settings.json, gemini/extensions/extension-enablement.json, tmux/tmux.conf |
| 2  | gemini/, opencode/, and codex/ each have a .gitignore excluding OAuth tokens and session state | ✓ VERIFIED | gemini/.gitignore covers oauth_creds.json, session state; codex/.gitignore covers config.toml; opencode/.gitignore covers cache/, gsd-file-manifest.json, oh-my-opencode.json |
| 3  | Setup script on non-aslaii account succeeds without aborting | ✓ VERIFIED | ensure_expected_user function and its main() call removed from initial-setup-macos.sh; no hardcoded username checks remain |
| 4  | Pre-commit run on staged .sh file triggers ShellCheck and shfmt checks locally | ✓ VERIFIED | .pre-commit-config.yaml exists with koalaman/shellcheck-precommit@v0.11.0 and scop/pre-commit-shfmt@v3.13.0-1; install_pre_commit_hooks() called in main() |
| 5  | Push to PR branch triggers ShellCheck GitHub Actions workflow | ✓ VERIFIED | .github/workflows/shellcheck.yml exists with paths filter "**.sh", ludeeus/action-shellcheck@2.0.0, triggers on push to all branches and PR |

**Score:** 4/5 success criteria verified (truth 1 failed)

### Must-Have Truths (from Plan frontmatter)

#### Plan 01-01

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | No /Users/aslaii paths in shell files (zshrc, initial-setup-macos.sh) | ✓ VERIFIED | grep returns zero matches in both files |
| 2 | ensure_expected_user function is gone from initial-setup-macos.sh | ✓ VERIFIED | grep -n 'ensure_expected_user' returns no matches |
| 3 | initial-setup-macos.sh runs correctly under any username | ✓ VERIFIED | ensure_expected_user removed; all paths use $HOME |
| 4 | initial-setup.sh has set -euo pipefail error handling | ✓ VERIFIED | Line 3: set -euo pipefail confirmed |

#### Plan 01-02

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | claude/settings.json and gemini/settings.json contain no hardcoded /Users/aslaii paths | ✗ FAILED | Both files are still tracked by git AND contain hardcoded /Users/aslaii paths (claude: 4 occurrences, gemini: 5 occurrences). Templates were created correctly but the generated files were never removed from git tracking. |
| 2 | codex/config.toml contains no hardcoded /Users/aslaii paths | ✗ FAILED | File still tracked by git, 10 occurrences of /Users/aslaii (project trust entries + hook command) |
| 3 | Template source files exist for claude, gemini, codex configs with $HOME placeholders | ✓ VERIFIED | claude/settings.template.json, gemini/settings.template.json, codex/config.template.toml all exist with $HOME placeholders |
| 4 | Generated config files are gitignored so they never get committed again | ✗ PARTIAL | Gitignore entries exist but git rm --cached was never run; files remain in git index |
| 5 | gemini/.gitignore excludes all OAuth tokens and runtime state | ✓ VERIFIED | oauth_creds.json, session state, extensions/extension-enablement.json all listed |
| 6 | codex/.gitignore exists and excludes the generated config.toml | ✓ VERIFIED | codex/.gitignore exists, contains 'config.toml' |
| 7 | opencode/.gitignore excludes runtime state | ✓ VERIFIED | cache/, gsd-file-manifest.json, oh-my-opencode.json all present |
| 8 | claude/.gitignore settings.json entry prevents re-committing | ✓ PARTIAL | Entry added to claude/.gitignore but file is still in git index |

#### Plan 01-03

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | No /Users/aslaii paths remain in any tracked opencode or gemini framework file | ✓ VERIFIED | git ls-files opencode/ + gemini/agents/ gemini/commands/ — zero files with /Users/aslaii |
| 2 | All opencode/agents/, command/, get-shit-done/ files use $HOME | ✓ VERIFIED | 100 files updated; grep confirms zero matches |
| 3 | All gemini/agents/ files are clean | ✓ VERIFIED | Were already clean before plan; confirmed zero occurrences |
| 4 | No truncated files or mangled syntax | ✓ VERIFIED | Commit history shows 73dd2e0; no structural damage |

#### Plan 01-04

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | git commit with staged .sh file triggers ShellCheck and shfmt locally | ✓ VERIFIED | .pre-commit-config.yaml has both hooks version-pinned; install_pre_commit_hooks() wired in bootstrap |
| 2 | Push to any branch with .sh changes triggers ShellCheck GitHub Actions | ✓ VERIFIED | .github/workflows/shellcheck.yml with branches: ["**"] and paths: ["**.sh"] |
| 3 | gitleaks runs as pre-commit hook | ✓ VERIFIED | gitleaks/gitleaks@v8.30.1 in .pre-commit-config.yaml |
| 4 | .pre-commit-config.yaml is version-pinned and reproducible | ✓ VERIFIED | All three hooks pinned: v0.11.0, v3.13.0-1, v8.30.1 |
| 5 | .zshrc and other pure-zsh files excluded from ShellCheck | ✓ VERIFIED | exclude: "macos/zsh/.*" in pre-commit config; ignore_paths: macos/zsh in CI workflow |

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `macos/zsh/zshrc` | Portable shell with $HOME paths | ✓ VERIFIED | PNPM_HOME, spicetify, antigravity all use $HOME |
| `initial-setup-macos.sh` | User-agnostic setup with $HOME MCP path | ✓ VERIFIED | MCP filesystem: `$HOME`; ensure_expected_user removed; process_json_templates() + install_pre_commit_hooks() added and called in main() |
| `initial-setup.sh` | Hardened Linux bootstrap | ✓ VERIFIED | Line 3: `set -euo pipefail`; no hardcoded paths |
| `claude/settings.template.json` | Template with $HOME for claude hooks | ✓ VERIFIED | Contains 4 $HOME hook command references; no /Users/aslaii |
| `gemini/settings.template.json` | Template with $HOME for gemini hooks | ✓ VERIFIED | Contains $HOME references for hooks and MCP arg; no /Users/aslaii |
| `codex/config.template.toml` | Template with $HOME for codex hook | ✓ VERIFIED | Contains $HOME/.codex/... hook command; no project trust entries |
| `gemini/.gitignore` | Comprehensive gitignore for Gemini CLI runtime | ✓ VERIFIED | oauth_creds.json, settings.json, extensions/extension-enablement.json, and more |
| `codex/.gitignore` | Gitignore excluding generated config.toml | ✓ VERIFIED | Contains 'config.toml' entry |
| `opencode/agents/` | GSD agent files with portable $HOME paths | ✓ VERIFIED | Zero /Users/aslaii occurrences in all tracked opencode files |
| `opencode/get-shit-done/` | GSD framework files with portable $HOME paths | ✓ VERIFIED | Part of the 100-file bulk replacement |
| `.pre-commit-config.yaml` | Pre-commit config with ShellCheck, shfmt, gitleaks | ✓ VERIFIED | All three hooks present; version-pinned; macos/zsh excluded; --write and --external-sources args correct |
| `.github/workflows/shellcheck.yml` | GitHub Actions CI for ShellCheck | ✓ VERIFIED | ludeeus/action-shellcheck@2.0.0; paths filter "**.sh"; all branches; warning severity; macos/zsh ignored |
| `claude/settings.json` | Should be UNTRACKED (generated from template) | ✗ ORPHANED | File exists, is in git index, contains 4 hardcoded /Users/aslaii paths. Gitignore entry added but git rm --cached never run. |
| `codex/config.toml` | Should be UNTRACKED (generated from template) | ✗ ORPHANED | File exists, is in git index, contains 10 hardcoded /Users/aslaii paths. Gitignore entry added but git rm --cached never run. |
| `gemini/settings.json` | Should be UNTRACKED (generated from template) | ✗ ORPHANED | File exists, is in git index, contains 5 hardcoded /Users/aslaii paths. Gitignore entry added but git rm --cached never run. |
| `gemini/extensions/extension-enablement.json` | Should be UNTRACKED (runtime artifact) | ✗ ORPHANED | File exists, is in git index, contains 2 hardcoded /Users/aslaii paths. gemini/.gitignore lists it but git rm --cached never run. |
| `tmux/tmux.conf` | Should have no hardcoded /Users/aslaii paths | ✗ FAILED | Contains 2 hardcoded paths in status-right and run-shell commands. File was outside plan scope but violates the phase success criterion. |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `claude/settings.template.json` | `claude/settings.json` | envsubst '$HOME' in process_json_templates() | ✓ WIRED | process_json_templates() at line 303; called in main() at line 666; uses scoped `envsubst '$HOME'` |
| `claude/.gitignore` | `claude/settings.json` | gitignore entry prevents re-commit | ✗ PARTIAL | Entry 'settings.json' exists in claude/.gitignore but file is STILL in git index — git rm --cached never run |
| `.pre-commit-config.yaml` | `initial-setup-macos.sh` | install_pre_commit_hooks() calls pre-commit install | ✓ WIRED | install_pre_commit_hooks() at line 328; called in main() at line 653; checks for .pre-commit-config.yaml presence |
| `.github/workflows/shellcheck.yml` | `**.sh files` | paths filter triggers only on .sh changes | ✓ WIRED | paths: ["**.sh"] on both push and pull_request triggers |

### Data-Flow Trace (Level 4)

Not applicable — this phase produces configuration files and shell scripts, not components rendering dynamic data.

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| zshrc has no hardcoded paths | `grep '/Users/aslaii' macos/zsh/zshrc` | No output, exit 1 | ✓ PASS |
| ensure_expected_user removed | `grep 'ensure_expected_user' initial-setup-macos.sh` | No output, exit 1 | ✓ PASS |
| set -euo pipefail in initial-setup.sh | `sed -n '3p' initial-setup.sh` | `set -euo pipefail` | ✓ PASS |
| Template files have $HOME | `grep '\$HOME' claude/settings.template.json` | 4 lines returned | ✓ PASS |
| pre-commit config valid structure | `cat .pre-commit-config.yaml` | 3 repos with pinned revs | ✓ PASS |
| CI workflow has paths filter | `grep '"**.sh"' .github/workflows/shellcheck.yml` | Match found | ✓ PASS |
| Zero /Users/aslaii in opencode | `git ls-files opencode/ \| xargs grep -l '/Users/aslaii' \| wc -l` | 0 | ✓ PASS |
| Tracked config files clean | `git ls-files \| xargs grep -l '/Users/aslaii' (non-.planning)` | 5 files found | ✗ FAIL |
| BREW_FORMULAE includes new tools | `grep '"shfmt"\|"pre-commit"\|"gitleaks"' initial-setup-macos.sh` | Lines 40, 41, 42 | ✓ PASS |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| SEC-01 | 01-01, 01-02, 01-03 | All tracked files contain no hardcoded absolute user paths | ✗ BLOCKED | 5 tracked non-planning files still contain /Users/aslaii (claude/settings.json, codex/config.toml, gemini/settings.json, gemini/extensions/extension-enablement.json, tmux/tmux.conf) |
| SEC-02 | 01-02 | gemini/ has .gitignore excluding OAuth tokens and session state | ✓ SATISFIED | gemini/.gitignore created with oauth_creds.json, state.json, and 11 other runtime artifacts |
| SEC-03 | 01-02 | opencode/ and codex/ audited for gitignore completeness | ✓ SATISFIED | opencode/.gitignore expanded; codex/.gitignore created |
| SEC-04 | 01-01 | ensure_expected_user replaced with portable approach | ✓ SATISFIED | Function and its main() call removed entirely; $HOME-based paths throughout |
| SEC-05 | 01-04 | Pre-commit secret detection hook (gitleaks) configured | ✓ SATISFIED | gitleaks/gitleaks@v8.30.1 in .pre-commit-config.yaml |
| QUAL-01 | 01-04 | ShellCheck CI runs on all .sh files via GitHub Actions | ✓ SATISFIED | .github/workflows/shellcheck.yml with ludeeus/action-shellcheck@2.0.0; paths: ["**.sh"] |
| QUAL-02 | 01-02, 01-04 | shfmt added to BREW_FORMULAE and wired as pre-commit hook | ✓ SATISFIED | "shfmt" at line 40 of initial-setup-macos.sh; shfmt hook in .pre-commit-config.yaml |
| QUAL-03 | 01-04 | .pre-commit-config.yaml created with ShellCheck + shfmt hooks | ✓ SATISFIED | File exists; shellcheck (v0.11.0) and shfmt (v3.13.0-1) hooks present |
| QUAL-04 | 01-01 | initial-setup.sh hardened with set -euo pipefail | ✓ SATISFIED | Line 3 of initial-setup.sh confirmed as `set -euo pipefail` |

**Summary:** 8/9 requirements satisfied. SEC-01 is blocked.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `claude/settings.json` | 12, 23, 35, 44 | Hardcoded `/Users/aslaii` in hook commands | Blocker | File is tracked by git; publishes username to any repo fork or public push |
| `gemini/settings.json` | 135, 145, 156, 168, 177 | Hardcoded `/Users/aslaii` in hook commands and MCP arg | Blocker | File is tracked by git; same exposure risk |
| `codex/config.toml` | 25-49, 137 | Hardcoded `/Users/aslaii` in [projects.] entries and hook command | Blocker | File is tracked by git; exposes project directory structure and username |
| `gemini/extensions/extension-enablement.json` | 4, 9 | Hardcoded `/Users/aslaii/*` in extension overrides | Blocker | File is tracked by git; exposes username |
| `tmux/tmux.conf` | 23, 43 | Hardcoded `/Users/aslaii/dotfiles/` in status-right and run-shell | Blocker | File is tracked by git; breaks on any other machine or username |

### Human Verification Required

#### 1. Pre-commit Hook Integration Test

**Test:** Stage a `.sh` file with a ShellCheck violation, then run `git commit`. Verify the commit is blocked with a ShellCheck error message.
**Expected:** Pre-commit hook intercepts the commit and reports the ShellCheck finding.
**Why human:** Requires a live git repo with pre-commit installed and a test shell file — cannot test without modifying state.

#### 2. GitHub Actions Workflow Trigger

**Test:** Push a commit that modifies a `.sh` file to a branch and verify the ShellCheck workflow runs on GitHub Actions.
**Expected:** The "ShellCheck" workflow appears in the Actions tab and reports pass/fail.
**Why human:** Requires a push to a remote GitHub repository — cannot verify programmatically without network access and a connected remote.

#### 3. Bootstrap script on non-aslaii account

**Test:** Run `initial-setup-macos.sh` (or at minimum `bash -n` + manual review of user-sensitive sections) on an account with a different username.
**Expected:** Script proceeds without any user-guard abort; all paths resolve correctly via `$HOME`.
**Why human:** Requires a second macOS account or VM — cannot test programmatically in current environment.

### Gaps Summary

The phase made substantial progress: portability of shell files and setup scripts is confirmed, templates were created correctly, gitignore rules were defined, opencode framework files are clean, and the quality gates (.pre-commit-config.yaml and GitHub Actions CI) are fully operational.

**Root cause of the gap:** The template+gitignore pattern requires two steps to take effect:
1. Add the file to `.gitignore` (done)
2. Run `git rm --cached <file>` to remove the already-tracked file from the git index (NOT done)

Because step 2 was skipped, `claude/settings.json`, `codex/config.toml`, `gemini/settings.json`, and `gemini/extensions/extension-enablement.json` are still committed files in the git history with hardcoded `/Users/aslaii` paths. The success criterion "grep -rn '/Users/aslaii' $(git ls-files) returns zero results" cannot pass until these files are removed from the git index.

Additionally, `tmux/tmux.conf` was outside the scope of any plan in this phase but contains 2 hardcoded paths that violate the same success criterion.

The `.planning/` directory files (ROADMAP.md, REQUIREMENTS.md, research docs) also appear in the grep results, but these contain `/Users/aslaii` only as explanatory text describing what the problem was (e.g., "replace /Users/aslaii with $HOME") — not as functional configuration. These are documentation artifacts and do not represent a portability failure. The five non-planning tracked files are the actionable blockers.

---

_Verified: 2026-03-30T15:04:37Z_
_Verifier: Claude (gsd-verifier)_
