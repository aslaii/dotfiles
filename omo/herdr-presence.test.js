import { afterEach, expect, test } from "bun:test";
import { spawn } from "node:child_process";
import { EventEmitter, once } from "node:events";
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, unlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import herdrPresence from "./agent/extensions/herdr-presence.js";

const source = new URL("./agent/extensions/herdr-presence.js", import.meta.url);
const tag = Symbol.for("dotfiles.omo.herdr-presence.v1");
const env = {
  HERDR_ENV: "1",
  HERDR_BIN_PATH: "/fake binary/herdr ; $(not-a-shell)",
  HERDR_SOCKET_PATH: "/socket with spaces/one.sock",
  HERDR_PANE_ID: "pane 1; $(not-a-shell)",
  PATH: "/inherited/path",
  OMO_PARENT_SESSION_ID: "parent",
  OMO_SESSION_ID: "session",
  SENPI_TASK_ID: "task",
};
const ok = { status: 0, signal: null, stderr: "" };
const hosts = [];
const directories = [];
const argv = (action, paneId = env.HERDR_PANE_ID) => [
  "pane", `${action}-agent`, paneId, "--source", "custom:omo-presence", "--agent", "omo",
  ...(action === "report" ? ["--state", "unknown"] : []),
];
const key = (socketPath, paneId) => JSON.stringify([socketPath, paneId]);
const listeners = (host) => host.process.listeners("exit").filter((listener) => listener[tag]);

function host() {
  const process = new EventEmitter();
  const stderr = [];
  process.stderr = { write: (text) => stderr.push(text) };
  const state = { process, stderr, calls: [], rows: new Map(), outcomes: [] };
  state.spawnSync = (binary, args, options) => {
    const outcome = state.outcomes.shift() ?? { result: ok, applied: true };
    const call = { binary, args: [...args], options, rows: [] };
    state.calls.push(call);
    if (outcome.applied) {
      const paneKey = key(options.env.HERDR_SOCKET_PATH, args[2]);
      const identity = { source: args[args.indexOf("--source") + 1], agent: args[args.indexOf("--agent") + 1] };
      if (args[1] === "report-agent") {
        state.rows.set(paneKey, { ...identity, state: args[args.indexOf("--state") + 1] });
      } else if (args[1] === "release-agent") {
        const current = state.rows.get(paneKey);
        if (current?.source === identity.source && current?.agent === identity.agent) state.rows.delete(paneKey);
      }
    }
    call.rows = [...state.rows.entries()];
    if ("thrown" in outcome) throw outcome.thrown;
    return outcome.result;
  };
  hosts.push(state);
  return state;
}

function factory(shared = host(), inherited = { ...env }) {
  const handlers = new Map();
  const notices = [];
  const ctx = { mode: "tui", hasUI: true, agentDir: "/agent dir", ui: { notify: (...notice) => notices.push(notice) } };
  herdrPresence({ on: (name, handler) => handlers.set(name, handler) }, {
    env: inherited, process: shared.process, spawnSync: shared.spawnSync,
  });
  const emit = (type, data = {}, context = ctx) => handlers.get(type)({ type, ...data }, context);
  return { host: shared, env: inherited, handlers, notices, ctx, emit,
    start: (reason = "startup", context = ctx) => emit("session_start", { reason }, context),
    shutdown: (reason = "quit") => emit("session_shutdown", { reason }),
    remove: (resolvedPath = resolve(ctx.agentDir, "extensions/herdr-presence.js")) =>
      emit("session_extensions_removed", { reason: "reload", removed: [{ path: "discovery input", resolvedPath }] }),
  };
}

function checkCalls(shared, inherited = env) {
  for (const call of shared.calls) {
    expect(call.binary).toBe(inherited.HERDR_BIN_PATH);
    expect(call.args).toEqual(argv(call.args[1] === "report-agent" ? "report" : "release", inherited.HERDR_PANE_ID));
    expect(call.options).toEqual({ env: inherited, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], timeout: 1000, killSignal: "SIGKILL", maxBuffer: 65536 });
    expect(call.options).not.toHaveProperty("shell");
    expect(call.args).not.toContain("--seq");
  }
}

function scratch() {
  const directory = mkdtempSync(join(tmpdir(), "omo-herdr-presence-"));
  directories.push(directory);
  return directory;
}

afterEach(() => {
  for (const shared of hosts.splice(0)) {
    for (const listener of listeners(shared)) listener[tag].retire();
    expect(listeners(shared)).toHaveLength(0);
  }
  for (const directory of directories.splice(0)) {
    rmSync(directory, { recursive: true, force: true });
    expect(existsSync(directory)).toBe(false);
    console.log(`fixture-cleanup ${JSON.stringify({ directory, removed: true })}`);
  }
});

test("identity fixture enforces matching socket, pane, source and agent on release", () => {
  const shared = host();
  const options = { env };
  shared.spawnSync(env.HERDR_BIN_PATH, argv("report"), options);
  for (const args of [argv("release", "other pane"), argv("release").map((x) => x === "omo" ? "other agent" : x), argv("release").map((x) => x === "custom:omo-presence" ? "custom:other" : x)]) {
    shared.spawnSync(env.HERDR_BIN_PATH, args, options);
    expect(shared.rows.size).toBe(1);
  }
  shared.spawnSync(env.HERDR_BIN_PATH, argv("release"), { env: { ...env, HERDR_SOCKET_PATH: "other socket" } });
  expect(shared.rows.size).toBe(1);
  shared.spawnSync(env.HERDR_BIN_PATH, argv("release"), options);
  expect(shared.rows.size).toBe(0);
});

test("construction is inert; eligible root TUI reports exact bounded transport despite parent metadata", () => {
  const f = factory();
  expect([...f.handlers.keys()].sort()).toEqual(["session_extensions_removed", "session_shutdown", "session_start"]);
  expect(f.host.calls).toHaveLength(0);
  expect(listeners(f.host)).toHaveLength(0);
  f.start();
  expect(f.host.calls).toHaveLength(1);
  checkCalls(f.host);
  expect([...f.host.rows.values()]).toEqual([{ source: "custom:omo-presence", agent: "omo", state: "unknown" }]);
  expect(listeners(f.host)).toHaveLength(1);
  expect(f.notices).toHaveLength(0);
});

for (const variable of ["HERDR_ENV", "HERDR_BIN_PATH", "HERDR_SOCKET_PATH", "HERDR_PANE_ID"]) {
  for (const value of [undefined, ""]) {
    test(`ineligible ${variable}=${String(value)} cannot mutate an existing owner`, () => {
      const owner = factory();
      owner.start();
      const token = listeners(owner.host)[0];
      const inherited = { ...env, [variable]: value };
      if (value === undefined) delete inherited[variable];
      const child = factory(owner.host, inherited);
      child.start();
      child.shutdown();
      child.remove();
      expect(listeners(owner.host)).toEqual([token]);
      expect(owner.host.calls).toHaveLength(1);
      expect(child.notices).toHaveLength(0);
      owner.host.process.emit("exit", 0);
      expect(owner.host.calls.map((call) => call.args[1])).toEqual(["report-agent", "release-agent"]);
    });
  }
}

for (const value of ["0", "true", " 1 "]) {
  test(`HERDR_ENV=${JSON.stringify(value)} is not eligible`, () => {
    const f = factory(host(), { ...env, HERDR_ENV: value });
    f.start();
    f.shutdown();
    f.remove();
    f.host.process.emit("exit", 0);
    expect(f.host.calls).toHaveLength(0);
    expect(listeners(f.host)).toHaveLength(0);
  });
}

for (const mode of ["rpc", "app-server", "json", "print"]) {
  for (const hasUI of [true, false]) {
    test(`${mode} hasUI=${hasUI} never acquires, retires or releases its TUI parent's token`, () => {
      const owner = factory();
      owner.start();
      const token = listeners(owner.host)[0];
      const child = factory(owner.host);
      child.ctx.mode = mode;
      child.ctx.hasUI = hasUI;
      child.start();
      for (const reason of ["reload", "new", "resume", "fork", "quit"]) child.shutdown(reason);
      child.remove();
      expect(owner.host.calls).toHaveLength(1);
      expect(listeners(owner.host)).toEqual([token]);
      expect(owner.host.rows.size).toBe(1);
      expect(child.notices).toHaveLength(0);
      owner.shutdown();
      expect(owner.host.calls).toHaveLength(2);
      expect(owner.host.rows.size).toBe(0);
    });
  }
}

test("first eligible start captures addressing, inherited environment and lexical installed path", () => {
  const f = factory(host(), { ...env, HERDR_ENV: "0" });
  f.start();
  f.shutdown();
  f.env.HERDR_ENV = "1";
  f.ctx.agentDir = "relative agent dir";
  const installed = resolve(f.ctx.agentDir, "extensions/herdr-presence.js");
  f.start();
  const captured = { ...f.env };
  const token = listeners(f.host)[0];
  expect(token[tag]).toMatchObject({ socketPath: env.HERDR_SOCKET_PATH, paneId: env.HERDR_PANE_ID });
  Object.assign(f.env, { HERDR_ENV: "0", HERDR_BIN_PATH: "changed binary", HERDR_SOCKET_PATH: "changed socket", HERDR_PANE_ID: "changed pane", PATH: "changed path" });
  f.ctx.agentDir = "/changed agent dir";
  f.start("new");
  f.remove();
  expect(f.host.calls).toHaveLength(2);
  expect(listeners(f.host)).toEqual([token]);
  f.remove(installed);
  expect(f.host.calls).toHaveLength(3);
  checkCalls(f.host, captured);
  expect(f.host.rows.size).toBe(0);
});

for (const reason of ["new", "resume", "fork"]) {
  for (const fresh of [false, true]) {
    test(`${reason} ${fresh ? "fresh" : "reused"} factory preserves identity with no release gap or stale resurrection`, () => {
      const old = factory();
      old.start();
      const oldExit = listeners(old.host)[0];
      old.shutdown(reason);
      expect(old.host.calls).toHaveLength(1);
      expect(listeners(old.host)).toEqual([oldExit]);
      const current = fresh ? factory(old.host) : old;
      current.start(reason);
      expect(old.host.calls.map((call) => call.args[1])).toEqual(["report-agent", "report-agent"]);
      expect(old.host.calls.map((call) => call.rows.length)).toEqual([1, 1]);
      expect(listeners(old.host)).toHaveLength(1);
      if (fresh) {
        expect(listeners(old.host)[0]).not.toBe(oldExit);
        old.shutdown();
        old.remove();
        old.start();
        oldExit();
        oldExit[tag].retire();
        expect(old.host.calls).toHaveLength(2);
        expect(old.host.rows.size).toBe(1);
      } else {
        expect(listeners(old.host)).toEqual([oldExit]);
      }
      current.shutdown();
      old.host.process.emit("exit", 0);
      current.start();
      expect(old.host.calls.map((call) => call.args[1])).toEqual(["report-agent", "report-agent", "release-agent"]);
      expect(old.host.rows.size).toBe(0);
      expect(listeners(old.host)).toHaveLength(0);
    });
  }
}

test("failed or interrupted reload keeps the old exit fallback until a replacement starts", () => {
  const f = factory();
  f.start();
  const token = listeners(f.host)[0];
  f.shutdown("reload");
  factory(f.host); // A rebuild that never reaches session_start must not take ownership.
  f.remove("/unrelated/extensions/other.js");
  expect(listeners(f.host)).toEqual([token]);
  expect(f.host.calls).toHaveLength(1);
  expect(f.host.rows.size).toBe(1);
  f.host.process.emit("exit", 0);
  expect(f.host.calls.map((call) => call.args[1])).toEqual(["report-agent", "release-agent"]);
  expect(f.host.rows.size).toBe(0);
});

test("repeated reload handoff retires every prior callback with exactly one matching listener", () => {
  const shared = host();
  const generations = [];
  let current = factory(shared);
  current.start();
  for (let index = 0; index < 32; index++) {
    current.shutdown("reload");
    generations.push({ factory: current, exit: listeners(shared)[0] });
    current = factory(shared);
    current.start("reload");
    for (const prior of generations) {
      prior.factory.start();
      prior.factory.shutdown();
      prior.factory.remove();
      prior.exit();
    }
    expect(listeners(shared)).toHaveLength(1);
    expect(shared.rows.size).toBe(1);
    expect(shared.calls).toHaveLength(index + 2);
  }
  expect(shared.calls.every((call) => call.args[1] === "report-agent" && call.rows.length === 1)).toBe(true);
  shared.process.emit("exit", 0);
  expect(shared.calls).toHaveLength(34);
  expect(shared.rows.size).toBe(0);
});

for (const install of ["copy", "symlink"]) {
  test(`${install} installed path removal works after the file or link target is deleted`, () => {
    const directory = scratch();
    const installed = join(directory, "extensions/herdr-presence.js");
    mkdirSync(join(directory, "extensions"));
    const target = join(directory, "source.js");
    if (install === "copy") copyFileSync(source, installed);
    else {
      copyFileSync(source, target);
      symlinkSync(target, installed);
    }
    const f = factory();
    f.ctx.agentDir = directory;
    f.start();
    const savedExit = listeners(f.host)[0];
    if (install === "symlink") unlinkSync(target);
    unlinkSync(installed);
    f.remove(join(directory, "extensions/other.js"));
    expect(f.host.calls).toHaveLength(1);
    f.remove(installed);
    f.remove(installed);
    f.shutdown();
    f.start();
    savedExit();
    expect(f.host.calls.map((call) => call.args[1])).toEqual(["report-agent", "release-agent"]);
    expect(f.host.rows.size).toBe(0);
    expect(listeners(f.host)).toHaveLength(0);
  });
}

test("quit marks inactive and detaches before release, preserving unrelated host cleanup", () => {
  const f = factory();
  const unrelated = () => {};
  f.host.process.on("exit", unrelated);
  f.start();
  const savedExit = listeners(f.host)[0];
  const originalSpawn = f.host.spawnSync;
  const runtime = { env: { ...env }, process: f.host.process, spawnSync: (binary, args, options) => {
    if (args[1] === "release-agent") {
      expect(listeners(f.host)).toHaveLength(0);
      current.start();
      current.shutdown();
      savedExit();
    }
    return originalSpawn(binary, args, options);
  } };
  const handlers = new Map();
  herdrPresence({ on: (name, handler) => handlers.set(name, handler) }, runtime);
  const current = {
    start: () => handlers.get("session_start")({ type: "session_start", reason: "startup" }, f.ctx),
    shutdown: () => handlers.get("session_shutdown")({ type: "session_shutdown", reason: "quit" }, f.ctx),
  };
  current.start();
  current.shutdown();
  current.shutdown();
  current.start();
  f.host.process.emit("exit", 0);
  expect(f.host.calls.map((call) => call.args[1])).toEqual(["report-agent", "report-agent", "release-agent"]);
  expect(f.host.process.listeners("exit")).toEqual([unrelated]);
  expect(f.host.rows.size).toBe(0);
  expect(f.host.stderr).toHaveLength(0);
});

for (const other of [{ HERDR_PANE_ID: "pane B" }, { HERDR_SOCKET_PATH: "/other/socket" }]) {
  for (const cleanup of ["quit", "remove"]) {
    test(`${cleanup} isolates ${Object.keys(other)[0]} and preserves other tagged and host listeners`, () => {
      const a = factory();
      const b = factory(a.host, { ...env, ...other });
      const unrelated = () => {};
      unrelated[Symbol.for("another.integration")] = { retire: () => { throw new Error("wrong integration retired"); } };
      a.host.process.on("exit", unrelated);
      a.start();
      b.start();
      const bToken = listeners(a.host).find((listener) => listener[tag].socketPath === b.env.HERDR_SOCKET_PATH && listener[tag].paneId === b.env.HERDR_PANE_ID);
      expect(a.host.rows.size).toBe(2);
      if (cleanup === "quit") a.shutdown();
      else a.remove();
      expect(listeners(a.host)).toEqual([bToken]);
      expect(a.host.rows.size).toBe(1);
      expect(a.host.rows.get(key(b.env.HERDR_SOCKET_PATH, b.env.HERDR_PANE_ID))).toEqual({ source: "custom:omo-presence", agent: "omo", state: "unknown" });
      a.host.process.emit("exit", 0);
      expect(a.host.rows.size).toBe(0);
      expect(a.host.process.listeners("exit")).toEqual([unrelated]);
      expect(a.host.calls.map((call) => call.args[1])).toEqual(["report-agent", "report-agent", "release-agent", "release-agent"]);
    });
  }
}

const failures = [
  ["ENOENT", { result: { error: Object.assign(new Error("missing executable"), { code: "ENOENT" }), status: null, signal: null, stderr: "" } }],
  ["nonzero", { result: { status: 7, signal: null, stderr: "z".repeat(450) } }],
  ["signal with zero status", { result: { status: 0, signal: "SIGTERM", stderr: "" } }],
  ["timeout", { result: { error: Object.assign(new Error("deadline"), { code: "ETIMEDOUT" }), status: null, signal: "SIGKILL", stderr: "" } }],
  ["thrown Error", { thrown: new Error("transport exception") }],
  ["thrown empty Error", { thrown: new Error() }],
  ["thrown string", { thrown: "transport exception value" }],
];

for (const [name, outcome] of failures) {
  test(`${name}: report boundary warns, keeps ownership and retries once only on a valid start`, () => {
    const f = factory();
    f.host.outcomes.push({ ...outcome, applied: false });
    expect(() => f.start()).not.toThrow();
    expect(f.host.calls).toHaveLength(1);
    expect(f.host.rows.size).toBe(0);
    const token = listeners(f.host)[0];
    expect(token).toBeDefined();
    expect(f.notices).toHaveLength(1);
    expect(f.notices[0][0].length).toBeGreaterThan(0);
    expect(f.notices[0][1]).toBe("warning");
    if (name === "nonzero") expect([...f.notices[0][0]].filter((char) => char === "z")).toHaveLength(400);
    const notices = [];
    f.start("reload", { ...f.ctx, ui: { notify: (...notice) => notices.push(notice) } });
    expect(f.host.calls).toHaveLength(2);
    expect(f.host.rows.size).toBe(1);
    expect(listeners(f.host)).toEqual([token]);
    expect(notices).toHaveLength(0);
    expect(f.notices).toHaveLength(1);
    f.shutdown();
    f.host.process.emit("exit", 0);
    f.start();
    expect(f.host.calls).toHaveLength(3);
    checkCalls(f.host);
  });

  for (const cleanup of ["quit", "exit"]) {
    test(`${name}: uncertain failed report still gets exactly one final release on ${cleanup}`, () => {
      const f = factory();
      f.host.outcomes.push({ ...outcome, applied: true });
      f.start();
      expect(f.notices).toHaveLength(1);
      expect(f.host.rows.size).toBe(1);
      if (cleanup === "quit") f.shutdown();
      else f.host.process.emit("exit", 0);
      f.shutdown();
      f.start();
      f.host.process.emit("exit", 0);
      expect(f.host.calls.map((call) => call.args[1])).toEqual(["report-agent", "release-agent"]);
      expect(f.host.rows.size).toBe(0);
      checkCalls(f.host);
    });

    test(`${name}: ${cleanup} release failure uses stderr, never disposed UI, without retry or resurrection`, () => {
      const f = factory();
      f.start();
      const savedExit = listeners(f.host)[0];
      f.ctx.ui.notify = () => { throw new Error("disposed UI called"); };
      f.host.outcomes.push({ ...outcome, applied: false });
      expect(() => cleanup === "quit" ? f.shutdown() : f.host.process.emit("exit", 0)).not.toThrow();
      expect(f.host.stderr).toHaveLength(1);
      expect(f.host.stderr[0].length).toBeGreaterThan(0);
      if (name === "nonzero") expect([...f.host.stderr[0]].filter((char) => char === "z")).toHaveLength(400);
      expect(listeners(f.host)).toHaveLength(0);
      expect(f.host.rows.size).toBe(1); // Unavailable cleanup cannot promise delivery.
      f.shutdown();
      f.remove();
      f.start();
      savedExit();
      expect(f.host.calls).toHaveLength(2);
      expect(f.host.stderr).toHaveLength(1);
      checkCalls(f.host);
    });
  }
}

test("report failures notify the current context, not a saved UI; programming errors are not swallowed", () => {
  const f = factory();
  f.start();
  f.host.outcomes.push({ result: { status: 1, signal: null, stderr: "failure" }, applied: false });
  const notices = [];
  f.start("resume", { ...f.ctx, ui: { notify: (...notice) => notices.push(notice) } });
  expect(f.notices).toHaveLength(0);
  expect(notices.map((notice) => notice[1])).toEqual(["warning"]);
  f.host.outcomes.push({ result: { status: 1, signal: null, stderr: "failure" }, applied: false });
  const programmingError = new Error("UI bug");
  expect(() => f.start("new", { ...f.ctx, ui: { notify: () => { throw programmingError; } } })).toThrow(programmingError);
});

test("real Node process exit invokes production spawnSync report then exactly one matching release", async () => {
  const directory = scratch();
  const binary = join(directory, "fake herdr ; literal");
  const log = join(directory, "calls.jsonl");
  const driver = join(directory, "driver.mjs");
  const node = Bun.which("node");
  expect(node).not.toBeNull();
  writeFileSync(binary, `#!/usr/bin/env node\nconst {appendFileSync} = require('node:fs');\nappendFileSync(process.env.PRESENCE_TEST_LOG, JSON.stringify({pid: process.pid, ppid: process.ppid, argv: process.argv.slice(2), socket: process.env.HERDR_SOCKET_PATH, pane: process.env.HERDR_PANE_ID, inherited: process.env.PRESENCE_TEST_INHERITED}) + '\\n');\n`, { mode: 0o755 });
  writeFileSync(driver, `import herdrPresence from ${JSON.stringify(source.href)};
const handlers = new Map();
herdrPresence({on: (name, handler) => handlers.set(name, handler)});
process.on('message', message => {
  if (message === 'start') {
    handlers.get('session_start')({type: 'session_start', reason: 'startup'}, {mode: 'tui', hasUI: true, agentDir: ${JSON.stringify(directory)}, ui: {notify: text => { throw new Error(text); }}});
    process.send({type: 'started', tagged: process.listeners('exit').filter(fn => fn[Symbol.for('dotfiles.omo.herdr-presence.v1')]).length});
  } else if (message === 'exit') process.exit(0);
});
process.send({type: 'ready', node: process.versions.node, bun: Boolean(process.versions.bun)});
`);
  const child = spawn(node, [driver], {
    env: { ...process.env, ...env, PATH: process.env.PATH, HERDR_BIN_PATH: binary, PRESENCE_TEST_LOG: log, PRESENCE_TEST_INHERITED: "captured context" },
    stdio: ["ignore", "pipe", "pipe", "ipc"],
  });
  const output = { stdout: "", stderr: "" };
  child.stdout.on("data", (data) => { output.stdout += data; });
  child.stderr.on("data", (data) => { output.stderr += data; });
  const closed = once(child, "close", { signal: AbortSignal.timeout(8000) })
    .then(([code, signal]) => ({ code, signal }), (error) => ({ error }));
  try {
    const [ready] = await once(child, "message", { signal: AbortSignal.timeout(8000) });
    expect(ready.type).toBe("ready");
    expect(ready.bun).toBe(false);
    expect(ready.node.length).toBeGreaterThan(0);
    expect(existsSync(log)).toBe(false);
    const started = once(child, "message", { signal: AbortSignal.timeout(8000) });
    child.send("start");
    expect((await started)[0]).toEqual({ type: "started", tagged: 1 });
    expect(readFileSync(log, "utf8").trim().split("\n").map(JSON.parse).map((record) => record.argv)).toEqual([argv("report")]);
    const exited = once(child, "exit", { signal: AbortSignal.timeout(8000) });
    child.send("exit");
    expect(await exited).toEqual([0, null]);
    expect(await closed).toEqual({ code: 0, signal: null });
    expect(output).toEqual({ stdout: "", stderr: "" });
    const records = readFileSync(log, "utf8").trim().split("\n").map(JSON.parse);
    expect(records.map((record) => record.argv)).toEqual([argv("report"), argv("release")]);
    for (const record of records) {
      expect(record).toMatchObject({ ppid: child.pid, socket: env.HERDR_SOCKET_PATH, pane: env.HERDR_PANE_ID, inherited: "captured context" });
      expect(() => process.kill(record.pid, 0)).toThrow(expect.objectContaining({ code: "ESRCH" }));
    }
    expect(() => process.kill(child.pid, 0)).toThrow(expect.objectContaining({ code: "ESRCH" }));
    console.log(`real-node-exit ${JSON.stringify({ node: ready.node, pid: child.pid, code: child.exitCode, records, allPidsGone: true })}`);
  } finally {
    if (child.exitCode === null && child.signalCode === null) {
      const killed = once(child, "close", { signal: AbortSignal.timeout(8000) });
      child.kill("SIGKILL");
      await killed;
    }
    await closed;
  }
}, 20000);
