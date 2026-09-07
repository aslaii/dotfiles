---
name: use-claude-subagents
description: Authorizes and guides Claude to use the main session as orchestrator with Claude subagents for bounded parallel work. Use when the user asks for subagents, delegated agents, parallel agents, worker/explorer agents, or main-session hygiene around delegation. Also use when reviewing, debugging, or improving why Claude did or did not delegate work.
---

<objective>
Make the main session the orchestrator, not the only worker and not a passive dispatcher.

The main session owns planning, user communication, critical-path judgment, integration, and final verification. Subagents handle bounded parallel work that can move without blocking the next local step.

Invoking this skill is an explicit request to:

- Actively look for useful subagent work on every substantial task.
- Spawn subagents when a bounded sidecar task exists.
- Keep critical-path work local when delegation would slow or confuse integration.
- Explain local-only decisions instead of silently declining delegation.
- Use the `Agent` tool with appropriate Claude model: `haiku` for quick lookups, `sonnet` for standard work, `opus` for architecture/security/deep analysis.
</objective>

<quick_start>
For any substantial task, run a delegation audit before deep local work:

```text
Critical path: [what the main session must do next]
Sidecar candidates: [review/log scan/exploration/disjoint edits/verification]
Decision: spawn [agent/task] OR local-only because [specific allowed reason]
```

When a sidecar exists, use the `Agent` tool:

- Explorer/reviewer: `subagent_type: "Explore"`, model matched to task complexity
- General worker: `subagent_type: "general-purpose"`, model matched to task complexity
- Model guide: `haiku` → quick lookups; `sonnet` → standard work; `opus` → architecture, security, deep analysis

Example spawn:
```
Agent({
  subagent_type: "Explore",
  model: "sonnet",
  prompt: "Answer this specific codebase question: ..."
})
```

Do not leave delegation implicit. If no subagent is spawned for a substantial task, state the local-only reason in one concise sentence.

If the `Agent` tool is unavailable, say so and continue locally. Do not present tool absence as a delegation judgment.
</quick_start>

<orchestrator_role>
Main session owns:

- Task framing and plan
- Delegation decisions
- User-facing updates
- Conflict resolution between subagent results
- Critical-path implementation
- Final edits that require holistic judgment
- Verification strategy and completion claim

Subagents own:

- Bounded exploration
- Disjoint implementation slices
- Focused review
- Noisy verification or log analysis
- Alternative research branches
- Pattern inventory across many files

The main session should remain readable as a concise control plane: what is happening, why it matters, what changed, what passed, and what remains.
</orchestrator_role>

<core_definitions>
Critical-path work is work the main session must do next to keep the task moving. It is usually tied to current edits, local failing tests, unresolved design judgment, or integration risk.

Sidecar work is useful work that can run while the main session continues. It has a bounded question or write scope, does not duplicate local work, and does not block the immediate next local step.

Delegation is successful only when the returned result can be integrated with less cost than doing the same work locally.
</core_definitions>

<substantial_task_floor>
A task is substantial when any two are true:

- Multiple files, packages, or subsystems are involved.
- There are two or more independent repo questions.
- There are red tests, noisy logs, or CI failures to interpret.
- The change has behavior, security, data, API, or migration risk.
- The work includes repeated pattern changes.
- The user asks for review, verification, investigation, or parallel work.

For substantial tasks, spawn at least one subagent when tools are available unless every candidate sidecar fails the delegation policy. The minimum useful spawn is often an explorer or reviewer, even when implementation edits stay local.

For tasks with two or more independent repo questions, spawn at least one explorer unless the user forbids subagents, tools are unavailable, or answering locally is clearly faster than delegating.
</substantial_task_floor>

<delegation_policy>
Default to subagents for bounded sidecar work. A sidecar is delegateable when:

- User task has independent sidecar work that can run while the main session keeps working locally
- Subtask is concrete, bounded, and self-contained
- Result materially advances the main task
- Work can be delegated without blocking the immediate next local step

Parallel local work is preferred, not mandatory. If no useful local work remains, a brief wait for a bounded explorer/reviewer is acceptable when delegation is still cleaner than doing a broad scan in the main session. Do not use this exception for urgent blocking edits.

On substantial tasks, assume at least one sidecar may exist until checked. Actively search for these sidecars:

- Independent codebase exploration questions
- Parallel review of different files or subsystems
- Verification that can run while implementation continues
- Disjoint implementation slices with clear ownership
- Risk review of the intended patch
- Test/log analysis that is noisy but not immediately blocking
- Pattern inventory before a repeated change
- Alternative implementation research with a clear decision needed

Keep work local when:

- Task is trivial
- Next step is blocked on the answer
- Work is tightly coupled to current edits
- Delegation would duplicate local work
- Write scope cannot be separated cleanly
- Worker merge cost is likely higher than local edit cost
- Red tests are already narrowed to files the main session is editing

Local-only is not a license to skip all delegation. If implementation must stay local, still consider a review, log-analysis, or verification agent unless that would also duplicate or block the immediate next step.
</delegation_policy>

<delegation_audit>
Run this audit for substantial tasks before extended implementation:

1. Name the critical path in plain terms.
2. List at least one possible sidecar, or state that none exists.
3. Spawn a subagent for each useful bounded sidecar, respecting the substantial task floor.
4. If not spawning, give the specific allowed reason:
   - trivial task
   - immediate next step blocked on same work
   - tightly coupled current edits
   - duplicate local work
   - no clean write or review boundary
   - merge cost exceeds value
   - subagent tool unavailable
   - user forbids subagents
5. Continue local critical-path work immediately after spawning.

Use this terse user-facing form when useful:

```text
Delegation audit: patch stays local because tests and edits touch same files. Spawning review/log sidecar for nonblocking risk check.
```

For tiny tasks, the audit can be internal and unspoken.
</delegation_audit>

<decision_matrix>
Use an explorer (`subagent_type: "Explore"`) when:

- Need a specific codebase answer.
- Need answers to two or more independent repo questions.
- Need line references or pattern inventory.
- Need independent review without edits.
- Need CI/log/test failure summarization.

Use a worker (`subagent_type: "general-purpose"`) when:

- Write scope is disjoint and clear.
- Output can be merged or copied without conflict.
- Task has clear acceptance criteria.
- Main session can keep moving locally on different files.

Model selection:

- `haiku`: quick lookups, simple pattern searches, log scans
- `sonnet`: standard implementation, reviews, verification
- `opus`: architecture decisions, security review, deep analysis, complex debugging

Do the work locally when:

- The next command or edit depends on the result.
- The edit is in files already under active local patching.
- The task needs holistic judgment or final integration.
- Subagent output would likely need full rework before use.
</decision_matrix>

<main_session_hygiene>
Keep the main session focused on:

- Orchestration state
- User-facing decisions and tradeoffs
- Critical-path implementation
- Integration of subagent results
- Final verification evidence
- Concise status updates

Push noisy work to subagents when useful:

- Broad repository scans
- Multi-file pattern inventory
- Log-heavy test or CI investigation
- Independent bug-risk review
- Alternative implementation research
- Test matrix runs that can proceed without local edits

Ask subagents for compact outputs:

- Findings first, with file paths and line references
- Changed paths when edits were made
- Verification commands and outcomes
- Open questions only when blocking

Do not paste raw dumps from subagents into the main session unless the user asks. Summarize the signal and keep detailed logs in agent results.
</main_session_hygiene>

<status_updates>
When using this skill, mention delegation decisions in concise updates:

- `Spawning Explore agent for route inventory while I patch local failing test path.`
- `Keeping edit local: worker would touch same files as current red-test fix.`
- `Delegating verification only; implementation is too coupled to split safely.`

Do not overexplain. The goal is observable orchestration, not process narration.
</status_updates>

<workflow>
1. In the main session, frame the task and identify the critical path.
2. Check for parallelizable sidecar work and main-session noise risk.
3. State or internally record the delegation audit.
4. If a useful sidecar exists, spawn one or more subagents via the `Agent` tool with appropriate `subagent_type` and `model`.
5. Give each subagent a narrow deliverable, compact-output requirement, and, for workers, clear file/module ownership.
6. Tell workers they are not alone in the codebase and must not revert others' edits.
7. Keep critical-path edits local when the audit says delegation would block, duplicate, or create merge risk.
8. Continue non-overlapping local orchestration or implementation work immediately after spawning.
9. Wait only when the result is needed for the next critical-path step.
10. Integrate only the decision-relevant signal into the main session.
11. Resolve conflicts locally; do not delegate final judgment.
12. Close agents that are no longer needed.
</workflow>

<worker_safety>
Only delegate edits to workers when ownership is explicit:

```text
Implement [bounded task]. Own only [files/modules]. You are not alone in the codebase; do not revert edits made by others. Adapt to existing changes. Edit files directly in your workspace. Keep output compact: changed paths, verification performed, and blockers.
```

Before spawning a worker, verify:

- Its file/module scope is disjoint from main-session current edits.
- Acceptance criteria are clear enough to avoid a second design loop.
- The main session can review and integrate returned edits quickly.
- Any generated artifacts or docs are forbidden unless explicitly requested.

If these checks fail, use an explorer/reviewer instead or keep work local.
</worker_safety>

<agent_prompts>
For explorer agents:

```text
Answer this specific codebase question: [question]. Keep main-session hygiene in mind: return concise findings, file paths, line references, and only decision-relevant detail. Do not edit files.
```

For review agents:

```text
Review [files/change/test failure] for likely bugs, missed edge cases, and verification gaps. Do not edit files. Return findings first with paths/lines and keep output compact.
```

For verification agents:

```text
Run or inspect [specific verification]. Do not edit files. Return command/results summary, failing tests or logs only if relevant, and any blocker.
```

For worker agents:

```text
Implement [bounded task]. Own only [files/modules]. You are not alone in the codebase; do not revert edits made by others. Edit files directly in your workspace. Keep output compact: changed paths, verification performed, and any blocking questions.
```
</agent_prompts>

<examples>
Example: red tests already narrowed to active local files.

```text
Critical path: patch failing tests in auth middleware locally.
Sidecar candidates: independent bug-risk review of middleware behavior.
Decision: keep edits local, spawn Explore reviewer if review can run without touching files.
```

Example: broad refactor across independent packages.

```text
Critical path: define target API and update shared contract locally.
Sidecar candidates: package A worker, package B worker, test inventory explorer.
Decision: spawn workers only for disjoint packages after contract is stable.
```

Example: unclear failure from long CI logs.

```text
Critical path: inspect local reproduction.
Sidecar candidates: log-analysis explorer.
Decision: spawn Explore agent for logs while main session reproduces locally.
```

Example: tiny one-line typo.

```text
Critical path: fix typo.
Decision: local-only because task is trivial.
```
</examples>

<wait_policy>
Do not wait reflexively after spawning.

Wait only when:

- The subagent result is needed for the next critical-path decision.
- All useful local non-overlapping work is done.
- The agent owns verification needed before completion.

Otherwise, continue local work and integrate the result when it arrives.
</wait_policy>

<integration_policy>
When a subagent returns:

1. Read for decision-relevant signal.
2. Check changed paths if it edited files.
3. Reject or adapt output that conflicts with local edits.
4. Run final verification from the main session.
5. Close the agent when no further work remains.

The main session owns final completion claims. Never let a subagent result alone become the final answer.
</integration_policy>

<anti_patterns>
- Do not spawn subagents for every request automatically.
- Do not hand off the immediate blocking task when the main session can move faster locally.
- Do not spawn multiple agents for the same unresolved question.
- Do not wait reflexively after spawning; keep useful local work moving.
- Do not clutter the main session with raw scan output, long logs, or subagent transcripts.
- Do not let subagents become the orchestrator or make final user-facing completion claims.
- Do not use "tightly coupled" as a vague excuse. Name the coupling: same files, same failing tests, same pending design decision, or same integration point.
- Do not decline workers and forget explorers. If edits are unsafe to delegate, review or verification may still be safe.
- Do not spawn a worker without file/module ownership.
- Do not ask a subagent to decide whether the task is complete.
- Do not treat the delegation conditions as a veto checklist. If a bounded sidecar has clear value and acceptable integration cost, spawn it.
</anti_patterns>

<success_criteria>
This skill is working when:

- Subagents are used for meaningful parallel work during substantial tasks
- Substantial local-only work has an explicit allowed reason
- Spawned agents use appropriate Claude models matched to task complexity
- Delegated tasks are bounded and non-overlapping
- Main session keeps critical-path work local
- Main session acts as orchestrator, not worker queue
- Main session stays focused on decisions, integration, and concise evidence
- Returned results are integrated or closed cleanly
- User can see why delegation did or did not happen
</success_criteria>

<failure_signals>
Revise behavior if:

- Main session repeatedly says work is "too coupled" without naming concrete coupling.
- No subagent is spawned during multi-file or multi-step work and no local-only reason is given.
- Workers return overlapping edits that require manual conflict repair.
- Main session waits on a subagent while obvious local work is available.
- Subagent transcripts or raw logs dominate user-facing messages.
</failure_signals>
