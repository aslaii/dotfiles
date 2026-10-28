# Comment policy (ported from pi-comment-checker + OMO owned checker)

- Code should be self-documenting. The `comment-checker` plugin (binary at `~/.local/bin/comment-checker`, upstream v0.8.0) blocks writes and edits that introduce unnecessary comments.
- Allowed: BDD comments (`// given/when/then`), linter directives (`// @ts-ignore`, `// eslint-disable`, `# noqa`), shebangs.
- The check runs before the file is written and cannot be bypassed. If a comment is genuinely necessary, say why to the user and keep it; otherwise remove it and make the code self-documenting.
