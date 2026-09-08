# OMO

Portable native OMO configuration, plugins, hooks, rules, and isolated skill
loading. OMO is separate from Claude Code/OMC and OMP.

## Restore on another computer

Use macOS or Linux with Node.js 24+, Bun 1.4+, npm, and Git. Install `dcg` and
`rtk` on `PATH` for the configured Bash hooks. The source machine used DCG
0.6.7 and RTK 0.42.4. Their platform-specific binaries are not copied.

```bash
git clone https://github.com/aslaii/dotfiles.git ~/dotfiles
npm install -g omo-ai@beta
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
`~/.omo/backups/`. An unchanged rerun does not create more backups. It installs
the three pinned packages, the owned comment-checker extension, and the four
built-in extension loaders using the destination OMO installation. Existing
directory symlinks are left in place when their files already match. The
command refuses changed writes through those links rather than modifying
another checkout or moving unrelated application state.

A restore archives obsolete OMO-local `skill-library/codex` and
`skill-library/shared` directories through the same backup mechanism. It never
modifies external `~/.codex`, `~/.agents`, or `~/.claude` skill sources.

Use `launch.sh` for isolated skill discovery. Updated Zsh functions route `omo`
through it automatically in new shells. The launcher always runs the globally
npm-installed `omo-ai` package from `npm root -g`, not `omo` from `PATH`.
Use Node LTS with `nvm use --lts`. Bundled skills come from the
selected npm package; without a complete install it exits 127 telling you to
run `npm i -g omo-ai@beta`. `OMO_BUNDLED_SKILLS_DIR` still overrides only the
bundled-skill directory. It retains OMO's own package extensions
and loads only individual OMO-native, bundled OMO, and active-package skills.
Imported snapshots, `caveman-*`, and `cavecrew` are excluded at both settings
and launcher boundaries. The launcher refuses global or project settings that
enable Claude MCP imports. It loads the OMO-owned Argent rule explicitly;
project context files and native rule discovery remain enabled.

To skip plugin installation or restore into a separate home directory:

```bash
bun ~/dotfiles/omo/restore.mjs --skip-packages
bun ~/dotfiles/omo/restore.mjs --home "/tmp/omo test home" --skip-packages
```

## Included configuration

| Source | Restored location and purpose |
|---|---|
| `omo.jsonc` | `~/.omo/omo.jsonc`: native model routes, profiles, and task/team limits |
| `agent/settings.json` | `~/.omo/agent/settings.json`: models, fallbacks, package sources, skill exclusions, permission settings, and UI preferences |
| `agent/hooks.json` | `~/.omo/agent/hooks.json`: `dcg` and `rtk hook claude`, before Bash calls, with 10-second timeouts |
| Native and bundled OMO skills | Loaded from `~/.omo/agent/skills` and the pinned OMO installation, excluding Caveman names |
| Ponytail package skills | Six skills loaded from `@dietrichgebert/ponytail@4.9.0`, with package-local Caveman exclusions |
| `agent/extensions/comment-checker.js` | `~/.omo/agent/extensions/comment-checker.js`: owned checker integration |
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
- `pi-comment-checker` remains pinned to
  `0a38dd8ff362be1b6020f2baba7b5723cbc5ea76` for its parser and runner, while
  its automatic extension is disabled with `extensions: []`.
- The restored owned `comment-checker.js` extension runs the checker without
  replacing unrelated files such as `herdr-presence.js`.
- The bundled `unslop` skill says to apply it to all writing. This is an agent
  instruction, not a shell hook. Other skills load when their tasks match.

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
load the owned extension and the new skill policy.

OMO's bundled skills and theme come with the pinned OMO installation. Additional
OMO-native skills may be placed in `~/.omo/agent/skills`. Ponytail is supplied
only by its pinned installed package; restore does not fetch or materialize a
Codex/shared skill snapshot. `--skip-packages` skips package installation but
still restores configuration and owned resources.

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
bun test omo/config.test.js omo/fast.test.js omo/herdr-presence.test.js omo/comment-checker.test.js
bun omo/comment-checker-qa.mjs
gitleaks dir omo --redact --no-banner
```

Scan installed package payloads separately from the portable configuration tree.

## Herdr Agents presence

`agent/extensions/herdr-presence.js` is a native OMO extension. Inside a
Herdr pane it registers the running TUI as an Agents entry, agent `omo`,
state `unknown`, so you can click that row in Herdr and land back on the
right OMO pane. It reports once at session start and again on reload, new
session, resume, or fork; it releases the entry on normal quit or process
exit. A file pane opened with `less`, or any non-TUI OMO invocation such as
`--mode rpc`, never appears. This extension is not part of `restore.mjs`;
restore does not install, remove, or otherwise touch it, and running restore
is unaffected either way.

### Prerequisites

You need a Herdr pane: `HERDR_ENV=1` and nonempty `HERDR_BIN_PATH`,
`HERDR_SOCKET_PATH`, and `HERDR_PANE_ID` in the environment OMO starts in.
Herdr sets these for panes it manages. Outside a Herdr pane, or in a non-TUI
OMO mode, the extension loads but does nothing.

### Install

OMO loads `.js`/`.ts` extensions from `<agentDir>/extensions`, where
`agentDir` is the first nonblank value among `OMO_CODING_AGENT_DIR`,
`SENPI_CODING_AGENT_DIR`, and `PI_CODING_AGENT_DIR`, trimmed and resolved
against your working directory if relative, falling back to
`~/.omo/agent` when none are set. Resolve that same directory before
installing, so the file lands where OMO will actually look for it:

```bash
REPO="$HOME/dotfiles" # set to the checkout location
AGENT_DIR="$(node --input-type=module -e '
  import {homedir} from "node:os";
  import {resolve, join} from "node:path";
  const env=process.env;
  const override=["OMO_CODING_AGENT_DIR","SENPI_CODING_AGENT_DIR","PI_CODING_AGENT_DIR"]
    .map(k=>env[k]?.trim()).find(Boolean);
  console.log(override ? resolve(override) : join(env.HOME || env.USERPROFILE || homedir(), ".omo", "agent"));
')" || exit
SRC="$REPO/omo/agent/extensions/herdr-presence.js"
DEST="$AGENT_DIR/extensions/herdr-presence.js"
test -f "$SRC" || exit 1
mkdir -p "$AGENT_DIR/extensions"
if test -e "$DEST" || test -L "$DEST"; then
  printf '%s\n' "Already exists; inspect without overwriting: $DEST" >&2
  exit 1
fi
ln -s "$SRC" "$DEST"
```

If you want a separate agent directory instead of `~/.omo/agent`, export the
override before running the recipe, for example
`export OMO_CODING_AGENT_DIR="$HOME/omo-work/agent"`, and use that same
exported value for the ordinary `omo` launches that follow. This project does
not export that variable for you and does not write it to any shell startup
file. The refusal above is deliberate: if `$DEST` already resolves to `$SRC`,
the extension is already installed and the command exits without touching it.

Some filesystems and editors don't preserve symlinks. Use a copy instead:
run the same recipe above through the `mkdir -p` and the `test -e "$DEST" ||
test -L "$DEST"` refusal, then replace only the final `ln -s "$SRC" "$DEST"`
line with this `COPYFILE_EXCL` copy, which fails closed the same way the
symlink line does if `$DEST` already exists:

```bash
node --input-type=module -e '
  import {copyFileSync, constants} from "node:fs";
  copyFileSync(process.argv[1], process.argv[2], constants.COPYFILE_EXCL);
' "$SRC" "$DEST"
```

Don't run the symlink recipe to completion and then copy on top of it; the
copy would fail because the destination already exists. Swap the last line
before you run it.

### Reload, new session, and normal exit

A native `/reload` or a new session in the same pane keeps reporting the
same `omo` entry; it does not release and re-add it. Quitting OMO normally
releases the entry once. The extension also installs a synchronous Node
`exit` handler with no async work, as a fallback release path for a normal
process exit that skips OMO's own quit flow. It does not install a signal
handler of its own and does not change how OMO handles signals or quit, so
cleanup on a signal-terminated or crashed process is not promised. `SIGKILL`
never runs it, since `SIGKILL` bypasses all handlers unconditionally.
Herdr's own state, not this extension, decides what happens to a row left
behind by a process that died that way.

### Transport failure recovery

Each report or release call is bounded to one second and never retried on a
timer. If a report call fails, OMO shows a warning in the current TUI naming
the failed visibility and telling you to `/reload` once the transport is
available again; the next native session start or `/reload` for that pane
retries once, with no background retry loop in between. A release or
process-exit failure instead goes to stderr, since the TUI may already be
gone by the time exit runs. That recovery instruction only covers a Herdr
socket or binary that comes back; it does not change a process's inherited
`HERDR_BIN_PATH` after the fact. If `HERDR_BIN_PATH` was wrong or missing for
that pane, fix the environment and relaunch OMO in it. If a pane's OMO
already stopped and Herdr still shows a stale `omo` row for it, confirm the
process is gone, then release the entry directly with the same identity the
extension would have used:

```bash
herdr pane release-agent "$PANE_ID" --source custom:omo-presence --agent omo
```

Use the actual Herdr pane ID for that pane, from `herdr pane list` or the
Agents view. Don't release an entry for a pane where OMO is still running;
its next native session start or `/reload` reports it again, not this
cleanup command.

### Uninstall

Resolve `SRC` and `DEST` the same way as install. Confirm `DEST` is the
installed artifact, either `readlink "$DEST"` equals `"$SRC"` for a symlink
or `cmp "$DEST" "$SRC"` for a copy, then remove only that file:

```bash
rm "$DEST"
```

Don't remove the whole `extensions` directory; other extensions may live
there. After removing the file, use OMO's native `/reload` or quit and
relaunch: native extension removal detects the missing installed path and
releases that pane's entry once, with no timer or background report cycle
involved. A pane with the extension still installed is unaffected.

### Tests

```bash
bun test omo/herdr-presence.test.js
```

The tests exercise the default factory through its runtime seam: argv and
addressing, eligibility per OMO mode, listener handoff across reload and
rebuild, matching removal and quit cleanup, pane isolation, and a real Node
child for the process-exit fallback. They don't call the network or Herdr
itself.

### Unsupported

This extension makes no promise around: an identity that ages out on its
own, cleanup after `SIGKILL`, delivery that survives a Herdr server
restart, or coverage of every possible way something might embed and
launch OMO as a child process. It reports presence only. It does not report
task status, session metadata, or completion, and it does not read or send
model output.
