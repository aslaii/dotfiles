#!/usr/bin/env python3
"""Keep docs artifacts out of Git commits and PRs."""

from __future__ import annotations

import argparse
import os
import shlex
import shutil
import subprocess
import sys
from pathlib import Path


DOC_DIR_NAMES = {
    ".docusaurus",
    ".gsd",
    ".omo",
    ".openspec",
    ".superpowers",
    "api-docs",
    "doc",
    "docs",
    "documentation",
    "docusaurus-build",
    "generated-docs",
    "gsd",
    "omo",
    "open-spec",
    "openspec",
    "site",
    "storybook-static",
    "superpowers",
    "typedoc",
}

DOC_SUFFIXES = {".adoc", ".asciidoc", ".markdown", ".md", ".mdx", ".rst"}

DOC_BASENAMES = {
    "changelog",
    "code_of_conduct",
    "contributing",
    "license",
    "notice",
    "readme",
}

CODE_MARKER_FILES = {
    "Cargo.toml",
    "CMakeLists.txt",
    "Gemfile",
    "Makefile",
    "bun.lock",
    "bun.lockb",
    "composer.json",
    "deno.json",
    "go.mod",
    "mix.exs",
    "next.config.js",
    "next.config.mjs",
    "next.config.ts",
    "package-lock.json",
    "package.json",
    "pnpm-lock.yaml",
    "pom.xml",
    "pubspec.yaml",
    "pyproject.toml",
    "requirements.txt",
    "settings.gradle",
    "tsconfig.json",
    "vite.config.js",
    "vite.config.mjs",
    "vite.config.ts",
    "wrangler.toml",
    "yarn.lock",
}

CODE_SUFFIXES = {
    ".bash",
    ".c",
    ".cjs",
    ".clj",
    ".cpp",
    ".cs",
    ".dart",
    ".erl",
    ".ex",
    ".exs",
    ".fish",
    ".fs",
    ".fsx",
    ".go",
    ".h",
    ".hpp",
    ".java",
    ".js",
    ".jsx",
    ".kt",
    ".kts",
    ".mjs",
    ".php",
    ".py",
    ".rb",
    ".rs",
    ".scala",
    ".sh",
    ".sql",
    ".svelte",
    ".swift",
    ".tf",
    ".ts",
    ".tsx",
    ".vue",
    ".zsh",
}

NON_CODE_PATH_HINTS = {
    "academic",
    "drafts",
    "journal",
    "journals",
    "literature",
    "manuscript",
    "notes",
    "obsidian",
    "paper",
    "papers",
    "publications",
    "reading",
    "research",
    "thesis",
    "writing",
    "zotero",
}

SKIP_DIR_NAMES = {
    ".git",
    ".hg",
    ".svn",
    "node_modules",
    "vendor",
}

GITIGNORE_BEGIN = "# BEGIN docs-artifact-guard"
GITIGNORE_END = "# END docs-artifact-guard"

DEFAULT_IGNORE_PATTERNS = [
    "# docs-artifact-guard: block docs directories",
    "docs/",
    "**/docs/",
    "doc/",
    "**/doc/",
    "documentation/",
    "**/documentation/",
    ".gsd/",
    "gsd/",
    "**/gsd/",
    ".openspec/",
    "openspec/",
    "**/openspec/",
    "open-spec/",
    "**/open-spec/",
    ".omo/",
    "omo/",
    "**/omo/",
    ".superpowers/",
    "superpowers/",
    "**/superpowers/",
    "site/",
    "public/docs/",
    "api-docs/",
    "**/api-docs/",
    "generated-docs/",
    "**/generated-docs/",
    "typedoc/",
    "**/typedoc/",
    ".docusaurus/",
    "docusaurus-build/",
    "storybook-static/",
    "# docs-artifact-guard: block docs source files",
    "*.md",
    "*.markdown",
    "*.mdx",
    "*.rst",
    "*.adoc",
    "*.asciidoc",
]

HOOK_BEGIN = "# BEGIN docs-artifact-guard"
HOOK_END = "# END docs-artifact-guard"


def run_git(root: Path | None, args: list[str], check: bool = True) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        ["git", *args],
        cwd=root,
        check=check,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
    )


def repo_root() -> Path:
    result = run_git(None, ["rev-parse", "--show-toplevel"])
    return Path(result.stdout.strip()).resolve()


def split_z(value: str) -> list[str]:
    return [item for item in value.split("\0") if item]


def git_paths(root: Path, args: list[str]) -> list[str]:
    result = run_git(root, [*args, "-z"])
    return sorted(set(split_z(result.stdout)))


def is_doc_path(path: str) -> bool:
    posix = path.replace("\\", "/").strip("/")
    if not posix:
        return False

    parts = [part for part in posix.split("/") if part]
    if any(part in SKIP_DIR_NAMES for part in parts):
        return False
    if any(part.lower() in DOC_DIR_NAMES for part in parts[:-1]):
        return True

    leaf = parts[-1]
    leaf_path = Path(leaf)
    suffix = leaf_path.suffix.lower()
    stem = leaf_path.stem.lower()
    return suffix in DOC_SUFFIXES or stem in DOC_BASENAMES


def top_doc_artifact(path: str) -> str:
    parts = [part for part in path.replace("\\", "/").strip("/").split("/") if part]
    for index, part in enumerate(parts[:-1]):
        if part.lower() in DOC_DIR_NAMES:
            return "/".join(parts[: index + 1])
    return "/".join(parts)


def doc_dir_patterns(paths: list[str]) -> list[str]:
    patterns: set[str] = set()
    for path in paths:
        parts = [part for part in path.replace("\\", "/").strip("/").split("/") if part]
        for index, part in enumerate(parts[:-1]):
            if part.lower() in DOC_DIR_NAMES:
                patterns.add("/".join(parts[: index + 1]) + "/")
    return sorted(patterns)


def tracked_docs(root: Path) -> list[str]:
    return [path for path in git_paths(root, ["ls-files"]) if is_doc_path(path)]


def staged_docs(root: Path) -> list[str]:
    return [path for path in git_paths(root, ["diff", "--cached", "--name-only", "--diff-filter=ACMRTUXBD"]) if is_doc_path(path)]


def staged_added_docs(root: Path) -> list[str]:
    return [path for path in git_paths(root, ["diff", "--cached", "--name-only", "--diff-filter=A"]) if is_doc_path(path)]


def untracked_docs(root: Path) -> list[str]:
    return [path for path in git_paths(root, ["ls-files", "--others", "--exclude-standard"]) if is_doc_path(path)]


def changed_docs(root: Path, base: str) -> list[str]:
    result = run_git(root, ["diff", "--name-only", "-z", f"{base}...HEAD"], check=False)
    if result.returncode != 0:
        result = run_git(root, ["diff", "--name-only", "-z", f"{base}..HEAD"], check=False)
    if result.returncode != 0:
        raise SystemExit(f"Could not compare against base '{base}':\n{result.stderr.strip()}")
    return [path for path in split_z(result.stdout) if is_doc_path(path)]


def history_docs(root: Path, base: str) -> list[str]:
    result = run_git(root, ["log", "--format=", "--name-only", f"{base}..HEAD"], check=False)
    if result.returncode != 0:
        raise SystemExit(f"Could not inspect history against base '{base}':\n{result.stderr.strip()}")
    return sorted({line.strip() for line in result.stdout.splitlines() if line.strip() and is_doc_path(line.strip())})


def default_base(root: Path) -> str | None:
    for candidate in ("origin/main", "origin/master", "main", "master"):
        result = run_git(root, ["rev-parse", "--verify", "--quiet", candidate], check=False)
        if result.returncode == 0:
            return candidate
    return None


def has_non_code_path_hint(root: Path) -> bool:
    parts = {part.lower() for part in root.parts}
    return bool(parts & NON_CODE_PATH_HINTS)


def has_code_marker(root: Path) -> bool:
    return any((root / marker).exists() for marker in CODE_MARKER_FILES)


def has_tracked_code(root: Path) -> bool:
    result = run_git(root, ["ls-files", "-z"], check=False)
    if result.returncode != 0:
        return False
    for path in split_z(result.stdout):
        if Path(path).suffix.lower() in CODE_SUFFIXES:
            return True
    return False


def looks_like_code_repo(root: Path) -> bool:
    if os.environ.get("DOCS_ARTIFACT_GUARD", "").lower() in {"0", "false", "off", "no"}:
        return False
    if has_code_marker(root):
        return True
    if has_non_code_path_hint(root):
        return False
    return has_tracked_code(root)


def print_group(title: str, paths: list[str]) -> None:
    print(f"{title}: {len(paths)}")
    for path in paths[:200]:
        print(f"  {path}")
    if len(paths) > 200:
        print(f"  ... {len(paths) - 200} more")


def command_scan(args: argparse.Namespace) -> int:
    root = repo_root()
    base = args.base
    print(f"Repo: {root}")
    print_group("Tracked docs", tracked_docs(root))
    print_group("Staged docs", staged_docs(root))
    print_group("Untracked docs", untracked_docs(root))

    if base:
        print_group(f"Docs changed vs {base}", changed_docs(root, base))
        print_group(f"Docs in branch history vs {base}", history_docs(root, base))
    return 0


def remove_existing_block(text: str) -> str:
    lines = text.splitlines()
    output: list[str] = []
    skipping = False
    for line in lines:
        if line.strip() == GITIGNORE_BEGIN:
            skipping = True
            continue
        if line.strip() == GITIGNORE_END:
            skipping = False
            continue
        if not skipping:
            output.append(line)
    return "\n".join(output).rstrip()


def update_gitignore(root: Path, paths: list[str]) -> Path:
    gitignore = root / ".gitignore"
    existing = gitignore.read_text() if gitignore.exists() else ""
    cleaned = remove_existing_block(existing)
    patterns = [*DEFAULT_IGNORE_PATTERNS, *doc_dir_patterns(paths)]
    block = "\n".join([GITIGNORE_BEGIN, *dict.fromkeys(patterns), GITIGNORE_END])
    new_text = f"{cleaned}\n\n{block}\n" if cleaned else f"{block}\n"
    gitignore.write_text(new_text)
    return gitignore


def chunked(paths: list[str], size: int = 100) -> list[list[str]]:
    return [paths[index : index + size] for index in range(0, len(paths), size)]


def unstage_paths(root: Path, paths: list[str]) -> None:
    for group in chunked(paths):
        result = run_git(root, ["restore", "--staged", "--", *group], check=False)
        if result.returncode != 0:
            run_git(root, ["reset", "--", *group])


def untrack_paths(root: Path, paths: list[str]) -> None:
    for group in chunked(paths):
        run_git(root, ["rm", "-r", "--cached", "--ignore-unmatch", "--", *group])


def delete_untracked(root: Path, paths: list[str]) -> None:
    targets = sorted({top_doc_artifact(path) for path in paths}, key=lambda p: p.count("/"))
    for rel_target in targets:
        target = (root / rel_target).resolve()
        if root not in target.parents and target != root:
            continue
        if target.is_dir():
            shutil.rmtree(target)
        elif target.exists():
            target.unlink()


def command_clean(args: argparse.Namespace) -> int:
    root = repo_root()
    staged = staged_docs(root)
    staged_added = staged_added_docs(root)
    untracked = untracked_docs(root)
    tracked = tracked_docs(root)
    all_docs = sorted(set(staged + staged_added + untracked + tracked))
    delete_candidates = sorted(set(untracked + staged_added))

    if args.write_gitignore:
        path = update_gitignore(root, all_docs)
        print(f"Updated {path}")
    if args.unstage and staged:
        unstage_paths(root, staged)
        print(f"Unstaged {len(staged)} docs paths")
        untracked = untracked_docs(root)
        tracked = tracked_docs(root)
    if args.delete_untracked and delete_candidates:
        delete_untracked(root, delete_candidates)
        print(f"Deleted {len(delete_candidates)} untracked docs paths")
        tracked = tracked_docs(root)
    if args.untrack_tracked and tracked:
        untrack_paths(root, tracked)
        print(f"Removed {len(tracked)} tracked docs paths from index")

    remaining = staged_docs(root)
    if remaining:
        print_group("Still staged docs", remaining)
        return 1
    print("Docs cleanup complete")
    return 0


def hook_path(root: Path) -> Path:
    result = run_git(root, ["rev-parse", "--git-path", "hooks/pre-commit"])
    path = Path(result.stdout.strip())
    if not path.is_absolute():
        path = root / path
    return path


def hook_block() -> str:
    script = shlex.quote(str(Path(__file__).resolve()))
    return "\n".join(
        [
            HOOK_BEGIN,
            f"python3 {script} pre-commit",
            "status=$?",
            'if [ "$status" -ne 0 ]; then',
            '  exit "$status"',
            "fi",
            HOOK_END,
        ]
    )


def remove_hook_block(text: str) -> str:
    lines = text.splitlines()
    output: list[str] = []
    skipping = False
    for line in lines:
        if line.strip() == HOOK_BEGIN:
            skipping = True
            continue
        if line.strip() == HOOK_END:
            skipping = False
            continue
        if not skipping:
            output.append(line)
    return "\n".join(output).strip()


def command_install_hook(args: argparse.Namespace) -> int:
    root = repo_root()
    path = hook_path(root)
    path.parent.mkdir(parents=True, exist_ok=True)
    existing = path.read_text() if path.exists() else ""
    existing = remove_hook_block(existing)

    if existing.startswith("#!"):
        first, _, rest = existing.partition("\n")
        new_text = f"{first}\n{hook_block()}\n"
        if rest.strip():
            new_text += f"{rest.strip()}\n"
    else:
        new_text = f"#!/bin/sh\n{hook_block()}\n"
        if existing.strip():
            new_text += f"{existing.strip()}\n"

    path.write_text(new_text)
    path.chmod(0o755)
    print(f"Installed docs guard hook at {path}")
    return 0


def command_pre_commit(args: argparse.Namespace) -> int:
    root = repo_root()
    if args.code_repo_only and not looks_like_code_repo(root):
        if not args.quiet_skip:
            print("Skipping docs guard: repo does not look like a codebase")
        return 0
    paths = staged_docs(root)
    if paths:
        print_group("Blocked staged docs", paths)
        print("Run: python3 ~/.codex/skills/docs-artifact-guard/scripts/guard_docs.py clean --write-gitignore --unstage --delete-untracked")
        return 1
    print("No staged docs artifacts")
    return 0


def command_history_plan(args: argparse.Namespace) -> int:
    root = repo_root()
    base = args.base or default_base(root)
    if not base:
        raise SystemExit("No base found. Pass --base origin/main or another base ref.")

    paths = sorted(set(changed_docs(root, base) + history_docs(root, base)))
    print(f"Base: {base}")
    print_group("Docs paths in branch diff/history", paths)
    if not paths:
        return 0

    path_file = root / ".git" / "docs-artifact-guard-paths.txt"
    path_file.write_text("\n".join(paths) + "\n")
    print(f"Wrote path list: {path_file}")
    print("Next: read references/history-rewrite.md before rewriting history.")
    return 1


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Keep docs artifacts out of Git commits and PRs.")
    subparsers = parser.add_subparsers(dest="command", required=True)

    scan = subparsers.add_parser("scan", help="Show tracked, staged, untracked, and optional branch docs.")
    scan.add_argument("--base", help="Base ref for PR/history checks, such as origin/main.")
    scan.set_defaults(func=command_scan)

    clean = subparsers.add_parser("clean", help="Clean docs artifacts from ignore rules, index, and untracked files.")
    clean.add_argument("--write-gitignore", action="store_true", help="Write/update the docs-artifact-guard .gitignore block.")
    clean.add_argument("--unstage", action="store_true", help="Unstage docs paths.")
    clean.add_argument("--delete-untracked", action="store_true", help="Delete untracked docs artifacts from the working tree.")
    clean.add_argument("--untrack-tracked", action="store_true", help="Remove tracked docs paths from the index. This stages deletions.")
    clean.set_defaults(func=command_clean)

    install_hook = subparsers.add_parser("install-hook", help="Install a local pre-commit hook that blocks staged docs.")
    install_hook.set_defaults(func=command_install_hook)

    pre_commit = subparsers.add_parser("pre-commit", help="Fail if docs paths are staged.")
    pre_commit.add_argument("--code-repo-only", action="store_true", help="Skip enforcement unless the repo looks like a codebase.")
    pre_commit.add_argument("--quiet-skip", action="store_true", help="Do not print when --code-repo-only skips.")
    pre_commit.set_defaults(func=command_pre_commit)

    history_plan = subparsers.add_parser("history-plan", help="Write a path list for docs found in branch history.")
    history_plan.add_argument("--base", help="Base ref for branch history checks, such as origin/main.")
    history_plan.set_defaults(func=command_history_plan)

    return parser


def main() -> int:
    parser = build_parser()
    args = parser.parse_args()
    return args.func(args)


if __name__ == "__main__":
    sys.exit(main())
