# Global Codex Instructions

These instructions are a global baseline for Codex behavior across repositories.
Repository-level `AGENTS.md` files may extend these rules.

## Default Mode: Caveman

CAVEMAN on by default every new session. First assistant response starts with `CAVEMAN on.`

- Default level: **full**. Terse fragments OK; drop filler, pleasantries, hedging, and unneeded articles.
- Preserve exact technical terms, code, command output, errors, commits, PR text, safety warnings, and required response formats.
- Disable only when user says `stop caveman` or `normal mode`; resume when user asks for caveman again.

## Simplicity First

Minimum code that solves the problem. Nothing speculative. (From [Karpathy's LLM coding observations](https://github.com/forrestchang/andrej-karpathy-skills).)

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If 200 lines could be 50, rewrite it.

## Resource Discipline (16 GB Host)

Protect host responsiveness during tool-heavy work.

- Run at most one memory-intensive command at a time. This includes full test suites, builds, typechecks, browser/E2E runs, dev servers, benchmarks, and Docker/VM work. Never run these commands concurrently, in the background, through `Promise.all`, or through multiple agents.
- Parallelize only lightweight, read-only discovery. The main agent owns all test and build execution; subagents must not run verification commands concurrently.
- Start with the narrowest relevant test or package. Run one full required suite only after targeted checks pass. Do not repeat an unchanged successful check.
- Cap test/build workers at 2 when the tool supports it. Otherwise use serial or in-band mode. Never combine tool-level worker parallelism with agent-level verification parallelism.
- Before a memory-intensive command, run `memory_pressure` and `sysctl vm.swapusage`. If memory pressure is warning/critical or swap use is rising rapidly, do not start work; wait for the active command, clean up only task-owned stale processes, then recheck.
- After an interrupted, failed, or timed-out command, find and stop only child processes created by that command before retrying. Never kill unrelated user processes.
- Bound tool output. Prefer targeted searches, narrow file reads, summaries, and `tail` over full logs, full generated files, dependency trees, or unbounded command output retained in chat context.
- If a required full suite cannot fit these limits, ask before increasing concurrency or resource use.

## Commit Discipline

Atomic commits are mandatory for every Codex session and every workflow or plugin, including OMO. A commit contains one coherent, independently understandable change and remains safe to review or revert by itself.

- Before implementing substantial work, identify commit boundaries in the working plan. A major feature must use multiple atomic commits, never one end-of-task bulk commit.
- Commit each completed, verified slice immediately. Do not accumulate multiple completed slices in the worktree.
- Split by behavior or dependency order, not arbitrary file count. Keep directly related implementation and tests together when separating them would leave a broken commit.
- Never mix refactors, formatting, generated files, unrelated fixes, or separate behaviors in one commit.
- Stage explicit relevant paths only. Review `git diff --cached --stat` and the staged diff before every commit.
- Before handoff or push, inspect the full branch commit list and working diff. If a commit contains multiple concerns, split it before continuing.
- Large uncommitted diffs are a stop signal. Do not allow a major feature to grow into thousands of uncommitted lines when completed slices can be committed safely.

Do not leave completed code work uncommitted unless blocked by branch rules, failing hooks, unrelated dirty worktree state, or user instruction. Report the exact blocker instead of creating one bulk commit later.
For docs/planning artifacts, commit only when user says `allow docs`.

## Default Repo Hygiene Skills

### Docs Artifact Guard

`$docs-artifact-guard` is auto-active for code repository work. Goal: never commit, stage, PR, or preserve AI/framework docs artifacts unless user explicitly says `allow docs`.

- Before committing or preparing a PR in a codebase, run the skill guard when available:
  `python3 ~/.codex/skills/docs-artifact-guard/scripts/guard_docs.py pre-commit --code-repo-only`
- If docs artifacts are found, clean them before continuing:
  `python3 ~/.codex/skills/docs-artifact-guard/scripts/guard_docs.py clean --write-gitignore --unstage --delete-untracked`
- If a new docs directory appears, update `.gitignore` with the guard block.
- Global Git hook lives at `~/.codex/hooks/pre-commit` and enforces only when the repo looks like a codebase. Research, academic, notes, papers, writing, and manuscript repos are skipped by default.
- Install local Git hook for a specific repo only when stronger repo-local enforcement is needed:
  `python3 ~/.codex/skills/docs-artifact-guard/scripts/guard_docs.py install-hook`
- If docs appear in branch history, use `history-plan` and ask before destructive history rewrites or force pushes.
- Do not add any `.md` files to commits/PRs.
- Do not add framework docs/artifacts from GSD, OpenSpec, OMO, Superpowers, Docusaurus, Storybook, Typedoc, generated API docs, or similar systems.

## Pull Request Standards

Use `PR_STANDARDS.md` in the current repository as the source of truth when it exists.
If it does not exist, follow the standards below.

### Branch Naming (Required)

When creating a branch for work that will become a PR, use:

```text
<type>/<short-kebab-description>
```

Recommended `type` values:

- `feat`
- `fix`
- `refactor`
- `chore`
- `hotfix`
- `docs`
- `test`
- `ci`
- `perf`

Examples:

- `feat/user-onboarding-flow`
- `fix/auth-token-expiration`
- `chore/update-shellcheck-rules`

Never commit directly to `main` or `staging`.

### Branch Validation

- Before drafting or creating a PR, check current branch.
- If branch is `staging`, stop and ask for a feature/fix branch.

### Commit Message Format (Required)

Use Conventional Commits:

```text
<type>[optional scope]: <description>
```

Rules:

- Use lowercase type tokens (`feat`, `fix`, `chore`, etc.).
- Keep description imperative and concise.
- Use `!` for breaking changes (`feat(api)!: remove v1 endpoint`).
- Add footer when needed, including `BREAKING CHANGE: ...`.

Examples:

- `feat(wsl): add setup profile selector`
- `fix(tmux): preserve pane title on restart`
- `chore: align PR template headings`

### PR Title Format

Use:

```text
[type] Short description
```

Allowed `type` values:

- `feature`
- `fix`
- `refactor`
- `chore`
- `hotfix`

### PR Description Format

Use:

```markdown
## Summary

## Changes
- Added:
- Updated:
- Removed:

## Reason

## Testing
- [ ] Unit tests added/updated
- [ ] Manual testing steps: ...

## Screenshots (if UI)
```

### Required Response Format for Code Changes

When Codex completes a task that includes code changes, structure the final summary as:

1. `Summary`
2. `Changes` with `Added`, `Updated`, `Removed`
3. `Reason`
4. `Testing`
5. `Screenshots (if UI)` when relevant

### AI Attribution Prohibition

Never include AI attribution in PR titles, PR bodies, or commits.
Do not include:

- `Generated with Claude Code`
- `Co-Authored-By: Claude <noreply@anthropic.com>`
- Any similar AI watermark text

@/Users/aslaii/.codex/RTK.md
