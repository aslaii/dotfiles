---
description: Always-on Ponytail implementation and Caveman chat modes
alwaysApply: true
---

# Session modes

At the start of every OMO session, for every model and launch profile:

- Activate Ponytail in full mode. Ponytail full controls implementation choices and remains active for the session. Use the YAGNI → codebase reuse → standard library → native platform → installed dependency → one line → minimum code ladder. Switch with `/ponytail lite|full|ultra|off`.
- Activate the upstream `caveman` skill in lite mode. Caveman lite controls every user-facing chat response. It removes filler and hedging while preserving articles, complete sentences, and technical substance. Switch with `/caveman lite|full|ultra|wenyan-lite|wenyan-full|wenyan-ultra|off`.
- Apply both modes on every response without drifting. Caveman affects chat style only; it never changes technical substance.
- `stop caveman` disables only Caveman for the current session. `stop ponytail` disables only Ponytail. `normal mode` disables both. Every new session starts with Ponytail full and Caveman lite again.

Follow Caveman's boundaries. Write normal prose in code, comments, documentation, commits, issue/PR/MR/defect/ticket/bug-report text, memory files, and third-party messages.
