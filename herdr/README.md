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
