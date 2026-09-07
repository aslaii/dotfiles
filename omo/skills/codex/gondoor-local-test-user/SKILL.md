---
name: gondoor-local-test-user
description: Run Gondoor local PM2 test-user automation for onboarding employees/test users, MVP builds, ecommerce setup, SaaS setup, and blogsite setup against the current worktree's local PM2 backend, then inspect local PM2 logs through `$gondoor-local-inspect` and report failures. Use when the user asks to test Gondoor onboarding or feature builds locally.
---

# Gondoor Local Test User

Use this skill when the user asks to test Gondoor local onboarding, create a local smoke user, onboard employees/test users on the local PM2 server, run `pnpm run onboard:user`, dispatch Build MVP, dispatch ecommerce setup, dispatch SaaS setup, dispatch blogsite setup, or investigate one of those local test flows.

## Ground Rules

- Work from `__OMO_HOME__/work/mobii/gondoor-mono` or the requested Gondoor worktree.
- Test against the current worktree's local PM2 backend.
- Start or verify PM2 before running user automation.
- Use local surfaces only: backend `http://127.0.0.1:3001`, dashboard `http://localhost:3000`, admin `http://localhost:3002`, and local tenant routes.
- Do not use production SSH, production PM2, production deploys, `https://api.gondoor.app`, `https://app.gondoor.app`, tenant `*.gondoor.app`, or `64.23.164.65`.
- Always verify pass/fail through `$gondoor-local-inspect` local PM2 helpers.
- If local PM2 is unavailable, start it when this skill is the active test workflow. If startup fails, report local verification blocked with PM2 logs.
- The test email must be `jecho.deleon+<slug>@gmail.com`.
- Never print passwords, Supabase keys, bearer tokens, or provisioning secrets.

## Local PM2 Setup

From the target worktree:

```bash
rtk pnpm dev:pm2
rtk __OMO_HOME__/.codex/skills/gondoor-local-inspect/scripts/local_pm2.sh wait backend 3001 120
rtk __OMO_HOME__/.codex/skills/gondoor-local-inspect/scripts/local_pm2.sh assert-cwd backend "$PWD"
```

For feature builds that use the tenant provisioning backend:

```bash
rtk pnpm dev:pm2:tenant-provisioning
rtk __OMO_HOME__/.codex/skills/gondoor-local-inspect/scripts/local_pm2.sh assert-cwd tenant-provisioning-backend "$PWD"
```

## Local Target Environment

Every runner command must explicitly target local PM2:

```bash
PROD_BACKEND_URL=http://127.0.0.1:3001
GONDOOR_PROD_BACKEND_URL=http://127.0.0.1:3001
GONDOOR_PROD_DOMAIN=localhost:3000
```

If the current runner rejects local URLs with `Refusing local backend URL for prod test`, do not remove the local target and do not fall back to production. Patch or add a local-runner path in the current branch, verify with `--dry-run`, then run the local test.

## Commands

Default onboarding with generated landing page:

```bash
rtk PROD_BACKEND_URL=http://127.0.0.1:3001 GONDOOR_PROD_DOMAIN=localhost:3000 pnpm run onboard:user -- --slug <short-slug>
```

Dispatch against an existing company:

```bash
rtk PROD_BACKEND_URL=http://127.0.0.1:3001 GONDOOR_PROD_DOMAIN=localhost:3000 pnpm run build-mvp:user -- --company-id <company-id>
rtk PROD_BACKEND_URL=http://127.0.0.1:3001 GONDOOR_PROD_DOMAIN=localhost:3000 pnpm run build-ecommerce:user -- --company-id <company-id>
rtk PROD_BACKEND_URL=http://127.0.0.1:3001 GONDOOR_PROD_DOMAIN=localhost:3000 pnpm run build-saas:user -- --company-id <company-id>
rtk PROD_BACKEND_URL=http://127.0.0.1:3001 GONDOOR_PROD_DOMAIN=localhost:3000 pnpm run build-blogsite:user -- --company-id <company-id>
```

Create a fresh ecommerce company, wait for onboarding, build MVP, then dispatch ecommerce and SaaS:

```bash
rtk PROD_BACKEND_URL=http://127.0.0.1:3001 GONDOOR_PROD_DOMAIN=localhost:3000 pnpm run onboard:user -- --action full --slug <short-slug>
```

Create a fresh blogsite company, wait for onboarding, build MVP, then dispatch blogsite:

```bash
rtk PROD_BACKEND_URL=http://127.0.0.1:3001 GONDOOR_PROD_DOMAIN=localhost:3000 pnpm run build-blogsite:user -- --slug <short-slug>
```

Useful flags:

- `--dry-run` checks command shape and env readiness without mutation.
- `--json` emits final result JSON on stdout and progress on stderr.
- `--no-wait` dispatches but does not poll async work.
- `--timeout-ms <ms>` and `--poll-ms <ms>` tune waits.
- `--business <key>` selects a named onboarding business: `ecommerce`, `saas`, `home-services`, `fitness-studio`, `cafe`, `blogsite`, `course-studio`, `event-venue`, `professional-services`, or `creator-community`.
- `--prompt <text>` overrides the rotating business prompt.
- `--force` forces MVP rebuild when using `build-mvp`.
- `--env-file <path>` loads an explicit local/test env before execution.

Required environment depends on the local runner path. For the existing runner, expect:

- `SUPABASE_URL_CLOUD`
- `SUPABASE_SERVICE_ROLE_KEY_CLOUD`
- `SUPABASE_ANON_KEY_CLOUD`
- `TEMPLATE_PROVISIONING_SECRET` when the action dispatches Build MVP
- `E2B_API_KEY` when watching or probing a live E2B sandbox

Do not rely on default production target values. Always set the local backend URL and local domain explicitly.

## Workflow

1. Pick a slug. Prefer `codex-local-<purpose>-<yyyymmddhhmm>`; keep it short and lowercase.
2. Start or verify local PM2 for the target worktree.
3. Run the relevant local PM2 command with `--json` when possible.
4. Capture these IDs from output: email, userId, companyId, companySlug, taskId, idempotencyKey.
5. For MVP/foundation work routed through E2B, watch the sandbox after a companyId or taskId exists:

```bash
node __OMO_HOME__/.codex/skills/gondoor-local-test-user/scripts/watch_e2b_sandbox.mjs --company-id <company-id> --watch --pm2-app tenant-provisioning-backend
node __OMO_HOME__/.codex/skills/gondoor-local-test-user/scripts/watch_e2b_sandbox.mjs --task-id <task-id> --watch --pm2-app tenant-provisioning-backend
```

Prefer `--task-id` once a build task is known. The watcher first reads `engineering_task_execution_attempts.timing_metadata.provider.sandboxId`; if the attempt exists but has no sandbox id yet, it falls back to `Sandbox.list()` and matches E2B metadata (`gondoor_task_id`, `gondoor_attempt_id`, `gondoor_company_id`) so live sandboxes can be probed before the DB row is finalized. It then connects with the local `e2b` SDK, lists running sandbox commands, and tails `/tmp/gondoor-e2b-events.log`. It is read-only for test inspection: do not kill sandboxes, delete files, run deploys, or print raw env values. If no sandbox appears, use queue/job status and PM2 logs before concluding E2B did not start.

6. Inspect local PM2 through `$gondoor-local-inspect`:

```bash
rtk __OMO_HOME__/.codex/skills/gondoor-local-inspect/scripts/local_pm2.sh status
rtk __OMO_HOME__/.codex/skills/gondoor-local-inspect/scripts/local_pm2.sh assert-cwd backend "$PWD"
```

7. Inspect bounded recent errors and focused app logs:

```bash
rtk __OMO_HOME__/.codex/skills/gondoor-local-inspect/scripts/local_pm2.sh errors 160 backend
rtk __OMO_HOME__/.codex/skills/gondoor-local-inspect/scripts/local_pm2.sh logs 160 backend
rtk __OMO_HOME__/.codex/skills/gondoor-local-inspect/scripts/local_pm2.sh errors 160 tenant-provisioning-backend
```

8. Check local health and user-facing surfaces:

```bash
rtk __OMO_HOME__/.codex/skills/gondoor-local-inspect/scripts/local_pm2.sh health 3001 /health/live
```

9. Report:

- command run
- email and company/task IDs
- pass/fail step
- backend HTTP error body or queue/task failure
- E2B sandbox ID, attempt status, sandbox event-log summary, or explicit "no sandbox ID observed"
- `$gondoor-local-inspect` local PM2 commands run
- PM2 app status, cwd, and restart signal
- relevant local PM2 log lines summarized, not pasted wholesale
- local URLs checked
- next file/service to inspect if code work is needed

## Failure Reading

Onboarding commonly fails in queue jobs. Treat `engineering_queue_jobs.last_error` as the primary signal, then corroborate with local `backend` or `tenant-provisioning-backend` logs.

Build MVP failures usually show in `foundation_build` task status, `company_infra`, and PM2 logs.

Ecommerce setup requires an ecommerce onboarding business, completed MVP infra, and the exact dashboard idempotency key. The runner computes that key. If the backend still rejects it, report the returned conflict exactly.

SaaS setup requires existing MVP infra and a valid trusted-user bearer token.

Blogsite setup requires existing MVP infra and a valid trusted-user bearer token. The runner dispatches a `core_feature_build` engineering task asking the agent to build a blog site from a sample blog site inside the MVP-built tenant website.
