# Phase 4: Documentation - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-03-31
**Phase:** 04-documentation
**Areas discussed:** README structure, yabai setup documentation, setups/ documentation, Skills system documentation
**Mode:** --auto (all choices auto-selected with recommended defaults)

---

## README Structure

| Option | Description | Selected |
|--------|-------------|----------|
| Single comprehensive README with ToC | One file, all sections, table of contents | ✓ |
| Multi-file docs with index | Separate files for each topic, linked from index | |
| Wiki-style (GitHub wiki) | Separate wiki pages | |

**User's choice:** [auto] Single comprehensive README with ToC (recommended — personal dotfiles repo, one file is more discoverable)

| Option | Description | Selected |
|--------|-------------|----------|
| Static markdown, manually maintained | Write and update by hand | ✓ |
| Auto-generated from script data | Parse bootstrap script to generate docs | |

**User's choice:** [auto] Static markdown (recommended — script changes rarely, auto-generation adds complexity)

**Notes:** Sections include Quick Start, Symlink Map, Env Flags, Tool Overview, Skills, Drift Check. Symlink map must match `emit_symlink_map()` output.

---

## yabai Setup Documentation

| Option | Description | Selected |
|--------|-------------|----------|
| Step-by-step with exact commands | Full SIP disable procedure, sudoers entry, inline | ✓ |
| Link to official docs | Brief overview with external links | |

**User's choice:** [auto] Step-by-step with commands (recommended — SIP disable is error-prone, external links risk breakage)

**Notes:** Include keybinding overview for quick reference. Document scripting-addition sudoers entry with exact `visudo` line.

---

## setups/ Documentation

| Option | Description | Selected |
|--------|-------------|----------|
| setups/README.md with contract + example | Full `functions.sh` API, role script template | ✓ |
| Inline comments in each script | Document within source files | |

**User's choice:** [auto] setups/README.md with contract spec (recommended — DOC-03 requires discoverability without reading source)

**Notes:** Each role script gets purpose + prerequisites. "Adding a new role script" section with minimal template.

---

## Skills System Documentation

| Option | Description | Selected |
|--------|-------------|----------|
| Section in root README + example reference | Convention docs in README, link to fullstack-bridge as example | ✓ |
| Separate skills/README.md | Standalone skills guide | |

**User's choice:** [auto] Section in root README (recommended — DOC-04 requires convention be documented, not a separate guide)

**Notes:** Cover directory structure, SKILL.md format, references/ convention, invocation method. Reference `skills/fullstack-bridge/SKILL.md` as canonical example.

---

## Claude's Discretion

- Exact markdown formatting, heading levels, and table alignment
- Whether to include badges in README header
- Level of detail in tool overview section
- skhd keybinding format (table vs code block) in yabai/README.md

## Deferred Ideas

None — discussion stayed within phase scope
