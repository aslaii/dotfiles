---
name: rapid-deploy
description: Promote a completed Gondoor branch through GitHub PRs and production deploy. Use when the user asks for rapid deploy, promote to dev/staging/main, create-and-merge chained PRs, or deploy Gondoor production after merging main using the existing backend deploy script and read-only prod verification.
---

# Rapid Deploy

## Overview

Run the Gondoor release train with minimal back-and-forth: feature branch to `dev`, `dev` to `staging`, `staging` to `main`, then production deploy.

Use the existing repo and prod tools. Do not invent a new deploy path.

## Preflight

1. Read this skill completely.
2. Read `$pr` if the request includes PR creation.
3. Read `$gondoor-prod-inspect` before any production status, log, or health check.
4. Inspect state:
   - `git status --short --branch`
   - `git branch --show-current`
   - `git remote -v`
   - `git fetch origin dev staging main`
5. Stop if the working tree is dirty unless the user explicitly asked to include those changes.
6. Stop if current branch is `main`, `staging`, `dev`, `master`, or detached and the user asked to promote a feature branch.

## Feature Branch To Dev

1. Compare current branch to `origin/dev`:
   - `git log --oneline origin/dev..HEAD`
   - `git diff --stat origin/dev...HEAD`
2. Run docs guard before push/PR when available:
   - `python3 ~/.codex/skills/docs-artifact-guard/scripts/guard_docs.py pre-commit --code-repo-only`
3. Push:
   - no upstream: `git push -u origin HEAD`
   - existing upstream: `git push`
4. If hooks fail because `pnpm` uses a version newer than `packageManager`, retry with a shell path that prefers the repo-pinned Corepack/pnpm. Do not commit generated `pnpm approve-builds` placeholder edits.
5. Create PR to `dev` using GitHub tools or `gh pr create`.
6. Merge it when requested:
   - `gh pr merge <number> --repo mobii-ph/Gondoor --merge --delete-branch=false`
7. Verify:
   - `gh pr view <number> --repo mobii-ph/Gondoor --json state,mergedAt,mergeCommit,url`
   - `git fetch origin dev`

## Dev To Staging

1. Compare:
   - `git log --oneline origin/staging..origin/dev`
   - `git diff --stat origin/staging...origin/dev`
2. If no diff exists, report that `staging` already contains `dev`.
3. Create PR `dev -> staging`.
4. Merge it when requested.
5. Fetch and verify merged PR state.

## Staging To Main

1. Compare:
   - `git log --oneline origin/main..origin/staging`
   - `git diff --stat origin/main...origin/staging`
2. If no diff exists, report that `main` already contains `staging`.
3. Create PR `staging -> main`.
4. Merge it when requested.
5. Fetch and verify merged PR state.
6. Continue to Production Deploy unless the user explicitly says to skip production deploy.

## PR Shape

Use repo `PR_STANDARDS.md` if present. Otherwise:

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

Use titles like `[fix] Promote open signup approval to staging`. Never include AI attribution.

## Production Deploy

Run this after the `staging -> main` PR is merged as part of rapid deploy. Skip only when the user explicitly says to skip production deploy or asks for PR promotion without production deploy. This is a mutating production action.

1. Inspect current deploy path every time because it may change:
   - `git show origin/main:package.json`
   - `sed -n '1,260p' scripts/deploy-backend.sh`
   - `sed -n '260,760p' scripts/deploy-backend.sh`
2. Confirm the root script still matches:
   - `pnpm run deploy:backend`
   - current package script SSHes with `~/.ssh/do_gondoor`, loads `/etc/gondoor-deploy-hook.env`, then runs `bash ~/gondoor-mono/scripts/deploy-backend.sh` on prod.
3. Run read-only preflight using `$gondoor-prod-inspect`:
   - `__OMO_HOME__/.codex/skills/gondoor-prod-inspect/scripts/prod_readonly.sh status`
   - `__OMO_HOME__/.codex/skills/gondoor-prod-inspect/scripts/prod_readonly.sh health`
4. Deploy from repo root:
   - `pnpm run deploy:backend`
5. Verify with read-only prod checks:
   - `__OMO_HOME__/.codex/skills/gondoor-prod-inspect/scripts/prod_readonly.sh status`
   - `__OMO_HOME__/.codex/skills/gondoor-prod-inspect/scripts/prod_readonly.sh logs 200 gondoor-api`
   - `__OMO_HOME__/.codex/skills/gondoor-prod-inspect/scripts/prod_readonly.sh errors 200 gondoor-api`
   - `__OMO_HOME__/.codex/skills/gondoor-prod-inspect/scripts/prod_readonly.sh logs 200 gondoor-worker`
   - `__OMO_HOME__/.codex/skills/gondoor-prod-inspect/scripts/prod_readonly.sh errors 200 gondoor-worker`

The server deploy script syncs to `origin/main`, detects migration/backend changes since the last successful production SHA, applies Supabase migrations when needed, refreshes PostgREST schema cache, installs dependencies, builds backend packages, recreates PM2 API/worker processes, runs health checks, saves PM2 state, and records the successful SHA.

## Final Report

Report PR URLs, merge commits, production deploy result if run, prod PM2 status/restart counts, verification commands, and anything skipped or blocked.
