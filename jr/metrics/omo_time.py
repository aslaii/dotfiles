import json, glob, os, time, re, collections
from datetime import datetime
root = os.path.expanduser("~/.omo/agent/sessions")
cut = time.time() - 14 * 86400
def ts(s): return datetime.fromisoformat(s.replace("Z", "+00:00")).timestamp()
VER = re.compile(r"\b(test|vitest|jest|pytest|tsc|typecheck|lint|build|curl|playwright|maestro|lsp_diagnostics)\b")
B = collections.Counter(); n = collections.Counter()
for p in glob.glob(root + "/*/*.jsonl"):
    if os.path.getmtime(p) < cut: continue
    prev = None
    for line in open(p, errors="ignore"):
        try: e = json.loads(line)
        except Exception: continue
        if e.get("type") != "message" or not isinstance(e.get("timestamp"), str): continue
        t = ts(e["timestamp"]); m = e["message"]; r = m.get("role")
        if r == "assistant":
            if prev and prev[0] in ("toolResult", "user"):
                d = t - prev[1]
                if d < 900: B["model_s"] += d
                else: B["idle_s"] += d
            calls = [c for c in m.get("content", []) if isinstance(c, dict) and c.get("type") == "toolCall"]
            kind = "text_only"
            if calls:
                names = [c["name"] for c in calls]; blob = json.dumps([c.get("arguments") for c in calls])[:4000]
                if any(x in ("apply_patch", "edit", "write") for x in names) or "apply_patch" in blob: kind = "implement"
                elif any(x in ("todo", "create_goal", "update_goal", "get_goal", "memory") for x in names): kind = "bookkeeping"
                elif any(x.startswith("task") for x in names) or "task(" in blob: kind = "delegate/poll"
                elif "lsp_diagnostics" in names or VER.search(blob): kind = "verify/run"
                elif any(x in ("read", "Read", "grep", "lsp_symbols", "lsp_find_references") for x in names) or "tool.read" in blob or "tool.grep" in blob: kind = "explore"
                elif any(x in ("web_search", "webfetch") for x in names): kind = "web"
                else: kind = "other"
            n[kind] += 1
            prev = ("assistant", t)
        elif r == "toolResult":
            if prev and prev[0] == "assistant":
                d = t - prev[1]
                if d < 900: B["tool_s"] += d
                else: B["tool_long_s"] += d
            prev = ("toolResult", t)
        elif r == "user":
            prev = ("user", t)
print(json.dumps({"hours": {k: round(v / 3600, 1) for k, v in B.items()}, "turn_kinds": n.most_common()}))
