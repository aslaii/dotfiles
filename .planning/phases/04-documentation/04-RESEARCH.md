# Phase 4: Documentation - Research

**Researched:** 2026-03-31
**Domain:** Markdown documentation for a personal dotfiles repository
**Confidence:** HIGH

## Summary

Phase 4 is a pure documentation phase. All four deliverables (root README.md, yabai/README.md, setups/README.md, and skills system docs) are new markdown files with no code changes required. The primary research task is inventorying what exists in the codebase so documentation is accurate rather than aspirational.

The codebase has been fully audited. All source material exists and is stable: `emit_symlink_map()` provides the canonical symlink list, `skhd/skhdrc` has clearly commented keybinding sections, `setups/functions.sh` exposes three utility functions, and two skill examples (`fullstack-bridge`, `react-native`) demonstrate the convention. No ambiguity remains about what to document.

**Primary recommendation:** Write each README as a standalone, self-contained document. Cross-reference CLAUDE.md and AGENTS.md where appropriate but never duplicate their content. Use `emit_symlink_map()` output as the single source of truth for the symlink table.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Single comprehensive README.md at repo root with a table of contents. No multi-file documentation split.
- **D-02:** Required sections: Quick Start, Full Symlink Map, Environment Flags Reference, Tool Overview, Skills System Overview, Drift Check usage.
- **D-03:** Static markdown, manually maintained. No auto-generation from script data.
- **D-04:** The symlink map table must match `emit_symlink_map()` output exactly.
- **D-05:** Create `yabai/README.md` with step-by-step SIP disable procedure including exact terminal commands. Do not rely on external links.
- **D-06:** Document the scripting-addition sudoers entry needed for yabai.
- **D-07:** Include yabai + skhd keybinding overview.
- **D-08:** Create `setups/README.md` documenting the role-script system.
- **D-09:** Each role script gets a one-line purpose + prerequisites description.
- **D-10:** Include "Adding a new role script" section with minimal template.
- **D-11:** Document skills convention in a dedicated section of root README.
- **D-12:** Reference `skills/fullstack-bridge/SKILL.md` as the canonical example.
- **D-13:** Document how skills are invoked and discovered.
- **D-14:** Include Neovim plugin upgrade workflow section (satisfies NVIM-02 deferral from Phase 2).

### Claude's Discretion
- Exact markdown formatting, heading levels, and table alignment
- Whether to include badges in the README header
- Level of detail in the tool overview section
- Whether skhd keybindings are listed as a table or code block

### Deferred Ideas (OUT OF SCOPE)
None
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| DOC-01 | Root `README.md` with bootstrap instructions, symlink map, and env flag reference | `emit_symlink_map()` (lines 198-226 of bootstrap) provides exact symlink pairs; env flags `SKETCHYBAR`, `DOTFILES_DIR`, `CONFIG_VARIANT` documented in script header; `dotcheck` alias in `aliases.zsh` line 9; `--check` mode at line 630 |
| DOC-02 | `yabai/README.md` with SIP disable procedure and scripting-addition sudoers entry | `yabairc` is minimal config with no scripting-addition required currently; `skhdrc` has clear keybinding sections with comment headers; SIP procedure is standard yabai documentation |
| DOC-03 | `setups/` scripts documented with shared `functions.sh` contract | `functions.sh` has 3 functions: `switch_github_account`, `kill_port`, `nvm_use_project_node`; 6 role scripts exist: `auto_setup.sh`, `dotconfig_setup.sh`, `gondoor_setup.sh`, `goose_setup.sh`, `lsp_setup.sh`, `rave_setup.sh` |
| DOC-04 | Skills system convention documented | Two skill locations: `skills/` (repo-global, 1 skill) and `claude/skills/` (Claude-specific, 2 skills); `SKILL.md` uses YAML frontmatter with `name` and `description` fields; `references/` subdirectory convention |
</phase_requirements>

## Architecture Patterns

### Documentation Structure
```
dotfiles/
├── README.md              # NEW — root documentation (DOC-01, DOC-04, D-14)
├── yabai/README.md        # NEW — yabai-specific docs (DOC-02)
├── setups/README.md       # NEW — role-script docs (DOC-03)
├── CLAUDE.md              # EXISTING — cross-referenced, not duplicated
├── AGENTS.md              # EXISTING — cross-referenced, not duplicated
└── GEMINI.md              # EXISTING — cross-referenced, not duplicated
```

### Pattern: Cross-Reference, Don't Duplicate
CLAUDE.md already contains a Directory Map table and tool descriptions. AGENTS.md documents shell conventions. The root README should reference these files for details rather than copy content that will drift.

### Pattern: Source-of-Truth Alignment
The symlink map in README.md must match `emit_symlink_map()`. Since D-03 specifies static markdown (no auto-generation), the table should be written once by reading the function output and formatted as a markdown table. A comment or note in the README should indicate the source of truth is `emit_symlink_map()` so future editors know to update both.

### Anti-Patterns to Avoid
- **Duplicating CLAUDE.md content:** The README and CLAUDE.md serve different audiences. README is for humans setting up a machine; CLAUDE.md is for AI assistants. Do not copy tool descriptions between them.
- **Linking to external docs for critical procedures:** D-05 explicitly prohibits relying on external links for the SIP disable procedure. Include the full procedure inline.
- **Over-documenting config options:** The yabai/skhd keybinding reference should be a quick-reference summary, not a restatement of every line in the config files.

## Source Material Inventory

### emit_symlink_map() Output (for DOC-01 symlink table)

The function produces pipe-delimited `source|target` pairs. Based on code analysis:

| Source (in repo) | Target (on system) |
|------------------|--------------------|
| `macos/zsh/zshrc` | `~/.zshrc` |
| `macos/zsh/zsh/` | `~/.zsh` |
| `tmux/tmux.conf` | `~/.tmux.conf` |
| `codex/AGENTS.md` | `~/AGENTS.md` |
| `ghostty/config` | `~/Library/Application Support/com.mitchellh.ghostty/config` |
| `codex/` | `~/.config/codex` |
| `yabai/` | `~/.config/yabai` |
| `skhd/` | `~/.config/skhd` |
| `opencode/` | `~/.config/opencode` |
| `claude/` | `~/.claude` |
| `sketchybar/` | `~/.config/sketchybar` (conditional on `SKETCHYBAR=true`) |
| `nvim/` | `~/.config/nvim` |

Note: `gemini/` directory exists in the repo but is NOT in `emit_symlink_map()` -- it is not symlinked. The README table must reflect what the function actually produces.

### Environment Flags (for DOC-01 flags reference)

| Flag | Default | Purpose |
|------|---------|---------|
| `DOTFILES_DIR` | `$HOME/dotfiles` | Location of the cloned dotfiles repo |
| `CONFIG_VARIANT` | `macos` | Selects which zshrc variant to link (used by `resolve_config_path`) |
| `SKETCHYBAR` | `true` | Whether to install SketchyBar support and create its symlink |

### skhd Keybindings (for DOC-02)

From `skhd/skhdrc`, organized by category:

| Category | Modifier | Keys | Action |
|----------|----------|------|--------|
| Focus | `alt` | `h/j/k/l` | Focus window west/south/north/east |
| Swap | `shift+alt` | `h/j/k/l` | Swap window with neighbor |
| Resize | `ctrl+alt` | `h/j/k/l` | Resize window by 120px |
| Balance | `ctrl+alt` | `e` | Balance space layout |
| Float | `alt` | `space` | Toggle float |
| Fullscreen | `alt` | `f` | Toggle zoom-fullscreen |
| Reload | `alt` | `r` | Restart yabai + reload skhd |
| Terminal | `cmd` | `return` | Launch Ghostty |

### functions.sh Contract (for DOC-03)

| Function | Parameters | Purpose |
|----------|------------|---------|
| `switch_github_account` | `account_name`, `git_name`, `git_email` | Switch active GitHub CLI account and set git config |
| `kill_port` | `port_number` | Kill process listening on a TCP port |
| `nvm_use_project_node` | `directory` | Read `.nvmrc` or `package.json` engines and switch Node version |

### Role Scripts (for DOC-03)

| Script | Purpose |
|--------|---------|
| `auto_setup.sh` | Creates a tmux session named "Just Setup" |
| `dotconfig_setup.sh` | Creates a tmux session for dotconfig editing |
| `gondoor_setup.sh` | Gondoor project bootstrap (uses `functions.sh`) |
| `goose_setup.sh` | Goose project bootstrap (uses `functions.sh`) |
| `lsp_setup.sh` | Installs global CLI tools (LSPs, linters) |
| `rave_setup.sh` | Rave/Mobii project bootstrap (uses `functions.sh`) |

### Skills System (for DOC-04)

Two skill locations:
1. **`skills/`** (repo root) -- repo-global skills, usable by any AI assistant
   - `fullstack-bridge/` -- NestJS + React/RN synchronization
2. **`claude/skills/`** -- Claude Code-specific skills
   - `react-native/` -- Expo Router, TanStack Query, Zustand patterns
   - `pr-standards/` -- PR size limits, branch naming, review rules

SKILL.md format:
```yaml
---
name: skill-name
description: One-line description of when to use this skill.
---
```

Convention: Each skill has `SKILL.md` (index) and `references/` subdirectory with detailed rule files.

Invocation: `/skill <name>` in Claude Code.

### Neovim Plugin Workflow (for D-14)

From `nvim/AGENTS.md`:
1. Run `:Lazy update` in Neovim
2. Commit `nvim/lazy-lock.json` in the same commit as any spec change
3. Verify with `:Lazy sync` and `:checkhealth`

## Common Pitfalls

### Pitfall 1: Symlink Table Drift
**What goes wrong:** README symlink map gets out of sync with `emit_symlink_map()` after future changes.
**Why it happens:** D-03 mandates static markdown, so there is no auto-sync mechanism.
**How to avoid:** Add a comment in the README noting the source of truth. The planner should include a note in the "Symlink Map" section header referencing `emit_symlink_map()`.
**Warning signs:** `dotcheck` reports unexpected symlinks not listed in README.

### Pitfall 2: SIP Procedure Version Sensitivity
**What goes wrong:** SIP disable steps change between macOS versions. Instructions written for one version may not work on another.
**Why it happens:** Apple occasionally changes the recovery mode workflow.
**How to avoid:** Document the procedure for Apple Silicon Macs (current hardware) and note that Intel Macs have a different procedure. Include the macOS version the instructions were tested against.
**Warning signs:** User reports "option not found" in recovery mode.

### Pitfall 3: yabairc Does Not Require Scripting Addition
**What goes wrong:** Documentation implies scripting addition is required, but the current `yabairc` uses only standard yabai commands (no `yabai -m signal` or space manipulation that requires SA).
**Why it happens:** D-06 says to document the SA sudoers entry, which is correct for future expansion. The docs should clarify that the current config works without SA, but SA enables advanced features.
**How to avoid:** Frame the SA section as "Optional: Enable Advanced Features" and list what SA unlocks vs. what works without it.

### Pitfall 4: Stale Role Script Descriptions
**What goes wrong:** Role scripts evolve but their one-line descriptions in setups/README.md don't.
**Why it happens:** Documentation is separate from the scripts themselves.
**How to avoid:** Keep descriptions at the purpose level ("bootstrap project X"), not implementation level ("runs npm install and starts server").

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Table of contents | Manual anchor links that break on heading changes | Markdown headings only; GitHub auto-generates a TOC via the file outline button | Manual TOC maintenance is error-prone; GitHub's built-in outline serves the same purpose |

## Code Examples

### README Quick Start Section Pattern
```markdown
## Quick Start

```bash
# Clone the repo
git clone https://github.com/aslaii/dotfiles.git ~/dotfiles

# Run the bootstrap (idempotent — safe to rerun)
bash ~/dotfiles/initial-setup-macos.sh

# Verify symlinks
dotcheck
# or: bash ~/dotfiles/initial-setup-macos.sh --check
```
```

### Symlink Map Table Pattern
```markdown
## Symlink Map

> Source of truth: `emit_symlink_map()` in `initial-setup-macos.sh`

| Repo Directory | Symlink Target | Tool |
|---------------|----------------|------|
| `macos/zsh/zshrc` | `~/.zshrc` | Zsh config |
| ...
```

### Skills System Documentation Pattern
```markdown
## Skills System

Skills provide structured guidance for AI coding assistants.

### Directory Structure
- `skills/` — repo-global skills (any AI assistant)
- `claude/skills/` — Claude Code-specific skills

### Creating a New Skill
1. Create `skills/<name>/SKILL.md` with YAML frontmatter:
   ```yaml
   ---
   name: my-skill
   description: When to use this skill.
   ---
   ```
2. Add detailed rules in `skills/<name>/references/`
3. See `skills/fullstack-bridge/SKILL.md` for a complete example
```

## Project Constraints (from CLAUDE.md)

- **Conventional Commits**: Documentation commits use `docs(scope): subject`
- **No secrets**: No API keys, credentials, or sensitive data in any committed file
- **No AI watermarks**: No `Co-Authored-By: Claude` or similar attribution in commits
- **Security**: Never document actual secret values; reference keychain or `.env` patterns only

## Open Questions

1. **Table of Contents approach**
   - What we know: D-01 says "table of contents" but GitHub renders a built-in outline for any markdown file
   - What's unclear: Whether user wants an explicit inline TOC or relies on GitHub's outline
   - Recommendation: Include a brief inline TOC with anchor links for the root README since it will be long. This is Claude's discretion per CONTEXT.md.

2. **yabai SIP procedure for Intel vs. Apple Silicon**
   - What we know: User's machine is Apple Silicon (Darwin arm64 detected). SIP disable differs between architectures.
   - What's unclear: Whether to document both procedures
   - Recommendation: Document Apple Silicon only (current hardware). Add a one-line note that Intel Macs differ. This keeps the docs focused.

## Environment Availability

Step 2.6: SKIPPED (no external dependencies identified). This is a documentation-only phase producing markdown files.

## Sources

### Primary (HIGH confidence)
- `initial-setup-macos.sh` lines 198-226 -- `emit_symlink_map()` function, canonical symlink list
- `initial-setup-macos.sh` lines 3-9 -- environment flag defaults
- `initial-setup-macos.sh` lines 629-634 -- `--check` mode entry point
- `macos/zsh/zsh/aliases.zsh` line 9 -- `dotcheck` alias definition
- `skhd/skhdrc` -- full keybinding definitions with comment headers
- `yabai/yabairc` -- minimal config, no scripting-addition required
- `setups/functions.sh` -- three utility functions with clear signatures
- `skills/fullstack-bridge/SKILL.md` -- canonical skill example with YAML frontmatter
- `claude/skills/react-native/SKILL.md` -- Claude-specific skill example
- `nvim/AGENTS.md` -- Neovim plugin workflow documentation

### Secondary (MEDIUM confidence)
- `AGENTS.md` -- repo conventions for shell scripts and commit style
- `CLAUDE.md` -- project structure overview and directory map

## Metadata

**Confidence breakdown:**
- Source material inventory: HIGH -- all files read and verified directly
- Architecture patterns: HIGH -- straightforward markdown documentation, no complex tooling
- Pitfalls: HIGH -- based on direct code analysis (e.g., SA not required in current yabairc)
- Content accuracy: HIGH -- all data points extracted from actual source files, not assumed

**Research date:** 2026-03-31
**Valid until:** Indefinite (documentation conventions are stable; re-validate only if bootstrap script structure changes)
