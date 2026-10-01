# OMO

Portable native OMO configuration, plugins, hooks, rules, and isolated skill
loading. OMO is separate from Claude Code/OMC and OMP.

## Restore on another computer

Use macOS or Linux with Node.js 24+, Bun 1.4+, npm, and Git. Install
`rtk` on `PATH` for the configured Bash hook. The source machine used
RTK 0.42.4. Its platform-specific binary is not copied.

```bash
git clone https://github.com/aslaii/dotfiles.git ~/dotfiles
npm install -g omo-ai@5.0.0-0.beta.85
bun ~/dotfiles/omo/restore.mjs
bash ~/dotfiles/omo/launch.sh
```

In OMO, authenticate OpenAI Codex and Claude with `/login`, then review and
enable the imported hooks with `/hooks`. Hook trust is deliberately local to
each computer. Restart OMO after restoring; resumed sessions may retain an
older model selection and do not reload the new startup rules.

The required version is recorded in `restore.json`. Update that pin with the
configuration when upgrading OMO; restore checks the exact installed version.

The restore command copies resources rather than linking the checkout. It
merges settings, replaces the managed skill-path list, preserves unrelated
configuration and credentials, and backs up conflicting originals under
`~/.omo/backups/`. An unchanged rerun does not create more backups. It installs
the four pinned packages, the owned comment-checker and mode-status
extensions, and the four built-in extension loaders using the destination OMO
installation. Existing
directory symlinks are left in place when their files already match. The
command refuses changed writes through those links rather than modifying
another checkout or moving unrelated application state.

Restore retires the managed native `metis`/`momus` keys, unused role catalog
aliases, and old `fast`/`gpt`/`claude`/`mixed`/`gpt-5.6` configuration overlays. Unrelated
custom agents, catalog entries, profiles, and other harness settings are preserved.

A restore archives obsolete OMO-local `skill-library/codex` and
`skill-library/shared` directories through the same backup mechanism. It never
modifies external `~/.codex`, `~/.agents`, or `~/.claude` skill sources.

Use `launch.sh` for isolated skill discovery. Updated Zsh functions route `omo`
through it automatically in new shells. The launcher always runs the globally
npm-installed `omo-ai` package from `npm root -g`, not `omo` from `PATH`.
Use Node LTS with `nvm use --lts`. Bundled skills come from the
selected npm package; without a complete install it exits 127 telling you to
run `npm i -g omo-ai@beta`.
`OMO_BUNDLED_SKILLS_DIR` still overrides only the bundled-skill directory.
It retains OMO's own package extensions and loads only individual OMO-native,
bundled OMO, and active-package skills. The exact `caveman` skill name is
allowed. Imported snapshots, `caveman-*`, and `cavecrew` remain excluded at
both settings and launcher boundaries. The launcher refuses global or project
settings that enable Claude MCP imports. Project context files and native rule
discovery remain enabled.

To skip plugin installation, or restore into a separate home directory:

```bash
bun ~/dotfiles/omo/restore.mjs --skip-packages
bun ~/dotfiles/omo/restore.mjs --home "/tmp/omo test home" --skip-packages
```

## Included configuration

| Source | Restored location and purpose |
|---|---|
| `omo.jsonc` | `~/.omo/omo.jsonc`: native model routes, profiles, and task/team limits |
| `agent/settings.json` | `~/.omo/agent/settings.json`: models, fallbacks, package sources, skill exclusions, permission settings, and UI preferences |
| `agent/hooks.json` | `~/.omo/agent/hooks.json`: `rtk hook claude`, before Bash calls, with 10-second timeout |
| Native and bundled skills | Loaded from `~/.omo/agent/skills` and the pinned OMO installation, excluding imported snapshots and auxiliary Caveman names |
| Ponytail package skills | Six skills loaded from `@dietrichgebert/ponytail@4.9.0`, with package-local Caveman exclusions |
| Caveman package skill | Only `caveman`, loaded from `git:github.com/JuliusBrussee/caveman@v2.6.0` |
| `agent/extensions/comment-checker.js` | `~/.omo/agent/extensions/comment-checker.js`: owned checker integration |
| `agent/extensions/mode-status.js` | `~/.omo/agent/extensions/mode-status.js`: Caveman, Ponytail, and cumulative token TUI status |
| `rules/` | Restored to `~/.omo/rules`: OMO-owned workflow rules, including persistent response modes |
| `restore.json` | OMO version, resource destinations, and `tps`, `prompt-url-widget`, `files`, `diff` extension selection |

| Role | Model | Reasoning |
|---|---|---|
| Main session, including native planning | GPT-6 Sol | `medium` |
| Quick | GPT-6 Luna at Standard speed | `low` |
| Explore, Librarian, Deep-low, Unspecified-low | OpenCode Go DeepSeek V4.1 Flash | `low` or `high` |
| Architect, Visual-engineering, Unspecified-high, Plan-consultant | Claude Opus 5.5 | `medium` or `high` |
| Deep-high | GPT-6 Sol | `high` |
| Ultrabrain and Plan-reviewer | GPT-6 Astra | `high` |
| Artistry and Writing | OpenCode Go GLM-5.3 Flash | `off` |

The only OpenCode Go routes are GLM-5.3 Flash, DeepSeek V4.1 Flash, and
Muse Spark 1.3 Contributor. Routine delegated work starts on DeepSeek Flash;
high-impact work uses GPT or Claude. No automatic route uses a GPT Fast tier.
The selected Go models are native to the installed OMO model registry.

The `pro100` overlay moves `ultrabrain` and `plan-reviewer` off Astra and
starts `quick` on DeepSeek. Launch with `OMO_PROFILE=pro100` when using the
$100 ChatGPT Pro 5x allowance. The default routes target the $200 Pro 20x
allowance. A profile changes routes, not the authenticated ChatGPT account.
The main model stays GPT-6 Sol at `medium` in both profiles.

The main-session retry chain switches from GPT-6 Sol to Claude Opus 5.5
at `medium` on an eligible failure. Opus has no automatic fallback to older
Claude models. Native retry reacts to failures; it does not reserve subscription
usage in advance. Check usage before a long run and switch models manually when
needed. Restore removes the previous managed fallback chains while retaining
unrelated user-defined chains.

`model_profile` chooses only the main model in a fresh session. It does not
override explicit `--model` selections or resumed sessions, change subagent
routes, or replace `agent/settings.json` retry chains. Availability is a
registry/auth check, not a guarantee of remaining quota.

The old `models.sisyphus`, `models.planner`, and related entries were unused
catalog aliases, not native role assignments. Planning uses the current
session model; its consultant and reviewer have explicit agent routes.
`omo-fast` keeps the native configuration and adds its priority extension.
The unused `omo-claude` and `omo-mixed` launchers are retired.

Saved manual favorites are separate from these automatic routes.

[OMO's documentation](https://omo.dev/docs) describes custom model overrides.
Restart existing OMO sessions after changing routes; a running session can
retain its previous category model mapping.

The Grok Night dark theme, fullscreen mode, quiet startup, visible thinking
blocks, standard Sol service tier, and existing permission preferences are
included.

## Plugins and always-on instructions

- `@dietrichgebert/ponytail@4.9.0` provides Ponytail `full`, which controls
  implementation in every new session and across all profiles.
- `git:github.com/JuliusBrussee/caveman@v2.6.0` provides only the upstream core
  `caveman` skill. A restored native rule activates `lite` for user-facing chat
  on every response in every new session and across all profiles.
- `@code-yeongyu/comment-checker@0.8.0` provides the checker binary.
- `pi-comment-checker` remains pinned to
  `0a38dd8ff362be1b6020f2baba7b5723cbc5ea76` for its parser and runner, while
  its automatic extension is disabled with `extensions: []`.
- The restored owned `comment-checker.js` extension runs the checker without
  replacing unrelated files in the extensions directory.
- The bundled `unslop` skill says to apply it to all writing. This is an agent
  instruction, not a shell hook. Other skills load when their tasks match.

The session modes rule keeps Ponytail at `full`. `/caveman`, `/ponytail`, and the
TUI status extension manage per-session levels; `normal mode` disables both.
Every new session starts with Caveman `lite` and Ponytail `full`. Caveman boundaries preserve normal prose in code, comments,
documentation, commits, and other persisted or third-party text. Restore does
not install SimpleEnglish, ASD-STE100, Cavecrew, a Caveman proxy, MCP shrink,
hooks, or any `caveman-*` skill.

The owned checker handles native `write`, `edit`, `multiedit`, and `apply_patch`
results, including nested `tool.*` calls in `eval`. It checks successful files
in a partially applied patch. Findings appear in both the tool result and
session context, even when an eval cell discards its nested tool result.
Missing dependencies, checker crashes, timeouts, and invalid-input skips are
reported as checker errors rather than clean checks. Necessary comments can
remain after review; the checker does not automatically delete them.

Use those mutation tools for file changes. Direct filesystem helpers, shell
redirection, and external editors do not emit OMO tool events and are outside
this hook's coverage. Restart existing OMO sessions after restoring so they
load the owned extension, restored response-mode rule, and exact-name skill
policy.

OMO's bundled skills and theme come with the pinned OMO installation. Additional
OMO-native skills may be placed in `~/.omo/agent/skills`. Ponytail and the core
Caveman skill come only from their pinned installed packages; restore does not
fetch or materialize a Codex/shared skill snapshot. `--skip-packages` skips
package installation but still restores configuration and owned resources.

`__OMO_HOME__` in source resources is replaced with the destination home.
Project-specific native skills still require their repositories, SSH keys, API
environment variables, and tools described by those skills. Browser dependencies
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
bun test omo/isolation.test.js omo/restore.test.js
bun test omo/config.test.js omo/native-config.test.js omo/fast.test.js omo/comment-checker.test.js omo/mode-status.test.js
bun omo/comment-checker-qa.mjs
gitleaks dir omo --redact --no-banner
```

Scan installed package payloads separately from the portable configuration tree.

## Herdr agent state

OMO's built-in herdr reporter reports each TUI pane to Herdr as agent `pi`:
`blocked` while a question or dialog waits, `working` during a turn or live
background work, and `idle` otherwise. Herdr shows an unseen `idle` as done.
It needs no setup here. Don't install an extension named `herdr-*` without
an `HERDR_INTEGRATION_ID=` header: the built-in reporter defers to one.
