# Pull Request Standards

## Purpose

Pull Requests ensure that all code entering the codebase is:

- Reviewed
- Tested
- Understandable
- Maintainable
- Safe to deploy

PRs are not just for approval — they are a **knowledge-sharing and quality control mechanism**.

---

## Codex PR Command

Use the local helper command to generate and open a PR with this template:

```bash
cpr
```

Preview only (no PR creation):

```bash
cpr --dry-run
```

You can also pass extra context:

```bash
cpr "Include migration note for ops team"
```

---

## Core Principles

Every PR must be:

- Small and focused
- Easy to review
- Tested
- Clearly explained
- Safe to merge

Avoid large PRs that mix multiple concerns.

---

## PR Size Guidelines

### Recommended

- 100–400 lines changed
- Single feature or fix
- Single logical concern

### Requires explanation

- 400–800 lines

### Avoid

- 800+ line PRs unless unavoidable (major refactor or migration)

If large changes are required:

- Split into multiple PRs
- Merge incrementally

---

## Branch Naming Convention

```
feat/<short-description>
fix/<short-description>
refactor/<short-description>
chore/<short-description>
hotfix/<short-description>
docs/<short-description>
test/<short-description>
ci/<short-description>
perf/<short-description>
```

Rules:

- Use lowercase kebab-case for the description.
- Keep names short and specific to one logical change.
- Do not open PRs from `main` or `staging`.

### Examples

```
feat/user-onboarding-flow
fix/auth-token-expiration
refactor/payment-service
```

---

## Commit Message Convention (Required)

Use Conventional Commits for every commit:

```text
<type>[optional scope]: <description>
```

Examples:

```text
feat(setups): add goose bootstrap profile
fix(wsl): prevent duplicate alias export
docs(pr): clarify branch naming rules
```

Breaking changes:

- Use `!` before `:` in the header when applicable.
- Add a footer with `BREAKING CHANGE: <details>` when context is needed.

Example:

```text
feat(setups)!: replace legacy install flow

BREAKING CHANGE: initial-setup.sh now requires Ubuntu 24.04+
```

---

## PR Title Format

```
[type] Short description
```

### Examples

```
[feature] Add onboarding flow
[fix] Resolve JWT refresh bug
[refactor] Simplify auth service logic
```

---

## PR Description Template (Required)

Every PR must include:

### Summary

What does this PR do?

### Changes

- Added:
- Updated:
- Removed:

### Reason

Why is this change needed?

### Testing

How was this tested?

- Unit tests added/updated
- Manual testing steps

### Screenshots (if UI)

Before / After screenshots or videos

---

## Code Requirements Before Opening PR

Developer must ensure:

- [ ] Code compiles
- [ ] No console logs or debug code
- [ ] Lint passes
- [ ] Tests pass locally
- [ ] No unused imports or files
- [ ] No commented-out dead code
- [ ] Environment variables documented

---

## Testing Requirements

### Required

- Unit tests for business logic
- Edge cases handled
- Existing tests pass

### When Applicable

- Integration tests
- E2E tests for user flows
- Regression tests for bug fixes

---

## Review Guidelines

### Reviewer Responsibilities

Reviewer must check:

- Code correctness
- Logic clarity
- Security implications
- Performance concerns
- Naming consistency
- Architecture alignment

Reviewer should ask:

- Is this understandable in 6 months?
- Is this the simplest solution?
- Does this introduce technical debt?

---

## Approval Rules

A PR can be merged when:

- At least 1 approval received
- All comments resolved
- CI checks pass
- No failing tests

Critical systems may require 2 approvals.

---

## Merge Rules

### Preferred Method

Squash and merge

Reason:

- Keeps git history clean
- Easier rollback
- One commit per feature

---

## Do Not

- Push directly to main
- Merge own PR without review
- Mix refactor + feature + bug fix in one PR
- Ignore review comments

---

## Fast Track PRs (Hotfixes)

Allowed when:

- Production is broken
- Security issue
- Critical bug

Requirements:

- Post-merge review required
- Follow-up PR for cleanup if necessary

---

## Definition of Done (PR Level)

A PR is complete when:

- Feature works as intended
- Tests exist and pass
- Code reviewed
- Documentation updated if needed
- Ready for deployment
