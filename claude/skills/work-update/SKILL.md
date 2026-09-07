---
name: work-update
description: Use when the user invokes $work-update, asks for a short non-technical Discord work update by date or cutoff time, wants only aslaii/Jericho landed work, wants in-progress percentages, or wants updates from Gondoor plus Ramiro Law repositories. Defaults to today's date.
---

# Work Update

## Quick Start

Run the context collector:

```bash
python3 ~/.codex/skills/work-update/scripts/generate_update.py
```

Include Ramiro `origin/dev` activity by default:

```bash
git -C /Users/aslaii/work/mobii/ramiro-law log --oneline \
  --since '<YYYY-MM-DD 00:00:00 +0800>' --until '<YYYY-MM-DD 23:59:59 +0800>' \
  --author 'Jericho|111640116+aslaii@users.noreply.github.com' \
  origin/dev --max-count=50
```

Check Ramiro worktrees and detect which path is based on `dev`:

```bash
git -C /Users/aslaii/work/mobii/ramiro-law worktree list --porcelain
```

Include `origin/dev` for Ramiro by default:

```bash
git -C /Users/aslaii/work/mobii/ramiro-law log --oneline \
  --since '<YYYY-MM-DD 00:00:00 +0800>' --until '<YYYY-MM-DD 23:59:59 +0800>' \
  --author 'Jericho|111640116+aslaii@users.noreply.github.com' \
  origin/dev --max-count=50
```

Check Ramiro worktrees and identify which one is based on `dev`:

```bash
git -C /Users/aslaii/work/mobii/ramiro-law worktree list --porcelain | sed -n '1,120p'
```

Pass a date when supplied by the user:

```bash
python3 ~/.codex/skills/work-update/scripts/generate_update.py "Jun 1 2026"
```

Pass a cutoff time when supplied by the user:

```bash
python3 ~/.codex/skills/work-update/scripts/generate_update.py "Jun 2 2026" --until-time 6PM
```

Pass an evening-to-morning range when the user asks for `Jun 3 evening` and `Jun 4 morning` style output:

```bash
python3 ~/.codex/skills/work-update/scripts/generate_update.py "Jun 4 2026" \
  --since-date "Jun 3 2026" --since-time 6PM --until-time 12PM
```

The script writes:

```text
/tmp/work-update-context-YYYY-MM-DD-to-YYYY-MM-DD.md
```

Open that context file. Codex writes the final Discord update prose into:

```text
/tmp/work-discord-update-YYYY-MM-DD.md
```

## Output Rules

- Keep lines short, non-technical, and Discord-ready.
- Separate updates by project. Use this Discord Markdown shape:
  - `**Work Update**`
  - `*June 2, 2026 until 6:00 PM*`
  - `**Gondoor**`
  - `**Pushed to Production:**`
  - `- **Scope** - Update text.`
  - `  - Short technical detail.`
  - `  - Short technical detail.`
  - `**In Progress:**`
  - `- **Workstream** *(80%)* - Status text.`
  - `  - **What is being worked on**: Current focus from `.omo` context.`
  - `  - Short implementation detail.`
  - `**Ramiro**`
  - `**Pushed to Production:**`
  - `**In Progress:**`
- Always include both `Gondoor` and `Ramiro` sections, even when one subsection has no source-backed items.
- For ranged evening/morning updates, segment landed work by date and half-day:
  - `**Jun 3 - Evening**` for `6:00 PM` through `11:59 PM`
  - `**Jun 4 - Morning**` for `12:00 AM` through `12:00 PM`
- Do not tag people or include mentions.
- Give each update 2-3 sub-bullets only when the detail is source-backed. Source-backed means the context file shows it from commit body, PR body/title, changed files, or diff/stat.
- Omit sub-bullets when the source does not provide useful detail. Never add filler just to reach a bullet count.
- Avoid repeated wording. Do not repeat the main update sentence as a sub-bullet.
- Never use generic detail bullets such as `Related checks were updated`, `Related tests or support files were updated`, `Active local work changed`, or `Verification or review is next`.
- Landed work from the tracked base ref is deployed/dev-synced work; use `origin/main` for Gondoor and `origin/dev` for Ramiro. List it under `**Pushed to Production**` instead of repeating `Pushed to production.` on every update line.
- Include authored Ramiro commits from `origin/dev` in `**Ramiro** / **Pushed to Production:**` with neutral wording (no branch names in bullet text).
- Do not mention branch names, commit hashes, or commit messages in the Discord text, especially in `In Progress`.
- Include landed work authored by `aslaii` / `Jericho` / `111640116+aslaii@users.noreply.github.com`, including merge commits whose merged branch contains that authored work.
- Exclude website-editor / MVP-site-editor work by other authors.
- Keep `Pushed to Production` to landed work by default. Do not use all-ref account history for the Discord text unless the user explicitly asks for raw account activity; it can duplicate branch commits and squash-merged PR commits.
- If no source-backed active stream is found for Ramiro, leave `**Ramiro**` > `**In Progress:**` empty.
- Include history from:
  - `/Users/aslaii/work/mobii/gondoor-mono` using `origin/main`
  - `https://github.com/Gondoor/Gondoor-Template.git` cloned/fetched at `/tmp/Gondoor-Template`
  - `/Users/aslaii/work/mobii/ramiro-law` using `origin/dev`
- Default date is today in `Asia/Manila`.
- Default window for today is midnight to current `Asia/Manila` time. Past dates default to the full day. Use `--until-time` when the user says `up to`, `until`, or gives a cutoff.
- Add project-local `In Progress` only for active worktrees with unmerged commits, recent source-backed dirty changes, or recent `.omo`, `.omc`, or `.omo/plans` artifacts.
- Include recently created or recently updated `.omo` artifact-only worktrees even when they have no unmerged commit or dirty source files. Use `.omo/boulder.json`, `.omo/plans`, `.omo/drafts`, `.omo/start-work`, `.omo/ulw-loop`, and `.omo/evidence` files as source context.
- Discover Gondoor worktrees from `/Users/aslaii/work/mobii/gondoor-mono` and Ramiro worktrees from `/Users/aslaii/work/mobii/ramiro-law`, including Superpowers worktrees registered by `git worktree list`.
- For the in-progress headline after the dash, describe the active work itself. Do not use process filler like `testing is done`, `review and push are next`, `code is done`, or similar status phrasing.
- In-progress sub-bullets must describe the unmerged commit body, changed paths, or diff/stat from the context file. If the only known fact is status/percent, do not add sub-bullets.
- For every `In Progress` item below `100%`, include a first sub-bullet exactly shaped as `**What is being worked on**: ...`. Prefer `.omo` `Current focus:` or active plan `What you'll get:` text; otherwise use the strongest source-backed changed-path, diff, or commit detail. Skip this bullet for `100%` items.
- Do not list random dirty-only worktrees as in progress. Exception: include the current `main`/`staging` worktree when changed files plus task/artifact/test context clearly identify active work in the update window.
- Patch-equivalent branches and worktrees whose scope already landed in the update window are omitted by default, even when local commit timestamps differ from the squash merge. Use `--all-in-progress` only when the user asks for broad debugging.
- In-progress percentages are mandatory. Always include `*(N%)*` for every `In Progress` item.
- For in-progress percentages, use explicit user overrides first, then AI/Superpowers artifacts (`docs/superpowers`, `.ai`, `.omo`, `.omc`, `.gsd`, `.codex`), then concrete test-result artifacts such as `.last-run.json`.
- When the user corrects an in-progress percentage or status, pass it with `--in-progress` and let that override artifact-derived percentages for the refreshed update.
- When artifact progress is below `100%`, include current work context from `.omo`/`.omc` plan or goal files when available:
  - `Current focus: ...`
  - `Checked: ...`
  - `Unchecked: ...`
- If no artifact-backed percentage exists, use a conservative estimate from the context: plan-only work `15%`, plan plus active test/source changes `25%`, dirty source-only work `40%`, unmerged commits `60-75%`, dirty source plus test coverage `70-80%`, verified complete `100%`.
- Do not omit a percentage. Do not call an estimate artifact-backed in final Discord text.
- Default in-progress output is capped to the top 3 high-signal workstreams. Use `--max-in-progress N` or `--all-in-progress` only when the user asks for a broader list.
- Scope these subjects explicitly:
  - `publish codex templates` / `codex templates by id` -> `E2B Templates`
  - `require neon org id` / `neon org id` -> `Provisioning`
  - `generation progress fallback` -> `Landing Pages`
  - `taste skill` / `tasteskill` / `design-taste-frontend` -> `TasteSkill E2B`

## Workflow

1. Run the context collector with the user's date/cutoff, or with no argument for today.
2. Open the generated context markdown.
3. Codex writes the Discord update from the context. Do not let Python-generated wording become the final copy.
4. Keep bold scope labels, italic percentages, and non-technical lines.
5. Report the final update path and mention the context path if useful.

## Useful Checks

Show source commits:

```bash
python3 ~/.codex/skills/work-update/scripts/generate_update.py "Jun 1 2026" --show-commits
```

Show Ramiro activity on `origin/dev`:

```bash
git -C /Users/aslaii/work/mobii/ramiro-law log --oneline \
  --author 'Jericho|111640116+aslaii@users.noreply.github.com' \
  origin/dev --since '<YYYY-MM-DD 00:00:00 +0800>' --until '<YYYY-MM-DD 23:59:59 +0800>'
```

Show Ramiro author activity on `origin/dev` for a date window:

```bash
git -C /Users/aslaii/work/mobii/ramiro-law log --oneline \
  --author 'Jericho|111640116+aslaii@users.noreply.github.com' \
  origin/dev --since '<YYYY-MM-DD 00:00:00 +0800>' --until '<YYYY-MM-DD 23:59:59 +0800>'
```

Generate the old deterministic draft only for diagnostics:

```bash
python3 ~/.codex/skills/work-update/scripts/generate_update.py "Jun 1 2026" --draft
```

Show raw authored commits across all refs for diagnostics only:

```bash
python3 ~/.codex/skills/work-update/scripts/generate_update.py "Jun 1 2026" --show-authored-commits
```

Override in-progress wording when the user supplies exact percent/status:

```bash
python3 ~/.codex/skills/work-update/scripts/generate_update.py "Jun 2 2026" --until-time 6PM \
  --in-progress "Codex CLI E2B=80:code is done, testing is next" \
  --in-progress "UGC=100:review and push are next"
```

Show all unmerged worktrees if needed:

```bash
python3 ~/.codex/skills/work-update/scripts/generate_update.py "Jun 2 2026" --all-in-progress --max-in-progress 20
```

Override repo paths only when needed:

```bash
python3 ~/.codex/skills/work-update/scripts/generate_update.py "Jun 1 2026" \
  --mono-repo /path/to/gondoor-mono \
  --template-dir /tmp/Gondoor-Template \
  --ramiro-dir /path/to/ramiro-law
```
