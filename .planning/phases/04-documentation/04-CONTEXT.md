# Phase 4: Documentation - Context

**Gathered:** 2026-03-31
**Status:** Ready for planning

<domain>
## Phase Boundary

Document the bootstrap, tools, and skills system so a developer (including future self on a new machine) can understand the full setup, run it, and extend the AI skills system without reading any source code first. Deliverables: root README.md, yabai/README.md, setups/ documentation, and skills system convention documentation.

</domain>

<decisions>
## Implementation Decisions

### Root README (DOC-01)
- **D-01:** Single comprehensive README.md at repo root with a table of contents. No multi-file documentation split — this is a personal dotfiles repo where one file is more discoverable.
- **D-02:** Required sections: Quick Start (one-command bootstrap), Full Symlink Map (directory → target table matching `link_configs()`), Environment Flags Reference (`SKETCHYBAR`, `DOTFILES_DIR`, `CONFIG_VARIANT`), Tool Overview (brief description of each managed tool), Skills System Overview (convention + link to example), Drift Check usage (`--check` flag and `dotcheck` alias).
- **D-03:** Static markdown, manually maintained. No auto-generation from script data — the bootstrap script changes rarely and auto-generation adds complexity without proportional value.
- **D-04:** The symlink map table must match `emit_symlink_map()` output exactly — this is the single source of truth established in Phase 3.

### yabai Documentation (DOC-02)
- **D-05:** Create `yabai/README.md` with step-by-step SIP disable procedure including exact terminal commands. Do not rely on external links to official docs (risk of broken links and version-specific differences).
- **D-06:** Document the scripting-addition sudoers entry needed for yabai to function, including the exact `visudo` line and where to place it.
- **D-07:** Include yabai + skhd keybinding overview so the user can quickly reference window management shortcuts without reading config files.

### setups/ Documentation (DOC-03)
- **D-08:** Create `setups/README.md` documenting the role-script system: what `functions.sh` provides (shared utilities like `switch_github_account`, `kill_port`), how to create a new role script, and what each existing script does.
- **D-09:** Each role script gets a one-line purpose + prerequisites description. The `functions.sh` contract (available functions, expected calling conventions) is the core of the documentation.
- **D-10:** Include a "Adding a new role script" section with a minimal template so a new script can be created by following written instructions alone.

### Skills System Documentation (DOC-04)
- **D-11:** Document the skills convention in a dedicated section of the root README. Cover: directory structure (`skills/` for repo-global, `claude/skills/` for Claude-specific), `SKILL.md` frontmatter format, `references/` subdirectory convention.
- **D-12:** Reference `skills/fullstack-bridge/SKILL.md` as the canonical example of a well-formed skill — reader can follow the same pattern to create a new skill.
- **D-13:** Document how skills are invoked (`/skill <name>` in Claude Code) and how the skill discovery mechanism works.

### Neovim Plugin Workflow (from Phase 2 deferral)
- **D-14:** Include a brief section in the root README documenting the Neovim plugin upgrade workflow: `:Lazy update` in Neovim → commit `nvim/lazy-lock.json`. This satisfies NVIM-02 which was deferred from Phase 2.

### Claude's Discretion
- Exact markdown formatting, heading levels, and table alignment
- Whether to include badges (build status, etc.) in the README header
- Level of detail in the tool overview section (brief vs. comprehensive)
- Whether skhd keybindings are listed as a table or code block in yabai/README.md

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Bootstrap Script
- `initial-setup-macos.sh` — Contains `emit_symlink_map()` (single source of truth for symlink targets), `--check` mode, env flags (`SKETCHYBAR`, `DOTFILES_DIR`, `CONFIG_VARIANT`), and all setup logic to document

### Shell Configuration
- `macos/zsh/zsh/aliases.zsh` — Contains `dotcheck` alias to document
- `macos/zsh/zshrc` — Zinit plugin setup, starship init, nvm lazy-loading

### Tool Configurations
- `yabai/yabairc` — yabai window manager config; keybindings and scripting-addition usage
- `skhd/skhdrc` — skhd hotkey config; keybinding definitions to reference in yabai docs

### Role Scripts
- `setups/functions.sh` — Shared utility functions (`switch_github_account`, `kill_port`, etc.)
- `setups/auto_setup.sh`, `setups/gondoor_setup.sh`, etc. — Role-specific scripts to document

### Skills System
- `skills/fullstack-bridge/SKILL.md` — Canonical example of a well-formed skill
- `claude/skills/react-native/` — Claude-specific skill example
- `claude/skills/pr-standards/` — Another Claude-specific skill

### Project Standards
- `AGENTS.md` — Shell script conventions, existing documentation conventions
- `CLAUDE.md` — Project structure overview (will be cross-referenced, not duplicated)
- `GEMINI.md` — Gemini CLI context

### Prior Phase Context
- `.planning/phases/02-declarative-package-and-plugin-management/02-CONTEXT.md` — D-13 deferred NVIM-02 documentation to Phase 4
- `.planning/phases/03-drift-detection-and-shell-performance/03-CONTEXT.md` — `emit_symlink_map()` and `--check` mode established

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `CLAUDE.md` §Directory Map — Already has a symlink directory→target table; README can reference or expand this format
- `AGENTS.md` — Documents shell conventions; README should cross-reference, not duplicate
- `emit_symlink_map()` in `initial-setup-macos.sh` — Pipe-delimited source|target pairs; use to generate accurate symlink map table

### Established Patterns
- Each tool directory is self-contained with its own config files
- `SKILL.md` with YAML frontmatter + `references/` subdirectory is the established skill convention
- Conventional commits enforced — documentation commits use `docs(scope): subject`

### Integration Points
- Root `README.md` — New file, primary deliverable
- `yabai/README.md` — New file, yabai-specific documentation
- `setups/README.md` — New file, role-script documentation
- `nvim/AGENTS.md` — Already documents lazy-lock.json conventions; README can reference

</code_context>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches for documentation structure and content.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 04-documentation*
*Context gathered: 2026-03-31*
