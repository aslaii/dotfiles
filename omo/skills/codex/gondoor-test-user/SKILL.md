---
name: gondoor-test-user
description: Run Gondoor production test-user automation for onboarding, MVP builds, ecommerce setup, SaaS setup, and blogsite setup, then inspect production backend logs over SSH through `$gondoor-prod-inspect` and report failures.
---

# Gondoor Test User

Use this skill when the user asks to test Gondoor production onboarding, create a prod smoke user, run `pnpm run onboard:user`, dispatch Build MVP, dispatch ecommerce setup, dispatch SaaS setup, dispatch blogsite setup, or investigate one of those prod test flows.

## Ground Rules

- Work from `__OMO_HOME__/work/mobii/gondoor-mono`.
- The script mutates production only through official Gondoor backend endpoints plus Supabase admin user setup for the trusted test email.
- Always test production. Do not start, check, or use local web/admin/backend runners for this skill.
- Use production surfaces only: backend `https://api.gondoor.app`, dashboard `https://app.gondoor.app`, and tenant sites `https://<slug>.gondoor.app`.
- Never pass local env files such as `apps/*/.env` or `.env.local`. If an env file is needed, it must be an explicit production/cloud env file.
- Always verify pass/fail through `$gondoor-prod-inspect` SSH helpers. Local logs, local frontend checks, local PM2, local dev servers, and localhost URLs are not valid evidence for this skill.
- If SSH/prod-inspect is unavailable, stop and report that production verification is blocked; do not replace it with local testing.
- The test email must be `jecho.deleon+<slug>@gmail.com`.
- Never print passwords, Supabase keys, bearer tokens, or provisioning secrets.
- Production inspection is read-only through `$gondoor-prod-inspect`.

## Commands

Default onboarding with generated landing page:

```bash
rtk pnpm run onboard:user -- --slug <short-slug>
```

Dispatch against an existing company:

```bash
rtk pnpm run build-mvp:user -- --company-id <company-id>
rtk pnpm run build-ecommerce:user -- --company-id <company-id>
rtk pnpm run build-saas:user -- --company-id <company-id>
rtk pnpm run build-blogsite:user -- --company-id <company-id>
```

Create a fresh ecommerce company, wait for onboarding, build MVP, then dispatch ecommerce and SaaS:

```bash
rtk pnpm run onboard:user -- --action full --slug <short-slug>
```

Create a fresh blogsite company, wait for onboarding, build MVP, then dispatch blogsite:

```bash
rtk pnpm run build-blogsite:user -- --slug <short-slug>
```

Useful flags:

- `--dry-run` checks command shape and env readiness without production mutation.
- `--json` emits final result JSON on stdout and progress on stderr.
- `--no-wait` dispatches but does not poll async work.
- `--timeout-ms <ms>` and `--poll-ms <ms>` tune waits.
- `--business <key>` selects a named onboarding business: `ecommerce`, `saas`, `home-services`, `fitness-studio`, `cafe`, `blogsite`, `course-studio`, `event-venue`, `professional-services`, or `creator-community`.
- `--prompt <text>` overrides the rotating business prompt.
- `--force` forces MVP rebuild when using `build-mvp`.
- `--env-file <path>` loads explicit production/cloud env before execution. Never use local app env files.

Required environment:

- `SUPABASE_URL_CLOUD`
- `SUPABASE_SERVICE_ROLE_KEY_CLOUD`
- `SUPABASE_ANON_KEY_CLOUD`
- `TEMPLATE_PROVISIONING_SECRET` when the action dispatches Build MVP

Production target environment:

- `PROD_BACKEND_URL` or `GONDOOR_PROD_BACKEND_URL` is optional; default is `https://api.gondoor.app`.
- `GONDOOR_PROD_DOMAIN` is optional; default is `gondoor.app`.
- Do not rely on `BACKEND_URL`, `SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `GONDOOR_DOMAIN`, or `NEXT_PUBLIC_GONDOOR_DOMAIN`; those may be local/dev values and must not drive this skill.

## Workflow

1. Pick a slug. Prefer `codex-<purpose>-<yyyymmddhhmm>`; keep it short and lowercase.
2. Run the relevant production command. Do not check or start a local runner first.
3. Capture these IDs from output: email, userId, companyId, companySlug, taskId, idempotencyKey.
4. Inspect production over SSH through `$gondoor-prod-inspect`:

```bash
__OMO_HOME__/.codex/skills/gondoor-prod-inspect/scripts/prod_readonly.sh status
```

5. Inspect bounded recent errors and focused app logs over SSH:

```bash
__OMO_HOME__/.codex/skills/gondoor-prod-inspect/scripts/prod_readonly.sh errors 160
__OMO_HOME__/.codex/skills/gondoor-prod-inspect/scripts/prod_readonly.sh logs gondoor-api 160
__OMO_HOME__/.codex/skills/gondoor-prod-inspect/scripts/prod_readonly.sh logs gondoor-worker 160
```

6. Report:

- command run
- email and company/task IDs
- pass/fail step
- backend HTTP error body or queue/task failure
- `$gondoor-prod-inspect` SSH commands run
- PM2 app status and restart signal from production SSH
- relevant production SSH log lines summarized, not pasted wholesale
- next file/service to inspect if code work is needed

## Failure Reading

Onboarding commonly fails in queue jobs. Treat `engineering_queue_jobs.last_error` as the primary signal, then corroborate with `gondoor-worker` logs.

Build MVP failures usually show in `foundation_build` task status, `company_infra`, and worker logs.

Ecommerce setup requires an ecommerce onboarding business, completed MVP infra, and the exact dashboard idempotency key. The runner computes that key. If backend still rejects it, report the returned conflict exactly.

SaaS setup requires existing MVP infra and a valid trusted-user bearer token.

Blogsite setup requires existing MVP infra and a valid trusted-user bearer token. The runner dispatches a `core_feature_build` engineering task asking the agent to build a blog site from a sample blog site inside the MVP-built tenant website.
