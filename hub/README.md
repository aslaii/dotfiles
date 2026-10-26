# Automation hub

Local page at http://hub.localhost:8700 that shows the launchd automations
(Foreclosed Pag-IBIG, Connecteam, Firstlight) and turns each on or off.
Off runs `launchctl bootout`; on runs `launchctl bootstrap` with the existing
plist in `~/Library/LaunchAgents`. Plists are never edited.
The Connecteam card can also skip today's punches
(`~/personal/punch/punch.zsh off`, in the separate local Punch repository).

Install:

```zsh
cp ~/dotfiles/hub/com.aslaii.hub.plist ~/Library/LaunchAgents/
launchctl bootstrap gui/$(id -u) ~/Library/LaunchAgents/com.aslaii.hub.plist
```

Log: `~/Library/Logs/hub.log`. Test: `bun test ~/dotfiles/hub`.
To add an automation, add an entry to `AUTOMATIONS` in `server.ts`.
