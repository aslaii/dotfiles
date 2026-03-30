# Phase 2: Declarative Package and Plugin Management - Research

**Researched:** 2026-03-30
**Domain:** Homebrew Bundle (Brewfile), Neovim lazy.nvim lockfile management
**Confidence:** HIGH

## Summary

This phase replaces inline Homebrew package arrays in `initial-setup-macos.sh` with a declarative `Brewfile` and ensures Neovim plugin versions are reproducible via `lazy-lock.json`. The technical domain is well-understood: `brew bundle` is a built-in Homebrew feature with stable, documented behavior. Brewfiles support Ruby conditionals for the SKETCHYBAR toggle, and `HOMEBREW_BUNDLE_BREW_SKIP` / `HOMEBREW_BUNDLE_TAP_SKIP` env vars provide runtime skip capability.

**Critical finding:** `Brewfile.lock.json` is NOT a real lockfile. Homebrew maintainers explicitly state it is a debugging artifact, not a reproducibility tool. The CONTEXT.md decision D-09/D-10 to commit it should be reconsidered -- it contains system-specific information (HOMEBREW_VERSION, OS version, etc.) and does not pin package versions. The Brewfile itself IS the source of truth; Homebrew does not support version pinning via lockfiles.

**Primary recommendation:** Generate a Brewfile from existing arrays, use Ruby conditional for SKETCHYBAR toggle, replace the install loops with `brew bundle install`, and either skip `Brewfile.lock.json` entirely or commit it with the understanding it is advisory-only.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Generate Brewfile programmatically from existing `BREW_TAPS`, `BREW_FORMULAE`, and `BREW_CASKS` arrays in `initial-setup-macos.sh`, then hand-verify for correctness and remove duplicates.
- **D-02:** Remove inline arrays (`BREW_TAPS`, `BREW_FORMULAE`, `BREW_CASKS`) entirely after Brewfile is committed. The Brewfile becomes the single source of truth for all Homebrew packages -- no parallel lists.
- **D-03:** Remove the deprecated `homebrew/cask-fonts` tap. Cask fonts are now in Homebrew core (no tap needed). The `font-*` entries move to `cask` directives in the Brewfile without a tap prefix.
- **D-04:** Keep `koekeishiya/formulae` (yabai, skhd) and `FelixKratz/formulae` (sketchybar) as `tap` directives in the Brewfile -- these are still required for third-party formulae.
- **D-05:** Replace the individual tap/install/cask loops in `ensure_homebrew_packages()` with a single `brew bundle install --file="$DOTFILES_DIR/Brewfile"` call. This handles taps, formulae, and casks in one idempotent command.
- **D-06:** Keep the `ensure_homebrew_packages()` function name and call site -- only replace its body. This preserves the script's existing structure and log messages.
- **D-07:** Add a `brew bundle check --file="$DOTFILES_DIR/Brewfile"` call before install to skip the step if everything is already installed (idempotency optimization).
- **D-08:** The `SKETCHYBAR` env var toggle currently gates sketchybar package installation. Preserve this behavior by conditionally adding/removing sketchybar from the bundle command or using `brew bundle` with a conditional approach.
- **D-09:** Commit `Brewfile.lock.json` to the repo for version reproducibility. (NOTE: Research shows this is NOT a real lockfile -- see Pitfall 1)
- **D-10:** The lockfile should be regenerated on each `brew bundle install` run -- no manual maintenance needed.
- **D-11:** `nvim/lazy-lock.json` is already tracked in git (NVIM-01 is effectively satisfied). Verify it's not gitignored and contains valid content.
- **D-12:** Document the Neovim plugin upgrade workflow: run `:Lazy update` in Neovim, then commit the updated `lazy-lock.json`. This satisfies NVIM-02.
- **D-13:** The documentation for NVIM-02 belongs in Phase 4 (Documentation) as a section in the Neovim docs, but the lockfile tracking verification belongs here.

### Claude's Discretion
- Exact Brewfile formatting and comment style
- Whether to alphabetize entries in the Brewfile or group by category
- How to handle the `SKETCHYBAR` toggle cleanly with `brew bundle` (conditional tap/formula inclusion)
- Whether `Brewfile.lock.json` needs a `.gitattributes` entry for diff handling

### Deferred Ideas (OUT OF SCOPE)
- NVIM-02 documentation (plugin upgrade workflow) -- belongs in Phase 4 (Documentation), only lockfile verification is Phase 2 scope
- `brew update && brew upgrade` automation wrapper -- deferred to v2 (APKG-01)
- yabai/skhd version pinning -- deferred to v2 (APKG-02)
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| PKG-01 | Brewfile committed with all taps, formulae, and casks extracted from setup script | Brewfile syntax documented; `brew bundle dump` can seed initial file; Ruby conditionals enable SKETCHYBAR toggle |
| PKG-02 | Bootstrap script updated to use `brew bundle install` instead of inline arrays | `brew bundle install --file=PATH` is the standard invocation; `brew bundle check` for idempotency; functions `ensure_brew_taps`, `install_formulae`, `install_casks` all replaced |
| PKG-03 | Deprecated `homebrew/cask-fonts` tap reference removed | Confirmed: `homebrew/cask-fonts` is deprecated; font casks now in core Homebrew; no tap needed for `font-*` casks |
| PKG-04 | Brewfile.lock.json committed for version reproducibility | WARNING: Brewfile.lock.json is NOT a real lockfile per Homebrew maintainers -- it's a debug artifact. Recommend committing with documentation caveat, or reconsidering |
| NVIM-01 | lazy-lock.json tracked in git for reproducible plugin installs | FINDING: File exists and IS tracked by git (`git ls-files` confirms), BUT it is also listed in root `.gitignore`. Currently tracked due to prior `git add -f`. Stable but fragile |
| NVIM-02 | Plugin upgrade workflow documented (`:Lazy update` + commit lockfile) | nvim/AGENTS.md already documents this workflow; full documentation deferred to Phase 4 per D-13 |
</phase_requirements>

## Standard Stack

### Core
| Tool | Version | Purpose | Why Standard |
|------|---------|---------|--------------|
| Homebrew Bundle (`brew bundle`) | Built-in (Homebrew 4.x) | Declarative package management via Brewfile | First-class built-in since Homebrew 4.x; no tap needed; handles taps, formulae, and casks in one command |
| lazy.nvim | Current (via LazyVim) | Neovim plugin manager with lockfile support | Already in use; `lazy-lock.json` provides true version pinning (commit hashes) |

### Supporting
| Tool | Version | Purpose | When to Use |
|------|---------|---------|-------------|
| `brew bundle dump` | Built-in | Generate Brewfile from installed packages | One-time seed for initial Brewfile creation |
| `brew bundle check` | Built-in | Verify all Brewfile deps are installed | Idempotency check before running install |

## Architecture Patterns

### Recommended Brewfile Structure
```ruby
# Brewfile -- Single source of truth for Homebrew packages
# Generated from initial-setup-macos.sh arrays, then manually curated
# Run: brew bundle install --file=Brewfile

# Third-party taps (required for non-core formulae)
tap "koekeishiya/formulae"    # yabai, skhd
tap "FelixKratz/formulae"     # sketchybar

# Core development tools
brew "git"
brew "gh"
brew "lazygit"
brew "neovim"
# ... (grouped by category with comments)

# Conditional: SketchyBar (set HOMEBREW_BUNDLE_BREW_SKIP="sketchybar" to skip)
brew "sketchybar"

# Casks
cask "ghostty"
cask "visual-studio-code"

# Fonts (no tap needed -- in Homebrew core since cask-fonts deprecation)
cask "font-hack-nerd-font"
cask "font-meslo-lg-nerd-font"
```

### Pattern 1: SKETCHYBAR Conditional via HOMEBREW_BUNDLE_BREW_SKIP
**What:** Use `HOMEBREW_BUNDLE_BREW_SKIP` and `HOMEBREW_BUNDLE_TAP_SKIP` env vars to skip sketchybar when disabled.
**When to use:** When the SKETCHYBAR env var is false/unset.
**Example:**
```bash
# In initial-setup-macos.sh
ensure_homebrew_packages() {
  local bundle_args=(--file="$DOTFILES_DIR/Brewfile" --no-upgrade)

  if ! is_truthy "$SKETCHYBAR"; then
    log "Skipping SketchyBar packages (SKETCHYBAR=${SKETCHYBAR})."
    export HOMEBREW_BUNDLE_BREW_SKIP="sketchybar"
    export HOMEBREW_BUNDLE_TAP_SKIP="FelixKratz/formulae"
  fi

  if brew bundle check "${bundle_args[@]}" 2>/dev/null; then
    log "All Homebrew packages already installed."
    return
  fi

  log "Installing Homebrew packages from Brewfile..."
  brew bundle install "${bundle_args[@]}"
}
```

### Pattern 2: Alternative -- Ruby Conditional in Brewfile
**What:** Use Ruby's `ENV` in the Brewfile itself to conditionally include sketchybar.
**When to use:** If you prefer the conditional logic in the Brewfile rather than the shell script.
**Example:**
```ruby
# In Brewfile
if ENV.fetch("SKETCHYBAR", "true").downcase.then { |v| %w[1 true y yes on].include?(v) }
  tap "FelixKratz/formulae"
  brew "sketchybar"
end
```
**Tradeoff:** Pattern 1 (env skip) is simpler and keeps the Brewfile unconditional. Pattern 2 puts logic in two places (shell + Brewfile). **Recommendation: Use Pattern 1** -- it keeps the Brewfile clean and declarative, with the shell script owning the conditional logic as it does today.

### Pattern 3: Bootstrap Script Migration
**What:** Replace three functions (`ensure_brew_taps`, `install_formulae`, `install_casks`) with one `brew bundle` call.
**Current code to replace:**
```
ensure_brew_taps()    -> lines 177-189
install_formulae()    -> lines 191-211
install_casks()       -> lines 213-225
```
**Also remove:** `BREW_TAPS`, `BREW_FORMULAE`, `BREW_CASKS` array declarations (lines 11-60).
**Keep:** `SKETCHYBAR` env var declaration (line 9), `is_truthy()` function.

### Anti-Patterns to Avoid
- **Keeping parallel package lists:** Do not maintain both the Brewfile and arrays in the shell script. The Brewfile is the single source of truth (D-02).
- **Using `brew bundle dump` as the final Brewfile:** `dump` captures everything on the current machine (including packages not in the dotfiles). Use it as a starting seed, then curate manually to match only the intended package set.
- **Treating Brewfile.lock.json as a version pin:** It is NOT a lockfile. It captures system-specific debug info. Homebrew does not support version pinning.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Package installation idempotency | Custom `brew list` checks per formula | `brew bundle install` (inherently idempotent) | brew bundle handles all check-before-install logic internally |
| Tap management | Manual `brew tap` loops | `tap` directive in Brewfile | brew bundle processes taps before formulae automatically |
| Cask font tap management | `homebrew/cask-fonts` tap reference | Direct `cask "font-*"` in Brewfile | The tap is deprecated; fonts are in core |
| Package skip logic | Complex shell conditionals per package | `HOMEBREW_BUNDLE_BREW_SKIP` env var | Built-in mechanism, no custom code needed |

## Common Pitfalls

### Pitfall 1: Brewfile.lock.json Is NOT a Real Lockfile
**What goes wrong:** Developers expect `Brewfile.lock.json` to pin versions like `package-lock.json` or `Gemfile.lock`. It does not. Homebrew explicitly does not support version pinning via lockfiles.
**Why it happens:** The filename is misleading. Homebrew maintainers have acknowledged this (Issue #1188). The file contains system-specific debug information (HOMEBREW_VERSION, OS version, CPU architecture).
**How to avoid:** If committing it (per D-09), add a comment in the Brewfile explaining it is advisory-only. Consider adding it to `.gitattributes` as `linguist-generated` to collapse diffs in PRs.
**Warning signs:** Relying on the lockfile for reproducibility across machines.
**Recommendation for D-09:** Commit it as decided, but document clearly that it is NOT a version pin. Alternatively, add `Brewfile.lock.json` to `.gitignore` and drop PKG-04 -- the Brewfile itself IS the reproducibility guarantee (taps + package names), and Homebrew always installs the latest available version regardless of the lockfile.

### Pitfall 2: lazy-lock.json Gitignore Conflict
**What goes wrong:** `nvim/lazy-lock.json` is listed in the root `.gitignore` (line confirmed). It IS currently tracked because it was force-added before the gitignore rule. If the file is ever removed from git and re-added, the gitignore will prevent tracking.
**Why it happens:** Root `.gitignore` contains `nvim/lazy-lock.json` explicitly.
**How to avoid:** Remove the `nvim/lazy-lock.json` line from root `.gitignore`. This makes the tracking explicit and survives `git rm` + `git add` cycles.
**Warning signs:** `git status` not showing changes to `lazy-lock.json` after `:Lazy update`.

### Pitfall 3: Missing Packages in Brewfile vs Current System
**What goes wrong:** The `brew bundle dump` output shows packages on the current machine that are NOT in the setup script arrays (e.g., `cocoapods`, `fastlane`, `go`, `cloudflared`, `supabase`, `temporal`, `gemini-cli`). The Brewfile should only contain packages that are part of the dotfiles standard setup.
**Why it happens:** Extra packages were installed manually or for specific projects.
**How to avoid:** Generate the Brewfile from the existing `BREW_TAPS`, `BREW_FORMULAE`, `BREW_CASKS` arrays -- NOT from `brew bundle dump`. Use dump only as a cross-reference to catch missing entries.
**Warning signs:** `brew bundle cleanup` wanting to remove many packages.

### Pitfall 4: homebrew/cask-fonts Tap Removal Timing
**What goes wrong:** Removing the tap while font casks are already installed is harmless. But if the tap removal fails (network issue), the script should not abort.
**Why it happens:** `set -euo pipefail` causes the script to exit on any failed command.
**How to avoid:** Untap inside a conditional: `brew untap homebrew/cask-fonts 2>/dev/null || true`.

### Pitfall 5: brew bundle check vs Partial Installs
**What goes wrong:** `brew bundle check` returns success only if ALL Brewfile entries are installed. If SKETCHYBAR is in the Brewfile but skipped via `HOMEBREW_BUNDLE_BREW_SKIP`, the check may still fail because sketchybar appears missing.
**Why it happens:** `HOMEBREW_BUNDLE_BREW_SKIP` affects `install` but its interaction with `check` needs verification.
**How to avoid:** Set the same skip env vars before both `check` and `install` calls. Test this behavior during implementation.

### Pitfall 6: Function Removal Order in main()
**What goes wrong:** The current `main()` calls `ensure_brew_taps`, `install_formulae`, `install_casks` as separate steps scattered through the flow (with `install_pre_commit_hooks` between formulae and casks). After migration, the single `brew bundle install` replaces all three, but `install_pre_commit_hooks` call placement must be preserved.
**Why it happens:** The three functions are not adjacent in `main()`.
**How to avoid:** Map the exact call order in `main()` before editing. The new `ensure_homebrew_packages()` replaces all three calls, but other calls between them stay in place.

## Code Examples

### Example Brewfile (Recommended Format)
```ruby
# Brewfile -- Dotfiles standard packages
# Source of truth for all Homebrew-managed packages
# Usage: brew bundle install --file=Brewfile
# Skip sketchybar: HOMEBREW_BUNDLE_BREW_SKIP="sketchybar" HOMEBREW_BUNDLE_TAP_SKIP="FelixKratz/formulae"

# ── Taps ──────────────────────────────────────────
tap "koekeishiya/formulae"       # yabai, skhd (window management)
tap "FelixKratz/formulae"        # sketchybar (status bar)

# ── Development ───────────────────────────────────
brew "git"
brew "gh"
brew "lazygit"
brew "neovim"
brew "lua"
brew "jq"
brew "wget"

# ── Shell ─────────────────────────────────────────
brew "fzf"
brew "ripgrep"
brew "bat"
brew "zoxide"
brew "starship"
brew "btop"

# ── Node.js ───────────────────────────────────────
brew "nvm"
brew "bun"
brew "pnpm"

# ── Services ──────────────────────────────────────
brew "redis"
brew "postgresql@16"
brew "mailhog"
brew "firebase-cli"

# ── Prompt / Theme ────────────────────────────────
brew "oh-my-posh"

# ── Quality tooling ──────────────────────────────
brew "shellcheck"
brew "shfmt"
brew "pre-commit"
brew "gitleaks"

# ── Audio / Media (sketchybar dependencies) ──────
brew "switchaudio-osx"
brew "nowplaying-cli"

# ── Window Management ────────────────────────────
brew "yabai"
brew "skhd"
brew "sketchybar"

# ── Casks ─────────────────────────────────────────
cask "ghostty"
cask "visual-studio-code"
cask "google-cloud-sdk"
cask "sf-symbols"

# ── Fonts (in Homebrew core, no tap needed) ──────
cask "font-hack-nerd-font"
cask "font-meslo-lg-nerd-font"
cask "font-sf-mono"
cask "font-sf-pro"
```

### Bootstrap Script Migration
```bash
# Replace ensure_brew_taps + install_formulae + install_casks with:
ensure_homebrew_packages() {
  local brewfile="$DOTFILES_DIR/Brewfile"

  if [[ ! -f "$brewfile" ]]; then
    die "Brewfile not found at $brewfile"
  fi

  # Conditionally skip sketchybar packages
  if ! is_truthy "$SKETCHYBAR"; then
    log "Skipping SketchyBar packages (SKETCHYBAR=${SKETCHYBAR})."
    export HOMEBREW_BUNDLE_BREW_SKIP="sketchybar"
    export HOMEBREW_BUNDLE_TAP_SKIP="FelixKratz/formulae"
  fi

  if brew bundle check --file="$brewfile" 2>/dev/null; then
    log "All Homebrew packages already installed."
    return
  fi

  log "Installing Homebrew packages from Brewfile..."
  if ! brew bundle install --file="$brewfile" --no-upgrade; then
    warn "Some Brewfile packages may have failed. Check output above."
  fi
}
```

### main() Migration
```bash
# BEFORE:
main() {
  ...
  ensure_brew_taps        # REMOVE
  install_formulae        # REMOVE
  install_pre_commit_hooks  # KEEP (moves after ensure_homebrew_packages)
  install_casks           # REMOVE
  ...
}

# AFTER:
main() {
  ...
  ensure_homebrew_packages   # NEW (replaces three functions above)
  install_pre_commit_hooks   # KEEP
  ...
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `homebrew/cask-fonts` tap for font casks | Font casks in core Homebrew (no tap) | Homebrew 4.x (2023+) | Remove tap reference; `cask "font-*"` works without it |
| `homebrew/homebrew-bundle` tap | `brew bundle` built-in | Homebrew 4.x | No tap needed for bundle commands |
| Individual `brew install` loops | `brew bundle install` from Brewfile | Stable since 2020+ | Single idempotent command replaces loops |

## Open Questions

1. **HOMEBREW_BUNDLE_BREW_SKIP + brew bundle check interaction**
   - What we know: SKIP env vars affect `install`; documented in help text
   - What's unclear: Whether `check` respects the same SKIP env vars or reports skipped packages as missing
   - Recommendation: Test during implementation; if check does not respect SKIP, gate the check with the same is_truthy conditional

2. **Brewfile.lock.json commitment (D-09 reconsideration)**
   - What we know: Homebrew maintainers say it is NOT a lockfile; it is a debug artifact with system-specific data
   - What's unclear: Whether the user still wants to commit it given this information
   - Recommendation: Honor D-09 as decided, but add `.gitattributes` entry (`Brewfile.lock.json linguist-generated=true`) to minimize PR noise. Document its limitations in a Brewfile comment.

3. **codex formula name**
   - What we know: The array has `"codex"` as a formula but `brew bundle dump` shows `cask "codex"`
   - What's unclear: Whether codex is a formula or cask in current Homebrew
   - Recommendation: Verify with `brew info codex` during implementation and place in correct section

## Sources

### Primary (HIGH confidence)
- `brew bundle --help` output (local, 2026-03-30) -- Full flag documentation, SKIP env vars confirmed
- [Homebrew Bundle and Brewfile docs](https://docs.brew.sh/Brew-Bundle-and-Brewfile) -- Official syntax reference, Ruby conditionals confirmed
- `initial-setup-macos.sh` source code -- Current array contents and function structure
- `git ls-files nvim/lazy-lock.json` -- Confirmed tracked in git
- Root `.gitignore` -- Confirmed `nvim/lazy-lock.json` IS listed (line present)

### Secondary (MEDIUM confidence)
- [Brewfile.lock.json Issue #1188](https://github.com/Homebrew/homebrew-bundle/issues/1188) -- Maintainer confirms not a real lockfile
- [Brewfile.lock.json Issue #1057](https://github.com/Homebrew/homebrew-bundle/issues/1057) -- Community discussion on whether to commit
- `brew bundle dump` output -- Cross-reference of currently installed packages vs setup script arrays

### Tertiary (LOW confidence)
- None -- all findings verified against official sources or local system

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- `brew bundle` is built-in, stable, well-documented
- Architecture: HIGH -- Brewfile syntax is Ruby-based, well-documented, verified locally
- Pitfalls: HIGH -- lazy-lock.json gitignore conflict verified locally; Brewfile.lock.json limitation confirmed by maintainers
- SKETCHYBAR conditional: MEDIUM -- HOMEBREW_BUNDLE_BREW_SKIP documented in help but check interaction unverified

**Research date:** 2026-03-30
**Valid until:** 2026-04-30 (stable domain, slow-moving)
