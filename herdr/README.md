# Herdr

`config.toml` captures the current Herdr preferences. Herdr's built-in
`catppuccin` theme is Mocha; `catppuccin-latte` is Latte. Automatic switching
follows the host terminal's light/dark appearance, not a clock. Ghostty already
uses the same pair. Use macOS Appearance: Auto for day/night switching.

Link only the configuration file so sessions, sockets, logs, and installed
plugins remain local:

```bash
mkdir -p "${XDG_CONFIG_HOME:-$HOME/.config}/herdr"
# Back up an existing config.toml before linking; ln refuses to overwrite it.
ln -s "$HOME/dotfiles/herdr/config.toml" \
  "${XDG_CONFIG_HOME:-$HOME/.config}/herdr/config.toml"
herdr config check
herdr server reload-config
```

Auto Title is installed and enabled locally from `kryptamine/herdr-auto-title`,
version `0.6.0`, commit `270076954c4c9e17dbfaeca278f62e9075c83bee`.
Its registry contains machine-specific paths and is not portable. On another
machine, install the tracked `go` formula from `Brewfile`, then run:

```bash
herdr plugin install kryptamine/herdr-auto-title --yes
herdr server stop # required once so the server starts the new plugin
```

The OMP launcher supplies OMP's stored session title through Herdr's
`pane.report_metadata` API. Auto Title therefore needs no Claude integration.

## OmO Native

Install the SDK process-group extension outside the generated OmO runtime:

```bash
mkdir -p "$HOME/.omo/agent/extensions"
cp "$HOME/dotfiles/herdr/sdk-process-group.js" \
  "$HOME/.omo/agent/extensions/sdk-process-group.js"
```

Also install the shell hook that identifies the Bun foreground process:

```bash
cp "$HOME/dotfiles/herdr/omo.zsh" "$HOME/.config/herdr/omo.zsh"
```

Add this line once to `~/.zshrc`:

```zsh
[[ -r "$HOME/.config/herdr/omo.zsh" ]] && source "$HOME/.config/herdr/omo.zsh"
```

Open a new shell, then restart OmO. The hook sets `HERDR_AGENT=pi` only for
`omo` commands inside Herdr; it does not export a global agent hint.
OmO updates preserve both the hook and the user extension.
It puts Claude SDK stream helpers in a separate process group inside Herdr,
so Herdr follows OmO's native `pi` working, blocked, and idle reports.
Ordinary commands and standalone Claude Code keep their normal process groups.
The SDK still owns each helper's pipes and termination.

Run `bun test herdr/*.test.mjs` to check process groups, scoped hints, and
replacement of the package command during an update.
