from __future__ import annotations

import html
from collections.abc import Sequence

from evidence_media import MediaItem


def format_size(size: int) -> str:
    value = float(size)
    for unit in ("B", "KB", "MB", "GB"):
        if value < 1024 or unit == "GB":
            return f"{value:.1f} {unit}" if unit != "B" else f"{int(value)} B"
        value /= 1024
    return f"{size} B"


def render_item(item: MediaItem) -> str:
    src = f"/media/{item.id}"
    label = html.escape(item.label)
    meta = html.escape(f"{item.kind} - {format_size(item.size)}")
    if item.kind == "image":
        media = f'<img src="{src}" alt="{label}" loading="lazy">'
    else:
        media = f'<video src="{src}" controls preload="metadata"></video>'
    return "\n".join(
        [
            '    <article class="card">',
            f'      <a class="preview" href="{src}" target="_blank" rel="noreferrer">{media}</a>',
            '      <div class="details">',
            f'        <div class="label" title="{label}">{label}</div>',
            f'        <div class="meta">{meta}</div>',
            "      </div>",
            "    </article>",
        ]
    )


def render_page(title: str, roots: Sequence[str], items: Sequence[MediaItem]) -> bytes:
    safe_title = html.escape(title)
    roots_text = html.escape(", ".join(roots))
    cards = "\n".join(render_item(item) for item in items)
    body = "\n".join(
        [
            "<!doctype html>",
            '<html lang="en">',
            "<head>",
            '  <meta charset="utf-8">',
            '  <meta name="viewport" content="width=device-width, initial-scale=1">',
            f"  <title>{safe_title}</title>",
            "  <style>",
            "    :root {",
            "      color-scheme: light dark;",
            '      font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;',
            "      background: #f7f7f5;",
            "      color: #1f2933;",
            "    }",
            "    * { box-sizing: border-box; }",
            "    body { margin: 0; }",
            "    header {",
            "      position: sticky;",
            "      top: 0;",
            "      z-index: 1;",
            "      border-bottom: 1px solid #d8d8d2;",
            "      background: rgba(247, 247, 245, 0.94);",
            "      backdrop-filter: blur(10px);",
            "      padding: 18px clamp(16px, 3vw, 32px);",
            "    }",
            "    h1 { margin: 0 0 6px; font-size: clamp(22px, 3vw, 34px); line-height: 1.1; }",
            "    .summary { color: #5f6b76; font-size: 14px; overflow-wrap: anywhere; }",
            "    main { padding: clamp(16px, 3vw, 32px); }",
            "    .grid {",
            "      display: grid;",
            "      grid-template-columns: repeat(auto-fit, minmax(min(100%, 320px), 1fr));",
            "      gap: 18px;",
            "    }",
            "    .card {",
            "      display: flex;",
            "      min-width: 0;",
            "      flex-direction: column;",
            "      overflow: hidden;",
            "      border: 1px solid #d8d8d2;",
            "      border-radius: 8px;",
            "      background: #ffffff;",
            "      box-shadow: 0 8px 24px rgba(31, 41, 51, 0.08);",
            "    }",
            "    .preview {",
            "      display: grid;",
            "      min-height: 220px;",
            "      aspect-ratio: 16 / 10;",
            "      place-items: center;",
            "      background: #151a1f;",
            "    }",
            "    img, video {",
            "      width: 100%;",
            "      height: 100%;",
            "      object-fit: contain;",
            "    }",
            "    .details { padding: 12px 14px 14px; }",
            "    .label {",
            "      overflow: hidden;",
            "      text-overflow: ellipsis;",
            "      white-space: nowrap;",
            "      font-size: 14px;",
            "      font-weight: 650;",
            "    }",
            "    .meta { margin-top: 5px; color: #6b7280; font-size: 12px; }",
            "    @media (prefers-color-scheme: dark) {",
            "      :root { background: #121416; color: #eef1f4; }",
            "      header { border-color: #30363d; background: rgba(18, 20, 22, 0.94); }",
            "      .summary, .meta { color: #aeb8c2; }",
            "      .card { border-color: #30363d; background: #1d2228; box-shadow: none; }",
            "      .preview { background: #0b0d0f; }",
            "    }",
            "  </style>",
            "</head>",
            "<body>",
            "  <header>",
            f"    <h1>{safe_title}</h1>",
            f'    <div class="summary">{len(items)} media file(s) from {roots_text}</div>',
            "  </header>",
            "  <main>",
            f'    <section class="grid">{cards}</section>',
            "  </main>",
            "</body>",
            "</html>",
        ]
    )
    return f"{body}\n".encode("utf-8")
