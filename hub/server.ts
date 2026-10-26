// Automation hub: one local page to see and toggle the launchd automations.
// Off = launchctl bootout (plist stays on disk), on = launchctl bootstrap.
import { homedir } from "os";

const PORT = 8700;
const UID = process.getuid!();
const HOME = homedir();
const AGENTS = `${HOME}/Library/LaunchAgents`;
const PUNCH = `${HOME}/personal/punch/punch.zsh`;
const SKIP_FILE = `${HOME}/.config/connecteam/skip-days`;
// Blocks drive-by POSTs from other sites; only this page may toggle.
const ORIGINS = new Set([`http://hub.localhost:${PORT}`, `http://127.0.0.1:${PORT}`, `http://localhost:${PORT}`]);

type Automation = { id: string; name: string; note: string; labels: string[]; link?: string };
export const AUTOMATIONS: Automation[] = [
  { id: "pagibig", name: "Foreclosed Pag-IBIG", note: "Hourly listing scan + report server", labels: ["com.aslaii.pagibig-watch", "com.aslaii.pagibig-report"], link: "http://foreclosed.local:8787" },
  { id: "connecteam", name: "Connecteam", note: "Punches Mon–Fri at 08:00, 12:00, 13:00, 17:00", labels: ["com.aslaii.connecteam"] },
  { id: "firstlight", name: "Firstlight", note: "Unattended job applier", labels: ["com.jobapply.worker"], link: "http://firstlight.localhost:8765" },
];

export type Status = { loaded: boolean; running: boolean; pid?: number; lastExit?: string };

// `out` is `launchctl print gui/<uid>/<label>` stdout, or null when the service is not loaded.
// Top-level fields are indented by exactly one tab; nested blocks repeat names like `state`.
export function parseStatus(out: string | null): Status {
  if (out === null) return { loaded: false, running: false };
  const field = (k: string) => out.match(new RegExp(`^\\t${k} = (.+)$`, "m"))?.[1];
  const pid = field("pid");
  return { loaded: true, running: field("state") === "running", pid: pid ? Number(pid) : undefined, lastExit: field("last exit code") };
}

const run = (...cmd: string[]) => Bun.spawnSync(cmd, { stderr: "pipe" });
const plist = (label: string) => `${AGENTS}/${label}.plist`;

function status(label: string): Status {
  const r = run("launchctl", "print", `gui/${UID}/${label}`);
  return parseStatus(r.exitCode === 0 ? r.stdout.toString() : null);
}

async function tail(label: string, lines = 20): Promise<string> {
  const path = run("plutil", "-extract", "StandardOutPath", "raw", plist(label)).stdout.toString().trim();
  const file = Bun.file(path);
  if (!path || !(await file.exists())) return "(no log)";
  const text = await file.slice(-16384).text();
  return text.trimEnd().split("\n").slice(-lines).join("\n");
}

async function skippingToday(): Promise<boolean> {
  const file = Bun.file(SKIP_FILE);
  return (await file.exists()) && (await file.text()).split("\n").includes(today());
}

const today = () => new Date().toLocaleDateString("en-CA"); // YYYY-MM-DD local, same as `date +%F`

// Toggles the whole group: any label loaded means "on", so all go off; otherwise all come on.
function toggle(a: Automation): string[] {
  const on = a.labels.some((l) => status(l).loaded);
  const errors: string[] = [];
  for (const l of a.labels) {
    const loaded = status(l).loaded;
    const r = on ? (loaded ? run("launchctl", "bootout", `gui/${UID}/${l}`) : null)
      : loaded ? null : run("launchctl", "bootstrap", `gui/${UID}`, plist(l));
    if (r && r.exitCode !== 0) errors.push(`${l}: ${r.stderr.toString().trim() || `exit ${r.exitCode}`}`);
  }
  return errors;
}

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

async function card(a: Automation): Promise<string> {
  const rows = await Promise.all(a.labels.map(async (l) => ({ l, s: status(l), log: await tail(l) })));
  const on = rows.some((r) => r.s.loaded);
  const state = (s: Status) => (!s.loaded ? "off" : s.running ? `running (pid ${s.pid})` : "on, idle");
  const skip = a.id === "connecteam"
    ? (await skippingToday()) ? `<span class="pill warn">skipping today</span>`
      : `<form method="post" action="/skip" onsubmit="return confirm('Skip all Connecteam punches today?')"><button>Skip today</button></form>`
    : "";
  return `<section class="${on ? "on" : "off"}">
  <header><h2>${esc(a.name)}</h2><span class="pill">${on ? "ON" : "OFF"}</span></header>
  <p class="note">${esc(a.note)}${a.link ? ` · <a href="${a.link}">open</a>` : ""}</p>
  <div class="actions">
    <form method="post" action="/toggle" ${on ? `onsubmit="return confirm('Turn off ${esc(a.name)}?')"` : ""}>
      <input type="hidden" name="id" value="${a.id}"><button class="${on ? "danger" : ""}">Turn ${on ? "off" : "on"}</button>
    </form>${skip}
  </div>
  ${rows.map((r) => `<details><summary><code>${r.l}</code>: ${state(r.s)}${r.s.lastExit ? `, last exit ${esc(r.s.lastExit)}` : ""}</summary><pre>${esc(r.log)}</pre></details>`).join("\n  ")}
</section>`;
}

async function page(error = ""): Promise<string> {
  const cards = await Promise.all(AUTOMATIONS.map(card));
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta http-equiv="refresh" content="15;url=/"><title>Automation Hub</title><style>
:root{color-scheme:light dark;--bg:#f6f6f4;--card:#fff;--fg:#1d1d1b;--muted:#6b6b66;--line:#e2e2dd;--on:#1f8a4c;--off:#9a9a94;--danger:#b3261e;--warn:#a15c00}
@media (prefers-color-scheme:dark){:root{--bg:#141413;--card:#1e1e1c;--fg:#ececea;--muted:#9a9a94;--line:#2e2e2b;--on:#3fbf74;--danger:#f2665c;--warn:#f0a440}}
body{margin:0;padding:24px 16px;background:var(--bg);color:var(--fg);font:15px/1.45 -apple-system,system-ui,sans-serif}
main{max-width:760px;margin:auto;display:grid;gap:16px}h1{font-size:20px;margin:0 0 4px}h2{font-size:17px;margin:0}
section{background:var(--card);border:1px solid var(--line);border-left:4px solid var(--off);border-radius:10px;padding:16px}
section.on{border-left-color:var(--on)}header{display:flex;justify-content:space-between;align-items:center}
.pill{font-size:12px;font-weight:600;padding:2px 8px;border-radius:99px;border:1px solid currentColor;color:var(--off)}
.on .pill{color:var(--on)}.pill.warn{color:var(--warn)}.note{color:var(--muted);margin:6px 0 12px}
.actions{display:flex;gap:8px;align-items:center;margin-bottom:8px}form{margin:0}
button{font:inherit;padding:6px 14px;border-radius:8px;border:1px solid var(--line);background:var(--bg);color:var(--fg);cursor:pointer}
button.danger{color:var(--danger);border-color:var(--danger)}a{color:inherit}
summary{cursor:pointer;color:var(--muted);font-size:13px;padding:4px 0}
pre{font-size:12px;overflow-x:auto;background:var(--bg);padding:8px;border-radius:6px;margin:4px 0 0}
.error{color:var(--danger);white-space:pre-wrap}</style></head>
<body><main><div><h1>Automation Hub</h1><span class="note">Refreshes every 15s · ${new Date().toLocaleTimeString()}</span></div>
${error ? `<p class="error">${esc(error)}</p>` : ""}${cards.join("\n")}</main></body></html>`;
}

const html = (body: string, status = 200) => new Response(body, { status, headers: { "content-type": "text/html; charset=utf-8" } });

if (import.meta.main) {
  Bun.serve({
    hostname: "127.0.0.1",
    port: PORT,
    async fetch(req) {
      const { pathname } = new URL(req.url);
      if (req.method === "GET" && pathname === "/") return html(await page());
      if (req.method !== "POST") return new Response("Not found", { status: 404 });
      if (!ORIGINS.has(req.headers.get("origin") ?? "")) return new Response("Forbidden", { status: 403 });
      if (pathname === "/toggle") {
        const id = (await req.formData()).get("id");
        const a = AUTOMATIONS.find((x) => x.id === id);
        if (!a) return new Response("Unknown automation", { status: 400 });
        const errors = toggle(a);
        console.log(new Date().toISOString(), "toggle", a.id, errors.length ? errors : "ok");
        if (errors.length) return html(await page(errors.join("\n")), 500);
      } else if (pathname === "/skip") {
        const r = run("/bin/zsh", PUNCH, "off");
        console.log(new Date().toISOString(), "skip", r.exitCode);
        if (r.exitCode !== 0) return html(await page(`punch.zsh off failed: ${r.stderr.toString()}`), 500);
      } else return new Response("Not found", { status: 404 });
      return Response.redirect("/", 303);
    },
  });
  console.log(`hub on http://hub.localhost:${PORT}`);
}
