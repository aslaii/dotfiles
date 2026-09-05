---
name: omp-prompt
description: Refines rough coding requests into copy-ready prompts for a new Oh My Pi session, with task-specific magic keywords, model roles, advisor and prewalk recommendations. Use when explicitly asked to prepare or improve an OMP prompt; never to execute the underlying task.
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
| `auto` | Infer one primary mode and the smallest adequate workflow. | None for trivial work. |
| `feature` | Deliver the named user journey; state non-goals and observable acceptance. | `orchestrate` only for substantial independent slices; prewalk on when bounded. |
| `debug` | Trace the reported failure to owning state/caller. RCA only unless fixing is clear; a fix addresses root cause and the failing path. | `ultrathink`; prewalk off while uncertain. |
| `change` | Define changed behavior and invariants; migrate affected callers without adjacent redesign. | `ultrathink` for tricky transitions; `orchestrate` for substantial slices. |
| `optimize` | Measure one reproducible scenario before/after; change only proven bottlenecks when fixes are authorized. | `workflowz` broad, `ultrathink` localized; prewalk off for diagnosis. |
| `audit` | Read-only, evidence-backed, severity-ranked findings and coverage gaps unless fixes are explicit. | `workflowz` broad, `ultrathink` narrow; prewalk off. |
| `verify` | Exercise the real changed journey against actual criteria; setup checks alone are not proof. | `workflowz` only for independent slices; prewalk off. |
| `plan` | Implementation-ready contracts, dependencies, risks, and verification gates; no implementation or approval. | `ultrathink` when difficult; `@plan`; prewalk off. |
| `continue` | Transfer only unfinished work, decisions, evidence, failed attempts, and exact next action. Never redo completed work or treat a plan as approved. | Inherit the remaining task's workflow. |

Prefer no magic keyword for trivial work and one for substantial work. Combine only for distinct contracts; every included keyword activates on the submitted turn. Select `workflowz` only when both `eval` and `task` are available, but do not add those tool names to the prompt merely to activate it. Never inflate scope to justify delegation.

## Setup

- **Model:** `@smol` for straightforward bounded work, `@default` for normal delivery, `@slow` for uncertain/high-risk reasoning, `@plan` for planning. Respect explicit user choices.
- **Prewalk:** on only for substantial, settled implementation that can hand off to `@smol`; off for prompt-writing, read-only work, unresolved diagnosis/optimization, direct `@smol`, or critical invariants still requiring strong reasoning.
- **Advisor:** off by default. Turn on for explicit requests or concrete architectural, security, billing, migration, data-loss, or concurrency risk. It adds scrutiny, latency, and provider use—not verification or approval.
- **Thinking:** keep the role default. Suggest `--thinking max` only for a concrete reason; `ultrathink` raises effort automatically only under AUTO thinking.

Do not inventory settings. Prefer role aliases. Inspect only a consequential unknown: `modelRoles`, or `magicKeywords.enabled` plus the selected keyword switch. Reuse results unless project/profile settings changed. Never inspect credentials or mutate configuration. If native syntax remains uncertain, read only the relevant OMP doc.

## Output

Initial delivery has exactly these sections, with no preliminary plan, progress update, alternate draft, or post-delivery self-review:

### OMP setup

One compact recommendation: mode, keyword(s) or none, role, prewalk on/off, advisor on/off, and the concrete tradeoff. Then:

- Fresh process in the same project/worktree: `rtk omp --model @<role> --prewalk` or `rtk omp --model @<role> --no-prewalk`.
- Separate in-session command: `/advisor on` or `/advisor off`.

These are recommendations, not applied settings. Add a thinking flag only when justified. If keyword activation was not inspected, say so briefly; if known disabled, give the relevant native `omp config set` command. On revisions, say `Setup unchanged` rather than repeat commands.

### Refined prompt

One copy-ready `text` block; tell the user once to copy its contents. A selected magic keyword must appear as exact lowercase standalone prose—even sentence-initial—never as code. Omit launcher flags and slash commands. Use the shortest prompt that preserves the request: normally 120–250 words, and over 350 only when the user's real criteria require it.

Use only helpful headings: Objective; Context/evidence; Scope and preserved behavior; Execution; Acceptance and deliverable. State each requirement once. Do not echo the objective, restate OMP's stable project rules, or add generic checklists.

For continuation, separate completed evidence from remaining work and name the next action; recheck completed work only when new changes invalidate it. Specify relevant observable verification for the underlying task, not tests of the prompt. UI verification requires the actual surface/environment. Audit/verification outcomes label criteria verified, failed, blocked, or not tested and give exact blockers. Include commits, worktrees, PRs, deployment, or merges only when authorized.
