---
name: omp-prompt
description: Refines rough coding requests into copy-ready prompts for a new Oh My Pi orchestration session, with model roles, bounded worker delegation, and advisor/prewalk off by default. Use when explicitly asked to prepare or improve an OMP prompt; never to execute the underlying task.
disable-model-invocation: true
argument-hint: "[auto|feature|debug|change|optimize|audit|verify|plan|continue] <rough request>"
---

# OMP Prompt

Create one self-contained prompt for a NEW OMP session. Refine only: do not execute the requested task, inspect its target, launch sessions, change settings, create worktrees, or save prompt files.

## Input

Arguments after `/skill:omp-prompt` are `[mode] <request>`. Modes: `auto`, `feature`, `debug`, `change`, `optimize`, `audit`, `verify`, `plan`, `continue`. Treat the first token as a mode only on an exact match; otherwise use `auto`. With no request, use the latest concrete task in this conversation or ask for it. `help` returns the modes and three short examples.

## One pass

Classify the conversation before acting:

- **No prompt delivered:** refine silently, check every user criterion once, return one setup and one prompt.
- **Prompt delivered; requirements unchanged:** answer a direct question or acknowledge completion briefly. Never reprint, polish, revalidate, research, or execute the prompt.
- **Requirements changed:** revise only affected decisions. Reuse unchanged evidence and setup; return one revised prompt only when requested.

`prewalk-continue` and other generic continuation notices are not changed requirements. The prompt-writing task ends on delivery; work described inside the prompt belongs to the next session. Do not create more work, todos, tool calls, or drafts to satisfy such a notice. If prewalk keeps nudging, explain once that prompt-writing sessions should start with `rtk omp --no-prewalk`; this does not change the target session's recommendation or disarm the current runtime.

## Refine

Use conversation context and loaded instructions first. An injected copy of this skill needs no second read. Default to zero tools; make one targeted read only when an unresolved fact materially changes scope, authorization, or setup. Reuse prior results. Never probe target executables, inventory the machine, investigate the underlying task, delegate, or run word-count/format checks merely to write its prompt.

Preserve the requested outcome, current/expected behavior, acceptance criteria, restrictions, failures reported by the user, and authorized actions. Do not invent specifications, paths, root causes, measurements, environments, or approvals. Ask one grouped clarification only for a consequential product/scope choice; leave discoverable implementation details to the next agent.

For handoffs, include only relevant decisions, reproduction steps, attempted fixes and outcomes, completed/pending work, and protected user changes. Inline necessary facts or use verified durable paths/URLs. Never depend on session-local URIs, agent IDs, attachments, or “as discussed.” Exclude secrets, unrelated history, whole transcripts, and stable project rules.

Preserve exact semantics: “all filtered rows” is not “current page”; “export a file” does not imply browser download. Correct omissions, not wording.

## Workflow

The request overrides mode defaults: `debug ... fix it` permits a fix; `feature ... plan only` does not.

| Mode | Contract | Usual choice |
|---|---|---|
| `auto` | Infer one primary mode and the smallest adequate workflow. | Main `@default`; no keyword required. |
| `feature` | Deliver the named user journey; state non-goals and observable acceptance. | Main delegates bounded implementation to `task`, difficult work to `terra`; prewalk off. |
| `debug` | Trace the reported failure to owning state/caller. RCA only unless fixing is clear; a fix addresses root cause and the failing path. | Delegate diagnosis to `task` or `terra` according to uncertainty; prewalk off. |
| `change` | Define changed behavior and invariants; migrate affected callers without adjacent redesign. | Delegate bounded changes to `task`, risky transitions to `terra`. |
| `optimize` | Measure one reproducible scenario before/after; change only proven bottlenecks when fixes are authorized. | Delegate diagnosis/implementation; one serial verification owner after edits settle. |
| `audit` | Read-only, evidence-backed, severity-ranked findings and coverage gaps unless fixes are explicit. | Bounded `reviewer` or `security-reviewer`; no continuous advisor. |
| `verify` | Exercise the real changed journey against actual criteria; setup checks alone are not proof. | Assign actual runtime acceptance to `verifier`; prewalk off. |
| `plan` | Implementation-ready contracts, dependencies, risks, and verification gates; no implementation or approval. | Main `@plan`; delegate difficult plan construction to `planner`; prewalk off. |
| `continue` | Transfer only unfinished work, decisions, evidence, failed attempts, and exact next action. Never redo completed work or treat a plan as approved. | Inherit the remaining task's workflow. |

No magic keyword is required for coding delegation. Main orchestrates even a single bounded coding task; it does not switch models to implement inline. Preserve an explicitly requested keyword only when it serves a distinct contract; every included keyword activates on the submitted turn. Select `workflowz` only when both `eval` and `task` are available. Never inflate scope or require parallel workers, a planning wave, or a review wave for trivial work.

## Setup

- **Model:** Main uses `@default` (Sol-medium) for normal launches and `@plan` (Sol-medium) for planning. Delegate bounded implementation to `task`/Luna, difficult implementation to `terra`, and difficult plan construction to `planner`/Claude. Do not switch Main to `@smol` or `@slow` to code. Respect explicit user choices.
- **Prewalk:** off for all recommended launches: `--no-prewalk`. Bounded features are delegated, not handed off by switching Main.
- **Advisor:** off unless explicitly requested. Concrete architectural, security, billing, migration, data-loss, or concurrency risk calls for a bounded `reviewer` or `security-reviewer`, not continuous commentary. Review is not runtime verification or approval.
- **Thinking:** retain each role's configured effort; do not raise Sol effort or add `--thinking max` unless explicitly requested.

Do not inventory settings. Prefer role aliases. Inspect only a consequential unknown: `modelRoles`, or `magicKeywords.enabled` plus the selected keyword switch. Reuse results unless project/profile settings changed. Never inspect credentials or mutate configuration. If native syntax remains uncertain, read only the relevant OMP doc.

## Output

Initial delivery has exactly these sections, with no preliminary plan, progress update, alternate draft, or post-delivery self-review:

### OMP setup

One compact recommendation: mode, keyword(s) or none, role, prewalk on/off, advisor on/off, and the concrete tradeoff. Then:

- Fresh process in the same project/worktree: `rtk omp --model @default --no-prewalk`; planning uses `rtk omp --model @plan --no-prewalk`.
- Separate in-session command: `/advisor off` unless the user explicitly requested an advisor.

These are recommendations, not applied settings. Existing sessions may retain old effort, advisor state, and rendered prompts: use `/advisor off`, select `@default` in `/model`, and start a fresh continuation session for the new orchestration policy. If a requested keyword's activation was not inspected, say so briefly; if known disabled, give the relevant native `omp config set` command. On revisions, say `Setup unchanged` rather than repeat commands.

### Refined prompt

One copy-ready `text` block; tell the user once to copy its contents. A selected magic keyword must appear as exact lowercase standalone prose—even sentence-initial—never as code. Omit launcher flags and slash commands. Use the shortest prompt that preserves the request: normally 120–250 words, and over 350 only when the user's real criteria require it.

Use only helpful headings: Objective; Context/evidence; Scope and preserved behavior; Execution; Acceptance and deliverable. State each requirement once. Do not echo the objective, restate OMP's stable project rules, or add generic checklists.

For continuation, separate completed evidence from remaining work and name the next action; recheck completed work only when new changes invalidate it. Specify relevant observable verification for the underlying task, not tests of the prompt. UI verification requires the actual surface/environment. Audit/verification outcomes label criteria verified, failed, blocked, or not tested and give exact blockers. Include commits, worktrees, PRs, deployment, or merges only when authorized.
