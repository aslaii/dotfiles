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

The existing Auto Title plugin remains installed and enabled locally:
`kryptamine/herdr-auto-title`, version `0.4.0`, commit
`a34f22d1fc8a6037d171789cfda17289088527e0`. Reinstall it separately on another
machine; its registry contains machine-specific paths and is not portable.
