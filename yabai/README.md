# yabai — Tiling Window Manager

Tiling window manager for macOS. Used with [skhd](../skhd/) for keyboard-driven window management.

## Disabling SIP (System Integrity Protection)

yabai requires partial SIP disable for advanced features (window movement across spaces, focus follows mouse). The current config in `yabairc` works without SIP changes, but disabling SIP unlocks the full feature set.

### Apple Silicon Macs

1. Shut down your Mac completely
2. Press and hold the power button until "Loading startup options" appears
3. Click "Options", then click "Continue"
4. From the menu bar, select Utilities > Terminal
5. Run:
   ```
   csrutil enable --without fs --without debug --without nvram
   ```
6. Reboot

### Verify SIP Status

```bash
csrutil status
# Expected: enabled with reduced protections
```

> These instructions were written for macOS Ventura+ on Apple Silicon. Intel Macs use a different recovery mode (Cmd+R at boot).

## Scripting Addition (Optional)

The scripting addition (`yabai -m signal`, space management, window opacity) requires a sudoers entry so yabai can load it without a password prompt.

> The current `yabairc` does not use the scripting addition. This section documents the setup for when advanced features (signals, space manipulation, window opacity) are needed.

### Install the Scripting Addition

1. Get the hash:
   ```bash
   shasum -a 256 $(which yabai)
   ```

2. Get your username:
   ```bash
   whoami
   ```

3. Create the sudoers file:
   ```bash
   sudo visudo -f /private/etc/sudoers.d/yabai
   ```

4. Add the following line (replace `<username>`, `<hash>`, and `<yabai_path>` with your values):
   ```
   <username> ALL=(root) NOPASSWD: sha256:<hash> <yabai_path> --load-sa
   ```

   For example:
   ```
   jdoe ALL=(root) NOPASSWD: sha256:abc123... /opt/homebrew/bin/yabai --load-sa
   ```

5. After Homebrew upgrades yabai, re-run step 1 and update the hash in the sudoers file.

## Keybindings

Keybindings are defined in [`skhd/skhdrc`](../skhd/skhdrc). Quick reference:

| Shortcut | Action |
|----------|--------|
| **Focus** | |
| `alt + h` | Focus window west (or display west) |
| `alt + j` | Focus window south (or display south) |
| `alt + k` | Focus window north (or display north) |
| `alt + l` | Focus window east (or display east) |
| **Swap** | |
| `shift + alt + h` | Swap window west (or move to display) |
| `shift + alt + j` | Swap window south (or move to display) |
| `shift + alt + k` | Swap window north (or move to display) |
| `shift + alt + l` | Swap window east (or move to display) |
| **Resize** | |
| `ctrl + alt + h` | Resize window left by 120px |
| `ctrl + alt + j` | Resize window down by 120px |
| `ctrl + alt + k` | Resize window up by 120px |
| `ctrl + alt + l` | Resize window right by 120px |
| `ctrl + alt + e` | Balance space layout |
| **Toggle** | |
| `alt + space` | Toggle float |
| `alt + f` | Toggle zoom-fullscreen |
| **System** | |
| `alt + r` | Restart yabai and reload skhd |
| `cmd + return` | Launch Ghostty |

## Configuration

Window management rules are in [`yabairc`](yabairc). Edit and reload with `alt + r` (restarts yabai and reloads skhd).

Key settings in the current config:

- **Layout:** BSP (binary space partitioning) with 50/50 split ratio
- **Padding:** 8px on all sides, 10px window gap
- **Borders:** Catppuccin-themed (active: lavender, normal: surface, insert: mauve)
- **Mouse:** Hold `fn` to move (left click) or resize (right click) windows
- **Float rules:** System apps (App Store, Calculator, Finder dialogs, etc.) float automatically
