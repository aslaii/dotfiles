---
name: pr
description: Create a GitHub pull request from the current branch to main. Use when the user invokes $pr, especially "$pr to main", "$pr main", "create PR to main", "open a PR to main", or asks to avoid repeatedly typing the pull request workflow.
---

# PR

## Goal

Create a pull request from the current branch to `main` with minimal user input, while respecting repository PR standards and avoiding unsafe branch or dirty-worktree mistakes.

## Workflow

1. Inspect repository state:
   - Run `git status --short`.
   - Run `git branch --show-current`.
   - Run `git remote -v`.
   - Run `git fetch origin main` when `origin` exists.

2. Enforce branch safety:
   - If current branch is `main`, `master`, or `staging`, stop and ask for a feature/fix branch.
   - If no current branch exists, stop and report detached HEAD.
   - If `main` does not exist locally or on `origin`, stop and ask before using another base.

3. Handle local changes:
   - If the worktree has uncommitted changes, summarize them and stop unless the user explicitly asked to commit/include them.
   - Do not create a PR with hidden local changes.

4. Check PR contents:
   - Run `git log --oneline origin/main..HEAD` after fetching.
   - Run `git diff --stat origin/main...HEAD`.
   - If there are no commits ahead of `main`, stop and report nothing to PR.

5. Apply repository standards:
   - Read `PR_STANDARDS.md` if present and follow it.
   - Read `.github/pull_request_template.md` if present and use its shape.
   - Otherwise use this body:

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

6. Run repo hygiene when available:
   - In code repos, if `~/.codex/skills/docs-artifact-guard/scripts/guard_docs.py` exists, run:
     `python3 ~/.codex/skills/docs-artifact-guard/scripts/guard_docs.py pre-commit --code-repo-only`
   - If it reports docs artifacts, clean or report according to its instructions before creating the PR.

7. Push branch:
   - If the branch has no upstream, run `git push -u origin HEAD`.
   - If it has an upstream, run `git push`.
   - If push fails, stop and report exact failure.

8. Create PR:
   - Prefer an available GitHub connector/tool when it can create pull requests.
   - Otherwise use GitHub CLI:
     `gh pr create --base main --head <current-branch> --title "<title>" --body "<body>"`
   - Use a concise title from the branch name and recent commits.
   - Do not include AI attribution or watermarks.

9. Final response:
   - Return PR URL.
   - Mention skipped or failed verification only if relevant.
