# History Rewrite

Use this only after `guard_docs.py history-plan --base <base>` reports docs in branch history.

## Safety Rules

- Confirm current branch is not `main` or `staging`.
- Confirm the worktree is clean except intended cleanup.
- Prefer branch rebuild over history rewrite when the PR branch has not been shared.
- Ask before force-pushing or rewriting shared history.

## Last Commit Only

If docs only appear in the last commit:

```bash
python3 ~/.codex/skills/docs-artifact-guard/scripts/guard_docs.py clean --write-gitignore --unstage --delete-untracked
git commit --amend --no-edit
python3 ~/.codex/skills/docs-artifact-guard/scripts/guard_docs.py scan --base origin/main
```

## Multiple Private Commits

For a private branch with multiple bad commits:

```bash
git rebase -i origin/main
```

Mark commits containing docs as `edit`. At each stop:

```bash
python3 ~/.codex/skills/docs-artifact-guard/scripts/guard_docs.py clean --write-gitignore --unstage --delete-untracked
git commit --amend --no-edit
git rebase --continue
```

Then re-run:

```bash
python3 ~/.codex/skills/docs-artifact-guard/scripts/guard_docs.py history-plan --base origin/main
```

## Repo-Wide Purge

Use `git filter-repo` only for explicit repo-wide purges or when branch rebuild/rebase is impractical. This rewrites commit IDs.

```bash
python3 ~/.codex/skills/docs-artifact-guard/scripts/guard_docs.py history-plan --base origin/main
git filter-repo --force --invert-paths --paths-from-file .git/docs-artifact-guard-paths.txt
```

After any rewrite, run:

```bash
python3 ~/.codex/skills/docs-artifact-guard/scripts/guard_docs.py scan --base origin/main
python3 ~/.codex/skills/docs-artifact-guard/scripts/guard_docs.py pre-commit
```
