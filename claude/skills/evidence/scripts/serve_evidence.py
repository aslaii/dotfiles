#!/usr/bin/env python3

from __future__ import annotations

import argparse
import mimetypes
from dataclasses import dataclass
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import unquote, urlparse

from evidence_html import render_page
from evidence_media import MediaItem, collect_media


@dataclass(frozen=True, slots=True)
class EvidenceState:
    title: str
    roots: tuple[str, ...]
    items: tuple[MediaItem, ...]


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Serve local image and video evidence as an HTML gallery."
    )
    parser.add_argument(
        "paths",
        nargs="*",
        default=["."],
        help="Files or directories to include. Defaults to the current directory.",
    )
    parser.add_argument(
        "--bind",
        default="127.0.0.1",
        help="Bind address. Defaults to 127.0.0.1.",
    )
    parser.add_argument(
        "--port",
        type=int,
        default=0,
        help="Port to use. Defaults to 0, which picks an available port.",
    )
    parser.add_argument(
        "--title",
        default="Implementation Evidence",
        help="Page title shown in the gallery.",
    )
    parser.add_argument(
        "--include-hidden",
        action="store_true",
        help="Include hidden directories while scanning.",
    )
    return parser.parse_args()


def make_handler(state: EvidenceState) -> type[BaseHTTPRequestHandler]:
    class EvidenceHandler(BaseHTTPRequestHandler):
        def do_GET(self) -> None:
            parsed = urlparse(self.path)
            path = unquote(parsed.path)
            if path in {"/", "/index.html"}:
                self.send_bytes(
                    render_page(state.title, state.roots, state.items),
                    "text/html; charset=utf-8",
                )
                return
            if path.startswith("/media/"):
                self.send_media(path.removeprefix("/media/"))
                return
            self.send_error(HTTPStatus.NOT_FOUND)

        def send_media(self, raw_id: str) -> None:
            try:
                item = state.items[int(raw_id)]
            except (ValueError, IndexError):
                self.send_error(HTTPStatus.NOT_FOUND)
                return
            mime_type = (
                mimetypes.guess_type(item.path.name)[0] or "application/octet-stream"
            )
            self.send_response(HTTPStatus.OK)
            self.send_header("Content-Type", mime_type)
            self.send_header("Content-Length", str(item.path.stat().st_size))
            self.send_header("Cache-Control", "no-store")
            self.end_headers()
            with item.path.open("rb") as file:
                while chunk := file.read(1024 * 256):
                    self.wfile.write(chunk)

        def send_bytes(self, content: bytes, mime_type: str) -> None:
            self.send_response(HTTPStatus.OK)
            self.send_header("Content-Type", mime_type)
            self.send_header("Content-Length", str(len(content)))
            self.send_header("Cache-Control", "no-store")
            self.end_headers()
            self.wfile.write(content)

        def log_message(self, format: str, *args: str) -> None:
            return

    return EvidenceHandler


def run_server(
    bind: str, port: int, title: str, roots: list[str], items: list[MediaItem]
) -> int:
    state = EvidenceState(title=title, roots=tuple(roots), items=tuple(items))
    server = ThreadingHTTPServer((bind, port), make_handler(state))
    host = "127.0.0.1" if bind in {"0.0.0.0", "::"} else bind
    actual_port = server.server_port
    print(f"Serving {len(items)} evidence file(s) at http://{host}:{actual_port}/")
    print("Press Ctrl-C to stop.")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nStopped evidence server.")
    finally:
        server.server_close()
    return 0


def main() -> int:
    args = parse_args()
    items = collect_media(args.paths, args.include_hidden)
    if not items:
        print("No image or video evidence found in the provided paths.")
        return 2
    return run_server(args.bind, args.port, args.title, args.paths, items)


if __name__ == "__main__":
    raise SystemExit(main())
