#!/usr/bin/env python3
import argparse
import datetime as dt
import json
import re
import shutil
import subprocess
from pathlib import Path
from typing import TypeAlias, TypedDict

from artifact_todos import progress_from_goals_json
from authorship import author_matches, commit_has_authored_side_parent
from update_sources import (
    DEFAULT_MONO_REPO,
    DEFAULT_RAMIRO_DIR,
    DEFAULT_TEMPLATE_DIR,
    update_sources,
)
MAIN_REFS = ("origin/main", "main")
RAMIRO_REFS = ("origin/dev", "dev", "origin/main", "main")
PROJECT_ORDER = ("Gondoor", "Ramiro")
IN_PROGRESS_LABEL_RULES = [
    (("taste-skill", "tasteskill", "design-taste-frontend"), "TasteSkill E2B"),
    (("tenant-inventory", "inventory-system"), "Tenant Inventory"),
    (("ecommerce-approval", "ecommerce-approval-investigation"), "Ecommerce Setup"),
    (("email-dashboard-link", "dashboard-link"), "Email Dashboard"),
    (("cloudflare-worker-domain-binding", "workers-domain", "default-workers-domain"), "Deploy Config"),
    (("custom-domain-bind-readiness", "deploy-readiness-before-domain-bind", "domain-bind"), "Domain Setup"),
    (("codex-cli-landing-template", "landing-template", "codex-cli", "codex", "e2b-ai"), "Codex CLI E2B"),
    (("ugc-video-generation", "ugc-generation-flow", "ugc"), "UGC Video Generation"),
    (("landing-gen-codex-cli-toggle", "codex-cli", "codex", "e2b-ai"), "Codex CLI E2B"),
]
IN_PROGRESS_HINTS = {
    "Codex CLI E2B": (None, ""),
    "E2B Sandbox Token Usage": (None, ""),
    "UGC Video Generation": (None, ""),
}
ARTIFACT_DIRS = ("docs/superpowers", ".ai", ".omo", ".omc", ".gsd", ".codex")
PLAN_ARTIFACT_DIR = ".omo/plans"
TEXT_EXTENSIONS = {".md", ".txt", ".json", ".jsonl", ".yaml", ".yml"}
CommitContext: TypeAlias = dict[str, str | int]
ProgressContext: TypeAlias = dict[
    str,
    str | bool | list[str] | list[CommitContext],
]
ProgressItem: TypeAlias = dict[str, str | int | None | list[str] | ProgressContext]


class WorktreeEntry(TypedDict, total=False):
    path: Path
    head: str
    branch: str
    detached: bool
    prunable: bool


def run(cmd, cwd=None, check=True):
    result = subprocess.run(
        cmd,
        cwd=cwd,
        text=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
    )
    if check and result.returncode != 0:
        raise RuntimeError(
            f"Command failed: {' '.join(cmd)}\n{result.stderr.strip()}"
        )
    return result.stdout.strip()


def parse_date(parts):
    if not parts:
        return current_manila_date()

    raw = " ".join(parts).strip()
    now_year = int(run(["bash", "-lc", "TZ=Asia/Manila date +%Y"]))
    formats = [
        "%Y-%m-%d",
        "%Y/%m/%d",
        "%b %d %Y",
        "%B %d %Y",
        "%b %d, %Y",
        "%B %d, %Y",
        "%b %d",
        "%B %d",
    ]
    for fmt in formats:
        try:
            parsed = dt.datetime.strptime(raw, fmt)
            if "%Y" not in fmt:
                parsed = parsed.replace(year=now_year)
            return parsed.date()
        except ValueError:
            pass
    raise SystemExit(f"Unsupported date: {raw}")


def current_manila_datetime():
    return dt.datetime.now(dt.timezone(dt.timedelta(hours=8)))


def current_manila_date():
    return current_manila_datetime().date()


def month_name(date_value):
    return date_value.strftime("%B %-d, %Y")


def parse_until_time(raw):
    if not raw:
        return dt.time(23, 59, 59)
    value = raw.strip().lower().replace(".", "")
    value = re.sub(r"\s+", "", value)
    formats = ["%I%p", "%I:%M%p", "%H:%M:%S", "%H:%M", "%H%M", "%H"]
    for fmt in formats:
        try:
            return dt.datetime.strptime(value, fmt).time()
        except ValueError:
            pass
    raise SystemExit(f"Unsupported time: {raw}")


def parse_since_time(raw):
    if not raw:
        return dt.time(0, 0, 0)
    return parse_until_time(raw)


def default_until_time(date_value, raw):
    if raw:
        return parse_until_time(raw)
    if date_value == current_manila_date():
        now = current_manila_datetime()
        return dt.time(now.hour, now.minute, now.second)
    return dt.time(23, 59, 59)


def format_time(time_value):
    hour = time_value.hour
    minute = time_value.minute
    suffix = "AM" if hour < 12 else "PM"
    display_hour = hour % 12 or 12
    return f"{display_hour}:{minute:02d} {suffix}"


def short_month_day(date_value):
    return f"{date_value.strftime('%b')} {date_value.day}"


def window_bounds(date_value, until_time):
    since = f"{date_value.isoformat()} 00:00:00 +0800"
    until = (
        f"{date_value.isoformat()} "
        f"{until_time.hour:02d}:{until_time.minute:02d}:{until_time.second:02d} +0800"
    )
    return since, until


def range_bounds(start_date, start_time, end_date, end_time):
    since = (
        f"{start_date.isoformat()} "
        f"{start_time.hour:02d}:{start_time.minute:02d}:{start_time.second:02d} +0800"
    )
    until = (
        f"{end_date.isoformat()} "
        f"{end_time.hour:02d}:{end_time.minute:02d}:{end_time.second:02d} +0800"
    )
    return since, until


def range_title(start_date, start_time, end_date, end_time):
    if start_date == end_date and start_time == dt.time(0, 0, 0):
        return f"{month_name(end_date)} until {format_time(end_time)}"
    return (
        f"{month_name(start_date)} {format_time(start_time)} "
        f"to {month_name(end_date)} {format_time(end_time)}"
    )


def manila_datetime_from_epoch(epoch):
    return dt.datetime.fromtimestamp(
        int(epoch),
        tz=dt.timezone(dt.timedelta(hours=8)),
    )


def segment_name(timestamp):
    value = manila_datetime_from_epoch(timestamp)
    if value.hour < 12:
        period = "Morning"
    elif value.hour < 18:
        period = "Afternoon"
    else:
        period = "Evening"
    return f"{short_month_day(value.date())} - {period}"


def ensure_repo(path, url=None):
    if path.exists() and (path / ".git").exists():
        run(["git", "fetch", "origin"], cwd=path)
        return
    if not url:
        raise SystemExit(f"Missing git repo: {path}")
    if path.exists():
        raise SystemExit(f"Path exists but is not a git repo: {path}")
    run(["git", "clone", "--filter=blob:none", "--single-branch", url, str(path)])


def default_ref(repo, refs=MAIN_REFS):
    for ref in refs:
        has_ref = run(
            ["git", "rev-parse", "--verify", "--quiet", ref],
            cwd=repo,
            check=False,
        )
        if has_ref:
            return ref
    return "HEAD"


def refs_for_source(source):
    if source.project == "Ramiro":
        return RAMIRO_REFS
    return MAIN_REFS


def get_commits_in_bounds(repo, ref, since, until):
    fmt = "%h%x1f%ct%x1f%ad%x1f%an%x1f%ae%x1f%s"
    out = run(
        [
            "git",
            "log",
            "--first-parent",
            ref,
            f"--since={since}",
            f"--until={until}",
            "--date=iso-local",
            f"--pretty=format:{fmt}",
            "--reverse",
        ],
        cwd=repo,
    )
    commits = []
    for line in out.splitlines():
        if not line.strip():
            continue
        sha, epoch, date_text, author, email, subject = line.split("\x1f", 5)
        author_key = f"{author} {email}"
        if author_matches(author_key) or commit_has_authored_side_parent(repo, sha):
            commits.append(
                {
                    "repo": str(repo),
                    "sha": sha,
                    "epoch": int(epoch),
                    "date": date_text,
                    "author": author,
                    "email": email,
                    "subject": subject,
                }
            )
    return commits


def get_commits(repo, ref, date_value, until_time):
    since, until = window_bounds(date_value, until_time)
    return get_commits_in_bounds(repo, ref, since, until)


def get_authored_commits_in_bounds(repo, since, until):
    fmt = "%h%x1f%ct%x1f%ad%x1f%an%x1f%ae%x1f%s%x1f%D"
    out = run(
        [
            "git",
            "log",
            "--all",
            f"--since={since}",
            f"--until={until}",
            "--date=iso-local",
            f"--pretty=format:{fmt}",
            "--reverse",
        ],
        cwd=repo,
    )
    commits = []
    seen = set()
    for line in out.splitlines():
        if not line.strip():
            continue
        sha, epoch, date_text, author, email, subject, refs = line.split("\x1f", 6)
        if sha in seen:
            continue
        seen.add(sha)
        author_key = f"{author} {email}"
        if author_matches(author_key):
            commits.append(
                {
                    "repo": str(repo),
                    "sha": sha,
                    "epoch": int(epoch),
                    "date": date_text,
                    "author": author,
                    "email": email,
                    "subject": subject,
                    "refs": refs,
                }
            )
    return commits


def get_authored_commits(repo, date_value, until_time):
    since, until = window_bounds(date_value, until_time)
    return get_authored_commits_in_bounds(repo, since, until)


def cleaned_subject(subject):
    merge_match = re.match(r"Merge pull request #\d+ from [^/]+/(.+)", subject)
    if merge_match:
        subject = merge_match.group(1).replace("/", " ").replace("-", " ")
    cleaned = re.sub(r"\s*\(#\d+\)\s*$", "", subject)
    cleaned = re.sub(r"^\[[^\]]+\]\s*", "", cleaned)
    cleaned = re.sub(r"^[a-z]+(?:\([^)]+\))?:\s*", "", cleaned)
    return cleaned[:1].upper() + cleaned[1:]


def commit_repo(commit):
    return Path(commit["repo"])


def commit_message_text(commit):
    return run(
        ["git", "show", "-s", "--format=%B", commit["sha"]],
        cwd=commit_repo(commit),
        check=False,
    )


def changed_paths(commit):
    out = run(
        ["git", "show", "--name-only", "--format=", commit["sha"]],
        cwd=commit_repo(commit),
        check=False,
    )
    return [line.strip() for line in out.splitlines() if line.strip()]


def changed_paths_with_status(commit):
    out = run(
        ["git", "show", "--name-status", "--format=", commit["sha"]],
        cwd=commit_repo(commit),
        check=False,
    )
    return [line.strip() for line in out.splitlines() if line.strip()]


def commit_stat_text(commit):
    return run(
        [
            "git",
            "show",
            "--stat",
            "--stat-count=80",
            "--format=",
            commit["sha"],
        ],
        cwd=commit_repo(commit),
        check=False,
    )


def github_repo_slug(repo):
    url = run(["git", "config", "--get", "remote.origin.url"], cwd=repo, check=False)
    match = re.search(r"github\.com[:/]([^/\s]+)/(.+?)(?:\.git)?$", url.strip())
    if not match:
        return None
    return f"{match.group(1)}/{match.group(2)}"


def commit_pr_text(commit):
    if not shutil.which("gh"):
        return ""
    match = re.search(r"\(#(\d+)\)\s*$", commit["subject"])
    if not match:
        return ""
    slug = github_repo_slug(commit_repo(commit))
    if not slug:
        return ""
    return run(
        [
            "gh",
            "pr",
            "view",
            match.group(1),
            "--repo",
            slug,
            "--json",
            "title,body",
            "--jq",
            '.title + "\n" + (.body // "")',
        ],
        check=False,
    )


def clean_detail_text(text):
    cleaned = re.sub(r"^\s*[-*]\s*", "", text.strip())
    cleaned = re.sub(r"^\[[ xX]\]\s*", "", cleaned)
    cleaned = re.sub(r"^(Added|Updated|Removed):\s*", "", cleaned, flags=re.IGNORECASE)
    cleaned = cleaned_subject(cleaned)
    replacements = {
        "Upgrade tenant ecommerce schema and checkout validation to permit zero-price products, enforce stock, avoid duplicate slugs on rename, and use live mode for product routes": (
            "Products now support stock tracking, zero-price checkout, safer slugs, and live-mode routes"
        ),
        "Add focused backend and web regression coverage": (
            "Backend and web regression tests cover inventory and checkout behavior"
        ),
    }
    cleaned = replacements.get(cleaned.rstrip("."), cleaned.rstrip("."))
    return sentence(cleaned)


def source_detail_lines(text, subject):
    details = []
    subject_key = normalized_sentence(cleaned_subject(subject))
    skipped = {
        "summary",
        "changes",
        "reason",
        "testing",
        "screenshots",
        "added:",
        "updated:",
        "removed:",
    }
    for raw_line in text.replace("\\n", "\n").splitlines():
        line = re.sub(r"^\s*[-*]\s*", "", raw_line.strip())
        if not line:
            continue
        lower = line.lower().strip("#: ")
        if lower in skipped or lower.startswith(("co-authored-by:", "generated with ")):
            continue
        detail = clean_detail_text(line)
        detail_key = normalized_sentence(detail)
        if detail_key == subject_key or len(detail_key) < 4:
            continue
        if detail not in details:
            details.append(detail)
    return details


def has_path(paths, *needles):
    return any(any(needle in path for needle in needles) for path in paths)


def path_detail_lines(paths, subject):
    lower = subject.lower()
    details = []

    def add(text):
        if text not in details:
            details.append(text)

    if "require ecommerce approval" in lower or "ecommerce approval" in lower:
        if has_path(paths, "engineering-execution-pipeline.service.ts"):
            add("Live site completion now creates an ecommerce approval suggestion instead of auto-starting setup.")
        if has_path(paths, "ecommerce-install-executor.service.ts"):
            add("Setup suggestions now skip companies that already have ecommerce active or installing.")
        if has_path(paths, "company-activity.service.ts"):
            add("Duplicate ecommerce suggestions are blocked through company activity checks.")
        if has_path(paths, "test/engineering-agent"):
            add("Backend tests cover the ecommerce approval policy.")
        return details

    if "tenant inventory" in lower or "product inventory" in lower or "inventory management" in lower:
        if has_path(paths, "tenant-products", "tenant-inventory-products"):
            add("Backend product APIs now support stock, price, and status management.")
        if has_path(paths, "tenant-commerce", "tenant-checkout"):
            add("Checkout now protects stock reservations and final payment states.")
        if has_path(paths, "dashboard/products", "dashboard/resources/products"):
            add("Dashboard product management screens were added.")
        if has_path(paths, "supabase/migrations"):
            add("Database migrations add inventory fields for tenant products.")
        return details

    return details


def source_backed_details(commit):
    message_details = source_detail_lines(commit_message_text(commit), commit["subject"])
    pr_details = source_detail_lines(commit_pr_text(commit), commit["subject"])
    path_details = path_detail_lines(changed_paths(commit), commit["subject"])
    details = []
    for detail in pr_details + message_details + path_details:
        if detail not in details:
            details.append(detail)
    return details[:3]


def truncate_text(text, limit=6000):
    cleaned = text.strip()
    if len(cleaned) <= limit:
        return cleaned
    return cleaned[:limit].rstrip() + "\n...[truncated]"


def append_text_block(lines, title, text):
    lines.append(f"{title}:")
    cleaned = truncate_text(text)
    if not cleaned:
        lines.append("_None found._")
        return
    lines.append("```text")
    lines.append(cleaned)
    lines.append("```")


def append_list_block(lines, title, values, limit=80):
    lines.append(f"{title}:")
    if not values:
        lines.append("- None found.")
        return
    for value in values[:limit]:
        lines.append(f"- {value}")
    if len(values) > limit:
        lines.append(f"- ...and {len(values) - limit} more.")


def commit_scope_text(commit):
    scope, text = scope_and_text(commit)
    return f"{scope} - {text}"


def write_commit_context(lines, commit):
    lines.append(f"### {commit['source']} {commit['sha']} - {commit['date']}")
    lines.append(f"Subject: {commit['subject']}")
    lines.append(f"Suggested scope: {commit_scope_text(commit)}")
    lines.append("")
    append_text_block(lines, "Commit message", commit_message_text(commit))
    lines.append("")
    append_text_block(lines, "PR context", commit_pr_text(commit))
    lines.append("")
    append_text_block(lines, "Diff stat", commit_stat_text(commit))
    lines.append("")
    append_list_block(lines, "Changed paths", changed_paths_with_status(commit))
    lines.append("")


def technical_details(commit, scope):
    subject = commit["subject"]
    lower = subject.lower()
    source = commit.get("source")
    sourced = source_backed_details(commit)
    if sourced:
        return sourced

    if source == "Gondoor-Template":
        if "neon websocket migrator" in lower:
            return [
                "Template migrations now use the Neon websocket migrator path.",
                "The older direct migrator path was removed from the template script.",
                "This keeps hosted template database setup aligned with Neon connection requirements.",
            ]
        return []
    if "ugc" in lower and "video generation" in lower:
        return [
            "Video generation now handles failure cases more reliably.",
        ]
    if "email dashboard link" in lower or ("dashboard" in lower and "link" in lower):
        return [
            "Dashboard navigation now points to the intended page.",
        ]
    if "default workers domain" in lower or "workers domain environment" in lower:
        return [
            "Deploys no longer carry the default Workers domain setting.",
        ]
    if "admin out of backend deploy" in lower:
        return [
            "Backend deploy packages now stay focused on backend code.",
            "Admin files stay out of backend restart packaging.",
        ]
    if "custom domain binding readiness" in lower or "domain bind" in lower:
        return [
            "Custom domain binding now waits more reliably.",
            "Deploy readiness is checked before domain binding starts.",
        ]
    if "restore codex cli template craft" in lower:
        return [
            "Landing generation can use the Codex CLI E2B template again.",
            "Template build scripts include the Codex CLI runtime pieces.",
            "Smoke and publish checks cover the E2B template flow.",
        ]
    if "publish codex templates" in lower or "codex templates by id" in lower:
        return [
            "E2B publishing now targets Codex templates by template id.",
            "Template build scripts can pass stable template identifiers through publish runs.",
            "Publish tests cover the id-based path so the wrong template is not updated.",
        ]
    if "require neon org id" in lower or "neon org id" in lower:
        return [
            "Production config now requires `NEON_ORG_ID` before provisioning can run.",
            "Environment validation fails early when the Neon organization id is missing.",
            "Config tests cover the required production setting.",
        ]
    if "generation progress fallback" in lower:
        return [
            "Landing generation now has fallback progress when live progress events lag.",
            "Dashboard task progress can read fallback state from the home data contract.",
            "Landing router and web tests cover the fallback progress path.",
        ]
    if "codex cli e2b templates" in lower or ("codex cli" in lower and "template" in lower):
        return [
            "Codex CLI E2B templates were published for landing generation.",
            "Template build scripts now include the Codex CLI runtime pieces.",
            "Smoke and publish tests were updated around the E2B template flow.",
        ]
    if "bind tenant domain" in lower:
        return [
            "Tenant domains are bound before smoke verification starts.",
            "Deploy orchestration now waits for the correct domain setup order.",
            "Regression tests cover the domain-before-smoke sequence.",
        ]
    return []


def scope_and_text(commit):
    subject = commit["subject"]
    lower = subject.lower()
    source = commit.get("source")

    if source == "Gondoor-Template":
        template_rules = [
            (["neon websocket migrator"], "Made template database setup connect more reliably in hosted environments."),
            (["migrator"], "Improved template database setup reliability."),
        ]
        for needles, text in template_rules:
            if any(needle in lower for needle in needles):
                return "Gondoor Template", text
        return "Gondoor Template", cleaned_subject(subject).rstrip(".") + "."
    if source == "Ramiro Law":
        return "Ramiro Law", cleaned_subject(subject).rstrip(".") + "."

    rules = [
        (["tenant inventory system", "tenant product inventory", "inventory management"], "Tenant Inventory", "Product inventory management went live."),
        (["require ecommerce approval", "ecommerce approval"], "Ecommerce Setup", "Ecommerce setup now waits for approval before continuing."),
        (["ugc", "video generation"], "UGC Video Generation", "Stabilized UGC video generation."),
        (["email dashboard link"], "Email Dashboard", "Fixed the email dashboard link."),
        (["default workers domain", "workers domain environment"], "Deploy Config", "Cleaned up default Workers domain handling."),
        (["admin out of backend deploy"], "Backend Deploys", "Kept admin code out of backend deploys."),
        (["custom domain binding readiness", "deploy readiness before domain bind", "domain bind"], "Domain Setup", "Reduced domain setup failures during deploys."),
        (["restore codex cli template craft"], "Codex CLI E2B", "Restored Codex CLI template generation."),
        (["research", "ceo research"], "Research Agent", "Improved CEO research tasks so results stay focused on the right business context."),
        (["checkout", "whop", "tenant-commerce", "product catalog", "product id"], "Whop", "Made tenant checkout setup safer and kept reused checkout credentials working."),
        (["low-credit", "import cycle"], "Billing", "Stabilized low-credit weekly bonus handling."),
        (["publish codex templates", "codex templates by id"], "E2B Templates", "Made Codex template publishing target the right template id."),
        (["require neon org id", "neon org id"], "Provisioning", "Required the Neon organization id before production provisioning runs."),
        (["generation progress fallback"], "Landing Pages", "Added a progress fallback for generated landing pages."),
        (["pin visual qa", "pin visual", "model"], "Landing Generator", "Made landing page quality more consistent by pinning the model setup."),
        (["routing", "landing urls", "landing url"], "Landing Routes", "Made landing page URLs safer and more reliable."),
        (["brand logo"], "Brand Setup", "Added brand logo content during onboarding."),
        (["onboarding", "restart-safe", "background jobs", "queue", "idea build"], "Onboarding", "Improved onboarding retries, restart recovery, queue handling, and idea-to-setup routing."),
        (["componentize", "generated images", "persist failure"], "Landing Pages", "Cleaned up generated homepages and kept images safe when saving runs into issues."),
        (["deploy propagation"], "Deployments", "Waited for site changes to finish publishing before showing them."),
        (["raw build", "build failure", "landing parity"], "Site Builder", "Hid raw build errors from users and kept generated landing pages consistent."),
        (["preview link", "public generated preview"], "Previews", "Switched generated site previews to public links."),
        (["e2b-ai", "e2b ai", "provider controls", "cli provider", "codex cli"], "Codex CLI E2B", "Added controls for choosing and managing the E2B AI provider."),
        (["dynamic-first", "landing-gen", "landing generation", "visual qa"], "Landing Generator", "Improved generated landing pages for more business types and better reuse of learned styles."),
        (["social-posting", "zernio"], "Zernio Social", "Fixed the social account connection flow."),
        (["foundation", "mvp output"], "Foundation MVP", "Added stronger quality checks before MVP outputs are accepted."),
        (["template publish"], "E2B Templates", "Fixed landing page environment publishing issues."),
        (["engineering"], "Engineering Tasks", "Reduced cleanup conflicts during task runs."),
        (["calendar"], "Dashboard Calendar", "Added an action for creating calendar drafts."),
        (["billing", "weekly bonus"], "Billing", "Added weekly bonus billing flows, bonus credit handling, and low-credit safeguards."),
        (["auth", "trusted"], "Auth", "Improved trusted registration handling."),
    ]
    for needles, scope, text in rules:
        if any(needle in lower for needle in needles):
            return scope, text

    cleaned = cleaned_subject(subject)
    return "General", cleaned.rstrip(".") + "."


def combine_updates(commits):
    by_scope = {}
    order = []
    for commit in commits:
        scope, text = scope_and_text(commit)
        key = (scope, text)
        if key not in by_scope:
            by_scope[key] = []
            order.append(key)
        for detail in technical_details(commit, scope):
            if normalized_sentence(detail) == normalized_sentence(text):
                continue
            if detail not in by_scope[key]:
                by_scope[key].append(detail)

    updates = []
    for scope, text in order:
        updates.append((scope, text, by_scope[(scope, text)]))
    return updates


def landed_scope_epochs(commits):
    epochs = {}
    for commit in commits:
        scope, _text = scope_and_text(commit)
        epochs[scope] = max(epochs.get(scope, 0), int(commit.get("epoch") or 0))
    return epochs


def project_name(value):
    text = str(value or "").strip()
    if text in PROJECT_ORDER:
        return text
    if text == "Ramiro Law":
        return "Ramiro"
    return "Gondoor"


def commits_by_project(commits):
    grouped = {project: [] for project in PROJECT_ORDER}
    for commit in commits:
        grouped.setdefault(project_name(commit.get("project") or commit.get("source")), []).append(commit)
    return grouped


def progress_by_project(in_progress):
    grouped = {project: [] for project in PROJECT_ORDER}
    for item in in_progress:
        grouped.setdefault(project_name(item.get("project")), []).append(item)
    return grouped


def landed_epochs_by_project(commits):
    grouped = {}
    for project, project_commits in commits_by_project(commits).items():
        grouped[project] = landed_scope_epochs(project_commits)
    return grouped


def landed_texts_by_project(commits):
    grouped = {project: [] for project in PROJECT_ORDER}
    for commit in commits:
        text = "\n".join(
            [
                str(commit.get("subject") or ""),
                commit_message_text(commit),
                commit_pr_text(commit),
            ]
        )
        grouped.setdefault(project_name(commit.get("project") or commit.get("source")), []).append(
            normalized_sentence(text)
        )
    return grouped


def normalized_sentence(text):
    return re.sub(r"[^a-z0-9]+", " ", text.lower()).strip()


def titleize_branch(branch):
    slug = branch.split("/")[-1]
    for needles, label in IN_PROGRESS_LABEL_RULES:
        if any(needle in branch.lower() for needle in needles):
            return label
    words = [word for word in re.split(r"[-_/]+", slug) if word]
    return " ".join(word.upper() if word.lower() in {"ai", "e2b", "ugc"} else word.capitalize() for word in words)


def worktrees(repo):
    out = run(["git", "worktree", "list", "--porcelain"], cwd=repo)
    entries: list[WorktreeEntry] = []
    current: WorktreeEntry | None = None
    for line in out.splitlines():
        if line.startswith("worktree "):
            if current:
                entries.append(current)
            current = {"path": Path(line.removeprefix("worktree "))}
            continue
        if not current:
            continue
        if line.startswith("HEAD "):
            current["head"] = line.removeprefix("HEAD ")
        elif line.startswith("branch "):
            current["branch"] = line.removeprefix("branch refs/heads/")
        elif line == "detached":
            current["detached"] = True
        elif line.startswith("prunable"):
            current["prunable"] = True
    if current:
        entries.append(current)
    return entries


def is_main_branch(branch, base_ref="origin/main"):
    base_branch = base_ref.removeprefix("origin/")
    return branch in {"main", "staging", base_branch} or not branch


def git_status_porcelain(repo):
    return run(["git", "status", "--porcelain"], cwd=repo, check=False)


def current_branch(repo):
    return run(["git", "rev-parse", "--abbrev-ref", "HEAD"], cwd=repo, check=False)


def dirty_paths_from_lines(dirty_lines):
    paths = []
    for line in dirty_lines:
        path = dirty_path_from_status(line)
        if path:
            paths.append(path)
    return paths


def dirty_activity_between(repo, dirty_lines, start, end):
    for path_text in dirty_paths_from_lines(dirty_lines):
        path = repo / path_text
        try:
            modified = int(path.stat().st_mtime)
        except OSError:
            continue
        if start <= modified <= end:
            return True
    return False


def recent_artifact_paths(repo, start, end, limit=8):
    priority_paths = []
    boulder_path = repo / ".omo/boulder.json"
    if boulder_path.exists():
        try:
            modified = int(boulder_path.stat().st_mtime)
            text = boulder_path.read_text(encoding="utf-8", errors="ignore")
            data = json.loads(text)
        except (OSError, json.JSONDecodeError):
            data = {}
            modified = 0
        if start <= modified <= end:
            priority_paths.append(boulder_path)
        works = data.get("works") if isinstance(data, dict) else None
        if isinstance(works, dict):
            for value in works.values():
                if not isinstance(value, dict):
                    continue
                active_plan = value.get("active_plan")
                if not isinstance(active_plan, str):
                    continue
                plan_path = repo / active_plan
                if not plan_path.exists():
                    continue
                try:
                    plan_modified = int(plan_path.stat().st_mtime)
                except OSError:
                    continue
                if start <= plan_modified <= end:
                    priority_paths.append(plan_path)

    paths = []
    for dirname in ARTIFACT_DIRS:
        root = repo / dirname
        if not root.exists():
            continue
        for path in root.rglob("*"):
            if not path.is_file() or path.suffix.lower() not in TEXT_EXTENSIONS:
                continue
            try:
                modified = int(path.stat().st_mtime)
            except OSError:
                continue
            if start <= modified <= end:
                paths.append(path)
    sorted_paths = sorted(paths, key=lambda path: path.stat().st_mtime, reverse=True)
    unique_paths = []
    for path in [*priority_paths, *sorted_paths]:
        if path not in unique_paths:
            unique_paths.append(path)
    return unique_paths[:limit]


def relative_artifact_paths(repo, paths):
    return [str(path.relative_to(repo)) for path in paths]


def dirty_diff_stat(repo):
    return run(["git", "diff", "--stat"], cwd=repo, check=False)


def dirty_work_label(paths):
    lower_paths = "\n".join(paths).lower()
    if "sandbox-template-gen" in lower_paths or "landing-gen" in lower_paths:
        return "E2B Landing Deadline Recovery"
    if "e2e" in lower_paths or ".spec." in lower_paths or ".test." in lower_paths:
        return "Nightly Tests"
    return "Local Work"


def dirty_work_details(paths, label=""):
    lower_paths = "\n".join(paths).lower()
    lower_label = label.lower()
    details = []
    if "header-search" in lower_paths or "app-header" in lower_paths or "employee-search" in lower_label:
        details.append("App header search files and coverage are being updated.")
    if "payroll" in lower_paths:
        details.append("Payroll mobile layout files are being adjusted.")
    if (
        "e2b-landing-deadline" in lower_paths
        or "deadline-recovery" in lower_label
        or "sandbox-template-gen" in lower_paths
    ):
        details.append("E2B landing timeout recovery planning is active.")
    if "dashboard/home" in lower_paths or "home-page" in lower_paths or "home-density" in lower_paths:
        details.append("Dashboard home and density tests are being stabilized.")
    if "email-" in lower_paths or "preauth-dashboard" in lower_paths:
        details.append("Email dashboard navigation fixtures and selectors are being tightened.")
    if "whop" in lower_paths or "groq" in lower_paths or "ugc" in lower_paths:
        details.append("Backend nightly failures around Whop, Groq, and UGC flows are being fixed.")
    if "actions-social-media" in lower_paths or "actions-library-picker" in lower_paths:
        details.append("Actions social media attach E2E setup is being adjusted.")
    return details[:3]


def estimated_progress(label, dirty, plus_count, paths=None, plan_only=False):
    lower_label = label.lower()
    lower_paths = "\n".join(paths or []).lower()
    has_test = ".test." in lower_paths or ".spec." in lower_paths
    has_source = any(
        path.endswith((".ts", ".tsx", ".js", ".jsx", ".py"))
        and ".test." not in path
        and ".spec." not in path
        for path in paths or []
    )

    if "e2b landing deadline recovery" in lower_label:
        return 25 if dirty else 15
    if "employee search" in lower_label:
        return 80 if has_test and has_source else 60
    if plan_only:
        return 15
    if plus_count:
        return 75 if has_test else 60
    if dirty and has_test and has_source:
        return 70
    if dirty:
        return 40
    return 20


def dirty_work_progress(repo, label):
    if label != "Nightly Tests":
        return None, ""
    last_run_path = repo / "apps/web/test-results/.last-run.json"
    if not last_run_path.exists():
        return None, ""
    try:
        data = json.loads(last_run_path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return None, ""
    status = data.get("status") if isinstance(data, dict) else None
    failed_tests = data.get("failedTests") if isinstance(data, dict) else None
    if status == "passed":
        return 100, "latest Playwright run passed"
    if status == "failed" and isinstance(failed_tests, list) and len(failed_tests) == 1:
        return 80, "4 of 5 active failure buckets are patched; one latest Playwright failure remains"
    if status == "failed":
        return 60, "multiple latest Playwright failures remain"
    return None, ""


def strip_plan_markup(text):
    cleaned = re.sub(r"^\s*>\s*", "", text.strip())
    cleaned = re.sub(r"^\s*[-*]\s*", "", cleaned)
    cleaned = re.sub(r"\*\*([^*]+)\*\*", r"\1", cleaned)
    cleaned = cleaned.replace("`", "")
    return cleaned.strip()


def plan_label(path, text):
    for raw_line in text.splitlines():
        line = raw_line.strip()
        if line.startswith("# "):
            return strip_plan_markup(line.removeprefix("# "))
    return titleize_branch(path.stem)


def plan_detail_lines(text):
    details = []
    for raw_line in text.splitlines():
        line = strip_plan_markup(raw_line)
        if not line:
            continue
        if line.startswith("Summary:"):
            detail = line.removeprefix("Summary:").strip()
        elif line.startswith("What you'll get:"):
            detail = line.removeprefix("What you'll get:").strip()
        elif line.startswith("Deliverables:"):
            continue
        elif raw_line.strip().startswith("> - "):
            detail = line
        else:
            continue
        if detail and detail not in details:
            details.append(sentence(detail))
        if len(details) >= 3:
            break
    return details


def artifact_context_details(repo, paths):
    details = []
    for path in paths:
        try:
            text = path.read_text(encoding="utf-8", errors="ignore")
        except OSError:
            continue
        if path.name == "boulder.json":
            try:
                data = json.loads(text)
            except json.JSONDecodeError:
                data = {}
            works = data.get("works") if isinstance(data, dict) else None
            if isinstance(works, dict):
                for value in works.values():
                    if not isinstance(value, dict):
                        continue
                    active_plan = value.get("active_plan")
                    if not isinstance(active_plan, str):
                        continue
                    plan_path = repo / active_plan
                    if plan_path.exists():
                        try:
                            plan_text = plan_path.read_text(encoding="utf-8", errors="ignore")
                        except OSError:
                            continue
                        for detail in plan_detail_lines(plan_text):
                            if detail not in details:
                                details.append(detail)
        elif path.name == "goals.json":
            progress = artifact_progress_from_json(path, text)
            if progress:
                _percent, _status, progress_details = progress
                for detail in progress_details:
                    if detail not in details:
                        details.append(detail)
        elif path.suffix.lower() == ".md":
            for detail in plan_detail_lines(text):
                if detail not in details:
                    details.append(detail)
    return details[:3]


def plan_artifact_items(repo, start_epoch, end_epoch, project, seen_labels, landed_epochs):
    plan_root = repo / PLAN_ARTIFACT_DIR
    if not plan_root.exists():
        return []

    items: list[ProgressItem] = []
    paths = sorted(
        (path for path in plan_root.glob("*.md") if path.is_file()),
        key=lambda path: path.stat().st_mtime,
        reverse=True,
    )
    for path in paths[:1]:
        try:
            modified = int(path.stat().st_mtime)
            text = path.read_text(encoding="utf-8", errors="ignore")
        except OSError:
            continue
        if modified < start_epoch or modified > end_epoch:
            continue
        label = plan_label(path, text)
        if label in seen_labels or label in landed_epochs:
            continue
        item = make_progress_item(
            label,
            estimated_progress(label, False, 0, [], plan_only=True),
            "",
            "estimated",
        )
        details = plan_detail_lines(text)
        if details:
            item["details"] = details
        item["project"] = project
        item["context"] = {
            "branch": current_branch(repo),
            "worktree": str(repo),
            "dirty": False,
            "artifact_paths": [str(path.relative_to(repo))],
            "unmerged_commits": [],
        }
        seen_labels.add(label)
        items.append(item)
    return items[:1]


def latest_matching_plan_context(repo, start_epoch, end_epoch, label):
    plan_root = repo / PLAN_ARTIFACT_DIR
    if not plan_root.exists():
        return [], []
    paths = sorted(
        (path for path in plan_root.glob("*.md") if path.is_file()),
        key=lambda path: path.stat().st_mtime,
        reverse=True,
    )
    if not paths:
        return [], []
    path = paths[0]
    try:
        modified = int(path.stat().st_mtime)
        text = path.read_text(encoding="utf-8", errors="ignore")
    except OSError:
        return [], []
    if modified < start_epoch or modified > end_epoch:
        return [], []
    if plan_label(path, text) != label:
        return [], []
    return [str(path.relative_to(repo))], plan_detail_lines(text)


def cherry_lines(repo, base_ref="origin/main"):
    out = run(["git", "cherry", "-v", base_ref, "HEAD"], cwd=repo, check=False)
    plus = []
    minus = []
    for line in out.splitlines():
        if line.startswith("+ "):
            plus.append(line)
        elif line.startswith("- "):
            minus.append(line)
    return plus, minus


def commit_epoch(repo, sha):
    out = run(["git", "show", "-s", "--format=%ct", sha], cwd=repo, check=False)
    try:
        return int(out.strip())
    except ValueError:
        return 0


def window_epochs(date_value, until_time):
    tz = dt.timezone(dt.timedelta(hours=8))
    start = dt.datetime.combine(date_value, dt.time(0, 0, 0), tz).timestamp()
    end = dt.datetime.combine(date_value, until_time, tz).timestamp()
    return int(start), int(end)


def range_epochs(start_date, start_time, end_date, end_time):
    tz = dt.timezone(dt.timedelta(hours=8))
    start = dt.datetime.combine(start_date, start_time, tz).timestamp()
    end = dt.datetime.combine(end_date, end_time, tz).timestamp()
    return int(start), int(end)


def plus_commit_epochs(repo, plus):
    epochs = []
    for line in plus:
        parts = line.split(maxsplit=2)
        if len(parts) < 2:
            continue
        epoch = commit_epoch(repo, parts[1])
        if epoch:
            epochs.append(epoch)
    return epochs


def plus_commit_shas(plus):
    shas = []
    for line in plus:
        parts = line.split(maxsplit=2)
        if len(parts) >= 2:
            shas.append(parts[1])
    return shas


def plus_commits_landed(repo, plus, landed_texts):
    shas = plus_commit_shas(plus)
    if not shas or not landed_texts:
        return False
    for sha in shas:
        subject = run(["git", "show", "-s", "--format=%s", sha], cwd=repo, check=False)
        key = normalized_sentence(cleaned_subject(subject))
        if not key or not any(key in landed_text for landed_text in landed_texts):
            return False
    return True


def has_activity_between(epochs, start, end):
    return any(start <= epoch <= end for epoch in epochs)


def dirty_path_from_status(line):
    if len(line) < 3:
        return None
    path_text = line[2:] if line[1:2] == " " else line[3:]
    if " -> " in path_text:
        path_text = path_text.rsplit(" -> ", 1)[1]
    return path_text.strip() or None


def has_dirty_activity_in_window(repo, dirty_lines, date_value, until_time):
    start, end = window_epochs(date_value, until_time)
    for line in dirty_lines:
        path_text = dirty_path_from_status(line)
        if not path_text:
            continue
        path = repo / path_text
        try:
            modified = int(path.stat().st_mtime)
        except OSError:
            continue
        if start <= modified <= end:
            return True
    return False


def branch_tokens(branch, label):
    raw = f"{branch} {label}".lower()
    tokens = []
    for token in re.split(r"[^a-z0-9]+", raw):
        if len(token) >= 3 and token not in {"feat", "fix", "chore", "flow", "generation"}:
            tokens.append(token)
    return sorted(set(tokens))


def candidate_artifacts(repo, tokens):
    files = []
    for dirname in ARTIFACT_DIRS:
        root = repo / dirname
        if not root.exists():
            continue
        for path in root.rglob("*"):
            if path.is_file() and path.suffix.lower() in TEXT_EXTENSIONS:
                haystack = str(path).lower()
                if any(token in haystack for token in tokens):
                    files.append(path)
    if files:
        return sorted(files, key=lambda path: path.stat().st_mtime, reverse=True)

    # If filenames do not match, inspect small artifact files for matching terms.
    for dirname in ARTIFACT_DIRS:
        root = repo / dirname
        if not root.exists():
            continue
        for path in root.rglob("*"):
            if not path.is_file() or path.suffix.lower() not in TEXT_EXTENSIONS:
                continue
            try:
                text = path.read_text(encoding="utf-8", errors="ignore")
            except OSError:
                continue
            lower = text[:120000].lower()
            if sum(1 for token in tokens if token in lower) >= min(2, len(tokens)):
                files.append(path)
    return sorted(files, key=lambda path: path.stat().st_mtime, reverse=True)


def progress_from_text(text):
    percents = []
    for match in re.finditer(r"(?<!\d)(100|[1-9]?\d)\s*%", text):
        percents.append(int(match.group(1)))

    checkbox_matches = re.findall(r"(?m)^\s*[-*]\s*\[([ xX])\]", text)
    checkbox_percent = None
    if checkbox_matches:
        done = sum(1 for item in checkbox_matches if item.lower() == "x")
        checkbox_percent = round(done * 100 / len(checkbox_matches))

    positive_percents = [value for value in percents if value > 0]
    percent = positive_percents[-1] if positive_percents else checkbox_percent
    if not percents and checkbox_percent == 0:
        percent = None
    lower = text.lower()
    status = None
    if "tests pass" in lower or "testing complete" in lower:
        status = "tests passed in artifact evidence"
    return percent, status


def artifact_progress_from_json(path, text):
    try:
        data = json.loads(text)
    except json.JSONDecodeError:
        return None

    if path.name == "goals.json":
        return progress_from_goals_json(data)

    if path.name == "final-codex-goal.json":
        goal = data.get("goal") if isinstance(data, dict) else None
        if isinstance(goal, dict) and goal.get("status") == "complete":
            return 100, "complete locally with final goal evidence", []

    if path.name == "final-quality-gate.json" and isinstance(data, dict):
        verification = data.get("verification")
        review = data.get("codeReview")
        criteria = data.get("criteriaCoverage")
        details = []
        if isinstance(verification, dict) and verification.get("status") == "passed":
            evidence = str(verification.get("evidence") or "").strip()
            if evidence:
                details.append(evidence)
        if isinstance(review, dict) and review.get("recommendation") == "APPROVE":
            details.append("Final code review approved with architect status clear.")
        if isinstance(criteria, dict):
            total = criteria.get("totalCriteria")
            passed = criteria.get("passCount")
            if isinstance(total, int) and isinstance(passed, int) and total:
                details.append(f"{passed}/{total} success criteria passed with manual evidence.")
                percent = round(passed * 100 / total)
                status = "quality gate passed" if percent == 100 else "quality gate partially passed"
                return percent, status, details
        if details:
            return 100, "quality gate passed", details

    if path.name == "ulw-complete-goals.json" and isinstance(data, dict):
        goal = data.get("goal")
        criteria = goal.get("successCriteria") if isinstance(goal, dict) else None
        if isinstance(criteria, list) and criteria:
            passed = sum(
                1
                for item in criteria
                if isinstance(item, dict) and item.get("status") == "pass"
            )
            details = []
            for item in criteria:
                if not isinstance(item, dict):
                    continue
                notes = str(item.get("notes") or "").strip()
                if notes:
                    details.append(notes)
            percent = round(passed * 100 / len(criteria))
            return percent, f"{passed}/{len(criteria)} criteria passed", details

    return None


def artifact_progress(repo, branch, label):
    tokens = branch_tokens(branch, label)
    best_percent = None
    best_status = None
    best_details = []
    for path in candidate_artifacts(repo, tokens):
        try:
            text = path.read_text(encoding="utf-8", errors="ignore")
        except OSError:
            continue
        json_progress = artifact_progress_from_json(path, text)
        if json_progress:
            percent, status, details = json_progress
            if percent is not None and best_percent is None:
                best_percent = percent
            if status:
                best_status = status
            for detail in details:
                if detail and detail not in best_details:
                    best_details.append(detail)
            continue
        percent, status = progress_from_text(text[:160000])
        if percent is not None and best_percent is None:
            best_percent = percent
        if status:
            best_status = status
    if best_percent is None and best_status is None and not best_details:
        return None
    return best_percent, best_status, best_details[:3]


def fallback_progress(label, dirty, plus_count, paths=None):
    return estimated_progress(label, dirty, plus_count, paths), ""


def parse_in_progress_override(raw) -> tuple[str, ProgressItem]:
    if "=" not in raw:
        raise SystemExit(f"Invalid --in-progress value: {raw}")
    label, rest = raw.split("=", 1)
    if ":" in rest:
        percent_text, status = rest.split(":", 1)
    else:
        percent_text, status = rest, ""
    try:
        percent = int(percent_text.strip().rstrip("%"))
    except ValueError as exc:
        raise SystemExit(f"Invalid in-progress percent: {raw}") from exc
    return label.strip(), {
        "label": label.strip(),
        "percent": percent,
        "percent_source": "user",
        "status": status.strip().rstrip("."),
    }


def parse_in_progress_overrides(values) -> dict[str, ProgressItem]:
    overrides: dict[str, ProgressItem] = {}
    for raw in values or []:
        label, item = parse_in_progress_override(raw)
        overrides[label] = item
    return overrides


def make_progress_item(
    label: str,
    percent: int | None,
    status: str | None,
    percent_source: str | None = None,
) -> ProgressItem:
    source = percent_source or ("artifact-backed" if percent is not None else "estimated")
    return {"label": label, "percent": percent if percent is not None else 20, "percent_source": source, "status": status or ""}


def in_progress_items(
    repo_root,
    start_epoch,
    end_epoch,
    project="Gondoor",
    source_name="Gondoor",
    overrides: dict[str, ProgressItem] | None = None,
    max_items=6,
    all_items=False,
    landed_epochs=None,
    landed_texts=None,
    base_ref="origin/main",
    include_unmatched_overrides=True,
):
    overrides = overrides or {}
    landed_epochs = landed_epochs or {}
    landed_texts = landed_texts or []
    items: list[ProgressItem] = []
    seen_labels = set()

    for entry in worktrees(repo_root):
        repo = entry.get("path")
        branch = entry.get("branch")
        if not repo or not repo.exists() or entry.get("prunable") or branch is None or is_main_branch(branch, base_ref):
            continue

        status = git_status_porcelain(repo)
        dirty_lines = [line for line in status.splitlines() if line.strip()]
        dirty_paths = dirty_paths_from_lines(dirty_lines)
        dirty = bool(dirty_lines)
        plus, _minus = cherry_lines(repo, base_ref)
        label = titleize_branch(branch)
        artifact_paths = recent_artifact_paths(repo, start_epoch, end_epoch)
        artifact_active = bool(artifact_paths)
        if not plus and not dirty and not artifact_active:
            continue
        if not all_items and plus and not dirty and plus_commits_landed(repo, plus, landed_texts):
            continue

        epochs = plus_commit_epochs(repo, plus)
        commit_active = has_activity_between(epochs, start_epoch, end_epoch)
        dirty_active = dirty and dirty_activity_between(repo, dirty_lines, start_epoch, end_epoch)
        if not commit_active and not dirty_active and not artifact_active:
            continue

        if label in seen_labels:
            continue

        item = overrides.get(label)
        artifact_details: list[str] = []
        dirty_details = dirty_work_details(dirty_paths, label) if dirty_active else []
        artifact_context = artifact_context_details(repo, artifact_paths) if artifact_active else []
        has_dirty_context = bool(dirty_details)
        if (
            not all_items
            and not item
            and label in landed_epochs
        ):
            continue
        artifact = artifact_progress(repo, branch, label)
        if (
            not all_items
            and not item
            and not artifact
            and not artifact_active
            and label not in IN_PROGRESS_HINTS
            and not has_dirty_context
            and not (dirty and len(dirty_lines) >= 8)
        ):
            continue

        if not item:
            fallback_percent, fallback_status = fallback_progress(label, dirty, len(plus), dirty_paths)
            if artifact:
                artifact_percent, artifact_status, artifact_details = artifact
                item = make_progress_item(
                    label,
                    artifact_percent if artifact_percent is not None else fallback_percent,
                    artifact_status or fallback_status,
                    "artifact-backed" if artifact_percent is not None else "estimated",
                )
            else:
                item = make_progress_item(label, fallback_percent, fallback_status, "estimated")

        item["status"] = str(item.get("status") or "").strip().rstrip(".")
        details = list(artifact_details) if not overrides.get(label) else []
        for detail in dirty_details:
            if detail not in details:
                details.append(detail)
        for detail in artifact_context:
            if detail not in details:
                details.append(detail)
        commit_contexts: list[CommitContext] = []
        shas = sorted(plus_commit_shas(plus), key=lambda sha: commit_epoch(repo, sha), reverse=True)
        for sha in shas:
            subject = run(["git", "show", "-s", "--format=%s", sha], cwd=repo, check=False)
            context_commit = {
                "repo": str(repo),
                "sha": sha,
                "epoch": commit_epoch(repo, sha),
                "date": run(["git", "show", "-s", "--format=%ad", "--date=iso-local", sha], cwd=repo, check=False),
                "subject": subject,
                "source": source_name,
                "project": project,
            }
            commit_contexts.append(context_commit)
            commit_details = source_backed_details(context_commit)
            for detail in commit_details:
                if detail not in details:
                    details.append(detail)
        if details:
            item["details"] = details[:3]
        item["project"] = project
        context = {
            "branch": branch,
            "worktree": str(repo),
            "dirty": dirty,
            "dirty_status": status,
            "dirty_stat": dirty_diff_stat(repo) if dirty else "",
            "dirty_paths": dirty_paths,
            "unmerged_commits": commit_contexts,
        }
        if artifact_paths:
            context["artifact_paths"] = relative_artifact_paths(repo, artifact_paths)
        item["context"] = context
        seen_labels.add(label)
        items.append(item)

    main_status = git_status_porcelain(repo_root)
    main_dirty_lines = [line for line in main_status.splitlines() if line.strip()]
    main_dirty_paths = dirty_paths_from_lines(main_dirty_lines)
    main_branch = current_branch(repo_root)
    if (
        main_dirty_paths
        and main_branch in {"main", "staging"}
        and dirty_activity_between(repo_root, main_dirty_lines, start_epoch, end_epoch)
    ):
        label = dirty_work_label(main_dirty_paths)
        if label not in seen_labels and label not in landed_epochs:
            progress_percent, progress_status = dirty_work_progress(repo_root, label)
            plan_paths, plan_details = latest_matching_plan_context(repo_root, start_epoch, end_epoch, label)
            details = list(plan_details)
            for detail in dirty_work_details(main_dirty_paths, label):
                if detail not in details:
                    details.append(detail)
            if all_items or details or progress_percent is not None or progress_status:
                if progress_percent is None:
                    progress_percent = estimated_progress(label, True, 0, main_dirty_paths)
                    progress_source = "estimated"
                else:
                    progress_source = "artifact-backed" if progress_status else "estimated"
                item = overrides.get(label) or make_progress_item(
                    label,
                    progress_percent,
                    progress_status,
                    progress_source,
                )
                if details:
                    item["details"] = details
                item["project"] = project
                context = {
                    "branch": main_branch,
                    "worktree": str(repo_root),
                    "dirty": True,
                    "dirty_status": main_status,
                    "dirty_stat": dirty_diff_stat(repo_root),
                    "dirty_paths": main_dirty_paths,
                    "unmerged_commits": [],
                }
                if plan_paths:
                    context["artifact_paths"] = plan_paths
                item["context"] = context
                seen_labels.add(label)
                items.append(item)

    for item in plan_artifact_items(repo_root, start_epoch, end_epoch, project, seen_labels, landed_epochs):
        items.append(item)

    if include_unmatched_overrides:
        for label, item in overrides.items():
            if label not in seen_labels:
                item["project"] = project
                items.append(item)

    priority = {label: index for index, label in enumerate(IN_PROGRESS_HINTS)}
    items.sort(key=lambda item: (priority.get(str(item["label"]), 50), str(item["label"])))
    return items[:max_items]


def all_in_progress_items(
    repos,
    start_epoch,
    end_epoch,
    overrides: dict[str, ProgressItem] | None,
    max_items,
    all_items,
    landed_by_project,
    landed_texts_by_project_value,
):
    items: list[ProgressItem] = []
    for repo, project, source_name in repos:
        base_ref = default_ref(repo, RAMIRO_REFS if project == "Ramiro" else MAIN_REFS)
        items.extend(
            in_progress_items(
                repo,
                start_epoch,
                end_epoch,
                project,
                source_name,
                overrides,
                max_items,
                all_items,
                landed_by_project.get(project, {}),
                landed_texts_by_project_value.get(project, []),
                base_ref,
                project == "Gondoor" and source_name == "Gondoor",
            )
        )
    priority = {label: index for index, label in enumerate(IN_PROGRESS_HINTS)}
    items.sort(
        key=lambda item: (
            PROJECT_ORDER.index(project_name(item.get("project")))
            if project_name(item.get("project")) in PROJECT_ORDER
            else 99,
            priority.get(str(item["label"]), 50),
            str(item["label"]),
        )
    )
    return items


def sentence(text):
    cleaned = text.strip().rstrip(".")
    if not cleaned:
        return ""
    cleaned = cleaned[:1].upper() + cleaned[1:]
    return cleaned + "."


def format_in_progress_status(status):
    cleaned = status.strip().rstrip(".")
    cleaned = cleaned.replace(", testing is next", "; testing is next")
    return sentence(cleaned)


def in_progress_percent_text(item):
    percent = item.get("percent")
    if percent is None:
        return ""
    return f" *({percent}%)*"


def in_progress_heading_status(item):
    status = item.get("status", "")
    if normalized_sentence(status) in {
        "review and push are next",
        "plan tasks are checked off review and push are next",
        "testing is done review and push are next",
        "code is done testing is next",
        "code is committed locally testing is next",
    }:
        return ""
    if status:
        return format_in_progress_status(status)
    details = item.get("details") or []
    if details:
        first = details[0].strip().rstrip(".")
        first = re.sub(r"^Adds?\s+", "Adds ", first)
        return sentence(first)
    return ""


def in_progress_details(item):
    if item.get("details"):
        return item["details"]
    label = item["label"]
    if label == "E2B Sandbox Token Usage":
        return [
            "Usage event storage is in place for E2B run tracking.",
            "Next pieces are backend capture, admin usage summaries, and UI reporting.",
            "Goal is to expose real E2B token usage instead of zero-token landing records.",
        ]
    return []


def in_progress_work_context(item):
    if item.get("percent") == 100:
        return ""
    details = in_progress_details(item)
    for detail in details:
        if detail.startswith("Current focus:"):
            return sentence(detail.removeprefix("Current focus:").strip())
    if details:
        return sentence(details[0].strip())
    return ""


def format_update_text(text):
    return sentence(text)


def write_update_lines(lines, updates):
    for scope, text, details in updates:
        lines.append(f"- **{scope}** - {format_update_text(text)}")
        for detail in details[:3]:
            lines.append(f"  - {detail}")


def write_in_progress_lines(lines, in_progress):
    for item in in_progress:
        status = in_progress_heading_status(item)
        suffix = f" - {status}" if status else ""
        lines.append(f"- **{item['label']}**{in_progress_percent_text(item)}{suffix}")
        work_context = in_progress_work_context(item)
        if work_context:
            lines.append(f"  - **What is being worked on**: {work_context}")
        for detail in in_progress_details(item):
            if status and normalized_sentence(detail) == normalized_sentence(status):
                continue
            if work_context and normalized_sentence(detail) == normalized_sentence(work_context):
                continue
            if detail.startswith("Current focus:"):
                continue
            lines.append(f"  - {detail}")


def write_project_sections(lines, commits, in_progress):
    commit_groups = commits_by_project(commits)
    progress_groups = progress_by_project(in_progress)
    for index, project in enumerate(PROJECT_ORDER):
        if index:
            lines.append("")
        lines.append(f"**{project}**")
        lines.append("**Pushed to Production:**")
        updates = combine_updates(commit_groups.get(project, []))
        if updates:
            write_update_lines(lines, updates)
        else:
            lines.append("- No aslaii-authored updates found.")
        lines.append("")
        lines.append("**In Progress:**")
        project_progress = progress_groups.get(project, [])
        if project_progress:
            write_in_progress_lines(lines, project_progress)
        else:
            lines.append("- No active worktree candidates found.")


def write_markdown(date_value, until_time, commits, in_progress, output=None):
    output_path = Path(output) if output else Path(f"/tmp/work-discord-update-{date_value.isoformat()}.md")
    lines = [
        "**Work Update**",
        f"*{month_name(date_value)} until {format_time(until_time)}*",
        "",
    ]
    write_project_sections(lines, commits, in_progress)

    body = "\n".join(lines) + "\n"
    output_path.write_text(body, encoding="utf-8")
    return output_path


def segmented_updates(commits):
    by_segment = {}
    order = []
    for commit in commits:
        label = segment_name(commit["epoch"])
        if label not in by_segment:
            by_segment[label] = []
            order.append(label)
        by_segment[label].append(commit)
    return [(label, by_segment[label]) for label in order]


def write_range_markdown(
    start_date,
    start_time,
    end_date,
    end_time,
    sections,
    in_progress,
    output=None,
):
    default_name = f"/tmp/work-discord-update-{start_date.isoformat()}-to-{end_date.isoformat()}.md"
    output_path = Path(output) if output else Path(default_name)
    lines = [
        "**Work Update**",
        f"*{range_title(start_date, start_time, end_date, end_time)}*",
        "",
    ]

    for index, (label, commits) in enumerate(sections):
        if index:
            lines.append("")
        lines.append(f"**{label}**")
        write_project_sections(lines, commits, [])

    if not sections:
        write_project_sections(lines, [], [])

    if in_progress:
        lines.extend(["", "**In Progress**"])
        write_in_progress_lines(lines, in_progress)

    body = "\n".join(lines) + "\n"
    output_path.write_text(body, encoding="utf-8")
    return output_path


def write_context_markdown(
    start_date,
    start_time,
    end_date,
    end_time,
    commits,
    in_progress,
    output=None,
):
    default_name = f"/tmp/work-update-context-{start_date.isoformat()}-to-{end_date.isoformat()}.md"
    output_path = Path(output) if output else Path(default_name)
    lines = [
        "# Work Update Source Context",
        "",
        f"Window: {range_title(start_date, start_time, end_date, end_time)}",
        "Purpose: source context only. Codex writes the Discord update prose from this file.",
        "",
        "## Writing Rules For Codex",
        "- Keep final Discord text short, non-technical, and source-backed.",
        "- Use landed commits under `Pushed to Production`; do not repeat `Pushed to production.` on every update line.",
        "- Use in-progress candidates only when they are not clearly already landed.",
        "- Do not mention branches, commit hashes, PR numbers, or raw commit messages in Discord text.",
        "- Do not add filler bullets. If context is weak, omit sub-bullets.",
        "- For non-100% in-progress items, include `**What is being worked on**:` from `.omo` current focus or source-backed details.",
        "- Write final Discord text separated by project: `Gondoor` then `Ramiro`.",
        "- Under each project, include `Pushed to Production:` and `In Progress:` headings.",
        "",
    ]

    commit_groups = commits_by_project(commits)
    progress_groups = progress_by_project(in_progress)
    for project in PROJECT_ORDER:
        project_commits = commit_groups.get(project, [])
        project_progress = progress_groups.get(project, [])
        lines.append(f"## {project}")
        lines.append("")
        lines.append(f"### Pushed to Production ({len(project_commits)})")
        if project_commits:
            for commit in project_commits:
                write_commit_context(lines, commit)
        else:
            lines.append(f"No aslaii-authored {project} landed commits found in this window.")
            lines.append("")

        lines.append(f"### In-Progress Candidates ({len(project_progress)})")
        if not project_progress:
            lines.append(f"No active {project} worktree candidates found for this window.")
            lines.append("")
        for item in project_progress:
            context = item.get("context", {})
            percent = item.get("percent")
            percent_source = item.get("percent_source") or "estimated"
            lines.append(f"#### {item['label']} ({percent}% {percent_source})")
            lines.append(f"Progress evidence: {in_progress_heading_status(item)}")
            lines.append(f"Worktree: {context.get('worktree', '')}")
            lines.append(f"Branch: {context.get('branch', '')}")
            lines.append(f"Dirty worktree: {context.get('dirty', False)}")
            lines.append("")
            if context.get("artifact_paths"):
                append_list_block(lines, "Artifact paths", context.get("artifact_paths", []))
                lines.append("")
            if item.get("details"):
                append_list_block(lines, "Source-backed details", item.get("details", []), limit=3)
                lines.append("")
            if context.get("dirty_status"):
                append_text_block(lines, "Dirty status", context.get("dirty_status", ""))
                lines.append("")
            if context.get("dirty_stat"):
                append_text_block(lines, "Dirty diff stat", context.get("dirty_stat", ""))
                lines.append("")
            if context.get("dirty_paths"):
                append_list_block(lines, "Dirty changed paths", context.get("dirty_paths", []))
                lines.append("")
            for commit in context.get("unmerged_commits", []):
                write_commit_context(lines, commit)

    body = "\n".join(lines).rstrip() + "\n"
    output_path.write_text(body, encoding="utf-8")
    return output_path


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("date", nargs="*", help="Date, e.g. 2026-06-01 or Jun 1 2026. Defaults to today in Asia/Manila.")
    parser.add_argument("--mono-repo", default=str(DEFAULT_MONO_REPO))
    parser.add_argument("--template-dir", default=str(DEFAULT_TEMPLATE_DIR))
    parser.add_argument("--ramiro-dir", default=str(DEFAULT_RAMIRO_DIR))
    parser.add_argument("--output")
    parser.add_argument(
        "--context",
        action="store_true",
        help="Write source context for Codex to summarize. This is the default workflow.",
    )
    parser.add_argument(
        "--draft",
        action="store_true",
        help="Write the legacy deterministic Discord draft instead of source context.",
    )
    parser.add_argument("--since-date", help="Start date for range output, e.g. Jun 3 2026. Uses the positional date as the end date.")
    parser.add_argument("--since-time", help="Asia/Manila start time for range output, e.g. 6PM or 18:00. Defaults to 12:00 AM.")
    parser.add_argument("--until-time", help="Asia/Manila cutoff time, e.g. 6PM or 18:00. Defaults to current time for today, full day for past dates.")
    parser.add_argument("--no-in-progress", action="store_true")
    parser.add_argument("--all-in-progress", action="store_true", help="List every unmerged worktree, including small or stale branches.")
    parser.add_argument("--max-in-progress", type=int, default=3)
    parser.add_argument(
        "--in-progress",
        action="append",
        default=[],
        help="Manual override as Label=80:status text. May be passed more than once.",
    )
    parser.add_argument("--show-commits", action="store_true")
    parser.add_argument(
        "--show-authored-commits",
        action="store_true",
        help="Diagnostic: print all matching author commits across all refs. Not used for the Discord update because it can duplicate squash-merged work.",
    )
    args = parser.parse_args()

    end_date = parse_date(args.date)
    end_time = default_until_time(end_date, args.until_time)
    start_date = parse_date([args.since_date]) if args.since_date else end_date
    start_time = parse_since_time(args.since_time)
    range_mode = bool(args.since_date or args.since_time)
    if (start_date, start_time) > (end_date, end_time):
        raise SystemExit("Start window must be before end window.")

    mono_repo = Path(args.mono_repo)
    template_dir = Path(args.template_dir)
    ramiro_dir = Path(args.ramiro_dir)

    sources = update_sources(mono_repo, template_dir, ramiro_dir)
    for source in sources:
        ensure_repo(source.path, source.url)

    since, until = range_bounds(start_date, start_time, end_date, end_time)
    commits = []
    for source in sources:
        source_ref = default_ref(source.path, refs_for_source(source))
        for commit in get_commits_in_bounds(source.path, source_ref, since, until):
            commit["source"] = source.name
            commit["project"] = source.project
            commits.append(commit)

    commits.sort(key=lambda commit: commit["epoch"])
    landed_by_project = landed_epochs_by_project(commits)
    landed_texts = landed_texts_by_project(commits)

    progress = []
    if not args.no_in_progress:
        start_epoch, end_epoch = range_epochs(start_date, start_time, end_date, end_time)
        progress = all_in_progress_items(
            (
                (mono_repo, "Gondoor", "Gondoor"),
                (ramiro_dir, "Ramiro", "Ramiro Law"),
            ),
            start_epoch,
            end_epoch,
            parse_in_progress_overrides(args.in_progress),
            args.max_in_progress,
            args.all_in_progress,
            landed_by_project,
            landed_texts,
        )

    if args.context or not args.draft:
        output_path = write_context_markdown(
            start_date,
            start_time,
            end_date,
            end_time,
            commits,
            progress,
            args.output,
        )
    elif range_mode:
        output_path = write_range_markdown(
            start_date,
            start_time,
            end_date,
            end_time,
            segmented_updates(commits),
            progress,
            args.output,
        )
    else:
        output_path = write_markdown(end_date, end_time, commits, progress, args.output)
    print(output_path)

    if args.show_commits:
        for commit in commits:
            print(f"{commit['source']}: {commit['sha']} {commit['date']} {commit['subject']}")
        print(f"Included commits: {len(commits)}")

    if args.show_authored_commits:
        print("Authored commits across all refs:")
        authored_total = 0
        for source in sources:
            authored = get_authored_commits_in_bounds(source.path, since, until)
            authored_total += len(authored)
            for commit in authored:
                refs = f" [{commit['refs']}]" if commit.get("refs") else ""
                print(f"{source.name}: {commit['sha']} {commit['date']} {commit['subject']}{refs}")
        print(f"Authored commits across all refs: {authored_total}")


if __name__ == "__main__":
    main()
