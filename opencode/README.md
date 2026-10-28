# OpenCode layer

Runtime files live in `~/.config/opencode`; this directory tracks them so a
restore can rebuild the setup.

| Tracked | Installed at |
| --- | --- |
| `config/*` | `~/.config/opencode/` |
| `agents/*.md` | `~/.config/opencode/agents/` (symlinked) |
| `pstack-overrides/<skill>/` | `~/.config/opencode/pstack-overrides/` (symlinked, registered as a `skills` source) |

`omp/agent/skills/pstack` holds the vendored upstream pstack tree and is linked
into `~/.config/opencode/skills` by `scripts/sync-pstack.sh`. That script pulls
`cursor/plugins`, re-copies the skills, relinks them, and rewrites the
`pstack-models` rule path. Run it after pulling upstream changes.
