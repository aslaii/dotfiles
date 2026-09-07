---
name: evidence
description: Serve visual implementation evidence as a local HTML gallery. Use when Codex needs to verify or present screenshots, screen recordings, videos, image diffs, Playwright artifacts, manual QA captures, bug fix proof, feature release proof, visual regression evidence, or when the user invokes $evidence.
---

# Evidence

Use this skill to make implementation evidence inspectable through a local browser page.
The goal is to show real images and videos from the change, not to summarize code or test output.

## Workflow

1. Locate or create visual evidence for the bug fix or feature release.
   Prefer artifacts from the actual verification surface: Playwright screenshots/videos, browser screenshots, screen recordings, image diffs, or manual QA captures.
2. If no visual evidence exists yet, drive the feature through its UI or verification surface and save screenshots or videos first. Do not claim visual verification from code inspection alone.
3. Start the bundled server with one or more files or directories:

```bash
python3 <skill-dir>/scripts/serve_evidence.py artifacts/evidence test-results playwright-report --title "Implementation Evidence"
```

Use `--port 0` to pick an available port automatically, or pass a fixed port when the user needs one.

4. Give the user the printed local URL and a short note about what evidence is included.
5. Keep the server running while the user needs to inspect it. Stop the process when the inspection session is complete.

## Evidence Paths

When the user does not provide paths, check common local locations before starting the server:

- `artifacts/evidence`
- `.evidence`
- `test-results`
- `playwright-report`
- `screenshots`
- `videos`
- `tmp`

Pass only relevant paths when possible. A focused gallery is better than a whole-repo scan.

## Server Script

Run `scripts/serve_evidence.py` from this skill folder. It accepts image and video files directly, or scans directories recursively.

Supported image files: `.png`, `.jpg`, `.jpeg`, `.gif`, `.webp`, `.bmp`, `.svg`
Supported video files: `.mp4`, `.webm`, `.mov`, `.m4v`, `.ogv`

Useful options:

```bash
python3 <skill-dir>/scripts/serve_evidence.py <paths...> --title "Release Evidence"
python3 <skill-dir>/scripts/serve_evidence.py <paths...> --bind 0.0.0.0 --port 8765
python3 <skill-dir>/scripts/serve_evidence.py <paths...> --include-hidden
```

If the script reports that no media was found, collect the missing screenshots or videos and run it again.
