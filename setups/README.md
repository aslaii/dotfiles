# Setup helpers

This directory retains configuration-related helpers:

- `dotconfig_setup.sh` opens a tmux session for editing these dotfiles.
- `lsp_setup.sh` installs development language-server tools.

Project launchers for Auto, Gondoor, Goose, and Rave, together with their shared
`functions.sh`, are installed outside the checkout:

```bash
node ~/dotfiles/scripts/restore-tools.mjs
node ~/dotfiles/scripts/restore-tools.mjs --check
```

The pinned source and file hashes are in `scripts/tools-source.json`. Installed
files live under `~/.local/share/dotfiles-tools/`, preserving their relative
directory structure. Existing shell aliases use this location.

Keep new project automation in its project repository or a separate tools source.
Do not add application launchers, workspace registries, or generated state here.
