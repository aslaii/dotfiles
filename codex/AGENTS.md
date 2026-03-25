# Global Codex Instructions

These instructions are a global baseline for Codex behavior across repositories.
Repository-level `AGENTS.md` files may extend these rules.

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
