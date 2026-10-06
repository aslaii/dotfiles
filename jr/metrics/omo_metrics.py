import json, os, glob, sys, time, collections, re
from datetime import datetime

DAYS = int(sys.argv[1]) if len(sys.argv) > 1 else 14
root = os.path.expanduser("~/.omo/agent")
cut = time.time() - DAYS * 86400

def ts(s):
    try:
        return datetime.fromisoformat(s.replace("Z", "+00:00")).timestamp()
    except Exception:
        return None

def analyze(path):
    S = dict(path=path, users=0, asst=0, tools=collections.Counter(), toolres_chars=collections.Counter(),
             inp=0, out=0, cr=0, cw=0, cost=0.0, custom=collections.Counter(), custom_chars=0,
             compactions=0, skills=collections.Counter(), models=collections.Counter(), first="",
             times=[], user_times=[], task_spawn=0, task_categories=collections.Counter(), user_chars=0)
    for line in open(path, errors="ignore"):
        try:
            e = json.loads(line)
        except Exception:
            continue
        t = ts(e.get("timestamp", "")) if isinstance(e.get("timestamp"), str) else None
        if t: S["times"].append(t)
        ty = e.get("type")
        if ty == "compaction": S["compactions"] += 1
        if ty == "custom_message":
            S["custom"][e.get("customType")] += 1
            c = e.get("content")
            S["custom_chars"] += len(c) if isinstance(c, str) else len(json.dumps(c))
        if ty != "message": continue
        m = e["message"]; r = m.get("role")
        content = m.get("content") if isinstance(m.get("content"), list) else [{"type": "text", "text": str(m.get("content"))}]
        if r == "user":
            txt = " ".join(c.get("text", "") for c in content if c.get("type") == "text")
            S["user_chars"] += len(txt)
            for sk in re.findall(r'explicitly invoked the "([\w-]+)" skill', txt): S["skills"][sk] += 1
            if "<ultrawork-mode>" in txt: S["skills"]["ultrawork"] += 1
            if not txt.startswith("<") or "ultrawork" in txt[:40]:
                S["users"] += 1
                if t: S["user_times"].append(t)
                if not S["first"]: S["first"] = re.sub(r"\s+", " ", txt[-300:] if txt.startswith("<") else txt[:300])
        elif r == "assistant":
            S["asst"] += 1
            S["models"][m.get("model")] += 1
            u = m.get("usage") or {}
            S["inp"] += u.get("input", 0) or 0; S["out"] += u.get("output", 0) or 0
            S["cr"] += u.get("cacheRead", 0) or 0; S["cw"] += u.get("cacheWrite", 0) or 0
            S["cost"] += (u.get("cost") or {}).get("total", 0) or 0
            for c in content:
                if c.get("type") == "toolCall":
                    n = c.get("name"); S["tools"][n] += 1
                    a = c.get("arguments") or {}
                    if n == "Read" or n == "read":
                        p = a.get("file_path") or a.get("path") or ""
                        if p.endswith("SKILL.md"): S["skills"]["read:" + p.split("/")[-2]] += 1
                    if n == "task":
                        items = a.get("tasks") or [a]
                        S["task_spawn"] += len(items)
                        for it in items: S["task_categories"][it.get("category") or it.get("subagent_type") or "?"] += 1
                    if n == "eval":
                        code = a.get("code", "")
                        for tn in re.findall(r"tool\.(\w+)\(", code): S["tools"]["eval>" + tn] += 1
                        S["task_spawn"] += code.count("task(") if "tool.task" not in code else 0
        elif r == "toolResult":
            S["toolres_chars"][m.get("toolName")] += sum(len(c.get("text", "")) for c in content if isinstance(c, dict))
    tt = sorted(S["times"])
    if len(tt) < 2: return None
    S["span_h"] = (tt[-1] - tt[0]) / 3600
    gaps = [b - a for a, b in zip(tt, tt[1:])]
    S["active_h"] = sum(min(g, 300) for g in gaps) / 3600
    S["idle_gaps_10m"] = sum(1 for g in gaps if g > 600)
    del S["times"], S["user_times"]
    return S

mains, kids = [], []
for p in glob.glob(root + "/sessions/*/*.jsonl"):
    if os.path.getmtime(p) >= cut:
        s = analyze(p)
        if s: mains.append(s)
for p in glob.glob(root + "/**/*.jsonl", recursive=True):
    if "/sessions/" in p and p.count("/") == (root + "/sessions/x/y.jsonl").count("/"): continue
    if os.path.getmtime(p) < cut or os.path.getsize(p) < 2000: continue
    try:
        with open(p) as fh:
            h = json.loads(fh.readline())
        if h.get("type") != "session": continue
    except Exception:
        continue
    s = analyze(p)
    if s: kids.append(s)

def agg(L):
    A = dict(n=len(L), span_h=0, active_h=0, asst=0, users=0, inp=0, out=0, cr=0, cw=0, cost=0, compactions=0,
             custom_chars=0, task_spawn=0, tools=collections.Counter(), custom=collections.Counter(), skills=collections.Counter(),
             models=collections.Counter(), toolres_chars=collections.Counter(), task_categories=collections.Counter(), user_chars=0, idle_gaps_10m=0)
    for s in L:
        for k in A:
            if k == "n": continue
            if isinstance(A[k], collections.Counter): A[k].update(s[k])
            else: A[k] += s[k]
    for k in ("tools", "custom", "skills", "models", "toolres_chars", "task_categories"):
        A[k] = A[k].most_common(25)
    tot_in = A["inp"] + A["cr"]
    A["cache_hit"] = round(A["cr"] / tot_in, 3) if tot_in else None
    return A

mains.sort(key=lambda s: -s["active_h"])
top = [dict(file=os.path.basename(s["path"])[:40], dir=s["path"].split("/")[-2][-45:], span_h=round(s["span_h"], 1),
            active_h=round(s["active_h"], 1), users=s["users"], asst=s["asst"], tasks=s["task_spawn"],
            in_M=round((s["inp"] + s["cr"]) / 1e6, 1), cache=round(s["cr"] / max(1, s["inp"] + s["cr"]), 2), out_k=round(s["out"] / 1e3),
            compact=s["compactions"], wakes=s["custom"].get("omo-senpi:wake", 0) + s["custom"].get("senpi-monitor:notification", 0),
            goalcont=s["custom"].get("goal-continuation", 0), skills=dict(s["skills"].most_common(6)),
            top_tools=s["tools"].most_common(8), first=s["first"][:220]) for s in mains[:15]]
print(json.dumps(dict(days=DAYS, main=agg(mains), children=agg(kids), top=top), default=str))
