---
name: gondoor-local-inspect
description: Read-only Gondoor local PM2 inspection for the current worktree. Use when the user asks to check local Gondoor PM2 status, inspect local PM2 logs, inspect local PM2 errors, verify PM2 cwd, check local backend health, or investigate local onboarding/MVP/ecommerce/SaaS/blogsite failures without touching production.
---

# Gondoor Local Inspect

## Contract

- Inspect only local PM2 processes on this machine.
- Treat this skill as read-only. Do not start, stop, restart, delete, deploy, edit files, install packages, run migrations, or mutate databases.
- Prefer bounded commands. Use `pm2 logs --lines <n> --nostream`; do not leave streaming logs running.
- Verify the PM2 app belongs to the current worktree before using it as evidence.
- Never SSH to production, run production deploys, inspect `64.23.164.65`, or use production URLs.

## Quick Start

Work from `__OMO_HOME__/work/mobii/gondoor-mono` or the requested Gondoor worktree.

```bash
rtk __OMO_HOME__/.codex/skills/gondoor-local-inspect/scripts/local_pm2.sh status
rtk __OMO_HOME__/.codex/skills/gondoor-local-inspect/scripts/local_pm2.sh assert-cwd backend "$PWD"
rtk __OMO_HOME__/.codex/skills/gondoor-local-inspect/scripts/local_pm2.sh logs 200 backend
rtk __OMO_HOME__/.codex/skills/gondoor-local-inspect/scripts/local_pm2.sh errors 200 backend
rtk __OMO_HOME__/.codex/skills/gondoor-local-inspect/scripts/local_pm2.sh health 3001 /health/live
```

## Workflow

1. Run `status` to identify local PM2 apps, state, restart count, and uptime.
2. Run `assert-cwd backend "$PWD"` before treating `backend` logs as evidence for this worktree.
3. Pull recent backend logs with `logs 200 backend`; pull error-only logs with `errors 200 backend`.
4. For feature builds, also inspect `tenant-provisioning-backend` when active.
5. If a specific PM2 app looks suspicious, run `describe <app>` and app-scoped bounded logs.
6. Capture exact error strings, timestamps, app names, restart counts, cwd, and local port.
7. Correlate findings with local repository code, tests, and recent changes.

## Allowed Helper Operations

- `status`: local `pm2 status`
- `list`: local `pm2 list`
- `cwd [app]`: print PM2 cwd for an app
- `assert-cwd [app] [cwd]`: fail unless the app is running from the expected worktree
- `describe <app>`: local PM2 process details
- `logs [lines] [app]`: bounded local PM2 logs
- `errors [lines] [app]`: bounded local PM2 error logs
- `health [port] [path]`: local HTTP check, default `http://127.0.0.1:3001/health/live`
- `wait [app] [port] [seconds]`: wait for a local PM2 app plus local health check

Avoid ad hoc commands unless they are clearly read-only (`pm2 status`, `pm2 jlist`, `tail -n`, `lsof -i`, `curl -fsS http://127.0.0.1:<port>/health/live`). Do not use `ssh`, `scp`, `rsync`, `pm2 restart`, `pm2 reload`, `pm2 delete`, `pnpm install`, deploy scripts, or production URLs from this inspect skill.

## Reporting

Report:

- commands run
- PM2 app status, cwd, uptime, and restart count
- local backend health result
- relevant log excerpts summarized, with exact error strings when useful
- likely local files or code paths to inspect next
- any mutation needed, clearly separated for the caller skill to perform
