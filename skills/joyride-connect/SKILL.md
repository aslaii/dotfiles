---
name: joyride-connect
description: Connect to the Joyride Mac (JR / joyrideadmin@100.71.250.43) over Tailscale SSH. Use when the user says "JR", "Joyride", "the other Mac", or asks to SSH into Joyride, check its OMP setup, or inspect the herdr workspace remotely.
---

# Joyride Connect

## Route
Alias `JR` is defined in `~/.ssh/config`:

```
Host JR 100.71.250.43
    HostName 100.71.250.43
    User joyrideadmin
    IdentityFile ~/.ssh/aslaii
    IdentitiesOnly yes
    StrictHostKeyChecking yes
```

Connect: `ssh JR`. Via the `read`/`bash` tools use `ssh://JR/<path>` (e.g. `ssh://JR/Users/joyrideadmin/herdr`).

## Tern
- Open **Switch host…** (`⌃⌘H`) and choose **JR**.
- The saved host is `joyrideadmin@100.71.250.43`, named `JR` in `~/Library/Application Support/Tern/hosts`.
- Tern uses the existing `~/.ssh/aslaii` key through the IP match in `~/.ssh/config`; no copied private key or password is needed.
- JR runs `tern remote serve --user --listen 100.71.250.43:8376 --authorized-keys /Users/joyrideadmin/.ssh/authorized_keys --no-iroh` through `~/Library/LaunchAgents/so.stencil.tern.remote.plist`. It starts at user login and listens only on JR's Tailscale address.
- Both Macs need Tailscale connected. Tern uses UDP 8376, not SSH port 22.
- Service log on JR: `~/Library/Logs/Tern/remote-service.log`.

### Phone web access
- Both Macs run `tern web serve` as user launch agents named `so.stencil.tern.web`, with no terminal tab. They start at user login.
- dev listens on `100.81.77.115:8377`; JR listens on `100.71.250.43:8377`. Both bind only to their Tailscale address.
- Each Mac keeps its own private token in `~/Library/Application Support/Tern/web-token`. Do not publish tokens; tokenized URLs grant terminal access.
- Logs: `~/Library/Logs/Tern/web-service.log`.
- Phone access is blocked on the installed 0.4.5 build: both endpoints return HTTP 404, `No web client here: build it with just tern-web, or pass --assets DIR.` The installed app lacks the web client assets, and the official 0.4.5 release file list has no separate web-client artifact.
- To finish, obtain the matching compiled web client, put it in a persistent directory on each Mac, add `--assets DIR` to each web launch agent's arguments, reload the agents, and verify the rendered client and a real session before sharing phone links.

## Key locations on JR
- Project workspace: `~/herdr` (contains the `joyride` repo; failing worktrees live under `joyride/.worktrees/`).
- OMP config: `~/.omp/agent/models.yml` (provider baseUrl/api/authHeader — no API keys here by design).
- OMP credential store: `~/.omp/agent/agent.db` (SQLite; login-sourced API keys/OAuth tokens live here, not in config or macOS Keychain).
- OMP logs: `~/.omp/logs/omp.<date>.<pid>.log`.

## Credential precedence (OMP)
`runtime --api-key > models.yml provider apiKey > stored OAuth > login-sourced stored API key (agent.db) > environment > ordinary stored API key > fallback resolver`.

A dormant macOS Keychain item (`commandcode-api-key`, login.keychain-db) exists on JR but is NOT in the active cascade — don't chase it when auth-debugging.

## Debugging 401s / stale creds
1. `omp token <provider>` — get the active fingerprint (SHA-256 prefix), never the raw token.
2. Query `agent.db` for that provider's credential rows; duplicates cause a stale row to stay selectable even after a new key is added.
3. Back up the DB before mutating: `cp agent.db agent.db.backup-<reason>-<timestamp>`, then `PRAGMA quick_check` after.
4. Delete only the stale row id; keep the newest.
5. Smoke-test with fallback disabled so success can't be masked by a fallback model:
   `omp -p --no-session --no-title --no-tools --model <provider>/<model> "Reply with exactly: AUTH_OK"` plus a temp overlay (`modelFallback: false`, `usageAwareFallback: false`, empty fallback chain).
6. Confirm success from the fresh log (`provider=<provider>`, `stopReason: stop`), not just stdout — a fallback model can produce the same visible output.
</content>
