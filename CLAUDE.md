# CLAUDE.md — Dotfiles Repository

## Purpose
Personal macOS dotfiles managed as versioned directories, each symlinked into their expected home
location by `initial-setup-macos.sh`. Bringing a new machine up is one script run.

## Directory Map

| Directory | Symlink target | Tool |
|-----------|---------------|------|
| `claude/` | `~/.claude` | Claude Code |
| `gemini/` | `~/.gemini` | Gemini CLI |
| `opencode/` | `~/.config/opencode` | OpenCode |
| `codex/` | `~/.config/codex` | Codex CLI |
| `nvim/` | `~/.config/nvim` | Neovim / LazyVim |
| `tmux/` | `~/.tmux.conf` (file) | tmux |
| `ghostty/` | `~/Library/Application Support/com.mitchellh.ghostty/config` | Ghostty |
| `yabai/` | `~/.config/yabai` | yabai |
| `skhd/` | `~/.config/skhd` | skhd |
| `sketchybar/` | `~/.config/sketchybar` | SketchyBar |
| `macos/` | various zsh files | Zsh / Zinit |

## Setup

```bash
bash initial-setup-macos.sh
```

Idempotent — safe to rerun. Existing configs are backed up with a `.bak.<timestamp>` suffix.

## Universal Engineering Standards

These apply across all projects touched from this machine:

- **SOLID**: Single responsibility, open/closed via composition, interface segregation with narrow DTOs.
- **DRY**: Extract at ≥2 usages — hooks (frontend), shared utilities (backend), barrel exports.
- **TypeScript strict**: No `any`. Infer types from Zod schemas. Strict DTOs at boundaries.
- **Conventional Commits**: `type(scope): subject` — `feat`, `fix`, `chore`, `refactor`, `test`, `docs`, `perf`, `build`, `ci`.
- **Test coverage**: ≥80% for new code. Unit + integration. No committing red tests.
- **Security**: No secrets in repo. Use system keychain or `.env` outside version control.

## Skills System

Skills live in `skills/` (repo-global) and `claude/skills/` (Claude-specific).
Each skill has a `SKILL.md` with YAML frontmatter and `references/` subdirectory.

Available skills:
- `skills/fullstack-bridge/` — NestJS ↔ React/RN sync
- `claude/skills/react-native/` — Expo Router, TanStack Query, Zustand, forms, i18n, RN Paper
- `claude/skills/pr-standards/` — PR size limits, branch naming, description template, review rules, merge strategy

## Cross-references

- `AGENTS.md` — shell script conventions, commit style, security rules (authoritative for this repo)
- `claude/CLAUDE.md` — Claude-specific workflows valid across **all** projects (plan mode, bug protocol, etc.)
- `GEMINI.md` — Gemini CLI context for this repo
