# Phase 2: Declarative Package and Plugin Management - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-03-30
**Phase:** 02-declarative-package-and-plugin-management
**Areas discussed:** Brewfile generation, Bootstrap migration, Neovim plugin workflow, SketchyBar packaging
**Mode:** Auto (--auto flag; all areas selected, recommended defaults chosen)

---

## Brewfile Generation Strategy

| Option | Description | Selected |
|--------|-------------|----------|
| Generate from existing arrays | Extract BREW_TAPS/FORMULAE/CASKS into Brewfile programmatically | ✓ |
| Hand-craft from scratch | Write Brewfile manually, risk missing packages | |
| Use `brew bundle dump` | Generate from currently installed packages (may include unwanted extras) | |

**User's choice:** [auto] Generate from existing arrays (recommended — ensures nothing missed)
**Notes:** Arrays in initial-setup-macos.sh are the authoritative source

## Inline Arrays Disposition

| Option | Description | Selected |
|--------|-------------|----------|
| Remove entirely | Brewfile becomes single source of truth | ✓ |
| Keep as fallback | Dual maintenance, risk of drift | |
| Keep as comments | Reference only, no execution path | |

**User's choice:** [auto] Remove entirely (recommended — DRY principle)

## Bootstrap Script Migration

| Option | Description | Selected |
|--------|-------------|----------|
| Replace loops with brew bundle | Single idempotent command | ✓ |
| Wrap brew bundle in existing function | Keep function signature, replace body | ✓ |
| Inline brew bundle in main() | Remove function entirely | |

**User's choice:** [auto] Replace loops, keep function wrapper (recommended — preserves structure)

## Neovim Plugin Workflow

| Option | Description | Selected |
|--------|-------------|----------|
| Verify tracking + document workflow | lazy-lock.json already tracked; just verify and document | ✓ |
| Add git hooks for lockfile | Enforce lockfile commits on plugin changes | |
| Skip entirely | Already working | |

**User's choice:** [auto] Verify tracking and document (recommended — NVIM-01 nearly satisfied)

## SketchyBar Tap Handling

| Option | Description | Selected |
|--------|-------------|----------|
| Brewfile tap directives | Native Brewfile feature for custom taps | ✓ |
| Keep taps in script separately | Don't migrate custom taps to Brewfile | |

**User's choice:** [auto] Brewfile tap directives (recommended — standard approach)

---

## Claude's Discretion

- Brewfile formatting and comment style
- Alphabetical vs categorical grouping in Brewfile
- SKETCHYBAR toggle implementation with brew bundle
- Brewfile.lock.json .gitattributes handling

## Deferred Ideas

- NVIM-02 full documentation — Phase 4
- brew upgrade automation — v2 APKG-01
- yabai/skhd version pinning — v2 APKG-02
