# OpenCode layer

Runtime files live in `~/.config/opencode`; this directory tracks them so a
restore can rebuild the setup.

| Tracked | Installed at |
| --- | --- |
| `config/*` | `~/.config/opencode/` |
| `agents/*.md` | `~/.config/opencode/agents/` (symlinked) |
| `pstack-overrides/<skill>/` | applied over `omp/agent/skills/pstack` by `scripts/sync-pstack.sh` |

`omp/agent/skills/pstack` holds the vendored upstream pstack tree with the
opencode ports applied, and is linked into `~/.config/opencode/skills` by
`scripts/sync-pstack.sh`. That script pulls `cursor/plugins`, re-copies the
skills, rewrites the `pstack-models` rule path, then re-applies every override.
Run it after pulling upstream changes. Ports live in `pstack-overrides` so an
upstream sync cannot erase them.
