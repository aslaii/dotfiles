import { expect, test } from "bun:test";
import { readFile } from "node:fs/promises";
import modeStatus, { formatTokens } from "./agent/extensions/mode-status.js";

function fixture({ totals = {}, entries = [] } = {}) {
  const handlers = new Map();
  const commands = new Map();
  const statuses = new Map();
  const notices = [];
  const appended = [];
  const api = {
    on: (event, handler) => handlers.set(event, handler),
    registerCommand: (name, command) => commands.set(name, command),
    appendEntry: (customType, data) => appended.push({ customType, data }),
  };
  const ctx = {
    hasUI: true,
    ui: {
      setStatus: (key, text) => statuses.set(key, text),
      notify: (...notice) => notices.push(notice),
    },
    sessionManager: {
      getEntries: () => entries,
      getUsageTotals: () => ({
        input: 0,
        output: 0,
        cacheRead: 0,
        cacheWrite: 0,
        cost: 0,
        latestCacheHitRate: undefined,
        ...totals,
      }),
    },
  };
  modeStatus(api);
  return { handlers, commands, statuses, notices, appended, ctx };
}

test("session start shows default modes and cumulative tokens", async () => {
  const f = fixture({
    totals: { input: 40_000, output: 4_000, cacheRead: 70_000, cacheWrite: 0 },
  });

  await f.handlers.get("session_start")({ reason: "startup" }, f.ctx);

  expect([...f.statuses.values()]).toEqual([
    "Caveman: LITE",
    "Ponytail: FULL",
    "Total tokens: 114K",
  ]);
});

test("commands update modes, persist state, and change the next prompt", async () => {
  const f = fixture();
  await f.handlers.get("session_start")({ reason: "startup" }, f.ctx);

  await f.commands.get("caveman").handler("ultra", f.ctx);
  await f.commands.get("ponytail").handler("off", f.ctx);
  const result = await f.handlers.get("before_agent_start")({
    prompt: "continue",
    systemPrompt: "base",
  }, f.ctx);

  expect(f.statuses.get("10-caveman")).toBe("Caveman: ULTRA");
  expect(f.statuses.get("20-ponytail")).toBe("Ponytail: OFF");
  expect(f.appended.at(-1)).toEqual({
    customType: "omo.mode-status",
    data: { caveman: "ultra", ponytail: "off" },
  });
  expect(result.systemPrompt).toContain("Caveman: ultra");
  expect(result.systemPrompt).toContain("Ponytail: off");
});

test("resumed sessions restore the latest saved modes", async () => {
  const f = fixture({
    entries: [
      { type: "custom", customType: "omo.mode-status", data: { caveman: "full", ponytail: "lite" } },
    ],
  });

  await f.handlers.get("session_start")({ reason: "resume" }, f.ctx);

  expect(f.statuses.get("10-caveman")).toBe("Caveman: FULL");
  expect(f.statuses.get("20-ponytail")).toBe("Ponytail: LITE");
});

test("natural stop phrases update only the requested mode", async () => {
  const f = fixture();
  await f.handlers.get("session_start")({ reason: "startup" }, f.ctx);

  const result = await f.handlers.get("input")({
    text: "stop caveman",
    source: "interactive",
  }, f.ctx);

  expect(result).toEqual({ action: "continue" });
  expect(f.statuses.get("10-caveman")).toBe("Caveman: OFF");
  expect(f.statuses.get("20-ponytail")).toBe("Ponytail: FULL");
});

test("settled turn refreshes cumulative token status after usage is committed", async () => {
  const totals = { input: 900, output: 100, cacheRead: 0, cacheWrite: 0 };
  const f = fixture({ totals });
  await f.handlers.get("session_start")({ reason: "startup" }, f.ctx);
  totals.cacheRead = 1_500;

  await f.handlers.get("agent_settled")({}, f.ctx);

  expect(f.statuses.get("30-total-tokens")).toBe("Total tokens: 2.5K");
});

test("token formatter stays compact and readable", () => {
  expect(formatTokens(0)).toBe("0");
  expect(formatTokens(999)).toBe("999");
  expect(formatTokens(1_000)).toBe("1K");
  expect(formatTokens(2_500)).toBe("2.5K");
  expect(formatTokens(1_250_000)).toBe("1.25M");
});

test("longest mode labels and total fit a compact status budget", async () => {
  const f = fixture({
    totals: { input: 1_250_000 },
    entries: [
      { type: "custom", customType: "omo.mode-status", data: { caveman: "wenyan-ultra", ponytail: "ultra" } },
    ],
  });
  await f.handlers.get("session_start")({ reason: "resume" }, f.ctx);

  expect(Bun.stringWidth([...f.statuses.values()].join(" "))).toBeLessThanOrEqual(70);
});

test("portable restore installs the mode status extension", async () => {
  const manifest = JSON.parse(await readFile(new URL("./restore.json", import.meta.url), "utf8"));

  expect(manifest.resources).toContainEqual({
    source: "agent/extensions/mode-status.js",
    target: ".omo/agent/extensions/mode-status.js",
  });
});
