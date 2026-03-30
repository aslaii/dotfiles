# Phase 1: Security and Quality Hardening - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-03-30
**Phase:** 01-security-and-quality-hardening
**Areas discussed:** Path replacement strategy, Gitignore scope, User guard replacement, CI workflow design
**Mode:** Auto (all recommended defaults selected)

---

## Path Replacement Strategy

| Option | Description | Selected |
|--------|-------------|----------|
| Template generation at bootstrap | Process `.template.json` files with `sed`/`envsubst` during setup, replacing `$HOME` placeholders | Yes |
| Runtime path resolution | Resolve paths at tool startup, not at install time | |
| Gitignore runtime files | Add runtime-generated files to gitignore instead of templating | Partial (for projects.json, extension-enablement.json) |

**User's choice:** Template generation for hook configs; gitignore for runtime-generated project mappings
**Notes:** Auto-selected. `claude/settings.json` and `gemini/settings.json` hooks need templates. `gemini/projects.json` is runtime-generated and should be gitignored.

---

## Gitignore Scope

| Option | Description | Selected |
|--------|-------------|----------|
| Per-directory .gitignore for all AI tools | Audit and add .gitignore to gemini/, codex/, verify opencode/ and claude/ | Yes |
| Root .gitignore only | Add patterns to root gitignore | |
| Selective (only missing dirs) | Only add to gemini/ which has no gitignore | |

**User's choice:** Per-directory .gitignore for all four AI tool directories
**Notes:** Auto-selected. `claude/.gitignore` serves as reference pattern.

---

## User Guard Replacement

| Option | Description | Selected |
|--------|-------------|----------|
| Remove entirely, use $HOME | Derive paths from $HOME and $(whoami), no user check | Yes |
| Replace with prompt | Ask user to confirm identity at runtime | |
| Replace with env var | Require DOTFILES_USER env var | |

**User's choice:** Remove `ensure_expected_user` entirely, use `$HOME`-based derivation
**Notes:** Auto-selected. Script should work for any user without asking.

---

## CI Workflow Design

| Option | Description | Selected |
|--------|-------------|----------|
| GitHub Actions + pre-commit | `ludeeus/action-shellcheck` CI + local pre-commit hooks | Yes |
| GitHub Actions only | CI-only, no local hooks | |
| Pre-commit only | Local hooks only, no CI | |

**User's choice:** Both GitHub Actions CI and local pre-commit hooks
**Notes:** Auto-selected. Standard dual-layer approach.

---

## Claude's Discretion

- shfmt configuration (indent style, binary ops)
- Exact gitignore patterns for gemini/ and codex/
- Template processing method (envsubst vs sed)

## Deferred Ideas

None
