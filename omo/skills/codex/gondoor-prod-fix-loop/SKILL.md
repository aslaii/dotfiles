---
name: gondoor-prod-fix-loop
description: Run the Gondoor production fix loop under `$omo:ulw-loop`. Use when the user invokes `$gondoor-prod-fix-loop` or asks to repeatedly fix a prod onboarding/MVP/ecommerce/SaaS/blogsite failure by creating a ULW session, fixing on a branch, opening a PR to main, merging it, deploying the backend, onboarding a fresh prod test user through `$gondoor-test-user`, watching production through `$gondoor-prod-inspect`, recording evidence through `$omo:ulw-loop`, and looping until the requested fresh production flow succeeds.
---

# Gondoor Prod Fix Loop

## Contract

Drive the requested Gondoor production flow to a fresh post-deploy pass:

1. Start or resume an `$omo:ulw-loop` session for the requested production flow.
2. Diagnose the current production failure from runner output and prod logs.
3. Fix code on a feature/fix branch.
4. Create a PR to `main`.
5. Merge the PR after required checks pass.
6. Deploy the backend from `main`.
7. Create a fresh production test user with `$gondoor-test-user`.
8. Watch production with `$gondoor-prod-inspect`.
9. Record each pass/fail/blocker through `$omo:ulw-loop`.
10. If the fresh run fails, capture evidence, fix the next root cause, and repeat from a new branch.

Stop only when a fresh production user created after the latest deploy completes the requested flow.

## Companion Skills

Load and follow these skills when their step is reached:

- `$omo:ulw-loop`: durable goals, success criteria, evidence ledger, checkpoints, and repeated fix/test loops.
- `$gondoor-test-user`: production onboarding and feature build commands.
- `$gondoor-prod-inspect`: read-only production PM2 status, logs, and errors.
- `$pr`: PR creation to `main`.

Do not duplicate or override those skills. This skill owns sequencing and stop conditions.

## Ground Rules

- Work from `__OMO_HOME__/work/mobii/gondoor-mono`.
- Do not test against localhost or local runners.
- Do not mutate production except through the official backend deploy step and `$gondoor-test-user` production commands.
- Keep production inspection read-only.
- Never print passwords, Supabase keys, bearer tokens, provisioning secrets, or deploy hook secrets.
- Never commit directly to `main`, `master`, or `staging`.
- Do not run this loop freehand. Use `$omo:ulw-loop` for goals, criteria, evidence, and checkpoint state.
- Use a new unique prod test slug/email after every backend deploy. Do not use an old failed user as pass evidence.
- For multiple requested businesses, use a canary only to avoid repeated known systemic failures. After the fix deploys, run all requested businesses fresh.
- If GitHub checks fail, fix the PR before merging. Do not bypass failing required checks unless the user explicitly authorizes it for that incident.

## ULW Session

Create or resume ULW state before branch work:

```bash
rtk omo ulw-loop create-goals --session-id gondoor-prod-fix-<yyyymmddhhmm> --brief "<requested prod flow and stop condition>" --json
rtk omo ulw-loop status --session-id gondoor-prod-fix-<yyyymmddhhmm> --json
```

If a previous context was compacted or a loop is being resumed, read ULW state first:

```bash
rtk omo sparkshell cat .omo/ulw-loop/ledger.jsonl
rtk omo ulw-loop status --json
```

Each success criterion must name:

- the fresh business/user flow to run
- the exact production command
- expected evidence path under `.omo/ulw-loop/evidence/`
- production surface to check, such as tenant URL, API route, dashboard route, or DB task/install state
- pass/fail observable

Record evidence only after cleanup receipts are known:

```bash
rtk omo ulw-loop record-evidence --session-id <session-id> --goal-id <goal-id> --criterion-id <criterion-id> --status pass --evidence "<observable prod result | cleanup receipt>" --json
rtk omo ulw-loop record-evidence --session-id <session-id> --goal-id <goal-id> --criterion-id <criterion-id> --status fail --evidence "<runner/prod failure | cleanup receipt>" --notes "<root cause or next file to inspect>" --json
```

Checkpoint the ULW goal only after all requested fresh post-deploy flows pass:

```bash
rtk omo ulw-loop checkpoint --session-id <session-id> --goal-id <goal-id> --status complete --evidence "<criteria summary>" --json
```

## Branch And Fix

1. Sync `main` and create a branch named `fix/<short-kebab-root-cause>` or `hotfix/<short-kebab-root-cause>`.
2. Inspect production evidence first:

```bash
rtk __OMO_HOME__/.codex/skills/gondoor-prod-inspect/scripts/prod_readonly.sh status
rtk __OMO_HOME__/.codex/skills/gondoor-prod-inspect/scripts/prod_readonly.sh errors 200
rtk __OMO_HOME__/.codex/skills/gondoor-prod-inspect/scripts/prod_readonly.sh logs gondoor-worker 200
rtk __OMO_HOME__/.codex/skills/gondoor-prod-inspect/scripts/prod_readonly.sh logs gondoor-api 200
```

3. Find the smallest code fix that addresses the production root cause.
4. Run focused tests and type/build checks that cover the changed behavior.
5. Run repo hygiene before committing:

```bash
rtk python3 ~/.codex/skills/docs-artifact-guard/scripts/guard_docs.py pre-commit --code-repo-only
```

6. Commit with a Conventional Commit.

## PR, Merge, Deploy

1. Use `$pr` to open a PR to `main`.
2. Wait for required GitHub checks. If they fail, fix on the same branch and update the PR.
3. Merge the PR to `main` using the repository's normal merge policy.
4. Check out and pull latest `main`.
5. Deploy backend from repo root:

```bash
rtk pnpm run deploy:backend
```

This package script SSHes to production and runs `~/gondoor-mono/scripts/deploy-backend.sh`.

6. Verify production status immediately after deploy:

```bash
rtk __OMO_HOME__/.codex/skills/gondoor-prod-inspect/scripts/prod_readonly.sh status
rtk __OMO_HOME__/.codex/skills/gondoor-prod-inspect/scripts/prod_readonly.sh logs gondoor-api 120
rtk __OMO_HOME__/.codex/skills/gondoor-prod-inspect/scripts/prod_readonly.sh logs gondoor-worker 120
```

## Fresh Test User

Use `$gondoor-test-user` for the exact command and reporting requirements.

Slug pattern:

```text
codex-<purpose>-<yyyymmddhhmm>
```

Email pattern, enforced by `$gondoor-test-user`:

```text
jecho.deleon+<slug>@gmail.com
```

Examples:

```bash
rtk pnpm run onboard:user -- --business saas --slug codex-saas-202606271530 --json
rtk pnpm run onboard:user -- --business ecommerce --slug codex-ecom-202606271530 --json
rtk pnpm run onboard:user -- --business home-services --slug codex-hsvc-202606271530 --json
```

For feature-specific flows, dispatch the matching build command from `$gondoor-test-user` after onboarding/MVP prerequisites are complete.

## Watch And Decide

While the runner polls, inspect prod with bounded reads only:

```bash
rtk __OMO_HOME__/.codex/skills/gondoor-prod-inspect/scripts/prod_readonly.sh status
rtk __OMO_HOME__/.codex/skills/gondoor-prod-inspect/scripts/prod_readonly.sh errors 160
rtk __OMO_HOME__/.codex/skills/gondoor-prod-inspect/scripts/prod_readonly.sh logs gondoor-worker 160
```

Pass requires all applicable evidence:

- runner exits successfully
- onboarding creates user/company
- MVP/build task reaches completed state when requested
- feature task reaches completed/active state when requested
- PM2 `gondoor-api` and `gondoor-worker` are online with no new crash loop
- tenant production URL responds on the user-facing surface
- feature-specific path works, such as booking form, reservation form, blog posts, course signup, ecommerce product/cart/checkout flow, or SaaS auth/session/dashboard flow

Failure requires all applicable evidence:

- exact runner step and error body
- email, userId, companyId, companySlug, taskId, and idempotencyKey when present
- `engineering_queue_jobs.last_error` when present
- bounded `gondoor-api` and `gondoor-worker` log summary
- likely local file/service to inspect next

Record the failure in `$omo:ulw-loop` before editing the next fix. After any failure, create the next fix from latest `main` unless the PR has not merged yet. Then repeat the loop with another fresh user after deploy.

## Final Report

Report:

- PR number and merge commit
- backend deploy result
- fresh test user email, companyId, companySlug, task IDs
- requested business/feature matrix with pass/fail
- PM2 status and restart signal
- production log errors that mattered
- tenant URLs checked
- ULW session id, goal id, criteria statuses, and evidence paths
- any remaining non-blocking issue
