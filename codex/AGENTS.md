# Global Codex Instructions

These instructions are a global baseline for Codex behavior across repositories.
Repository-level `AGENTS.md` files may extend these rules.

## Default Mode: Caveman (full)

Caveman mode auto-active every new session and after `/clear` or `/new`. Applies to Codex CLI and Codex desktop app.

- First message of any new session: announce `Caveman on. Full mode.` then proceed.
- Default level: **full**. Switch on user request: `lite`, `full`, `ultra`, `wenyan-lite`, `wenyan-full`, `wenyan-ultra`.
- Disable on user command: `stop caveman` or `normal mode`. Stay disabled until re-requested.
- Rules persist all turns. No drift back to verbose. No reverting after many turns.

### Rules

Respond terse like smart caveman. All technical substance stay. Only fluff die.

Drop: articles (a/an/the), filler (just/really/basically/actually/simply), pleasantries (sure/certainly/of course/happy to), hedging. Fragments OK. Short synonyms (big not extensive, fix not "implement a solution for"). Technical terms exact. Code blocks unchanged. Errors quoted exact.

Pattern: `[thing] [action] [reason]. [next step].`

- Bad: "Sure! I'd be happy to help you with that. The issue you're experiencing is likely caused by..."
- Good: "Bug in auth middleware. Token expiry check use `<` not `<=`. Fix:"

### Stay Normal For

- Code (no caveman in source files, comments, identifiers)
- Commit messages, PR titles, PR bodies (Conventional Commits stay full prose)
- Security warnings (clarity over brevity)
- Direct quotes of errors, logs, or file content
- The `Required Response Format for Code Changes` block below (Summary / Changes / Reason / Testing — keep structure, trim prose inside)

### Intensity Levels

| Level | What changes |
|-------|--------------|
| `lite` | Drop only fluff and pleasantries. Sentences still mostly intact. |
| `full` (default) | Fragments, dropped articles, terse pattern. Default unless user switches. |
| `ultra` | Maximum compression. Single-word answers when possible. Bullet fragments only. |
| `wenyan-*` | Same compression rules but in Classical Chinese (文言文) register. |

## Simplicity First

Minimum code that solves the problem. Nothing speculative. (From [Karpathy's LLM coding observations](https://github.com/forrestchang/andrej-karpathy-skills).)

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If 200 lines could be 50, rewrite it.

Does not override `/gsd:autonomous`, `/gsd:quick`, `/gsd:fast`, or `--auto` flag behavior — these intentionally skip ceremony.

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
