# Keyboard Shortcuts

Beginner-friendly cheatsheet for the yabai + skhd layout shipped with this
dotfiles repo. Modifiers use macOS naming (`⌥` = alt/option, `⇧` = shift,
`⌃` = control, `⌘` = command).

## Window Focus
- `⌥ + h` — focus window to the left (or previous display)
- `⌥ + j` — focus window below (or next display down)
- `⌥ + k` — focus window above (or next display up)
- `⌥ + l` — focus window to the right (or next display)

## Move / Swap Windows
- `⇧⌥ + h/j/k/l` — swap the focused window with its neighbour in that
  direction; if there is no neighbour, move to the adjacent display

## Resize Windows
- `⌃⌥ + h/j/k/l` — resize the focused window by nudging the shared edge;
  repeat the shortcut to keep resizing
- `⌃⌥ + e` — balance the current space so windows become even

## Window State Toggles
- `⌥ + space` — toggle float (useful for dialogs or picture-in-picture)
- `⌥ + f` — toggle fullscreen for the focused window
- `⌥ + r` — restart yabai and skhd if they misbehave

## Launchers
- `⌘ + return` — open a new Ghostty terminal window

## Mouse Helpers
- Hold `fn` while dragging a window to move it with the mouse
- Hold `fn` while dragging a window edge to resize it with the mouse

### Notes
- The config keeps animations slow and auto-balancing enabled so screen
  movement stays easy to follow while learning.
- Yabai’s scripting addition is not required; you do not have to disable SIP.
