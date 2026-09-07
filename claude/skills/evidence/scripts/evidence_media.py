from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path
from typing import Final


IMAGE_EXTENSIONS: Final[frozenset[str]] = frozenset(
    {".png", ".jpg", ".jpeg", ".gif", ".webp", ".bmp", ".svg"}
)
VIDEO_EXTENSIONS: Final[frozenset[str]] = frozenset(
    {".mp4", ".webm", ".mov", ".m4v", ".ogv"}
)
MEDIA_EXTENSIONS: Final[frozenset[str]] = IMAGE_EXTENSIONS | VIDEO_EXTENSIONS
EXCLUDED_DIRS: Final[frozenset[str]] = frozenset(
    {
        ".git",
        ".hg",
        ".svn",
        ".next",
        ".nuxt",
        ".turbo",
        ".venv",
        "__pycache__",
        "build",
        "dist",
        "node_modules",
        "venv",
    }
)


@dataclass(frozen=True, slots=True)
class MediaItem:
    id: int
    path: Path
    label: str
    kind: str
    size: int
    mtime: float


def is_media(path: Path) -> bool:
    return path.is_file() and path.suffix.lower() in MEDIA_EXTENSIONS


def should_skip_dir(name: str, include_hidden: bool) -> bool:
    if name in EXCLUDED_DIRS:
        return True
    return not include_hidden and name.startswith(".")


def collect_files(paths: list[str], include_hidden: bool) -> list[Path]:
    files: list[Path] = []
    for raw_path in paths:
        path = Path(raw_path).expanduser().resolve()
        if is_media(path):
            files.append(path)
            continue
        if not path.is_dir():
            continue
        for root, dirs, names in os.walk(path):
            dirs[:] = [
                name for name in dirs if not should_skip_dir(name, include_hidden)
            ]
            root_path = Path(root)
            for name in names:
                candidate = root_path / name
                if is_media(candidate):
                    files.append(candidate.resolve())
    return sorted(
        set(files), key=lambda item: (item.stat().st_mtime, str(item)), reverse=True
    )


def make_label(path: Path) -> str:
    try:
        return str(path.relative_to(Path.cwd()))
    except ValueError:
        return str(path)


def collect_media(paths: list[str], include_hidden: bool) -> list[MediaItem]:
    items: list[MediaItem] = []
    for index, path in enumerate(collect_files(paths, include_hidden)):
        stat = path.stat()
        kind = "image" if path.suffix.lower() in IMAGE_EXTENSIONS else "video"
        items.append(
            MediaItem(
                id=index,
                path=path,
                label=make_label(path),
                kind=kind,
                size=stat.st_size,
                mtime=stat.st_mtime,
            )
        )
    return items
