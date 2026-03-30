# Phase 3: Drift Detection and Shell Performance - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-03-31
**Phase:** 03-drift-detection-and-shell-performance
**Areas discussed:** Drift check mode, dotcheck alias, nvm lazy-loading strategy, Zinit plugin optimization
**Mode:** Auto (--auto flag — all decisions auto-selected)

---

## Drift Check Mode

| Option | Description | Selected |
|--------|-------------|----------|
| List each symlink as OK/MISSING/WRONG with non-zero exit | Standard verify pattern — clear, scriptable | ✓ |
| Summary only (count of issues) | Less verbose but harder to debug | |
| JSON output | Machine-readable but overkill for personal dotfiles | |

**User's choice:** [auto] List each symlink as OK/MISSING/WRONG with non-zero exit (recommended default)
**Notes:** Covers all symlinks from link_configs() — same scope as setup. Extracted symlink map shared between setup and check modes.

---

## dotcheck Alias

| Option | Description | Selected |
|--------|-------------|----------|
| Alias in aliases.zsh delegating to --check | Simple, DRY — one implementation in setup script | ✓ |
| Standalone shell function | More flexible but duplicates logic | |
| Separate dotcheck script | Unnecessary complexity for a single command | |

**User's choice:** [auto] Alias in aliases.zsh delegating to --check (recommended default)
**Notes:** `dotcheck` = `bash "$HOME/dotfiles/initial-setup-macos.sh" --check`

---

## nvm Lazy-Loading Strategy

| Option | Description | Selected |
|--------|-------------|----------|
| Remove eager source, configure zsh-nvm with NVM_LAZY_LOAD=true | Eliminates ~150ms startup cost; nvm inits on first node/npm/nvm call | ✓ |
| Replace both with custom lazy wrapper function | More control but reinvents what zsh-nvm already does | |
| Replace nvm with mise entirely | Better long-term but out of scope (v2 SHMOD-01) | |

**User's choice:** [auto] Remove eager source, configure zsh-nvm with NVM_LAZY_LOAD=true (recommended default)
**Notes:** Keep NVM_DIR export. Remove lines 29-31 eager source. Set NVM_LAZY_LOAD=true and NVM_COMPLETION=true before zinit light line.

---

## Zinit Plugin Optimization

| Option | Description | Selected |
|--------|-------------|----------|
| Turbo mode for autosuggestions + history-search; sync for syntax-highlighting last | Standard Zinit optimization; syntax highlighting must load last | ✓ |
| Turbo mode for all plugins | Risks syntax highlighting loading before other plugins register widgets | |
| No Turbo mode (keep synchronous) | Simpler but misses easy startup time win | |

**User's choice:** [auto] Turbo mode for autosuggestions + history-search; sync for syntax-highlighting last (recommended default)
**Notes:** fast-syntax-highlighting must be the final plugin loaded. zsh-autosuggestions and zsh-history-substring-search safe for deferred loading.

---

## Claude's Discretion

- Output formatting for --check mode (colors, alignment)
- Exact Turbo mode wait delay values
- Whether WSL zshrc gets parallel optimizations
- Symlink map data structure choice (associative array vs function)

## Deferred Ideas

- mise as nvm replacement — v2 (SHMOD-01)
- Shell startup update notification — v2 (SHMOD-02)
