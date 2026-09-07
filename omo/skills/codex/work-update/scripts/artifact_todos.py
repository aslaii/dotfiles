from __future__ import annotations

import re
from typing import TypeAlias

JsonValue: TypeAlias = (
    str | int | float | bool | None | list["JsonValue"] | dict[str, "JsonValue"]
)
ProgressTuple: TypeAlias = tuple[int | None, str, list[str]]


def progress_from_goals_json(data: JsonValue) -> ProgressTuple | None:
    if not isinstance(data, dict):
        return None
    goals = data.get("goals")
    if not isinstance(goals, list) or not goals:
        return None

    details: list[str] = []
    checked_count = 0
    total_count = 0
    for goal_value in goals:
        if not isinstance(goal_value, dict):
            continue
        if not details:
            focus = _string_value(goal_value.get("objective") or goal_value.get("title"))
            if focus:
                details.append(f"Current focus: {_focus_summary(focus)}")
        criteria = goal_value.get("successCriteria")
        if isinstance(criteria, list) and criteria:
            checked, total, criterion_details = _checked_unchecked_details(criteria)
            checked_count += checked
            total_count += total
            for detail in criterion_details:
                if detail not in details:
                    details.append(detail)
        else:
            total_count += 1
            if _is_checked_status(goal_value.get("status")):
                checked_count += 1

    if not total_count:
        return None
    percent = round(checked_count * 100 / total_count)
    status = f"{checked_count}/{total_count} criteria checked"
    if percent == 100:
        return percent, status, []
    return (percent if checked_count else None), status, details[:3]


def _string_value(value: JsonValue) -> str:
    if isinstance(value, str):
        return value.strip()
    return ""


def _safe_artifact_text(text: str) -> str:
    cleaned = re.sub(r"\bulw[-_ ]loop\b", "local plan", text, flags=re.IGNORECASE)
    cleaned = re.sub(r"\bfix loop\b", "fix work", cleaned, flags=re.IGNORECASE)
    cleaned = re.sub(r"\bloop\b", "work", cleaned, flags=re.IGNORECASE)
    cleaned = re.sub(r"\bharness\b", "local runner", cleaned, flags=re.IGNORECASE)
    cleaned = re.sub(r"\s+", " ", cleaned).strip()
    return cleaned


def _truncate_artifact_text(text: str, limit: int = 180) -> str:
    cleaned = _safe_artifact_text(text)
    if len(cleaned) <= limit:
        return cleaned
    return cleaned[:limit].rsplit(" ", 1)[0].rstrip(" ,;:") + "..."


def _focus_summary(text: str) -> str:
    cleaned = _safe_artifact_text(text)
    parts = [part.strip() for part in cleaned.split(".") if part.strip()]
    for part in parts:
        lower = part.lower()
        if "reproduce" in lower or "server component" in lower:
            cleaned = part
            break
    else:
        for part in parts:
            if "fix" in part.lower():
                cleaned = part
                break
    cleaned = re.sub(r"^Use local-only PM2,\s*", "", cleaned, flags=re.IGNORECASE)
    for marker in (", capture", ", then run", ";"):
        if marker in cleaned:
            cleaned = cleaned.split(marker, 1)[0]
    cleaned = cleaned.replace("reproduce/fix", "reproduce and fix")
    cleaned = cleaned.replace("invalid/expired", "invalid or expired")
    return _sentence(_truncate_artifact_text(cleaned))


def _is_checked_status(status: JsonValue) -> bool:
    return _normalized_sentence(_string_value(status)) in {
        "complete",
        "completed",
        "done",
        "pass",
        "passed",
    }


def _criterion_label(item: dict[str, JsonValue]) -> str:
    identifier = _string_value(item.get("id"))
    user_model = _string_value(item.get("userModel"))
    scenario = _string_value(
        item.get("scenario") or item.get("title") or item.get("objective")
    )
    if user_model:
        label = user_model.replace("_", " ")
    else:
        label = _truncate_artifact_text(scenario, 80)
    if identifier and label:
        return f"{identifier} {label}"
    return identifier or label or "criterion"


def _checked_unchecked_details(criteria: list[JsonValue]) -> tuple[int, int, list[str]]:
    checked: list[str] = []
    unchecked: list[str] = []
    for item_value in criteria:
        if not isinstance(item_value, dict):
            continue
        label = _criterion_label(item_value)
        if _is_checked_status(item_value.get("status")):
            checked.append(label)
        else:
            unchecked.append(label)
    details = [f"Checked: {', '.join(checked) if checked else 'none'}."]
    if unchecked:
        details.append(f"Unchecked: {', '.join(unchecked)}.")
    return len(checked), len(checked) + len(unchecked), details


def _sentence(text: str) -> str:
    cleaned = text.strip()
    if not cleaned:
        return ""
    capitalized = cleaned[:1].upper() + cleaned[1:]
    if capitalized.endswith((".", "...")):
        return capitalized
    return capitalized + "."


def _normalized_sentence(text: str) -> str:
    return re.sub(r"[^a-z0-9]+", " ", text.lower()).strip()
