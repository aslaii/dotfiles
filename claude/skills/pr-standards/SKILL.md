---
name: pr-standards
description: >
  Enforce and apply pull request standards. Use when opening a PR, writing a PR description,
  reviewing a PR, naming a branch, or checking if a PR is ready to merge.
---

# PR Standards Skill

## Purpose

Pull Requests ensure that all code entering the codebase is reviewed, tested, understandable,
maintainable, and safe to deploy. PRs are a **knowledge-sharing and quality control mechanism**,
not just an approval gate.

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

| Size | Lines changed | Action |
|------|---------------|--------|
| Recommended | 100–400 | Ship it |
| Requires explanation | 400–800 | Add context in description |
| Avoid | 800+ | Split into multiple PRs unless unavoidable |

If a large change is unavoidable, split into incremental PRs and merge sequentially.

---

## Branch Naming Convention

```
feature/<short-description>
fix/<short-description>
refactor/<short-description>
chore/<short-description>
hotfix/<short-description>
```

**Examples:**
```
feature/user-onboarding-flow
fix/auth-token-expiration
refactor/payment-service
```

---

## PR Title Format

```
[type] Short description
```

**Examples:**
```
[feature] Add onboarding flow
[fix] Resolve JWT refresh bug
[refactor] Simplify auth service logic
```

---

## PR Description Template

Use this template for every PR:

```markdown
## Summary

<!-- What does this PR do? -->

## Changes

- Added:
- Updated:
- Removed:

## Reason

<!-- Why is this change needed? -->

## Testing

<!-- How was this tested? -->

- [ ] Unit tests added/updated
- [ ] Manual testing steps: ...

## Screenshots (if UI)

<!-- Before / After screenshots or videos -->
```

---

## Pre-PR Checklist

Before opening a PR, verify:

- [ ] Code compiles
- [ ] No console logs or debug code
- [ ] Lint passes
- [ ] Tests pass locally
- [ ] No unused imports or files
- [ ] No commented-out dead code
- [ ] Environment variables documented

---

## Testing Requirements

### Always required

- Unit tests for business logic
- Edge cases handled
- Existing tests pass

### When applicable

- Integration tests
- E2E tests for user flows
- Regression tests for bug fixes

---

## Review Guidelines

### Reviewer must check

- Code correctness
- Logic clarity
- Security implications
- Performance concerns
- Naming consistency
- Architecture alignment

### Reviewer asks

- Is this understandable in 6 months?
- Is this the simplest solution?
- Does this introduce technical debt?

---

## Approval Rules

A PR can be merged when:

- At least **1 approval** received (critical systems: **2 approvals**)
- All comments resolved
- CI checks pass
- No failing tests

---

## Merge Strategy

**Squash and merge** (preferred)

- Keeps git history clean
- Easier rollback
- One commit per feature

---

## Prohibited

- Push directly to main
- Merge own PR without review
- Mix refactor + feature + bug fix in one PR
- Ignore review comments

---

## Fast Track (Hotfixes)

Allowed only when:

- Production is broken
- Security issue
- Critical bug

Requirements:

- Post-merge review required
- Follow-up cleanup PR if necessary

---

## Definition of Done

A PR is complete when:

- [ ] Feature works as intended
- [ ] Tests exist and pass
- [ ] Code reviewed and approved
- [ ] Documentation updated if needed
- [ ] Ready for deployment
