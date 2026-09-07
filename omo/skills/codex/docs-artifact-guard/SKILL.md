---
name: docs-artifact-guard
description: Keep AI-generated or framework-generated documentation artifacts out of Git repositories, pull requests, commits, and branch history. Use when the user wants to remove docs artifacts, block docs from being committed, update .gitignore for new docs directories, inspect PR diffs for docs, install a local pre-commit guard, or plan removal of docs paths from Git history.
---

# Docs Artifact Guard

## Overview

Prevent docs artifacts from reaching the branch, PR, or commit history. Treat Markdown and common generated documentation directories as blocked unless the user explicitly narrows the policy.

Use `scripts/guard_docs.py` from the skill directory for repeatable checks and cleanup.

## Workflow

1. Check branch and status first:
   - Do not commit directly on `main` or `staging`.
   - Do not rewrite history on a shared branch without explicit user approval.
   - Preserve unrelated user changes.

2. Scan for docs artifacts:

```bash
python3 ~/.codex/skills/docs-artifact-guard/scripts/guard_docs.py scan
```

3. Clean current working tree/index:

```bash
python3 ~/.codex/skills/docs-artifact-guard/scripts/guard_docs.py clean --write-gitignore --unstage --delete-untracked
```

Use `--untrack-tracked` only when the user explicitly wants tracked docs removed from the index. This stages deletions and may make docs appear in the PR if those files already exist on the base branch.

4. Install local commit protection when the user wants commits blocked:

```bash
python3 ~/.codex/skills/docs-artifact-guard/scripts/guard_docs.py install-hook
```

The hook lives under `.git/hooks/pre-commit`; it is local and does not enter the repo.

5. Before committing or opening a PR in a codebase, run:

```bash
python3 ~/.codex/skills/docs-artifact-guard/scripts/guard_docs.py pre-commit --code-repo-only
python3 ~/.codex/skills/docs-artifact-guard/scripts/guard_docs.py scan --base origin/main
```

If docs appear in staged paths, current diff, or branch history, clean before committing.

## Global Hook

For global enforcement across code repos:

```bash
chmod +x ~/.codex/hooks/pre-commit
git config --global core.hooksPath ~/.codex/hooks
```

The global hook calls `pre-commit --code-repo-only`. It skips repos whose path looks like research, academic, papers, notes, writing, manuscript, thesis, or similar non-code work unless the repo has strong code markers.

## History Removal

If docs were committed earlier in the branch, run:

```bash
python3 ~/.codex/skills/docs-artifact-guard/scripts/guard_docs.py history-plan --base origin/main
```

Then read `references/history-rewrite.md` before rewriting. Prefer rebuilding a private PR branch from the base and recommitting non-doc changes. Use destructive history rewrite commands only after explicit user approval.

## Blocked Artifacts

Default policy blocks every `.md` file and common generated docs/framework artifact directories:

- Doc source files: `*.md`, `*.markdown`, `*.mdx`, `*.rst`, `*.adoc`, `*.asciidoc`
- Common docs files: `README`, `CHANGELOG`, `CONTRIBUTING`, `LICENSE`, `NOTICE`, with doc suffixes
- Docs directories: `docs`, `doc`, `documentation`, `site`, `public/docs`, `api-docs`, `generated-docs`, `typedoc`, `.docusaurus`, `docusaurus-build`, `storybook-static`
- Framework artifact directories: `.gsd`, `gsd`, `.openspec`, `openspec`, `open-spec`, `.omo`, `omo`, `.superpowers`, `superpowers`

When a new docs directory is found, add the generated `.gitignore` block. Do not hand-edit around the block unless the user changes the policy.
