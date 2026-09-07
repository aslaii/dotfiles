---
name: gondoor-prod-inspect
description: Read-only Gondoor production inspection over SSH. Use when the user asks to check Gondoor prod, inspect PM2 status, PM2 logs, PM2 errors, production runtime context, or investigate/bug-fix using production logs without repeating `ssh -i ~/.ssh/do_gondoor root@64.23.164.65`. Never use for production file edits, deployments, restarts, database writes, or any mutating production command.
---

# Gondoor Prod Inspect

## Contract

- Connect to prod with `ssh -i ~/.ssh/do_gondoor -o IdentitiesOnly=yes root@64.23.164.65`.
- Treat prod as read-only. Do not edit files, install packages, restart/reload PM2, deploy, change env vars, run migrations, mutate databases, copy files to prod, or run commands with side effects.
- Prefer bounded commands. Use `pm2 logs --lines <n> --nostream`; do not leave streaming logs running.
- If prod evidence points to a fix, summarize findings and make changes locally. Ask explicit user approval before any production mutation.
- If SSH fails because key/host access is unavailable, report exact failure and continue with local investigation where possible.

## Quick Start

Prefer the bundled helper:

```bash
/Users/aslaii/.codex/skills/gondoor-prod-inspect/scripts/prod_readonly.sh status
/Users/aslaii/.codex/skills/gondoor-prod-inspect/scripts/prod_readonly.sh logs 200
/Users/aslaii/.codex/skills/gondoor-prod-inspect/scripts/prod_readonly.sh errors 200
```

When an app name is known:

```bash
/Users/aslaii/.codex/skills/gondoor-prod-inspect/scripts/prod_readonly.sh describe <app>
/Users/aslaii/.codex/skills/gondoor-prod-inspect/scripts/prod_readonly.sh logs 300 <app>
/Users/aslaii/.codex/skills/gondoor-prod-inspect/scripts/prod_readonly.sh errors 300 <app>
```

Direct SSH fallback:

```bash
ssh -i ~/.ssh/do_gondoor -o IdentitiesOnly=yes -o BatchMode=yes root@64.23.164.65 'pm2 status; pm2 logs --lines 200 --nostream'
```

## Investigation Workflow

1. Start with `status` to identify PM2 apps, restarts, uptime, and errored processes.
2. Pull recent logs with `logs 200`; pull error-only logs with `errors 200`.
3. If a specific PM2 app looks suspicious, run `describe <app>` and app-scoped logs.
4. Capture exact error lines, timestamps, app names, restart counts, and environment clues.
5. Correlate findings with local repository code, tests, and recent changes.
6. Keep production unchanged. Only propose prod actions after evidence is clear and user approves.

## Allowed Helper Operations

- `status`: `pm2 status`
- `logs [lines] [app]`: bounded PM2 logs
- `errors [lines] [app]`: bounded PM2 error logs
- `describe <app>`: PM2 process details
- `health`: uptime, memory, disk, PM2 status
- `journal <unit> [lines]`: bounded systemd logs for a named unit

Avoid ad hoc prod commands unless they are clearly read-only (`ls`, `pwd`, `cat`, `tail -n`, `df -h`, `free -h`, `uptime`, `journalctl --no-pager`). Never use write operators (`>`, `>>`), editors, `rm`, `mv`, `cp`, `chmod`, `chown`, `npm install`, `pnpm install`, `pm2 restart`, `pm2 reload`, `pm2 delete`, `systemctl restart`, `docker compose up`, `scp`, or `rsync`.

## Reporting

Report:

- Commands run
- PM2 app status and restart count
- Relevant log excerpts summarized, with exact error strings when useful
- Likely local files or code paths to inspect next
- Any production action needed, clearly separated and requiring approval
