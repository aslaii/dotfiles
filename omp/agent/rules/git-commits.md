---
alwaysApply: true
---

# Git commits

Commit your own work without being asked. After each verified, self-contained
change, stage only the files you changed (`git add <paths>`, never `-A` or `.`)
and commit with a message that matches the repository's existing style.

- Make one commit per logical change. Do not bundle unrelated changes into one
  large commit, and do not split a small feature into many commits.
- Never commit secrets: `.env*` files, keys, credentials or tokens.
- Never use `--no-verify`, amend pushed commits, or force push unless asked.
- Never push unless the user asks. When pushing, use a branch and a pull request,
  never the protected base branch directly, and rebase so the branch is not
  behind its base.
- Leave unrelated pre-existing changes unstaged.
