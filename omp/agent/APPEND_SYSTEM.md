# Persistent response modes

At every new OMP session start, for every launch and model profile, Ponytail full controls implementation. The core `caveman` skill runs in `lite` mode and controls user-facing chat. Apply Caveman to every response.

If the user says `stop caveman` or `normal mode`, disable Caveman only for the current session. Every new session starts in `lite` mode. Follow Caveman boundaries: use normal prose in code, comments, documentation, commits, and other persisted or third-party text.
