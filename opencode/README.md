# OpenCode layer

Runtime files live in `~/.config/opencode`; this directory tracks them so a
restore can rebuild the setup.

| Tracked | Installed at |
| --- | --- |
| `config/*` | `~/.config/opencode/` |
| `agents/*.md` | `~/.config/opencode/agents/` (symlinked) |
| `pstack-ports.patch` | applied over upstream pstack by `scripts/sync-pstack.sh` |

`omp/agent/skills/pstack` holds the vendored upstream pstack tree with the
opencode ports applied, and is linked into `~/.config/opencode/skills` by
`scripts/sync-pstack.sh`. That script copies the skills and the two agents from
the `cursor/plugins` marketplace, rewrites the `pstack-models` rule path, then
applies `pstack-ports.patch`. `.pstack-version` records the upstream version.

The `local.pstack-sync` LaunchAgent (`~/.local/bin/pstack-sync`) runs the script
whenever upstream pstack changes. If the ports no longer apply, it leaves
OpenCode on the old version and sends a notification. To resolve:

1. `scripts/sync-pstack.sh --force` updates anyway and puts the hunks that did
   not apply in `opencode/pstack-rejects/`.
2. Port those hunks by hand into `omp/agent/skills/pstack` or `agents/`.
3. `scripts/sync-pstack.sh --save-ports` rewrites `pstack-ports.patch` from the
   vendored tree and clears the rejects.

Any personal edit to a pstack skill follows step 3, so the next sync keeps it.
