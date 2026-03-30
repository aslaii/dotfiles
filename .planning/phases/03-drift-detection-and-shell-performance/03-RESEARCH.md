# Phase 3: Drift Detection and Shell Performance - Research

**Researched:** 2026-03-31
**Domain:** Shell scripting (Bash/Zsh), Zinit plugin management, symlink verification
**Confidence:** HIGH

## Summary

This phase has two independent workstreams: (1) adding a `--check` mode to the bootstrap script plus a `dotcheck` alias, and (2) optimizing Zsh startup from the current 1.1s down to under 200ms by removing dead prompt code, lazy-loading nvm, and applying Zinit Turbo mode.

The drift detection side is straightforward Bash engineering: extract the symlink map from `link_configs()` into a shared data structure, add a `check_link()` function that tests each symlink without modifying anything, and wire `--check` into `main()`. The shell performance side has more surface area than the CONTEXT.md decisions suggest -- beyond the nvm eager source and plugin ordering, the current zshrc also runs `set_shell_theme()` which initializes oh-my-posh (a second prompt engine conflicting with starship), `sync_ai_cli_theme` which spawns a Bash subprocess with `jq`/`sed` on every startup, and `ensure_lts_node` which calls `nvm ls-remote` (a network call) on every interactive shell.

**Primary recommendation:** Tackle drift detection first (clean, no risk), then shell performance changes in a separate plan since performance work requires iterative measurement.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Add `--check` flag handling to `initial-setup-macos.sh` that validates all symlinks from `link_configs()` without modifying anything. Each symlink is reported as OK/MISSING/WRONG-TARGET/STALE. Exit non-zero if any mismatch found.
- **D-02:** The `--check` scope covers exactly the same symlinks that `link_configs()` creates -- no more, no less. This ensures the verify mode stays in sync with setup.
- **D-03:** Implement by extracting the symlink map from `link_configs()` into a data structure (associative array or function that yields source/target pairs) so both `link_configs()` and `--check` iterate the same list.
- **D-04:** Output format: one line per symlink -- `OK: ~/.zshrc -> dotfiles/macos/zsh/zshrc`, `MISSING: ~/.config/yabai`, `WRONG: ~/.tmux.conf -> /other/path (expected dotfiles/tmux/tmux.conf)`, `STALE: ~/.config/foo -> dead-target`.
- **D-05:** Define `dotcheck` as a shell alias in `macos/zsh/zsh/aliases.zsh` that runs `bash "$HOME/dotfiles/initial-setup-macos.sh" --check`.
- **D-06:** The alias delegates entirely to the script's `--check` mode -- no separate implementation.
- **D-07:** Search all tracked files for Powerlevel10k/p10k references and remove them. Starship is already configured at `macos/zsh/zshrc:89-91` and `wsl/zsh/zshrc:106-107` -- confirm it's the sole prompt after cleanup.
- **D-08:** Check for any `.p10k.zsh` files or Powerlevel10k zinit plugin references that might exist.
- **D-09:** Remove the eager nvm source block (`macos/zsh/zshrc:29-31`) that directly sources `/opt/homebrew/opt/nvm/nvm.sh` on every shell start. This adds ~150ms to startup.
- **D-10:** Keep the `zinit light lukechilds/zsh-nvm` plugin (`macos/zsh/zshrc:44`) but configure it for lazy loading by setting `NVM_LAZY_LOAD=true` and `NVM_COMPLETION=true` as environment variables BEFORE the zinit light line.
- **D-11:** With `NVM_LAZY_LOAD=true`, nvm will only initialize on the first invocation of `node`, `npm`, or `nvm` in a session -- satisfying SHELL-03.
- **D-12:** Keep `NVM_DIR="$HOME/.nvm"` export (line 29) as it's needed by the lazy loader.
- **D-13:** Move `zsh-autosuggestions` and `zsh-history-substring-search` to Turbo mode using `zinit wait lucid` for deferred loading.
- **D-14:** Keep `fast-syntax-highlighting` loading synchronously (NOT Turbo) and ensure it loads LAST among plugins. Syntax highlighting must be the final plugin to correctly highlight all registered widgets.
- **D-15:** Remove `zinit light lukechilds/zsh-nvm` redundancy -- with the eager nvm source removed (D-09), only the zinit plugin manages nvm.
- **D-16:** After all optimizations, verify `time zsh -i -c exit` measures below 200ms.

### Claude's Discretion
- Exact output formatting for `--check` mode (colors, alignment, summary line)
- Whether to use bash associative arrays or a simpler approach for the symlink map extraction
- Exact Turbo mode `wait` delay values for zinit plugins (e.g., `wait"0"` vs `wait"1"`)
- Whether WSL zshrc gets the same optimizations (likely yes, for consistency)

### Deferred Ideas (OUT OF SCOPE)
- mise as nvm replacement -- deferred to v2 (SHMOD-01); this phase only lazy-loads nvm
- Shell startup update notification -- deferred to v2 (SHMOD-02)
- oh-my-posh as starship alternative -- decided against; starship stays
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| DRIFT-01 | `initial-setup-macos.sh --check` mode validates symlinks without modifying anything | Architecture pattern for `check_link()` function, symlink map extraction from `link_configs()` |
| DRIFT-02 | `dotcheck` shell alias available for quick drift verification | Simple alias addition to `macos/zsh/zsh/aliases.zsh` |
| DRIFT-03 | Verify mode reports missing symlinks, wrong targets, and stale links | Four-state classification logic (OK/MISSING/WRONG/STALE) |
| SHELL-01 | Powerlevel10k references removed; starship confirmed as sole prompt | Grep audit found zero p10k references in source files; `set_shell_theme()` initializes oh-my-posh (not p10k) but conflicts with starship |
| SHELL-02 | Zinit plugin load order audited; `zsh-syntax-highlighting` loads last | Current order incorrect: fast-syntax-highlighting at line 42, before history-substring-search at line 43; must be reordered |
| SHELL-03 | nvm lazy-loaded (init only on first `node`/`npm`/`nvm` invocation) | zsh-nvm `NVM_LAZY_LOAD=true` verified in official README; must also handle `ensure_lts_node` interaction |
| SHELL-04 | Shell startup time verified < 200ms | Current baseline: 1.133s; multiple sources of overhead identified |
</phase_requirements>

## Standard Stack

No new libraries or tools are introduced in this phase. All work uses existing Bash, Zsh, and Zinit capabilities.

### Tools Used

| Tool | Version | Purpose | Notes |
|------|---------|---------|-------|
| Bash | 5.x (Homebrew) | `--check` mode in bootstrap script | Already in use; associative arrays require Bash 4+ |
| Zinit | v3.14.0 | Turbo mode plugin loading | Already installed; `wait lucid` ice modifiers |
| zsh-nvm | latest | nvm lazy loading | Already loaded as Zinit plugin; `NVM_LAZY_LOAD=true` env var |
| starship | latest | Shell prompt (sole prompt after cleanup) | Already configured at zshrc:89-91 |

## Architecture Patterns

### Pattern 1: Symlink Map Extraction (for --check mode)

**What:** Extract the source/target pairs from `link_configs()` into a function that yields pairs, iterable by both `link_configs()` and the new `check_mode()`.

**Recommendation:** Use a function that prints `source:target` pairs rather than Bash associative arrays. Reasons:
1. The symlink list has conditional entries (SKETCHYBAR toggle, nvim in a separate function)
2. Associative arrays cannot preserve insertion order in Bash
3. A generator function is easier to read and extend

```bash
# Emit all symlink pairs as "source:target" lines
emit_symlink_map() {
  local zshrc_source zsh_root zsh_functions_dir config_root ghostty_target
  zshrc_source="$(resolve_config_path)"
  zsh_root="$(dirname "$zshrc_source")"
  zsh_functions_dir="${zsh_root}/zsh"
  config_root="${XDG_CONFIG_HOME:-$HOME/.config}"
  if [[ "$(uname -s)" == "Darwin" ]]; then
    ghostty_target="$HOME/Library/Application Support/com.mitchellh.ghostty/config"
  else
    ghostty_target="${config_root}/ghostty/config"
  fi

  echo "${zshrc_source}:${HOME}/.zshrc"
  if [[ -d "$zsh_functions_dir" ]]; then
    echo "${zsh_functions_dir}:${HOME}/.zsh"
  fi
  echo "${DOTFILES_DIR}/tmux/tmux.conf:${HOME}/.tmux.conf"
  echo "${DOTFILES_DIR}/codex/AGENTS.md:${HOME}/AGENTS.md"
  echo "${DOTFILES_DIR}/ghostty/config:${ghostty_target}"
  echo "${DOTFILES_DIR}/codex:${config_root}/codex"
  echo "${DOTFILES_DIR}/yabai:${config_root}/yabai"
  echo "${DOTFILES_DIR}/skhd:${config_root}/skhd"
  echo "${DOTFILES_DIR}/opencode:${config_root}/opencode"
  echo "${DOTFILES_DIR}/claude:${HOME}/.claude"
  if is_truthy "$SKETCHYBAR"; then
    echo "${DOTFILES_DIR}/sketchybar:${config_root}/sketchybar"
  fi
  echo "${DOTFILES_DIR}/nvim:${config_root}/nvim"
}
```

**Why this pattern:** `link_configs()` and `ensure_neovim_config()` both call `link_file()`. Consolidating all symlink pairs into one emitter ensures `--check` covers exactly the same set (D-02).

### Pattern 2: Four-State Symlink Check

**What:** A `check_link()` function that classifies each target symlink.

```bash
check_link() {
  local source="$1" target="$2"
  local status=0

  if [[ ! -e "$target" && ! -L "$target" ]]; then
    printf 'MISSING: %s\n' "$target"
    return 1
  fi

  if [[ -L "$target" && ! -e "$target" ]]; then
    printf 'STALE: %s -> %s (dead target)\n' "$target" "$(readlink "$target")"
    return 1
  fi

  if [[ -L "$target" ]]; then
    local actual
    actual="$(readlink "$target")"
    if [[ "$actual" != "$source" ]]; then
      printf 'WRONG: %s -> %s (expected %s)\n' "$target" "$actual" "$source"
      return 1
    fi
    printf 'OK: %s -> %s\n' "$target" "$source"
    return 0
  fi

  # Exists but is not a symlink (regular file/directory)
  printf 'WRONG: %s is not a symlink (expected link to %s)\n' "$target" "$source"
  return 1
}
```

### Pattern 3: Zinit Turbo Mode Plugin Block

**What:** Reordered plugin block with turbo mode for non-critical plugins.

```zsh
# --- NVM Lazy Loading ---
export NVM_DIR="$HOME/.nvm"
export NVM_LAZY_LOAD=true
export NVM_COMPLETION=true

# --- Zinit Plugin Manager ---
if [ ! -f "$HOME/.zinit/bin/zinit.zsh" ]; then
  mkdir -p "$HOME/.zinit"
  git clone https://github.com/zdharma-continuum/zinit.git "$HOME/.zinit/bin"
fi
source "$HOME/.zinit/bin/zinit.zsh"

# --- Plugins (Turbo mode for non-critical) ---
zinit ice wait lucid
zinit light zsh-users/zsh-autosuggestions

zinit ice wait lucid
zinit light zsh-users/zsh-history-substring-search

zinit light lukechilds/zsh-nvm

# Syntax highlighting MUST load last (synchronous)
zinit light zdharma-continuum/fast-syntax-highlighting
```

**Key detail:** `wait lucid` (equivalent to `wait"0" lucid`) loads immediately after prompt is first drawn, so it's effectively instant to the user but doesn't block prompt display. Use `wait"0"` -- no benefit to `wait"1"` or higher for these plugins.

### Pattern 4: Key Bindings with Turbo-Loaded Plugins

**What:** When `zsh-history-substring-search` is loaded via Turbo mode, the `bindkey` commands for `^[[A` and `^[[B` must run AFTER the plugin loads, not at the top level where they currently sit (zshrc:85-86).

```zsh
zinit ice wait lucid atload"bindkey '^[[A' history-substring-search-up; bindkey '^[[B' history-substring-search-down"
zinit light zsh-users/zsh-history-substring-search
```

**Why:** Without `atload`, the bindkeys execute before the widget functions exist, causing silent failures. This is the most common Zinit Turbo pitfall.

### Anti-Patterns to Avoid

- **Double nvm initialization:** Having both eager `source nvm.sh` AND `zinit light lukechilds/zsh-nvm` causes nvm to load twice. D-09 and D-15 address this.
- **Dual prompt engines:** `set_shell_theme()` initializes oh-my-posh, then starship also initializes at zshrc:89-91. One prompt overwrites the other, but both pay startup cost.
- **Network calls in shell startup:** `ensure_lts_node()` calls `nvm ls-remote` which fetches from the network. With lazy-loaded nvm, this function must be deferred or restructured.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| nvm lazy loading | Custom wrapper functions for node/npm/nvm | `NVM_LAZY_LOAD=true` + `zsh-nvm` plugin | The plugin already handles lazy-load proxies for node, npm, npx, and all global binaries |
| Symlink validation | Per-file ad-hoc checks | Single `emit_symlink_map` + loop pattern | Keeps check mode in sync with setup mode automatically |
| Plugin deferred loading | Manual `autoload` / `zsh-defer` | Zinit `wait lucid` ice modifiers | Zinit already has mature Turbo infrastructure |

## Common Pitfalls

### Pitfall 1: bindkey Ordering with Turbo-Loaded Plugins
**What goes wrong:** Moving `zsh-history-substring-search` to Turbo mode breaks up/down arrow history search because `bindkey` runs before the plugin's widgets are registered.
**Why it happens:** Turbo-loaded plugins load AFTER `.zshrc` finishes sourcing. Bindkeys at the top level reference functions that don't exist yet.
**How to avoid:** Use `atload` ice modifier to attach bindkeys to the plugin load event.
**Warning signs:** Arrow keys stop doing substring search; they do plain history navigation instead.

### Pitfall 2: ensure_lts_node Breaks with Lazy nvm
**What goes wrong:** `ensure_lts_node()` is called at zshrc:56 in interactive shells. It runs `nvm ls-remote` which triggers nvm initialization AND makes a network request. With lazy nvm, this function call itself triggers the lazy load, defeating the purpose.
**Why it happens:** The function is called unconditionally in interactive shells, before the user types any command.
**How to avoid:** Either (a) remove the `ensure_lts_node` call from zshrc startup entirely, or (b) restructure it to only run on explicit user action. Since `NVM_LAZY_LOAD=true` with `NVM_AUTO_USE=true` handles version switching via `.nvmrc`, the eager LTS check is redundant.
**Warning signs:** Startup still slow despite nvm lazy-load config.

### Pitfall 3: oh-my-posh Prompt Conflict
**What goes wrong:** `set_shell_theme()` calls `oh-my-posh init zsh` which registers a prompt. Then `eval "$(starship init zsh)"` registers another prompt, overwriting it. Both pay initialization cost.
**Why it happens:** Historical layering -- oh-my-posh was the original prompt, starship was added later, but `set_shell_theme()` was never updated.
**How to avoid:** Remove the oh-my-posh init block from `set_shell_theme()`. Keep only the BAT_THEME export. The function is still useful for theme detection.
**Warning signs:** `brew --prefix oh-my-posh` is called on every shell start (slow subshell).

### Pitfall 4: sync_ai_cli_theme Subprocess Overhead
**What goes wrong:** `sync_ai_cli_theme` spawns a Bash subprocess that calls `defaults`, `jq`, `sed`, `mktemp`, `mv` on every shell startup.
**Why it happens:** It's called unconditionally at zshrc:53.
**How to avoid:** This is already wrapped in the `claude()`, `gemini()`, `codex()` wrapper functions. The unconditional call at startup is redundant -- the wrapper functions sync theme when the user actually launches an AI CLI.
**Warning signs:** Extra 50-100ms on startup from subprocess + file I/O.

### Pitfall 5: readlink Portability
**What goes wrong:** On macOS, `readlink` does not support `-f` (canonicalize) by default. Using `readlink -f` in the check function fails.
**Why it happens:** macOS ships BSD readlink, not GNU readlink.
**How to avoid:** Use plain `readlink "$target"` (without `-f`) for symlink target resolution. This returns the direct symlink target which is what we need for comparison.
**Warning signs:** `readlink: illegal option -- f` error.

### Pitfall 6: Ghostty Config Path with Spaces
**What goes wrong:** The Ghostty config target path contains spaces (`~/Library/Application Support/...`). If the `emit_symlink_map` function uses a simple colon-delimited format and downstream code splits incorrectly, the path breaks.
**How to avoid:** Use a delimiter that won't appear in paths (e.g., `|`), or use null-delimited output, or process the map with `while IFS='|' read`.
**Warning signs:** Check reports Ghostty as MISSING even though it's correctly linked.

## Code Examples

### Complete --check Mode Flow

```bash
# In main(), before the existing function calls:
main() {
  if [[ "${1:-}" == "--check" ]]; then
    require_macos
    ensure_dotfiles_dir
    detect_brew
    run_check_mode
    exit $?
  fi

  # ... existing main body ...
}

run_check_mode() {
  local errors=0
  local total=0

  while IFS='|' read -r source target; do
    (( total++ ))
    if ! check_link "$source" "$target"; then
      (( errors++ ))
    fi
  done < <(emit_symlink_map)

  echo ""
  if (( errors == 0 )); then
    echo "All ${total} symlinks OK."
    return 0
  else
    echo "${errors} of ${total} symlinks out of sync."
    return 1
  fi
}
```

### Optimized nvm Section (macos zshrc)

```zsh
# --- NVM Setup (lazy) ---
export NVM_DIR="$HOME/.nvm"
export NVM_LAZY_LOAD=true
export NVM_COMPLETION=true
```

Remove lines 30-31 (eager source). The `zinit light lukechilds/zsh-nvm` plugin handles all loading.

### Cleaned set_shell_theme (remove oh-my-posh init)

```zsh
function set_shell_theme() {
  local defaults_result
  defaults_result="$(defaults read -g AppleInterfaceStyle 2>/dev/null || true)"
  if [[ "$defaults_result" == "Dark" ]]; then
    export BAT_THEME="Catppuccin-Mocha"
  else
    export BAT_THEME="Catppuccin-Latte"
  fi
}
```

Remove all oh-my-posh logic from this function. Starship is the sole prompt.

## Performance Budget Analysis

Current baseline: **1.133s** (measured on development machine).

| Source | Estimated Cost | Action | Expected Savings |
|--------|---------------|--------|-----------------|
| Eager nvm source (`nvm.sh`) | ~150-200ms | Remove; use zsh-nvm lazy load | ~150ms |
| `ensure_lts_node` (nvm ls-remote) | ~300-500ms | Remove from startup | ~400ms |
| `set_shell_theme` oh-my-posh init | ~100-150ms | Remove oh-my-posh init | ~100ms |
| `sync_ai_cli_theme` subprocess | ~50-100ms | Remove from startup (already in wrapper functions) | ~75ms |
| `ensure_gemini_api_key` (file check) | ~5ms | Keep (negligible) | 0ms |
| Zinit eager plugin loading | ~50-100ms | Turbo mode for autosuggestions + history | ~50ms |
| Starship init | ~30-50ms | Keep (needed) | 0ms |
| Zoxide init | ~10-20ms | Keep (needed) | 0ms |

**Projected after optimization:** ~200-300ms. May need further tuning.

**Critical insight:** The `ensure_lts_node` call is the single biggest startup cost because it triggers a network request. Removing it from startup is essential to hitting the 200ms target.

## Scope Discovery: Items Beyond CONTEXT.md Decisions

The CONTEXT.md decisions cover nvm lazy-loading, Powerlevel10k removal, and Zinit reordering. But the current zshrc has additional startup overhead sources that must be addressed to hit 200ms:

1. **`set_shell_theme()` oh-my-posh initialization** -- Not mentioned in CONTEXT.md but runs oh-my-posh init on every startup, conflicting with starship. Must be cleaned up.
2. **`sync_ai_cli_theme` call at startup** -- Spawns a subprocess. Already called inside wrapper functions for `claude()`, `gemini()`, `codex()`, making the startup call redundant.
3. **`ensure_lts_node` at startup** -- Calls nvm (which with lazy loading would trigger immediate initialization, negating the lazy load). Must be removed from startup or deferred.

These are not new decisions -- they are necessary consequences of the performance target (D-16/SHELL-04). Without addressing them, the 200ms target is not achievable.

## Open Questions

1. **ensure_lts_node removal or deferral**
   - What we know: It calls `nvm ls-remote` (network) and `nvm use --lts` on every interactive shell start. With lazy nvm, it would trigger initialization immediately, negating lazy loading.
   - What's unclear: Does the user depend on always having LTS Node active? Or is `.nvmrc`-based version switching sufficient?
   - Recommendation: Remove from startup. Use `NVM_AUTO_USE=true` with `.nvmrc` files per-project instead. The function can remain defined for manual use.

2. **oh-my-posh in Brewfile**
   - What we know: oh-my-posh is still in the Brewfile (line 30). After removing its init from `set_shell_theme()`, it becomes an unused installed package.
   - What's unclear: Should it be removed from Brewfile in this phase, or deferred?
   - Recommendation: Remove from Brewfile in this phase since it's directly related to prompt cleanup (SHELL-01). But this is a low-priority concern -- it just wastes disk space if left.

3. **WSL zshrc parallel changes**
   - What we know: `wsl/zsh/zshrc` has the same eager nvm loading, same plugin order, same function calls. CONTEXT.md discretion says "likely yes, for consistency."
   - Recommendation: Apply same optimizations to WSL zshrc for consistency.

## Project Constraints (from CLAUDE.md)

- **Conventional commits:** `type(scope): subject` format required
- **No Claude attribution:** No `Co-Authored-By` or generated-with lines in commits
- **set -euo pipefail:** Required in all Bash scripts
- **Idempotency:** All setup operations must be safe to rerun
- **No secrets in repo:** System keychain or `.env` outside repo only
- **Symlink-based:** Configs live in repo, symlinked to expected locations
- **ShellCheck:** CI runs on all `.sh` files; pre-commit hooks active
- **GSD Workflow:** Use GSD commands for file changes

## Sources

### Primary (HIGH confidence)
- `initial-setup-macos.sh` -- direct code inspection, all 12 `link_file()` calls catalogued
- `macos/zsh/zshrc` -- direct code inspection, line-by-line startup analysis
- `macos/zsh/zsh/functions.zsh` -- direct code inspection, `set_shell_theme()` and `ensure_lts_node()` analyzed
- [zsh-nvm GitHub README](https://github.com/lukechilds/zsh-nvm) -- `NVM_LAZY_LOAD`, `NVM_COMPLETION`, `NVM_AUTO_USE` environment variables verified
- [Zinit GitHub README](https://github.com/zdharma-continuum/zinit) -- `wait lucid` and `atload` ice modifiers verified
- Shell startup measurement: `time zsh -i -c exit` = 1.133s baseline

### Secondary (MEDIUM confidence)
- Zinit Turbo mode savings estimate (50-80% faster) -- from Zinit documentation, actual savings depend on plugin count
- nvm startup cost (~150ms) -- widely reported in community, consistent with measured total

### Tertiary (LOW confidence)
- Individual function timing estimates in Performance Budget -- derived from general shell profiling knowledge, not individually measured with `zprof`

## Metadata

**Confidence breakdown:**
- Drift detection architecture: HIGH -- straightforward Bash, no external dependencies, code fully inspected
- Shell performance changes: HIGH -- all source files read, startup measured, plugin docs verified
- Performance budget estimates: MEDIUM -- individual function costs are estimates, not profiled; total target achievability depends on cumulative savings

**Research date:** 2026-03-31
**Valid until:** 2026-04-30 (stable domain, no fast-moving dependencies)
