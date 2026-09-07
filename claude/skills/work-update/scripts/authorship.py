from __future__ import annotations

import re
import subprocess
from pathlib import Path
from typing import Final


AUTHOR_RE: Final[re.Pattern[str]] = re.compile(
    r"(aslaii|111640116\+aslaii|jericho|jecho\.deleon)",
    re.IGNORECASE,
)


def author_matches(author_key: str) -> bool:
    return AUTHOR_RE.search(author_key) is not None


def run_git(repo: Path, args: tuple[str, ...]) -> str:
    result = subprocess.run(
        ("git", *args),
        cwd=repo,
        text=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        check=False,
    )
    if result.returncode != 0:
        return ""
    return result.stdout.strip()


def commit_has_authored_side_parent(repo: Path, sha: str) -> bool:
    parents_text = run_git(repo, ("show", "-s", "--format=%P", sha))
    parents = parents_text.split()
    if len(parents) < 2:
        return False

    first_parent = parents[0]
    for side_parent in parents[1:]:
        side_commits = run_git(
            repo,
            (
                "log",
                f"{first_parent}..{side_parent}",
                "--format=%an%x1f%ae",
            ),
        )
        for line in side_commits.splitlines():
            author, separator, email = line.partition("\x1f")
            if separator and author_matches(f"{author} {email}"):
                return True
    return False
