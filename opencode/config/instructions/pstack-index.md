# pstack — compact index (always on)

pstack comes from Cursor's `cursor/plugins` repository (author: Lauren Tan),
vendored at `~/dotfiles/omp/agent/skills/pstack` and symlinked into
`~/.config/opencode/skills`. All skills except `setup-pstack` set
`disable-model-invocation: true`, so they are hidden from the automatic skill
list. Load one on demand with the `skill` tool by exact ID, or when the user
writes `@<id>`. Do not load a pstack skill just because it exists; load it when
its trigger matches.

Two pstack agents are installed alongside the skills: `poteto-agent` for
code-writing delegates and `comment-sicko` for read-only comment audits. Launch
them with the `subagent` tool's `agent` field, not as skills.

Harness-specific skills are ported: they use the `subagent` tool with an
`agent` field, the `question` tool, `opencode session list` / `session export`
for transcripts, and `.opencode/skills/` or `~/.config/opencode/skills/` for
skill files. `make-bot-ui` is the exception: it builds a UI for Cursor's bot
service, so its `api2.cursor.sh` webhook stays literal.

Where a skill says `/name`, load that skill with the skill tool instead;
OpenCode has no slash commands for this stack.

## Workflow

- `poteto-mode` — poteto's agent style: concise, deliberate subagents, unslopped prose, simple code, verified work. Entry point for the stack.
- `poteto-help` — guide to pstack setup, modes, and which skill fits a task.
- `how` — how does X work; walkthroughs before changing code; placement/ownership questions.
- `why` — why something works this way; rationale, regressions, postmortems, thresholds.
- `teach` — explain a body of work so a person actually understands it.
- `figure-it-out` — auditable playbook for large migrations or ambitious multi-part changes.
- `architect` — sketch types, signatures, and module structure before code.
- `sharpen` — make a task deeper, not bigger, then rewrite the prompt.
- `in-your-own-words` — restate the user's goals and problem.
- `bro` — restate the last message in plain language, no jargon.
- `ketchup` — catch the user up on what changed in this chat.
- `ketchup-video` — same catch-up, delivered as a short subtitled video of slides.
- `recall` — reconstruct working context from history, live state, and the shared record.
- `reflect` — parallel review of the transcript, routed into concrete skill edits.
- `correct` — turn a repeated agent mistake into an impossible one (architecture, types, lint, test, docs).
- `show-me-your-work` — reviewable decision trail for long or unattended work.

## Execution and review

- `arena` — N parallel candidates, pick a base, graft the strongest parts.
- `swarm` — fan out N workers, drain, return one report.
- `interrogate` — adversarial or multi-model review of code.
- `blast-radius` — find what a change could break beyond the diff.
- `benchmark-checklist` — vet a perf measurement before believing or reporting it.
- `statechart` — check a TLA+ model of state transitions and draw it as a Mermaid statechart.
- `tdd` — red/green only when TDD or a failing test is explicitly wanted.
- `no-comments` — hunt down comment slop and encode the constraint.
- `typescript-best-practices` — rules for any `.ts` / `.tsx` edit.
- `automate-me` — turn the user's working style into a reusable mode skill.
- `make-bot-ui` — custom UI that wakes a webhook bot.

## Verification

- `create-verification-skill` — project skill that drives the real app like a user.
- `maintain-verification-skill` — keep that skill and its feature map honest.
- `create-formal-verification-skill` — project skill that proves a property formally.
- `maintain-formal-verification-skill` — re-align formal verification after code changes.

## Setup

- `setup-pstack` — per-role model and reasoning budget for pstack workflows. The only auto-invokable skill here.

## Writing

- `technical-writing` — Diátaxis structure, developer style, STE instruction rules.
- `unslop` — cut AI tells from any writing.

## Principles (load when the trigger matches)

- `principle-attack-the-premise` — two or more fixes on one premise failed the same gate.
- `principle-boundary-discipline` — wiring validation, error handling, framework adapters.
- `principle-build-the-lever` — non-trivial bulk work: build the tool that does or proves it.
- `principle-encode-lessons-in-structure` — the same instruction appears twice, or a correction recurs.
- `principle-exhaust-the-design-space` — novel interaction or architectural decision with no precedent.
- `principle-experience-first` — product, UX, or feature-scope tradeoffs.
- `principle-explain-the-number` — before trusting or reporting a measured number.
- `principle-fix-root-causes` — debugging; trace to the first place the system went wrong.
- `principle-foundational-thinking` — choosing core types, data structures, work order.
- `principle-guard-the-context-window` — context filling up: bulk output, long files, fan-out.
- `principle-laziness-protocol` — refactoring, diff size, temptation to add abstractions.
- `principle-make-operations-idempotent` — commands and loops that run amid crashes and retries.
- `principle-migrate-callers-then-delete-legacy-apis` — new internal API while old callers remain.
- `principle-minimize-reader-load` — code that is hard to trace.
- `principle-model-the-domain` — stateful logic, heavy branching, repeated shape assumptions.
- `principle-never-block-on-the-human` — tempted to ask about reversible work.
- `principle-outcome-oriented-execution` — planned rewrites with explicit phase boundaries.
- `principle-prove-it-works` — before declaring a task done.
- `principle-redesign-from-first-principles` — integrating a new requirement into an existing design.
- `principle-separate-before-serializing-shared-state` — concurrent writers to one file, branch, key, or object.
- `principle-sequence-verifiable-units` — multi-step work, commit and PR stacking.
- `principle-subtract-before-you-add` — sequencing an addition, refactor, or rewrite.
- `principle-test-behavior-not-implementation` — writing, changing, or keeping a test.
- `principle-type-system-discipline` — designing types or reviewing signatures.
