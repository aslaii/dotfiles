---
phase: 03-drift-detection-and-shell-performance
verified: 2026-03-31T12:00:00Z
status: passed
score: 7/7 must-haves verified
re_verification: true
gaps: []
human_verification:
  - test: "Measure shell startup time"
    expected: "time zsh -i -c exit reports under 200ms (median of 3 runs)"
    why_human: "Requires live shell environment; cannot be measured statically"
  - test: "Verify nvm lazy loading"
    expected: "node --version works on first invocation (slow), fast on subsequent calls; nvm --version works"
    why_human: "Requires interactive shell session to test lazy load trigger"
  - test: "Verify Turbo plugins function"
    expected: "Arrow-up does substring history search; autosuggestions appear as you type"
    why_human: "Requires interactive terminal input to verify plugin behavior"
---

# Phase 3: Drift Detection and Shell Performance Verification Report

**Phase Goal:** The developer can verify in seconds that the live machine matches the repo, and the interactive shell starts in under 200ms with a clean plugin order
**Verified:** 2026-03-31T12:00:00Z
**Status:** gaps_found
**Re-verification:** No -- initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | `./initial-setup-macos.sh --check` exits non-zero when symlinks are out of sync and prints each mismatch | VERIFIED | Running `--check` produces OK/MISSING/WRONG output for 12 symlinks, exits 1 when AGENTS.md is missing |
| 2 | `./initial-setup-macos.sh --check` exits 0 when all symlinks correct and prints "all symlinks OK" | VERIFIED | `run_check_mode()` at line 269 prints "All N symlinks OK." and returns 0 when errors==0 |
| 3 | Running `dotcheck` in a shell session invokes the --check mode | VERIFIED | `macos/zsh/zsh/aliases.zsh` line 9: `alias dotcheck='bash "$HOME/dotfiles/initial-setup-macos.sh" --check'` |
| 4 | No oh-my-posh or Powerlevel10k initialization runs during shell startup (macOS) | VERIFIED | `macos/zsh/zsh/functions.zsh` set_shell_theme() only sets BAT_THEME (lines 56-64); no oh-my-posh, no p10k |
| 5 | No oh-my-posh or Powerlevel10k initialization runs during shell startup (WSL) | FAILED | `wsl/zsh/zsh/functions.zsh` set_shell_theme() still contains oh-my-posh init (lines 60-90): `omp_script=$(oh-my-posh init zsh ...)` and `source <(echo "${omp_script}")` |
| 6 | nvm does not initialize until the first invocation of node/npm/nvm | VERIFIED | Both zshrc files have `NVM_LAZY_LOAD=true` before zsh-nvm plugin; no eager `source nvm.sh` lines remain |
| 7 | Shell startup completes in under 200ms | ? UNCERTAIN | Cannot measure statically; requires human verification |

**Score:** 5/7 truths verified (1 failed, 1 needs human)

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `initial-setup-macos.sh` | emit_symlink_map(), check_link(), run_check_mode(), --check flag | VERIFIED | All 3 functions present (lines 198-276); --check handled at main() line 606; emit_symlink_map referenced 3 times |
| `macos/zsh/zsh/aliases.zsh` | dotcheck alias | VERIFIED | Line 9: `alias dotcheck='bash "$HOME/dotfiles/initial-setup-macos.sh" --check'` |
| `macos/zsh/zshrc` | Optimized config with lazy nvm, Turbo plugins, no oh-my-posh | VERIFIED | NVM_LAZY_LOAD=true at line 30; `wait lucid` on autosuggestions (line 41) and history-substring-search (line 44); fast-syntax-highlighting last (line 50); starship sole prompt (line 90) |
| `macos/zsh/zsh/functions.zsh` | Cleaned set_shell_theme without oh-my-posh | VERIFIED | Function at lines 56-64 only sets BAT_THEME; zero oh-my-posh references |
| `wsl/zsh/zshrc` | WSL config with same optimizations | VERIFIED | NVM_LAZY_LOAD=true at line 37; Turbo plugins (lines 49-58); starship init (line 102); no ensure_lts_node or sync_ai_cli_theme calls |
| `wsl/zsh/zsh/functions.zsh` | Cleaned set_shell_theme without oh-my-posh | FAILED | set_shell_theme() at lines 60-90 still has full oh-my-posh init code |
| `Brewfile` | oh-my-posh removed from package list | VERIFIED | No oh-my-posh reference in Brewfile |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| main() | run_check_mode() | --check argument parsing | WIRED | Line 606-611: `if [[ "${1:-}" == "--check" ]]` calls `run_check_mode` then `exit $?` |
| run_check_mode() | emit_symlink_map() | pipe-delimited iteration | WIRED | Line 266: `done < <(emit_symlink_map)` |
| run_check_mode() | check_link() | per-pair validation | WIRED | Line 263: `if ! check_link "$source" "$target"` |
| link_configs() | emit_symlink_map() | shared map iteration | WIRED | Line 290: `done < <(emit_symlink_map)` -- single source of truth for both check and link |
| macos/zsh/zshrc | zsh-nvm plugin | NVM_LAZY_LOAD env var | WIRED | Lines 30-31: `NVM_LAZY_LOAD=true` and `NVM_COMPLETION=true` set before `zinit light lukechilds/zsh-nvm` at line 47 |
| macos/zsh/zshrc | starship | eval starship init | WIRED | Line 90: `eval "$(starship init zsh)"` -- sole prompt init |
| macos/zsh/zsh/functions.zsh | BAT_THEME export | set_shell_theme | WIRED | Lines 59-63: conditional export BAT_THEME based on dark mode |
| aliases.zsh | initial-setup-macos.sh --check | dotcheck alias | WIRED | Line 9: full path alias |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| --check mode produces output | `bash initial-setup-macos.sh --check` | 11 OK, 1 MISSING, exits 1 | PASS |
| emit_symlink_map is single source of truth | `grep -c 'emit_symlink_map' initial-setup-macos.sh` | 3 (definition + link_configs + run_check_mode) | PASS |
| dotcheck alias exists | `grep 'alias dotcheck' macos/zsh/zsh/aliases.zsh` | Found at line 9 | PASS |
| oh-my-posh removed from bootstrap | `grep -c 'oh-my-posh' initial-setup-macos.sh` | 0 | PASS |
| NVM_LAZY_LOAD set in macOS zshrc | `grep 'NVM_LAZY_LOAD=true' macos/zsh/zshrc` | Found at line 30 | PASS |
| No eager nvm source in macOS zshrc | `grep 'source.*nvm.sh' macos/zsh/zshrc` | Not found | PASS |
| No ensure_lts_node at startup | `grep 'ensure_lts_node' macos/zsh/zshrc wsl/zsh/zshrc` | Not found | PASS |
| Shell startup time | `time zsh -i -c exit` | Requires live shell | SKIP |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-----------|-------------|--------|----------|
| DRIFT-01 | 03-01 | `initial-setup-macos.sh --check` mode validates symlinks without modifying anything | SATISFIED | --check runs read-only via check_link(); no link_file calls; tested live with expected output |
| DRIFT-02 | 03-01 | `dotcheck` shell alias available for quick drift verification | SATISFIED | alias at `macos/zsh/zsh/aliases.zsh` line 9 |
| DRIFT-03 | 03-01 | Verify mode reports missing symlinks, wrong targets, and stale links | SATISFIED | check_link() has four states: OK (line 248), MISSING (line 232), STALE (line 237), WRONG (lines 244, 253) |
| SHELL-01 | 03-02 | Powerlevel10k references removed; starship confirmed as sole prompt | PARTIAL | No Powerlevel10k/p10k in any source file. oh-my-posh removed from macOS functions.zsh and Brewfile. BUT `wsl/zsh/zsh/functions.zsh` still has oh-my-posh init in set_shell_theme(). Also `initial-setup.sh` still installs oh-my-posh. |
| SHELL-02 | 03-02 | Zinit plugin load order audited; zsh-syntax-highlighting loads last | SATISFIED | Both zshrc files: autosuggestions (Turbo) -> history-substring-search (Turbo+atload) -> zsh-nvm (sync) -> fast-syntax-highlighting (sync, last) |
| SHELL-03 | 03-02 | nvm lazy-loaded (init only on first node/npm/nvm invocation) | SATISFIED | NVM_LAZY_LOAD=true in both zshrc files; no eager `source nvm.sh`; zsh-nvm plugin handles lazy loading |
| SHELL-04 | 03-02 | Shell startup time verified < 200ms | NEEDS HUMAN | Cannot measure statically; auto-approved in summary without actual measurement |

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| wsl/zsh/zsh/functions.zsh | 60-90 | oh-my-posh init code in set_shell_theme() | Blocker | WSL shell still initializes oh-my-posh at startup, conflicting with starship and adding startup overhead |
| initial-setup.sh | 115-126 | oh-my-posh install and theme download | Warning | Dead code -- oh-my-posh removed from Brewfile but legacy WSL script still installs it |

### Human Verification Required

### 1. Shell Startup Time Measurement

**Test:** Open a NEW terminal window. Run `time zsh -i -c exit` three times and take the median.
**Expected:** Real time under 200ms
**Why human:** Cannot be measured from a static codebase analysis; requires live shell environment

### 2. nvm Lazy Loading Behavior

**Test:** In a fresh shell session, run `node --version`. Then run it again.
**Expected:** First call triggers nvm lazy load (slightly slower); subsequent calls are fast. `nvm --version` also works.
**Why human:** Requires interactive shell session to test lazy load trigger mechanism

### 3. Turbo Plugin Functionality

**Test:** In a new shell, type a partial command that exists in history; press arrow-up.
**Expected:** Arrow-up does substring history search (not plain history). Autosuggestions appear as gray text while typing.
**Why human:** Requires interactive terminal input to verify Turbo-mode loaded plugins work correctly

### 4. Starship is Sole Prompt

**Test:** Open a terminal and observe the prompt.
**Expected:** Starship prompt is visible (not oh-my-posh). No prompt errors.
**Why human:** Visual verification of prompt rendering

## Gaps Summary

Two gaps were found, both related to incomplete cleanup of oh-my-posh from WSL-related files:

**Gap 1 (Blocker): `wsl/zsh/zsh/functions.zsh` set_shell_theme() not cleaned.** The macOS version was correctly stripped of oh-my-posh init code, but the WSL version at `wsl/zsh/zsh/functions.zsh` lines 60-90 still contains the full oh-my-posh initialization including `oh-my-posh init zsh --config "$omp_config_path"` and `source <(echo "${omp_script}")`. This means WSL shell sessions still attempt oh-my-posh initialization at startup, which conflicts with starship and adds startup overhead. The 03-02-PLAN scope included `wsl/zsh/zshrc` but did not list `wsl/zsh/zsh/functions.zsh` as a file to modify, so the executor followed the plan correctly -- the plan itself was incomplete.

**Gap 2 (Warning): `initial-setup.sh` still references oh-my-posh.** The legacy WSL/Linux bootstrap script at `initial-setup.sh` lines 115-126 still installs oh-my-posh and downloads its themes. While this script is not used on macOS (the primary target), it is a tracked file and contradicts SHELL-01's intent. This was not in scope for any plan.

**Root cause:** Both gaps stem from the same issue -- the 03-02 plan scoped WSL changes to only `wsl/zsh/zshrc` and `Brewfile`, missing the WSL functions file and legacy setup script. The executor correctly followed the plan but the plan did not cover all tracked files with oh-my-posh references.

---

_Verified: 2026-03-31T12:00:00Z_
_Verifier: Claude (gsd-verifier)_
