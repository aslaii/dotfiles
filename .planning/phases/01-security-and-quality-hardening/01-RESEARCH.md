# Phase 1: Security and Quality Hardening - Research

**Researched:** 2026-03-30
**Domain:** Shell script linting, gitignore hygiene, config templating, CI/CD, secret detection
**Confidence:** HIGH

## Summary

This phase has two distinct work streams. The first is a security sweep: eliminate all hardcoded
`/Users/aslaii` paths from tracked files, close gitignore gaps in AI tool directories so OAuth
tokens and runtime state are never committed, and replace the user-guard function in the macOS
setup script with portable `$HOME`-based derivation. The second stream establishes quality
tooling: a `.pre-commit-config.yaml` wiring ShellCheck + shfmt + gitleaks for local commits, and
a GitHub Actions workflow using `ludeeus/action-shellcheck@2.0.0` for CI.

The hardcoded-path problem is larger than CONTEXT.md anticipated. Beyond the 4 JSON/TOML
configs and the setup script, `macos/zsh/zshrc` has 3 hardcoded paths (pnpm, spicetify,
antigravity), and `codex/config.toml` has 9 project-trust entries plus a hook command — all
hardcoded. The `codex/config.toml` project entries are runtime state (project trust is
machine-specific) and should be gitignored rather than templated. The `zshrc` paths must be
replaced with `$HOME`-based equivalents. The `opencode/` agents directory contains ~30+ markdown
files each referencing `/Users/aslaii/.config/opencode/` — these are GSD framework files that
need systematic `$HOME`-based substitution or should be handled via a different mechanism (see
Open Questions).

**Primary recommendation:** Handle each file category differently — template JSON hook configs,
gitignore runtime TOML state, replace `$HOME` in shell files directly, and investigate whether
opencode agents are generated or hand-maintained before deciding on a strategy.

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** JSON config files with hardcoded `/Users/aslaii` paths (`claude/settings.json`,
  `gemini/settings.json`) should use template files (`.template.json`) that are processed with
  `sed` or `envsubst` during bootstrap to replace `$HOME` placeholders with the actual home
  directory.
- **D-02:** `gemini/projects.json` and `gemini/extensions/extension-enablement.json` are
  runtime-generated files with project-specific absolute paths — these should be added to
  `gemini/.gitignore`, not templated.
- **D-03:** `claude/projects/` subagent metadata files (`.meta.json`) contain session-specific
  absolute paths — these are already gitignored via `claude/.gitignore` `projects/` rule. Verify
  coverage.
- **D-04:** `initial-setup-macos.sh` line 549 hardcodes `/Users/aslaii` in the MCP filesystem
  server command — replace with `$HOME`.
- **D-05:** Create `gemini/.gitignore` excluding OAuth tokens, session state, `projects.json`,
  and extension-enablement files. Use `claude/.gitignore` as reference pattern.
- **D-06:** Create `codex/.gitignore` for any runtime/auth artifacts.
- **D-07:** Audit `opencode/.gitignore` (already exists) for completeness against runtime
  artifacts.
- **D-08:** Verify `claude/.gitignore` `projects/` rule covers all session metadata.
- **D-09:** Remove `ensure_expected_user` function entirely from `initial-setup-macos.sh`.
  Replace with `$HOME`-based and `$(whoami)`-based path derivation throughout the script.
- **D-10:** No confirmation prompt needed — the script should work for any user on any machine
  without asking who they are.
- **D-11:** Create `.pre-commit-config.yaml` with ShellCheck and shfmt hooks for local linting
  on every commit.
- **D-12:** Create GitHub Actions workflow (`.github/workflows/shellcheck.yml`) using
  `ludeeus/action-shellcheck` for CI on push/PR.
- **D-13:** Add `shfmt` to `BREW_FORMULAE` array in setup script (or Brewfile when Phase 2
  creates it — for now, add to the script array).
- **D-14:** Harden `initial-setup.sh` (Linux) with `set -euo pipefail` to match macOS script's
  error handling.

### Claude's Discretion

- shfmt configuration (indent style, binary ops) — match existing code conventions
- Exact `.gitignore` patterns for `gemini/` and `codex/` — inspect runtime artifacts and exclude
  appropriately
- Whether to use `envsubst` vs `sed` for template processing — either is fine, pick the simpler
  approach

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| SEC-01 | All tracked files contain no hardcoded absolute user paths (`/Users/aslaii`) | Path audit completed; 26 occurrences across 8 files plus ~30+ opencode agents |
| SEC-02 | `gemini/` directory has a dedicated `.gitignore` excluding OAuth tokens and session state | gemini/ runtime artifacts enumerated; `claude/.gitignore` reference pattern identified |
| SEC-03 | `opencode/` and `codex/` directories audited for gitignore completeness | `opencode/.gitignore` exists but incomplete; `codex/` has no `.gitignore` — `config.toml` project entries are runtime state that must be gitignored |
| SEC-04 | `ensure_expected_user` replaced with portable approach | Function located at line 85-95; called at line 618; removal + `$HOME` approach documented |
| SEC-05 | Pre-commit secret detection hook (gitleaks or trufflehog) configured | gitleaks v8.30.1 available via brew; pre-commit hook YAML documented |
| QUAL-01 | ShellCheck CI runs on all `.sh` files via GitHub Actions | `ludeeus/action-shellcheck@2.0.0` confirmed; workflow YAML pattern documented |
| QUAL-02 | `shfmt` added to BREW_FORMULAE and wired as pre-commit hook | shfmt v3.13.0 in brew; `scop/pre-commit-shfmt@v3.13.0-1` is current hook rev |
| QUAL-03 | `.pre-commit-config.yaml` created with ShellCheck + shfmt hooks | `koalaman/shellcheck-precommit@v0.11.0` and `scop/pre-commit-shfmt@v3.13.0-1` hooks documented |
| QUAL-04 | `initial-setup.sh` (Linux) hardened with `set -euo pipefail` | File starts with `set -e` only; needs `set -euo pipefail` replacement |
</phase_requirements>

---

## Project Constraints (from CLAUDE.md)

These directives from `CLAUDE.md` are binding constraints that plans MUST respect:

| Directive | Impact on this phase |
|-----------|---------------------|
| Conventional commits: `type(scope): subject` | All commits must follow format |
| Shell scripts target Bash; begin with `#!/usr/bin/env bash` | Preserved in all shell edits |
| Idempotency: all setup operations must be safe to rerun | Template processing in bootstrap must be guarded (check-before-write) |
| `set -euo pipefail` convention (macOS script) | Linux script must match |
| No secrets in repo | Exactly the goal of SEC-02/03/05 |
| Symlink-based approach: no mandatory extra dependencies | pre-commit and shfmt install via Homebrew (existing mechanism); no new mandatory runtime deps |

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| ShellCheck | 0.11.0 | Shell script linting | De-facto standard; already in `BREW_FORMULAE`; already installed locally |
| shfmt | 3.13.0 | Shell script formatting | Latest stable (March 2026); first version with Zsh parser — directly needed for `.zshrc` |
| pre-commit | 4.5.1 | Git hook framework | Manages multiple hooks, pins versions, no manual `.git/hooks/` maintenance |
| gitleaks | 8.30.1 | Secret detection in git history/staged | Audits for committed credentials; fast Go binary; Homebrew available |
| ludeeus/action-shellcheck | 2.0.0 | GitHub Actions CI for ShellCheck | Official action; integrates with GH PR checks |
| envsubst | 1.0 (gettext) | Template variable substitution in JSON configs | Already installed (`/opt/homebrew/bin/envsubst`); simpler than sed for `$VAR` replacement |

### Supporting
| Library / Tool | Version | Purpose | When to Use |
|----------------|---------|---------|-------------|
| koalaman/shellcheck-precommit | v0.11.0 | pre-commit hook for ShellCheck | In `.pre-commit-config.yaml` |
| scop/pre-commit-shfmt | v3.13.0-1 | pre-commit hook for shfmt | In `.pre-commit-config.yaml`; uses prebuilt upstream binary |
| gitleaks/gitleaks (pre-commit) | v8.30.1 | pre-commit hook for secret detection | In `.pre-commit-config.yaml` |

**Installation (additions to BREW_FORMULAE in `initial-setup-macos.sh`):**
```bash
"shfmt"
"pre-commit"
"gitleaks"
```

Note: `shellcheck` is already in `BREW_FORMULAE` (line 39). Do not add a duplicate.

**Post-install hook initialization:**
```bash
pre-commit install   # run once after cloning the repo
```

This should be added to the setup script's main() flow after `install_formulae`.

---

## Architecture Patterns

### Pattern 1: Template JSON Config Files (D-01)

**What:** For JSON files that tools read directly from disk (Claude Code hooks, Gemini hooks),
the repo stores a `.template.json` source. The bootstrap script processes it with `envsubst`
to write the live `.json` in the correct location — which is already symlinked to where the
tool reads it.

**When to use:** When the tool reads the config directly and the path must be absolute at
read time (not expandable by the tool itself).

**Example — claude/settings.template.json:**
```json
{
  "hooks": {
    "SessionStart": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "node \"$HOME/.claude/hooks/gsd-check-update.js\""
          }
        ]
      }
    ]
  }
}
```

**Bootstrap processing (idempotent):**
```bash
process_json_templates() {
  local templates=(
    "${DOTFILES_DIR}/claude/settings.template.json:${DOTFILES_DIR}/claude/settings.json"
    "${DOTFILES_DIR}/gemini/settings.template.json:${DOTFILES_DIR}/gemini/settings.json"
  )
  local spec src dst
  for spec in "${templates[@]}"; do
    src="${spec%%:*}"
    dst="${spec##*:}"
    if [[ -f "$src" ]]; then
      envsubst < "$src" > "$dst"
      log "Processed template: $src -> $dst"
    fi
  done
}
```

**`envsubst` is preferred over `sed`** because:
- Already available (`/opt/homebrew/bin/envsubst`)
- Handles `$HOME`, `$USER`, `$DOTFILES_DIR` without escaping issues
- One command, no regex needed

**IMPORTANT — gitignore the generated files:** `claude/settings.json` and
`gemini/settings.json` must be added to their respective `.gitignore` files once templates
exist. The `.template.json` files become the versioned source of truth.

### Pattern 2: Gitignore Runtime State (D-02, D-03, D-06)

**What:** Files that tools generate at runtime with machine-specific absolute paths (project
trust entries, OAuth tokens, session state) are gitignored, not templated. They are
regenerated on each machine by the tool itself or via bootstrap steps.

**`gemini/.gitignore` — new file (reference: `claude/.gitignore`):**
```gitignore
# Gemini CLI runtime artifacts — do not version-control
antigravity/
antigravity-browser-profile/
extensions/extension-enablement.json
google_accounts.json
gsd-file-manifest.json
history/
installation_id
oauth_creds.json
projects.json
state.json
themes/
tmp/
trustedFolders.json

# Auth / credentials
.env
.credentials.json
```

**`codex/.gitignore` — new file:**
```gitignore
# Codex CLI runtime artifacts — do not version-control
# Project trust entries are machine-specific; regenerated by Codex
config.toml

# If a config.template.toml is added later, track that instead
```

Wait — see **Open Questions** before gitignoring `codex/config.toml` entirely. The file
also contains non-path settings (model, features, agents, hooks). The better approach is
to gitignore only the project trust section or to move those settings into a separate
runtime file. See Architecture Patterns > Pattern 3 for the resolution.

### Pattern 3: Split codex/config.toml (D-06, SEC-01)

`codex/config.toml` mixes two concerns:
1. **Static settings** — model, features flags, agents, hooks (versioned, no absolute paths except the hook command)
2. **Runtime project trust entries** — 9 `[projects."/Users/aslaii/..."]` sections (machine-specific absolute paths)

**Recommended approach:** gitignore `codex/config.toml` and create
`codex/config.template.toml` with the static settings plus the one hook command using
`$HOME` substitution. The bootstrap script processes it with `envsubst` (same Pattern 1
mechanism). Project trust entries are user-added at runtime by Codex itself — not tracked.

```toml
# codex/config.template.toml (versioned)
model = "gpt-5.4"
model_reasoning_effort = "high"
# ... all static settings ...

[[hooks]]
event = "SessionStart"
command = "node $HOME/.codex/get-shit-done/hooks/gsd-update-check.js"

# Project trust entries NOT included — Codex generates these at runtime
```

### Pattern 4: Direct `$HOME` Substitution in Shell Files

**What:** `macos/zsh/zshrc` has 3 hardcoded paths. These are shell files that are sourced
by Zsh — variable expansion happens at source time, so `$HOME` works directly.

**Lines to fix (lines 112, 119, 122):**
```bash
# Before
export PNPM_HOME="/Users/aslaii/Library/pnpm"
export PATH=$PATH:/Users/aslaii/.spicetify
export PATH="/Users/aslaii/.antigravity/antigravity/bin:$PATH"

# After
export PNPM_HOME="$HOME/Library/pnpm"
export PATH=$PATH:"$HOME/.spicetify"
export PATH="$HOME/.antigravity/antigravity/bin:$PATH"
```

### Pattern 5: Removing `ensure_expected_user` (D-09)

**Function location:** Lines 85–95 of `initial-setup-macos.sh`
**Call site:** Line 618 in `main()`

**Removal is straightforward:** Delete the function body and remove its call from `main()`.
The rest of the script already derives paths from `$HOME` (via `DOTFILES_DIR="${DOTFILES_DIR:-$HOME/dotfiles}"`).
The MCP server command (line 549) only needs `$HOME` substituted — that single line is the
only other hardcoded path in the script.

### Pattern 6: `.pre-commit-config.yaml` Structure (D-11)

```yaml
repos:
  - repo: https://github.com/koalaman/shellcheck-precommit
    rev: v0.11.0
    hooks:
      - id: shellcheck
        args: [--severity=warning, --external-sources]

  - repo: https://github.com/scop/pre-commit-shfmt
    rev: v3.13.0-1
    hooks:
      - id: shfmt
        args: [--write, --indent=2, --case-indent]

  - repo: https://github.com/gitleaks/gitleaks
    rev: v8.30.1
    hooks:
      - id: gitleaks
```

**shfmt args rationale:** `--indent=2` matches existing 2-space indentation in both setup
scripts. `--case-indent` indents case branches, matching existing style. Do NOT add
`--simplify` (`-s`) — scop/pre-commit-shfmt removed it as default in v3.12.0-2 because it
causes false positives.

**shellcheck args rationale:** `--external-sources` follows `source` directives across
files (matches the existing `shellcheck -x` convention from AGENTS.md). `--severity=warning`
avoids failing on style-only findings.

### Pattern 7: GitHub Actions Workflow (D-12)

```yaml
# .github/workflows/shellcheck.yml
name: ShellCheck

on:
  push:
    branches: ["**"]
    paths:
      - "**.sh"
  pull_request:
    paths:
      - "**.sh"

jobs:
  shellcheck:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: ludeeus/action-shellcheck@2.0.0
        with:
          severity: warning
```

**Why `paths` filter:** Avoid running CI on every push unrelated to shell files. Given this
is a dotfiles repo, most commits touch config files, not shell scripts.

### Anti-Patterns to Avoid

- **Templating runtime state files:** `gemini/projects.json`, `gemini/extensions/extension-enablement.json`,
  codex project trust entries — these must be gitignored, not templated. Templating them
  creates a false sense of portability; they get overwritten by the tool on first run anyway.
- **Using `sed -i` for JSON template processing:** `sed -i` behaves differently on macOS
  (`-i ''`) vs Linux (`-i`). Use `envsubst` for consistent cross-platform output.
- **Committing generated JSON after template processing:** Once `.template.json` files exist,
  the generated `.json` files become machine-specific — they must be gitignored immediately.
- **Adding `shfmt` hook to auto-fix without `--write`:** Without `--write`, shfmt exits
  non-zero without modifying files, which confuses developers. Use `--write` so the hook
  fixes files in place, then git re-stages.
- **Running ShellCheck on `.zshrc` without directive:** zshrc uses zsh-isms that ShellCheck
  flags as errors under default (bash) parsing. Add `# shellcheck shell=bash` or configure
  the hook to skip `.zshrc` files, OR use `--shell=bash` only for `.sh` files.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Secret detection in commits | Custom grep for API key patterns | gitleaks | Entropy analysis, regex rules, 200+ built-in detectors, maintained ruleset |
| Shell script formatting | Manual style guide + reviews | shfmt | Deterministic AST-based formatter; no ambiguity about indent/spacing |
| Shell script linting | Manual review for quoting bugs | ShellCheck | Catches SC2 quoting rules, deprecated constructs, portability issues silently missed in review |
| Git hook installation | Symlink scripts to `.git/hooks/` manually | pre-commit framework | Versions hooks, manages virtual envs per hook, works across team members |
| CI shell linting | Write custom bash to iterate `.sh` files | ludeeus/action-shellcheck | Handles file discovery, exit codes, GH annotations, maintainer support |
| JSON variable substitution | Custom sed pipeline | envsubst | Single command, handles all `$VAR` and `${VAR}` patterns, no escaping edge cases |

---

## Runtime State Inventory

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | None — this phase doesn't rename stored data keys | None |
| Live service config | None — no external services reference these local paths | None |
| OS-registered state | None — no Task Scheduler/launchd entries | None |
| Secrets/env vars | None — path changes don't affect secret key names | None |
| Build artifacts | `opencode/node_modules/` (gitignored), `opencode/cache/` (gitignored) | None — already excluded |

**Note:** This is a path-replacement phase, not a rename phase. The string `/Users/aslaii` appears in file content as a path, not as a stored identity. No data migration is required — only file content changes and gitignore additions.

---

## Common Pitfalls

### Pitfall 1: Generated JSON Conflicts After Template Creation

**What goes wrong:** Developer creates `claude/settings.template.json`, runs bootstrap,
which writes `claude/settings.json`. The generated file now differs from the tracked file.
Git shows `claude/settings.json` as modified, and the next commit accidentally captures the
generated (machine-specific) version.

**Why it happens:** Forgetting to add the generated JSON to `.gitignore` at the same time
as creating the template.

**How to avoid:** In the same commit that creates `*.template.json`, add the generated
filename to the corresponding `.gitignore`. This is an atomic change — template creation +
gitignore update must be one commit.

**Warning signs:** `git status` shows the generated `.json` as modified immediately after
running bootstrap.

### Pitfall 2: envsubst Substitutes More Than Intended

**What goes wrong:** `envsubst < template.json > output.json` substitutes ALL `$VAR` and
`${VAR}` patterns in the template, including any JSON values that happen to look like env
var references (e.g., `"$schema"` in some JSON formats).

**Why it happens:** envsubst substitutes every shell variable reference by default.

**How to avoid:** Use `envsubst '$HOME $USER'` (with the variable list argument) to limit
substitution to only the variables you intend. For JSON files, this is safe:
```bash
envsubst '$HOME' < settings.template.json > settings.json
```

**Warning signs:** Output JSON contains empty strings where env var references existed in
non-path fields.

### Pitfall 3: ShellCheck Treats `.zshrc` as Bash

**What goes wrong:** ShellCheck exits non-zero on `macos/zsh/zshrc` because it uses
zsh-specific syntax (`setopt`, `autoload`, `typeset`, Zinit DSL) that ShellCheck doesn't
understand under bash mode.

**Why it happens:** ShellCheck defaults to `--shell=bash` when no shebang is present.
`.zshrc` has no shebang.

**How to avoid:** Exclude `.zshrc` and other pure-zsh files from the ShellCheck hook and
CI workflow. In `.pre-commit-config.yaml`:
```yaml
- id: shellcheck
  args: [--severity=warning, --external-sources]
  exclude: "macos/zsh/.*"
```
In GitHub Actions, use `ignore_paths: macos/zsh` input.

### Pitfall 4: pre-commit Hooks Run on Zsh Config Files via shfmt

**What goes wrong:** shfmt runs on `.zshrc`, encounters Zsh-specific syntax (process
substitutions `=(...)`, `{}` expansion forms), and exits non-zero.

**Why it happens:** shfmt v3.13.0 added a Zsh parser but it's opt-in (`--language-dialect zsh`).
The default hook doesn't pass this flag for files without a shebang.

**How to avoid:** The `scop/pre-commit-shfmt` hook excludes files without recognizable shell
shebangs by default. Verify `macos/zsh/zshrc` doesn't have a `#!/...bash` or `#!/...sh`
shebang (it doesn't — safe). If shfmt still picks it up, add an explicit exclude.

### Pitfall 5: gitleaks False Positive on Historical Commits

**What goes wrong:** Running `gitleaks git` on a repo with a long history flags old commits
that contained `/Users/aslaii` paths as "secrets" depending on gitleaks rule matching.

**Why it happens:** gitleaks detects patterns, not just credentials. Some path patterns can
match credential rules.

**How to avoid:** Use the `gitleaks` pre-commit hook with `--staged` flag only (default in
the pre-commit hook). This checks only what's about to be committed, not history. If false
positives occur, add a `.gitleaks.toml` with an `[allowlist]` rule.

### Pitfall 6: opencode Agents Have ~30+ Hardcoded Paths — Scope Creep Risk

**What goes wrong:** The full grep of tracked files found `opencode/agents/*.md` and
`opencode/command/*.md` files contain `/Users/aslaii/.config/opencode/` paths on hundreds of
lines. Fixing these naively would touch 30+ files and risk breaking GSD framework behavior.

**Why it happens:** These are GSD framework agent instructions that reference tool paths
directly. They may be generated by the GSD installer rather than hand-maintained.

**How to avoid:** Treat this as a separate sub-decision — see Open Questions #1. Do NOT
attempt to bulk-replace these in Phase 1 without confirming the right strategy.

---

## Code Examples

### envsubst Template Processing (verified pattern)
```bash
# Source: envsubst man page / gettext docs
# Substitute only $HOME to avoid touching other $ references in JSON
envsubst '$HOME' < "${DOTFILES_DIR}/claude/settings.template.json" \
  > "${DOTFILES_DIR}/claude/settings.json"
```

### ensure_expected_user Removal (current function for reference)
```bash
# Lines 85-95 of initial-setup-macos.sh — DELETE THIS ENTIRE FUNCTION:
ensure_expected_user() {
  local expected_user="aslaii"
  local current_user
  current_user="$(id -un)"
  if [[ "$current_user" != "$expected_user" ]]; then
    die "This script must be run as ${expected_user}. Current user: ${current_user}"
  fi
  log "Running as expected user ${expected_user}."
}
# Also DELETE the call at line 618: ensure_expected_user
```

### MCP Server Fix (line 549)
```bash
# Before
[filesystem]="npx -y @modelcontextprotocol/server-filesystem /Users/aslaii"
# After
[filesystem]="npx -y @modelcontextprotocol/server-filesystem $HOME"
```

### zshrc PATH fixes (lines 112, 119, 122)
```bash
# Before
export PNPM_HOME="/Users/aslaii/Library/pnpm"
export PATH=$PATH:/Users/aslaii/.spicetify
export PATH="/Users/aslaii/.antigravity/antigravity/bin:$PATH"

# After
export PNPM_HOME="$HOME/Library/pnpm"
export PATH=$PATH:"$HOME/.spicetify"
export PATH="$HOME/.antigravity/antigravity/bin:$PATH"
```

### initial-setup.sh Hardening (line 3)
```bash
# Before
set -e

# After
set -euo pipefail
```

### pre-commit Installation in Bootstrap
```bash
# Add to initial-setup-macos.sh main() after install_formulae:
install_pre_commit_hooks() {
  if command -v pre-commit >/dev/null 2>&1; then
    if [[ -f "${DOTFILES_DIR}/.pre-commit-config.yaml" ]]; then
      log "Installing pre-commit hooks..."
      (cd "${DOTFILES_DIR}" && pre-commit install)
    fi
  else
    warn "pre-commit not found; skipping hook installation."
  fi
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `brew bundle` required tap `Homebrew/homebrew-bundle` | `brew bundle` is built-in to Homebrew 4.x | ~2023 | Remove tap reference from BREW_TAPS if present |
| shfmt had no Zsh support | shfmt v3.13.0 adds Zsh parser | March 2026 | Can now format `.zshrc` files; use `--language-dialect zsh` opt-in |
| pre-commit 2.x | pre-commit 4.5.1 | 2025 | Config format unchanged; no migration needed |

**Deprecated/outdated:**
- `homebrew/cask-fonts` tap: deprecated — cask fonts are now in Homebrew core. Remove from
  `BREW_TAPS` array (line 14). This is in scope as a quality-of-life fix while the setup
  script is already being edited.

---

## Open Questions

1. **opencode agents: generated or hand-maintained?**
   - What we know: `opencode/agents/*.md` and `opencode/command/*.md` contain ~30+ files each
     with dozens of `/Users/aslaii/.config/opencode/` hardcoded paths (total ~350+ occurrences)
   - What's unclear: Are these files generated by the GSD installer (which would regenerate
     them on each install with the correct home path), or are they manually maintained and
     must be edited in place?
   - Recommendation: Before Phase 1 execution, check if the GSD installer has a
     `generate` or `install` command that produces these files. If generated: gitignore
     `opencode/agents/` and `opencode/command/` and add regeneration to bootstrap. If
     hand-maintained: either do a bulk sed replace across all files (touching ~30 files),
     or gitignore them and document a bootstrap-time generation step. **Do not leave
     these hardcoded paths committed** — they will fail SEC-01 verification.

2. **claude/settings.json and gemini/settings.json: gitignore the generated files?**
   - What we know: Decision D-01 says use templates; templates become the tracked version
   - What's unclear: Claude Code reads `settings.json` directly. If we gitignore
     `settings.json` and a user clones fresh without running bootstrap, Claude Code will
     have no settings (missing hooks, no statusLine). The bootstrap must process templates
     before the user's first tool launch.
   - Recommendation: Document this bootstrap requirement prominently in setup script output.
     Add a check in the bootstrap that verifies generated files exist before finishing.

3. **codex/config.toml: gitignore entire file vs. partial?**
   - What we know: File mixes static (model settings, agents, hooks) and runtime (project
     trust entries, hook command path). TOML doesn't support `!include` for splitting.
   - What's unclear: Whether Codex supports a separate config file for project trust, or
     if it merges multiple config files.
   - Recommendation: Use Pattern 3 (template the whole file, gitignore the generated
     version). Project trust entries are user-added by Codex at runtime — they won't be
     in the template, and Codex will re-add them after first launch.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| ShellCheck | QUAL-01, QUAL-03 | Yes | 0.11.0 | — |
| shfmt | QUAL-02, QUAL-03 | No | — | `brew install shfmt` (in scope D-13) |
| pre-commit | QUAL-03 | No | — | `brew install pre-commit` (in scope D-11/D-13) |
| gitleaks | SEC-05 | No | — | `brew install gitleaks` (in scope) |
| envsubst | D-01 template processing | Yes | 1.0 (gettext) | sed fallback (more complex) |
| git | All | Yes | system | — |
| GitHub Actions runner | QUAL-01 | Yes (after `.github/` created) | ubuntu-latest | — |

**Missing dependencies with no fallback:** None — all missing tools are installed as part of
this phase via BREW_FORMULAE additions.

**Missing dependencies with fallback:** None blocking.

---

## Sources

### Primary (HIGH confidence)
- `initial-setup-macos.sh` — Direct source inspection; line numbers verified
- `claude/settings.json`, `gemini/settings.json`, `codex/config.toml` — Direct source inspection; all `/Users/aslaii` occurrences catalogued
- `macos/zsh/zshrc` lines 112, 119, 122 — Direct source inspection
- `claude/.gitignore` — Reference pattern for new gitignore files
- `opencode/.gitignore` — Existing file; confirmed incomplete (missing many gemini-style runtime artifacts)
- Brew local: shfmt 3.13.0, pre-commit 4.5.1, gitleaks 8.30.1 — `brew info` verified
- ShellCheck 0.11.0 — `shellcheck --version` on local machine
- envsubst 1.0 — `envsubst --version` on local machine
- `.planning/config.json` — `nyquist_validation: false` confirmed; Validation Architecture section omitted

### Secondary (MEDIUM confidence)
- [koalaman/shellcheck-precommit](https://github.com/koalaman/shellcheck-precommit) — v0.11.0 latest tag verified via WebFetch
- [scop/pre-commit-shfmt](https://github.com/scop/pre-commit-shfmt) — v3.13.0-1 latest tag verified via WebFetch (March 23, 2026)
- [ludeeus/action-shellcheck releases](https://github.com/ludeeus/action-shellcheck/releases) — v2.0.0 latest verified via WebFetch
- [gitleaks/gitleaks tags](https://github.com/gitleaks/gitleaks/tags) — v8.30.1 latest verified via WebFetch (March 12, 2026)
- [gitleaks pre-commit hooks yaml](https://github.com/gitleaks/gitleaks/blob/master/.pre-commit-hooks.yaml) — hook ID and args verified

### Tertiary (LOW confidence)
- None

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all versions verified against local brew and official GitHub tags
- Architecture: HIGH — based on direct codebase inspection; all file paths and line numbers verified
- Pitfalls: HIGH — based on direct inspection of file formats, tool behavior docs, and confirmed envsubst behavior
- Open questions: MEDIUM — opencode agents strategy requires confirmation of GSD installer behavior before execution

**Research date:** 2026-03-30
**Valid until:** 2026-04-30 (tools are stable; pre-commit hook revs update with tool releases)
