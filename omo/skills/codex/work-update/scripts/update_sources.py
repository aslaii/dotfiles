from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Final


@dataclass(frozen=True, slots=True)
class UpdateSource:
    name: str
    project: str
    path: Path
    url: str | None


DEFAULT_MONO_REPO: Final[Path] = Path("__OMO_HOME__/work/mobii/gondoor-mono")
DEFAULT_TEMPLATE_DIR: Final[Path] = Path("/tmp/Gondoor-Template")
DEFAULT_RAMIRO_DIR: Final[Path] = Path("__OMO_HOME__/work/mobii/ramiro-law")

TEMPLATE_URL: Final[str] = "https://github.com/Gondoor/Gondoor-Template.git"
RAMIRO_URL: Final[str] = "https://github.com/mobii-ph/ramiro-law.git"


def update_sources(
    mono_repo: Path,
    template_dir: Path,
    ramiro_dir: Path,
) -> tuple[UpdateSource, ...]:
    return (
        UpdateSource("Gondoor", "Gondoor", mono_repo, None),
        UpdateSource("Gondoor-Template", "Gondoor", template_dir, TEMPLATE_URL),
        UpdateSource("Ramiro Law", "Ramiro", ramiro_dir, RAMIRO_URL),
    )
