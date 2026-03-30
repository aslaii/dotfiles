# Phase 3: Drift Detection and Shell Performance - Context

**Gathered:** 2026-03-31
**Status:** Ready for planning

<domain>
## Phase Boundary

Add a symlink verification mode to the bootstrap script and a `dotcheck` shell alias so the developer can verify in seconds that the live machine matches the repo. Remove Powerlevel10k references, optimize Zinit plugin loading order, and lazy-load nvm so the interactive shell starts in under 200ms.

</domain>

<decisions>
## Implementation Decisions

### Drift Check Mode (--check flag)
- **D-01:** Add `--check` flag handling to `initial-setup-macos.sh` that validates all symlinks from `link_configs()` without modifying anything. Each symlink is reported as OK/MISSING/WRONG-TARGET/STALE. Exit non-zero if any mismatch found.
- **D-02:** The `--check` scope covers exactly the same symlinks that `link_configs()` creates — no more, no less. This ensures the verify mode stays in sync with setup.
- **D-03:** Implement by extracting the symlink map from `link_configs()` into a data structure (associative array or function that yields source/target pairs) so both `link_configs()` and `--check` iterate the same list.
- **D-04:** Output format: one line per symlink — `OK: ~/.zshrc -> dotfiles/macos/zsh/zshrc`, `MISSING: ~/.config/yabai`, `WRONG: ~/.tmux.conf -> /other/path (expected dotfiles/tmux/tmux.conf)`, `STALE: ~/.config/foo -> dead-target`.

### dotcheck Alias
- **D-05:** Define `dotcheck` as a shell alias in `macos/zsh/zsh/aliases.zsh` that runs `bash "$HOME/dotfiles/initial-setup-macos.sh" --check`.
- **D-06:** The alias delegates entirely to the script's `--check` mode — no separate implementation.

### Powerlevel10k Removal
- **D-07:** Search all tracked files for Powerlevel10k/p10k references and remove them. Starship is already configured at `macos/zsh/zshrc:89-91` and `wsl/zsh/zshrc:106-107` — confirm it's the sole prompt after cleanup.
- **D-08:** Check for any `.p10k.zsh` files or Powerlevel10k zinit plugin references that might exist.

### nvm Lazy-Loading
- **D-09:** Remove the eager nvm source block (`macos/zsh/zshrc:29-31`) that directly sources `/opt/homebrew/opt/nvm/nvm.sh` on every shell start. This adds ~150ms to startup.
- **D-10:** Keep the `zinit light lukechilds/zsh-nvm` plugin (`macos/zsh/zshrc:44`) but configure it for lazy loading by setting `NVM_LAZY_LOAD=true` and `NVM_COMPLETION=true` as environment variables BEFORE the zinit light line.
- **D-11:** With `NVM_LAZY_LOAD=true`, nvm will only initialize on the first invocation of `node`, `npm`, or `nvm` in a session — satisfying SHELL-03.
- **D-12:** Keep `NVM_DIR="$HOME/.nvm"` export (line 29) as it's needed by the lazy loader.

### Zinit Plugin Optimization
- **D-13:** Move `zsh-autosuggestions` and `zsh-history-substring-search` to Turbo mode using `zinit wait lucid` for deferred loading. These don't need to be available during the first few milliseconds of shell startup.
- **D-14:** Keep `fast-syntax-highlighting` loading synchronously (NOT Turbo) and ensure it loads LAST among plugins. Syntax highlighting must be the final plugin to correctly highlight all registered widgets.
- **D-15:** Remove `zinit light lukechilds/zsh-nvm` redundancy — with the eager nvm source removed (D-09), only the zinit plugin manages nvm.

### Shell Startup Verification
- **D-16:** After all optimizations, verify `time zsh -i -c exit` measures below 200ms. This is the SHELL-04 acceptance criterion.

### Claude's Discretion
- Exact output formatting for `--check` mode (colors, alignment, summary line)
- Whether to use bash associative arrays or a simpler approach for the symlink map extraction
- Exact Turbo mode `wait` delay values for zinit plugins (e.g., `wait"0"` vs `wait"1"`)
- Whether WSL zshrc gets the same optimizations (likely yes, for consistency)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Bootstrap Script
- `initial-setup-macos.sh` — Contains `link_file()` (line 155), `link_configs()` (line 198), and all symlink targets; `--check` mode will be added here

### Shell Configuration
- `macos/zsh/zshrc` — Primary zsh config; contains nvm eager source (lines 29-31), Zinit plugins (lines 40-44), starship init (lines 89-91)
- `macos/zsh/zsh/aliases.zsh` — Where `dotcheck` alias will be added
- `macos/zsh/zsh/functions.zsh` — Contains `ensure_lts_node()` that uses nvm (line 40); must work with lazy-loaded nvm
- `wsl/zsh/zshrc` — WSL zsh config; has same starship init pattern, may need parallel optimizations

### Project Standards
- `AGENTS.md` — Shell script conventions, commit style
- `CLAUDE.md` §Recommended Stack — Zinit Turbo mode documentation, nvm/mise comparison, Powerlevel10k life-support status
- `.planning/REQUIREMENTS.md` — DRIFT-01 through DRIFT-03, SHELL-01 through SHELL-04 acceptance criteria

### Prior Phase Context
- `.planning/phases/01-security-and-quality-hardening/01-CONTEXT.md` — D-09 removed `ensure_expected_user`; `link_file()` unchanged
- `.planning/phases/02-declarative-package-and-plugin-management/02-CONTEXT.md` — D-05 migrated to `brew bundle`; script structure preserved

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `link_file()` in `initial-setup-macos.sh:155` — Handles symlink creation with backup-on-collision; the `--check` mode needs a parallel `check_link()` function that reads but doesn't modify
- `log()`, `warn()`, `die()` helpers — Available for `--check` mode output
- `link_configs()` at line 198 — Contains the authoritative list of all symlink source/target pairs

### Established Patterns
- `set -euo pipefail` — Error handling standard for all scripts
- `DOTFILES_DIR="${DOTFILES_DIR:-$HOME/dotfiles}"` — Standard path derivation
- `SKETCHYBAR="${SKETCHYBAR:-true}"` — Conditional symlink toggle (must be respected in --check mode too)
- `resolve_config_path()` — Determines zshrc source based on platform; --check needs to call this too

### Integration Points
- `main()` function argument parsing — Where `--check` flag is caught and routed
- `macos/zsh/zsh/aliases.zsh` — Where `dotcheck` alias is added
- Zinit plugin block at `macos/zsh/zshrc:40-44` — Where Turbo mode and lazy-load config are applied
- `ensure_lts_node()` in `functions.zsh:40` — Calls `nvm` directly; must work after lazy-load changes

</code_context>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches for drift detection output and Zinit optimization.

</specifics>

<deferred>
## Deferred Ideas

- mise as nvm replacement — deferred to v2 (SHMOD-01); this phase only lazy-loads nvm
- Shell startup update notification — deferred to v2 (SHMOD-02)
- oh-my-posh as starship alternative — decided against in research phase; starship stays

</deferred>

---

*Phase: 03-drift-detection-and-shell-performance*
*Context gathered: 2026-03-31*
