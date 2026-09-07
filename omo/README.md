# OMO

Portable native OMO configuration, plugins, hooks, and rules, with a pinned
external skill source. OMO is separate from Claude Code/OMC and OMP.

## Restore on another computer

Use macOS or Linux with Node.js 24+, Bun 1.4+, npm, and Git. Install `dcg` and
`rtk` on `PATH` for the configured Bash hooks. The source machine used DCG
0.6.7 and RTK 0.42.4. Their platform-specific binaries are not copied.

```bash
git clone https://github.com/aslaii/dotfiles.git ~/dotfiles
npm install -g omo-ai@5.0.0-0.beta.48
bun ~/dotfiles/omo/restore.mjs
bash ~/dotfiles/omo/launch.sh
```

In OMO, authenticate OpenAI Codex and Claude with `/login`, then review and
enable the imported hooks with `/hooks`. Hook trust is deliberately local to
each computer. Restart OMO after restoring; resumed sessions may retain an
older model selection.

The restore command copies resources rather than linking the checkout. It
merges settings, replaces the managed skill-path list, preserves unrelated
configuration and credentials, and backs up conflicting originals under
`~/.omo/backups/`. An unchanged rerun does not
create more backups. It installs the three pinned packages and regenerates
the four built-in extension loaders using the destination OMO installation.
Existing directory symlinks are left in place when their files already match.
The command refuses changed writes through those links rather than modifying
another checkout or moving unrelated application state.

Use `launch.sh` for isolated skill discovery. Updated Zsh functions route `omo`
through it automatically in new shells. It retains OMO's own package extensions,
loads only explicitly selected skill roots, and refuses global or project
settings that enable Claude MCP imports. It loads the OMO-owned Argent rule
explicitly; project context files and native rule discovery remain enabled.

To skip plugin installation or restore into a separate home directory:

```bash
bun ~/dotfiles/omo/restore.mjs --skip-packages
bun ~/dotfiles/omo/restore.mjs --home "/tmp/omo test home" --skip-packages
```

## Included configuration

| Source | Restored location and purpose |
|---|---|
| `omo.jsonc` | `~/.omo/omo.jsonc`: native model routes, profiles, and task/team limits |
| `agent/settings.json` | `~/.omo/agent/settings.json`: models, fallbacks, package sources, skill paths, permission settings, and UI preferences |
| `agent/hooks.json` | `~/.omo/agent/hooks.json`: `dcg` and `rtk hook claude`, before Bash calls, with 10-second timeouts |
| Pinned `codex` skill snapshot | `~/.omo/agent/skill-library/codex/`: 30 selected skills, isolated from live Codex |
| Pinned `shared` skill snapshot | `~/.omo/agent/skill-library/shared/`: 66 selected skills, isolated from live shared/Claude skills |
| `rules/` | `~/.omo/agent/rules/`: OMO-owned Argent interaction rule |
| `restore.json` | OMO version, resource destinations, and `tps`, `prompt-url-widget`, `files`, `diff` extension selection |

| Role | Model | Reasoning |
|---|---|---|
| Main / Sisyphus | GPT-6 Astra | `medium` |
| Planner, Prometheus, Metis, Atlas | GPT-6 Astra | `max` |
| Former Terra/Luna selections and fallbacks | Muse Spark 1.3 Contributor Free | `xhigh` |
| Optional manual selection | GLM-5.3 through OpenCode Go | `max` |

These choices apply across the default, GPT, Claude, and mixed profiles.
Other Claude work remains on Sonnet 5 or Haiku 4.5. Existing Sol and Mini
fallbacks remain; replacement chains are deduplicated and do not fall back to
themselves.

`max` is a distinct Astra level above `xhigh`, confirmed by the
[OpenAI model reference](https://developers.openai.com/api/docs/models/gpt-6-astra).
Main uses `medium` because OpenAI's [reasoning guide](https://developers.openai.com/api/docs/guides/reasoning)
recommends it for judgment and delegation. This is a cautious default, not a
claim that a published Astra low-versus-medium benchmark proves it optimal.

[Artificial Analysis](https://artificialanalysis.ai/articles/muse-spark-1-3)
reports Muse Spark 1.3 `xhigh` at 61 on its Intelligence Index and 85% on
Terminal-Bench 2.1, with GLM-5.3 `max` at 60 on the same Intelligence Index.
Those aggregate results do not prove Muse wins every coding workload.
Muse's higher-scoring `max` variant is limited-preview and is not supported by
the free Contributor endpoint, whose highest supported level is `xhigh`.

The free model ID is `opencode/muse-spark-1.3-contributor-free`, on
[OpenCode Zen](https://opencode.ai/docs/zen/). Its offer is temporary and
permits training on prompts and completions. Authenticate the `opencode`
provider separately if only `opencode-go` is connected.

[OpenCode Go](https://opencode.ai/docs/go/) costs $10/month; GLM-5.3 consumes
subscription allowance and is not a free endpoint. It is selectable but is
not assigned to any agent or automatic fallback. GLM-5.3 is text-only, and
[Z.ai recommends `max` for coding](https://docs.z.ai/guides/llm/glm-5.3).

[OMO's documentation](https://omo.dev/docs) describes custom model overrides.
The installed native runtime lists Muse explicitly, and a real OMO child
using the free Muse model successfully executed a read tool. This confirms
runtime/tool compatibility, not comprehensive upstream evaluation of every
OMO workflow. Restart existing OMO sessions after changing routes; a running
session can retain its previous category model mapping.

The Grok Night dark theme, fullscreen mode, quiet startup, visible thinking
blocks, Sol priority service tier, and existing permission preferences are
included.

## Plugins and always-on instructions

- `@dietrichgebert/ponytail@4.9.0` injects its instructions before agent turns.
  Its default is `full`; `/ponytail` changes the session mode.
- `@code-yeongyu/comment-checker@0.8.0` provides the checker binary.
- `pi-comment-checker` is pinned to
  `0a38dd8ff362be1b6020f2baba7b5723cbc5ea76` and runs the checker after file edits.
- The bundled `unslop` skill says to apply it to all writing. This is an agent
  instruction, not a shell hook. Other skills load when their tasks match.

OMO's own skills and theme come with the pinned OMO installation. User skill
snapshots are fetched from commit `a2ab0135829a04dcd8dcc5354a7c09ba6b2161bc`
of the published dotfiles repository. `restore.json` pins the exact `omo/skills`
Git tree, verified before any destination write. The current checkout does not
need to contain that payload. Licenses, custom adaptations, references, scripts,
and fixtures remain intact in the installed copy.

Restoration uses local Git objects when available and otherwise fetches the
immutable commit. `--skip-packages` does not disable that fetch. It does not
install into or modify `~/.codex/skills`, `~/.agents/skills`, or `~/.claude`.
The snapshot retains all original resources, but `restore.json` excludes 23
approved optional skills from installation: Academic Research Suite, unused
service integrations, the GSAP family, and selected overlapping audit tools.
Restoration moves existing excluded skill directories into `~/.omo/backups/`
and does not reinstall them. The remaining 96 skills retain their resources.

`__OMO_HOME__` in source resources is replaced with the destination home.
Small binary assets and empty fixtures are stored as `.b64` files and decoded
during restoration. Project-specific skills still require their repositories,
SSH keys, API environment variables, and tools described in each skill.
Install skill-specific dependencies when using that skill; browser dependencies
and browser profiles are not part of this backup.

## Excluded state

Credentials, login tokens, SSH keys, hook/project trust, sessions, memory
databases, logs, caches, browser profiles, installed dependencies, and generated
evidence are excluded. Project-local MCP configuration stays with its project.
Legacy OpenCode-only settings are not applied by this native OMO restore.

The tracked `omo/` directory is configuration. Hidden `.omo/`, `.omc/`, and
`.senpi/` directories are runtime state and are ignored.

## Check the restore code

```bash
bun test omo/config.test.js omo/restore.test.js
gitleaks dir omo --redact --no-banner
```

The external skill snapshot includes upstream test/example credentials and
placeholders. Scan installed payloads separately from the configuration tree.
