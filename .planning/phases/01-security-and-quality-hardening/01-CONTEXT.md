# Phase 1: Security and Quality Hardening - Context

**Gathered:** 2026-03-30
**Status:** Ready for planning

<domain>
## Phase Boundary

Eliminate all hardcoded absolute user paths from tracked files, close gitignore gaps in AI tool directories, replace the hardcoded user guard in the setup script, and establish ShellCheck + shfmt linting locally (pre-commit) and in CI (GitHub Actions). After this phase, the repo is safe to publish publicly and every shell script change is automatically linted.

</domain>

<decisions>
## Implementation Decisions

### Path Replacement Strategy
- **D-01:** JSON config files with hardcoded `/Users/aslaii` paths (`claude/settings.json`, `gemini/settings.json`) should use template files (`.template.json`) that are processed with `sed` or `envsubst` during bootstrap to replace `$HOME` placeholders with the actual home directory.
- **D-02:** `gemini/projects.json` and `gemini/extensions/extension-enablement.json` are runtime-generated files with project-specific absolute paths — these should be added to `gemini/.gitignore`, not templated.
- **D-03:** `claude/projects/` subagent metadata files (`.meta.json`) contain session-specific absolute paths — these are already gitignored via `claude/.gitignore` `projects/` rule. Verify coverage.
- **D-04:** `initial-setup-macos.sh` line 549 hardcodes `/Users/aslaii` in the MCP filesystem server command — replace with `$HOME`.

### Gitignore Completeness
- **D-05:** Create `gemini/.gitignore` excluding OAuth tokens, session state, `projects.json`, and extension-enablement files. Use `claude/.gitignore` as reference pattern.
- **D-06:** Create `codex/.gitignore` for any runtime/auth artifacts.
- **D-07:** Audit `opencode/.gitignore` (already exists) for completeness against runtime artifacts.
- **D-08:** Verify `claude/.gitignore` `projects/` rule covers all session metadata.

### User Guard Replacement
- **D-09:** Remove `ensure_expected_user` function entirely from `initial-setup-macos.sh`. Replace with `$HOME`-based and `$(whoami)`-based path derivation throughout the script.
- **D-10:** No confirmation prompt needed — the script should work for any user on any machine without asking who they are.

### CI and Linting
- **D-11:** Create `.pre-commit-config.yaml` with ShellCheck and shfmt hooks for local linting on every commit.
- **D-12:** Create GitHub Actions workflow (`.github/workflows/shellcheck.yml`) using `ludeeus/action-shellcheck` for CI on push/PR.
- **D-13:** Add `shfmt` to `BREW_FORMULAE` array in setup script (or Brewfile when Phase 2 creates it — for now, add to the script array).
- **D-14:** Harden `initial-setup.sh` (Linux) with `set -euo pipefail` to match macOS script's error handling.

### Claude's Discretion
- shfmt configuration (indent style, binary ops) — match existing code conventions
- Exact `.gitignore` patterns for `gemini/` and `codex/` — inspect runtime artifacts and exclude appropriately
- Whether to use `envsubst` vs `sed` for template processing — either is fine, pick the simpler approach

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Setup Scripts
- `initial-setup-macos.sh` — Primary bootstrap script; contains `ensure_expected_user`, `link_configs()`, MCP server setup, BREW_FORMULAE array
- `initial-setup.sh` — Linux/WSL bootstrap; needs `set -euo pipefail` hardening

### AI Tool Configs (hardcoded path sources)
- `claude/settings.json` — Hook commands with hardcoded `/Users/aslaii/.claude/hooks/` paths
- `gemini/settings.json` — Hook commands with hardcoded `/Users/aslaii/.gemini/hooks/` paths
- `gemini/projects.json` — Runtime-generated project mappings (should be gitignored)
- `gemini/extensions/extension-enablement.json` — Runtime-generated extension paths (should be gitignored)

### Gitignore References
- `claude/.gitignore` — Reference pattern for comprehensive AI tool gitignore
- `opencode/.gitignore` — Existing gitignore to audit for completeness

### Project Standards
- `AGENTS.md` — Shell script conventions, commit style, security rules
- `CLAUDE.md` — Project structure and conventions

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `claude/.gitignore` — Comprehensive pattern covering backups, cache, projects, auth, telemetry. Use as template for `gemini/` and `codex/` gitignore files.
- `link_file()` function in `initial-setup-macos.sh` — Already handles symlink creation with backup-on-collision; no changes needed.

### Established Patterns
- `set -euo pipefail` is used in `initial-setup-macos.sh` — Linux script should match
- `CONFIG_VARIANT` env var pattern for platform-specific behavior — already established
- Conventional commits enforced — all commits must follow `type(scope): subject`

### Integration Points
- `link_configs()` function — where template processing would be called after symlinking
- `ensure_homebrew_packages()` — where `shfmt` and `pre-commit` would be added to BREW_FORMULAE
- Root `.gitignore` — may need updates if per-directory gitignores don't fully cover runtime artifacts

</code_context>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches for template processing, gitignore patterns, and CI configuration.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 01-security-and-quality-hardening*
*Context gathered: 2026-03-30*
