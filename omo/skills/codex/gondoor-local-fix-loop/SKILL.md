---
name: gondoor-local-fix-loop
description: Run the Gondoor local PM2 fix loop under `$omo:ulw-loop`. Use when the user invokes `$gondoor-local-fix-loop` or asks to repeatedly fix a local onboarding/MVP/ecommerce/SaaS/blogsite failure by starting the current worktree in PM2, testing through the local PM2 backend with `$gondoor-local-test-user`, inspecting local PM2 with `$gondoor-local-inspect`, fixing failures, committing the fix, restarting PM2, and looping until a fresh local test user flow succeeds.
---

# Gondoor Local Fix Loop

## Contract

Drive the requested Gondoor flow to a fresh local PM2 pass:

1. Start or resume an `$omo:ulw-loop` session for the requested local flow.
2. Start the requested worktree with PM2.
3. Verify PM2 apps belong to that worktree.
4. Diagnose the current failure from local runner output and local PM2 logs.
5. Fix code on the current non-protected branch, or create a `fix/<short-kebab-root-cause>` branch when needed.
6. Run focused tests and type/build checks that cover the changed behavior.
7. Run repo hygiene.
8. Commit the fix with a Conventional Commit.
9. Restart the same worktree's PM2 server.
10. Create a fresh local test user with `$gondoor-local-test-user`.
11. Watch local PM2 with `$gondoor-local-inspect`.
12. Record each pass/fail/blocker through `$omo:ulw-loop`.
13. If the fresh local run fails, capture evidence, fix the next root cause, commit, restart PM2, and repeat.

Stop only when a fresh local user created after the latest commit and PM2 restart completes the requested flow.

## Companion Skills

Load and follow these skills when their step is reached:

- `$omo:ulw-loop`: durable goals, success criteria, evidence ledger, checkpoints, and repeated fix/test loops.
- `$gondoor-local-test-user`: local PM2 onboarding and feature build commands.
- `$gondoor-local-inspect`: read-only local PM2 status, cwd, health, logs, and errors.

Do not use `$pr`, production deploy skills, production SSH, or production URLs for this local loop.

## Ground Rules

- Work from `__OMO_HOME__/work/mobii/gondoor-mono` or the requested Gondoor worktree.
- Use the current worktree's `ecosystem.config.cjs` and PM2 apps.
- Do not SSH to production, deploy, merge PRs, or mutate production.
- Do not use `https://api.gondoor.app`, `https://app.gondoor.app`, tenant `*.gondoor.app`, or `64.23.164.65`.
- Never print passwords, Supabase keys, bearer tokens, provisioning secrets, or deploy hook secrets.
- Never commit directly to `main`, `master`, or `staging`.
- Do not run this loop freehand. Use `$omo:ulw-loop` for goals, criteria, evidence, and checkpoint state.
- Use a new unique local test slug/email after every fix commit and PM2 restart. Do not reuse an old failed user as pass evidence.
- For multiple requested businesses, use a canary only to avoid repeated known systemic failures. After the fix lands locally, run all requested businesses fresh against the restarted PM2 server.

## ULW Session

Create or resume ULW state before branch work:

```bash
rtk omo ulw-loop create-goals --session-id gondoor-local-fix-<yyyymmddhhmm> --brief "<requested local PM2 flow and stop condition>" --json
rtk omo ulw-loop status --session-id gondoor-local-fix-<yyyymmddhhmm> --json
```

Each success criterion must name:

- the fresh business/user flow to run
- the exact local PM2-backed command
- expected evidence path under `.omo/ulw-loop/evidence/`
- local surface to check, such as `http://127.0.0.1:3001/health/live`, `http://localhost:3000`, `http://localhost:3002`, PM2 app state, or DB task/install state
- pass/fail observable

## Start Local PM2

From the target worktree:

```bash
rtk pnpm dev:pm2
rtk __OMO_HOME__/.codex/skills/gondoor-local-inspect/scripts/local_pm2.sh wait backend 3001 120
rtk __OMO_HOME__/.codex/skills/gondoor-local-inspect/scripts/local_pm2.sh assert-cwd backend "$PWD"
```

For tenant provisioning or build-heavy flows:

```bash
rtk pnpm dev:pm2:tenant-provisioning
rtk __OMO_HOME__/.codex/skills/gondoor-local-inspect/scripts/local_pm2.sh assert-cwd tenant-provisioning-backend "$PWD"
```

If PM2 already has `backend`, `admin`, `web`, or `tenant-provisioning-backend` from a different cwd, do not use that evidence. Stop conflicting processes only if they belong to this local work task or the user explicitly asked for this worktree to own PM2.

## Diagnose And Fix

1. Inspect local PM2 evidence first:

```bash
rtk __OMO_HOME__/.codex/skills/gondoor-local-inspect/scripts/local_pm2.sh status
rtk __OMO_HOME__/.codex/skills/gondoor-local-inspect/scripts/local_pm2.sh errors 200 backend
rtk __OMO_HOME__/.codex/skills/gondoor-local-inspect/scripts/local_pm2.sh logs 200 backend
rtk __OMO_HOME__/.codex/skills/gondoor-local-inspect/scripts/local_pm2.sh errors 200 tenant-provisioning-backend
```

2. Find the smallest code fix that addresses the local root cause.
3. Run focused tests and type/build checks that cover the changed behavior.
4. Run repo hygiene before committing:

```bash
rtk python3 ~/.codex/skills/docs-artifact-guard/scripts/guard_docs.py pre-commit --code-repo-only
```

5. Commit with a Conventional Commit.

## Restart After Commit

Restart the same worktree's PM2 apps after each committed fix:

```bash
rtk pnpm dev:pm2:restart
rtk __OMO_HOME__/.codex/skills/gondoor-local-inspect/scripts/local_pm2.sh wait backend 3001 120
rtk __OMO_HOME__/.codex/skills/gondoor-local-inspect/scripts/local_pm2.sh assert-cwd backend "$PWD"
```

If the ecosystem config changed or restart does not pick up the current worktree, delete/restart only the local worktree's PM2 apps after confirming cwd ownership.

## Fresh Local Test User

Use `$gondoor-local-test-user` for the exact command and reporting requirements.

Slug pattern:

```text
codex-local-<purpose>-<yyyymmddhhmm>
```

Examples:

```bash
rtk PROD_BACKEND_URL=http://127.0.0.1:3001 GONDOOR_PROD_DOMAIN=localhost:3000 pnpm run onboard:user -- --business saas --slug codex-local-saas-202606271530 --json
rtk PROD_BACKEND_URL=http://127.0.0.1:3001 GONDOOR_PROD_DOMAIN=localhost:3000 pnpm run onboard:user -- --business ecommerce --slug codex-local-ecom-202606271530 --json
```

If the runner refuses local targets with `Refusing local backend URL for prod test`, do not switch to production. Patch or add a local-runner path in the same branch, verify it with a dry run, then continue the local loop.

## Watch And Decide

Pass requires all applicable evidence:

- runner exits successfully against the local PM2 backend
- onboarding creates user/company
- MVP/build task reaches completed state when requested
- feature task reaches completed/active state when requested
- PM2 `backend` and any required build process are online with no new crash loop
- local backend health responds
- requested local user-facing surface responds

Failure requires all applicable evidence:

- exact runner step and error body
- email, userId, companyId, companySlug, taskId, and idempotencyKey when present
- `engineering_queue_jobs.last_error` when present
- bounded local `backend` and `tenant-provisioning-backend` log summary
- likely local file/service to inspect next

Record failures in `$omo:ulw-loop` before editing the next fix. After any failure, fix on the current branch, commit, restart PM2, and repeat with another fresh local user.

## Final Report

Report:

- commit hash and Conventional Commit subject
- PM2 restart result
- fresh local test user email, companyId, companySlug, task IDs
- requested business/feature matrix with pass/fail
- PM2 app status, cwd, and restart signal
- local log errors that mattered
- local URLs checked
- ULW session id, goal id, criteria statuses, and evidence paths
- any remaining non-blocking issue
