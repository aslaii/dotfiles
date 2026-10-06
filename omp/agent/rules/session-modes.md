---
alwaysApply: true
---

# Session modes

Start every fresh session with Ponytail full and Caveman lite. Read
`~/.agents/skills/ponytail/SKILL.md` and `~/.agents/skills/caveman/SKILL.md` once
before answering the first request, then keep these exact levels active.

Ponytail full controls implementation choices: reuse existing code, then the
standard library, native platform features and installed dependencies. Make the
smallest correct change and verify it. Caveman lite controls chat only: remove
filler while keeping full sentences, articles and technical substance. Use
normal prose in code, comments, documentation, commits and third-party messages.

An explicit mode change overrides its startup default for this session.
`stop ponytail` disables only Ponytail; `stop caveman` disables only Caveman;
`normal mode` disables both. A new session starts with both defaults again.
