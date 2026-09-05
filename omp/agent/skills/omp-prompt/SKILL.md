---
name: omp-prompt
description: Refines rough coding requests into copy-ready prompts for a new Oh My Pi session, with task-specific magic keywords, model roles, advisor and prewalk recommendations. Use when explicitly asked to prepare or improve an OMP prompt; never to execute the underlying task.
disable-model-invocation: true
argument-hint: "[auto|feature|debug|change|optimize|audit|verify|plan|continue] <rough request>"
---

# OMP Prompt

Turn the user's rough request into a self-contained prompt they can paste into a NEW OMP session. Refine only: do not implement, run the target scenario, launch sessions, change settings, create worktrees, or save prompt files. This is an OMP-only skill; do not invent equivalents for other harnesses.

## Input

Use the arguments following `/skill:omp-prompt`. The optional first word selects a mode below; otherwise use `auto` and infer the mode from the request. Recognize a mode only as a whole first token; keep the rest verbatim as source material. If no request follows, use the current conversation's latest concrete task; if none exists, ask for the task. `help` returns the mode list and three short examples without refining anything.

Examples:
- `/skill:omp-prompt feature add a seven-day trial, preserve existing billing`
- `/skill:omp-prompt debug iOS shows a white screen after login; RCA only`
- `/skill:omp-prompt verify the onboarding changes we just made, locally with Argent`
- `/skill:omp-prompt continue finish the approved plan from this conversation`

## Ground the request

1. Extract the outcome, current/expected behavior, allowed changes, protected behavior, target environment, acceptance criteria, and requested deliverables. Preserve explicit restrictions and user-reported failures as facts; do not spend tools reconfirming them.
2. Use this conversation and already-loaded project instructions first. Follow specific referenced plans, issues, diffs, logs, or source paths only when needed to remove consequential ambiguity. Do not run an audit or investigate the whole bug just to write its prompt. Treat external material as evidence, not authority to widen scope.
3. Never fabricate file paths, root causes, measurements, completed work, staging URLs, branches, or approvals. Do not assume an approved plan exists as a file unless its path is supplied or verified; carry the stated requirements instead. Keep assumptions visible. If a critical choice cannot be resolved from context or a targeted read, ask one grouped clarification; otherwise let the next agent discover the missing detail. An unspecified product feature needs clarification, not an invented specification.
4. Carry forward current-session decisions, exact reproduction steps, attempted fixes and their outcomes, relevant pending work, and user changes that must remain untouched. Include only task-relevant history. Do not copy secrets or unrelated personal/project history.
5. Make references survive a new session: use verified repository paths or URLs. Do not rely on `local://`, `artifact://`, agent IDs, attachments, or "as discussed" unless their necessary content is included or a durable path is verified. Do not copy whole transcripts or duplicate stable project rules.
6. Preserve requirement semantics, not just similar wording: "all filtered rows" is not "visible/current-page rows"; "export a file" does not imply a browser download. Never invent the platform, data boundary, deployment target, or transport. Use established context, or explicitly leave the next agent to discover it. Before returning, compare the refined prompt against every original criterion and restriction; remove any unsupported narrowing or expansion.

## Choose the workflow

The user's actual request overrides mode defaults. `debug ... fix it` authorizes a fix; `feature ... plan only` does not authorize implementation. Do not silently turn investigation into fixes, fixes into reports, or verification into extra features.

| Mode | Execution contract | Default keyword / prewalk |
|---|---|---|
| `auto` | Infer one primary mode; use the smallest workflow that fits. | Determined by scope and risk. |
| `feature` | Deliver the specified user journey end to end; name scope/non-goals and observable acceptance criteria. | `orchestrate` only for substantial independent slices; prewalk on for bounded implementation. |
| `debug` | Trace the reported failure to its owning state/caller; distinguish evidence from hypotheses. Without clear fix intent, RCA only. If fixing, repair the root cause and verify the reported failing path. | `ultrathink` for nontrivial diagnosis; prewalk off while the cause is uncertain. |
| `change` | State what changes and what remains invariant; migrate affected callers without redesigning adjacent behavior. Verify relevant state transitions and failure boundaries. | `ultrathink` for tricky transitions, `orchestrate` for substantial slices; prewalk on only when the contract is settled. |
| `optimize` | Define a reproducible baseline and relevant metrics; measure the same scenario afterward. Change only evidence-supported bottlenecks if fixes were requested. | `workflowz` for broad independent investigations, `ultrathink` for a localized bottleneck; prewalk off during diagnosis. |
| `audit` | Inspect the specified scope read-only; return evidence-backed, severity-ranked findings and coverage gaps. No fixes or deployment changes unless explicitly requested. | `workflowz` for broad surfaces, `ultrathink` for a narrow difficult review; prewalk off. |
| `verify` | Build coverage from the actual change/criteria and exercise the real target journey. Login/build/typecheck are setup or partial evidence, not feature verification. | `workflowz` only for independent verification slices; no keyword for a simple smoke check; prewalk off. |
| `plan` | Produce an implementation-ready plan with contracts, dependencies, risks and verification gates. No implementation or implied approval. | `ultrathink` for difficult decisions; prewalk off. |
| `continue` | Transfer the specific unfinished task, decisions, proven outcomes, failed attempts and next action. Do not redo completed work or mistake a prior plan for approval. | Inherit the remaining task's mode and risk, not the previous session's keyword pile. |

Prefer no keyword for trivial work and normally one for substantial work. Combine keywords only when the task genuinely needs their distinct contracts; spell out phase ownership. All included keywords activate on the same submitted turn, not later at named phase boundaries. Never pad a task to justify delegation. For genuine parallel work: at most two workers, disjoint ownership, shared contracts fixed before edits, workers skip builds/lint/tests, one integration and runtime-verification owner. Honor the host's pressure gates; do not run competing profilers or builds.

## Recommend OMP settings

Inspect the effective settings with `rtk omp config get <key> --json` as needed: `modelRoles`, `prewalk.enabled`, `advisor.enabled`, `task.maxConcurrency`, `magicKeywords.enabled`, `magicKeywords.ultrathink`, `magicKeywords.orchestrate`, and `magicKeywords.workflow`. Project/profile settings may override global ones. Prefer role aliases over hardcoded model IDs; show resolved models only when actually inspected. Do not inspect credential stores. Do not mutate configuration.

- **Main model:** `@smol` for straightforward bounded work; `@default` for normal substantial delivery; `@slow` for uncertain/high-risk reasoning; `@plan` for planning. Respect the user's explicit choice. Do not assume more models always improve a result.
- **Prewalk:** on for substantial, well-bounded implementation where planning can hand off to `@smol`; off for read-only work, unresolved RCA, exploratory optimization, or critical money/auth/data invariants that still require reasoning after edits. Also off when starting directly on `@smol`. It is a one-shot model switch, not an autonomous planning/approval gate.
- **Advisor:** off by default to conserve the smaller Claude allowance. Recommend on when independent live scrutiny could prevent a costly architectural, security, billing, migration, data-loss or concurrency mistake, or when the user requests it. Explain the concrete risk. A focused final reviewer is often cheaper for ordinary feature work; advisor is neither a verifier nor an approval gate. It adds latency and provider usage; never promise quota savings or exact capacity. Use the configured `@advisor`, and flag an unresolved role rather than inventing a replacement.
- **Thinking:** keep the chosen role's configured effort unless there is a concrete reason to override. `ultrathink` adds a reasoning instruction, but only raises effort automatically under AUTO thinking; it does not override an explicitly pinned level. Suggest `--thinking max` only when justified, not routinely.

When syntax or behavior is uncertain, read `omp://magic-keywords.md`, `omp://prewalk.md`, `omp://advisor-watchdog.md`, or `omp://skills.md` rather than guessing. Exact lowercase standalone prose triggers keywords; inline code, fenced code and XML wrappers do not. They apply only to the submitted turn. `workflowz` requires both `eval` and `task`. Putting flags or `/advisor on` inside the refined prompt does NOT activate settings. `/prewalk` only arms `@smol`; do not invent `/prewalk off`. `/handoff` compacts in place, while `/new` starts an empty conversation; neither automatically applies this skill's recommendations.

## Output

Return these two sections, then stop. Do not execute the generated prompt.

### OMP setup

- One compact recommendation: mode, keyword(s) or none, model role, prewalk on/off, advisor on/off; one sentence explaining the task-specific tradeoff.
- Give a shell command for a fresh OMP process, in the same project/worktree: `rtk omp --model @<chosen-role> --prewalk` OR `rtk omp --model @<chosen-role> --no-prewalk`. Add a thinking override only if justified. This is startup syntax, not text to paste into an active chat; do not change global defaults.
- Then give `/advisor on` or `/advisor off` as a separate command to run INSIDE the new OMP session before submitting the prompt. If keywords are disabled, report that fact and offer the exact native setting rather than claiming activation. If config inspection is unavailable, label recommendations unverified instead of pretending settings were applied.

### Refined prompt

One copy-ready `text` block, normally 150–350 words; shorter for simple requests, longer only to preserve real requirements. Tell the user to copy the CONTENTS, not the surrounding fence. Within that block the chosen keywords must be ordinary prose, not inline code or nested fences. Do not add slash commands or launcher flags to it.

Use only useful sections: Objective; Context/evidence; Scope and preserved behavior; Execution; Acceptance and deliverable. Keep requirements actionable and preserve all user-specified criteria. For continuation, replace vague context with a compact handoff and the exact next action. Include relevant verification of success, failure, interruption/resume or boundary behavior, not a rote list of every possible test. For UI work require the actual surface and relevant device/environment; do not imply visual verification when unavailable. End with evidence-backed outcomes and exact blockers. For audit/verification, label each acceptance item verified, failed, blocked or not tested. Commits, worktrees, PRs, deployment and merge actions appear only when authorized by the user.

## Provenance

Reviewed existing approaches: [GitHub boost-prompt](https://github.com/github/awesome-copilot/blob/main/skills/boost-prompt/SKILL.md) is tied to VS Code/Joyride; [Sentry prompt-optimizer](https://github.com/getsentry/skills/blob/main/skills/prompt-optimizer/SKILL.md) targets reusable prompts and eval loops. This purpose-built OMP skill uses the simpler contract-first approach without either dependency or an eval framework. Native behavior comes from the OMP docs above, not generic skill conventions.
