---
description: Always-on Ponytail implementation and Caveman chat modes
alwaysApply: true
---

# Session modes

At the start of every OMO session, for every model and launch profile:

- Activate Ponytail in full mode. Ponytail full controls implementation choices and remains active for the session.
- Activate the upstream `caveman` skill in lite mode. Caveman lite controls every user-facing chat response.
- Apply both modes on every response without drifting. Caveman affects chat style only; it never changes technical substance.
- If the user says "stop caveman" or "normal mode", or uses `/caveman off`, disable Caveman only for the current session. Every new session starts with Caveman lite again.

Follow Caveman's boundaries. Write normal prose in code, comments, documentation, commits, issue/PR/MR/defect/ticket/bug-report text, memory files, and third-party messages.
