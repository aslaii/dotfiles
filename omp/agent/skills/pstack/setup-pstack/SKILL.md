---
name: setup-pstack
description: Configure which models pstack uses per role and at what reasoning budget under OpenCode. Detects your available OpenCode models and writes an always-applied instruction file that overrides the skill defaults. Use for /setup-pstack, "configure pstack models", "pstack budget", or changing pstack's model choices.
---

# Setup pstack (OpenCode)

Write `~/.config/opencode/instructions/pstack-models.md`, an always-applied
instruction file that sets pstack's model per role, then make sure the global
config loads it.

## Steps

### 1. Detect available models

Run `opencode models`. Each line is a `provider/model` slug accepted by the
`model` field of the `subagent` tool and of agent definitions. That list is the
dependable source. If the command fails, ask the user to paste their slugs.
Never write a real slug you have not confirmed is available.

A role may also carry a reasoning variant: `provider/model#variant`. Variants
are the effort levels the model picker shows for that model (`low`, `medium`,
`high`, `xhigh`, `max` where offered). Do not invent one. The aliases
`inherit-parent` and `auto` are always valid and are not detected slugs.

### 2. Load current state

If `~/.config/opencode/instructions/pstack-models.md` exists, read it and treat
its `# budget` line and role values as the current choices. Otherwise start from
the defaults in step 5.

If the Cursor rule `~/.cursor/rules/pstack-models.mdc` exists and the OpenCode
file does not, import it once: keep its role values that are real detected
slugs, map anything unavailable to its family's closest detected slug or to
`inherit-parent`, and carry the budget over. Say what you migrated.

A line whose role is not listed in step 5 is from a retired role. Drop it.

### 3. Budget, map, and confirm

**(a) Ask for a budget.** Ask with the `question` tool when it is available,
otherwise in plain chat. Offer these four labels and name the current budget
when the file records one. With no file, say that `large` matches the pstack
defaults.

- `unlimited — max reasoning`
- `large — xhigh reasoning`
- `medium — high reasoning`
- `small — medium reasoning`

**(b) Apply it.** `unlimited`, `large`, `medium`, and `small` set the variant of
every real slug to `max`, `xhigh`, `high`, or `medium`. On a re-run, keep any
role the user changed by family, list, or alias. If a model does not offer the
target variant, use the highest variant it does offer at or below the target.
If the model offers no variants, leave the slug bare. `inherit-parent` and
`auto` never change.

**(c) Show the roles and confirm.** Show every role with its model, marking any
real slug that is not in the detected set as needing a choice. Also list each
line step 2 dropped. Offer the detected models plus `inherit-parent` and `auto`
(both mean: run on the parent chat model) as replacements.

For panel roles the value is a comma-separated list and one subagent runs per
entry, alias entries included, so the list length sets the fan-out:
`arena runners`, `architect runners`, `interrogate reviewers`. `arena
cross-judge pool` is a list too, but Arena runs one judge and only tries values
from a family other than the parent's, in list order, so order it by preference;
an `inherit-parent` value never judges. `swarm workers` is the default model for
every worker unless a race assigns another model per arm.

### 4. Validate

Every real slug written must be in the detected set, and every `#variant` must
be offered by that model. `inherit-parent` and `auto` always pass. If a chosen
slug or variant is unavailable, stop and ask again.

### 5. Write the instruction file

Write `~/.config/opencode/instructions/pstack-models.md`. It is plain Markdown,
not a Cursor rule, so it has no frontmatter. Overwrite the whole file so re-runs
stay idempotent. Shape:

```
# pstack model configuration. One line per role. Delete a line to fall back to the skill default.
# `inherit-parent` or `auto`: the role runs on the parent chat model (omit subagent `model`). Alias entries in a panel list still count toward its fan-out.
# budget: large (xhigh)
feature, refactoring: inherit-parent
bug-fix: inherit-parent
perf-issue: inherit-parent
hillclimb: inherit-parent
judgment and prose: inherit-parent
hardest tasks: inherit-parent
how explorer: inherit-parent
how explainer: inherit-parent
why investigators: inherit-parent
why synthesizer: inherit-parent
reflect tooling: inherit-parent
reflect judgment, divergent, synthesizer: inherit-parent
arena runners: inherit-parent, inherit-parent
arena cross-judge pool: inherit-parent
swarm workers: inherit-parent
architect runners: inherit-parent, inherit-parent
interrogate reviewers: inherit-parent, inherit-parent
```

Every role defaults to `inherit-parent` because OpenCode exposes whatever
providers the user has, and a guessed slug fails. When the user wants diverse
judgment, replace entries with real slugs from step 1, keeping the family
diversity Arena needs.

### 6. Wire it into the global config

`~/.config/opencode/opencode.jsonc` must list the file in its `instructions`
array. Read the file, keep every existing entry and every unrelated setting,
and append `"~/.config/opencode/instructions/pstack-models.md"` only when it is
missing. OpenCode hot-reloads config, so no restart is needed.

### 7. Confirm

Tell the user the file was written, that it applies immediately, and that
re-running this skill updates it. Report the budget and any role still on
`inherit-parent`.

### 8. Offer a verification skill (optional)

Check whether the project has a way to drive the real app for proof (a
`verify-*` skill or an existing harness). If not, offer once: "want a
project-local verification skill, so agents can drive the app the way a user
does and prove changes work? I can generate one with the `create-verification-skill`
skill." On yes, load that skill with the skill tool. On no, move on.

### 9. Offer a formal verification skill (optional)

Check whether the project already has a formal verification skill (a project
skill that runs a model checker, a proof, or another verifier). If not, offer
once: "want a formal verification skill, so agents can prove a key property
holds in every case in scope, not only the cases tests reach? I can generate one
with the `create-formal-verification-skill` skill." On yes, load it. On no, stop.
