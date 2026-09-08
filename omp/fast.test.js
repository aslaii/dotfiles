import { afterEach, expect, test } from "bun:test"
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises"
import { realpathSync } from "node:fs"
import { tmpdir } from "node:os"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

const fastOverlay = fileURLToPath(new URL("./fast.yml", import.meta.url))
const fastExtension = fileURLToPath(new URL("./fast.mjs", import.meta.url))
const trackedConfig = fileURLToPath(new URL("./agent/config.yml", import.meta.url))
const cleanup = []

afterEach(async () => {
  await Promise.all(cleanup.splice(0).map((p) => rm(p, { recursive: true, force: true })))
})

function ompPkgRoot() {
  const which = Bun.which("omp")
  if (!which) throw new Error("omp not found on PATH")
  const real = realpathSync(which)
  if (!real.endsWith("/dist/cli.js")) throw new Error(`unexpected omp layout: ${real}`)
  return dirname(dirname(real))
}

const ZEN = "opencode-zen/muse-spark-1.3-contributor-free:xhigh"
const GPT_FAST = "openai-codex/gpt-6-astra:medium"

async function write(path, contents) {
  await mkdir(dirname(path), { recursive: true })
  await writeFile(path, contents)
}

// Minimal base config: standard tiers, Claude fallbacks WITHOUT GPT first.
async function makeBase() {
  const root = await mkdtemp(join(tmpdir(), "omp fast "))
  cleanup.push(root)
  const agentDir = join(root, "agent")
  const project = join(root, "proj")
  await write(
    join(agentDir, "config.yml"),
    [
      "disabledProviders:",
      "  - claude",
      "task:",
      "  maxConcurrency: 2",
      "retry:",
      "  fallbackChains:",
      "    default:",
      "      - anthropic/claude-sonnet-5:medium",
      `      - ${ZEN}`,
      "    anthropic/*:",
      `      - ${ZEN}`,
      "    opencode-zen/muse-spark-1.3-contributor-free:",
      "      - anthropic/claude-sonnet-5:high",
      "",
    ].join("\n"),
  )
  await mkdir(project, { recursive: true })
  return { root, agentDir, project }
}

async function loadSettings(agentDir, project, configFiles) {
  const root = ompPkgRoot()
  const { Settings } = await import("file://" + join(root, "src/config/settings.ts"))
  // loadIsolated: fresh instance per call (init is a global singleton, first call wins).
  return Settings.loadIsolated({ cwd: project, agentDir, ...(configFiles ? { configFiles } : {}) })
}

test("fast overlay enables priority tiers via native --config overlay", async () => {
  const { agentDir, project } = await makeBase()
  const s = await loadSettings(agentDir, project, [fastOverlay])
  expect(s.get("tier.openai")).toBe("priority")
  expect(s.get("tier.anthropic")).toBe("priority")
  expect(s.get("tier.google")).toBe("none")
  expect(s.get("tier.subagent")).toBe("inherit")
  expect(s.get("tier.advisor")).toBe("inherit")
}, 30000)

test("normal load without overlay stays standard (normal omp unchanged)", async () => {
  const { agentDir, project } = await makeBase()
  const s = await loadSettings(agentDir, project)
  expect(s.get("tier.openai")).toBe("none")
  expect(s.get("tier.anthropic")).toBe("none")
  expect(s.get("tier.google")).toBe("none")
  expect(s.get("tier.subagent")).toBe("inherit")
  expect(s.get("tier.advisor")).toBe("none")
}, 30000)

test("child subagents inherit live fast tiers (native createSubagentSettings)", async () => {
  const { agentDir, project } = await makeBase()
  const s = await loadSettings(agentDir, project, [fastOverlay])
  const root = ompPkgRoot()
  const { buildServiceTierByFamily } = await import("file://" + join(root, "src/config/service-tier.ts"))
  const { createSubagentSettings } = await import("file://" + join(root, "src/task/executor.ts"))
  const live = buildServiceTierByFamily(s.get("tier.openai"), s.get("tier.anthropic"), s.get("tier.google"))
  const child = createSubagentSettings(s, undefined, live)
  expect(child.get("tier.openai")).toBe("priority")
  expect(child.get("tier.anthropic")).toBe("priority")
  expect(child.get("tier.google")).toBe("none")
  // Grandchildren keep tracking: inherit survives the snapshot.
  expect(child.get("tier.subagent")).toBe("inherit")
}, 30000)

test("claude fallback starts with GPT Astra, zen preserved, sibling chains untouched", async () => {
  const { agentDir, project } = await makeBase()
  const s = await loadSettings(agentDir, project, [fastOverlay])
  const chains = s.get("retry.fallbackChains")
  expect(chains["anthropic/*"][0]).toBe(GPT_FAST)
  expect(chains["anthropic/*"]).toContain(ZEN)
  expect(chains["anthropic/claude-opus-5"][0]).toBe(GPT_FAST)
  expect(chains["anthropic/claude-opus-5"]).toContain("anthropic/claude-sonnet-5:high")
  expect(chains["anthropic/claude-opus-5"]).toContain(ZEN)
  // Non-Claude chains are byte-identical to the no-overlay load.
  const plain = await loadSettings(agentDir, project)
  const plainChains = plain.get("retry.fallbackChains")
  expect(chains["default"]).toEqual(plainChains["default"])
  expect(chains["opencode-zen/muse-spark-1.3-contributor-free"]).toEqual(
    plainChains["opencode-zen/muse-spark-1.3-contributor-free"],
  )
}, 30000)

test("fast overlay raises child concurrency to 8, normal stays pinned at 2", async () => {
  const { agentDir, project } = await makeBase()
  const fast = await loadSettings(agentDir, project, [fastOverlay])
  expect(fast.get("task.maxConcurrency")).toBe(8)
  const plain = await loadSettings(agentDir, project)
  expect(plain.get("task.maxConcurrency")).toBe(2)
  const root = ompPkgRoot()
  const { buildServiceTierByFamily } = await import("file://" + join(root, "src/config/service-tier.ts"))
  const { createSubagentSettings } = await import("file://" + join(root, "src/task/executor.ts"))
  const live = buildServiceTierByFamily(fast.get("tier.openai"), fast.get("tier.anthropic"), fast.get("tier.google"))
  const child = createSubagentSettings(fast, undefined, live)
  // Snapshot copies every key the executor does not pin, so the live
  // workpool/spawn-semaphore ceiling (task/index.ts, workpool.ts) is 8
  // at every depth of the fast spawn tree.
  expect(child.get("task.maxConcurrency")).toBe(8)
}, 30000)

test("tracked live config carries no tier keys (normal omp ships standard)", async () => {
  const data = Bun.YAML.parse(await readFile(trackedConfig, "utf8"))
  expect(data?.tier ?? {}).toEqual({})
})

test("fast overlay pins retry fallback switches on", async () => {
  const { agentDir, project } = await makeBase()
  const s = await loadSettings(agentDir, project, [fastOverlay])
  expect(s.get("retry.enabled")).toBe(true)
  expect(s.get("retry.modelFallback")).toBe(true)
})

// --- fast.mjs guard extension ---

async function loadFastExtension(cwd) {
  const root = ompPkgRoot()
  const { loadExtensions } = await import("file://" + join(root, "src/extensibility/extensions/loader.ts"))
  return loadExtensions([fastExtension], cwd)
}

function hookOf(extensions) {
  const handlers = extensions[0]?.handlers?.get("before_provider_request")
  if (!handlers || handlers.length !== 1) throw new Error("fast.mjs must register one before_provider_request handler")
  return handlers[0]
}

const anthropicCtx = (provider = "anthropic") => ({ model: { provider, api: "anthropic-messages", id: "claude-opus-5" } })

test("guard re-adds speed fast on direct anthropic, ignores the rest", async () => {
  const { project } = await makeBase()
  const loaded = await loadFastExtension(project)
  expect(loaded.errors).toEqual([])
  const hook = hookOf(loaded.extensions)
  const payload = { model: "claude-opus-5", max_tokens: 16, messages: [] }
  const replaced = await hook({ type: "before_provider_request", payload }, anthropicCtx())
  expect(replaced.speed).toBe("fast")
  expect(replaced.model).toBe("claude-opus-5")
  expect(payload.speed).toBeUndefined()
  expect(await hook({ type: "before_provider_request", payload: { ...payload, speed: "fast" } }, anthropicCtx())).toBeUndefined()
  expect(await hook({ type: "before_provider_request", payload }, anthropicCtx("amazon-bedrock"))).toBeUndefined()
  expect(await hook({ type: "before_provider_request", payload }, anthropicCtx("openai-codex"))).toBeUndefined()
  expect(await hook({ type: "before_provider_request", payload: null }, anthropicCtx())).toBeUndefined()
  expect(await hook({ type: "before_provider_request", payload }, {})).toBeUndefined()
}, 30000)

test("guard survives the native subagent re-bind (preloadedPreparedExtensions)", async () => {
  const { project } = await makeBase()
  const root = ompPkgRoot()
  const parent = await loadFastExtension(project)
  expect(parent.errors).toEqual([])
  // Mirror sdk.ts createAgentSession path 2: child re-binds the parent's
  // prepared factories to its own ExtensionAPI without re-importing modules.
  const { bindPreparedExtensions } = await import("file://" + join(root, "src/extensibility/extensions/loader.ts"))
  const childDir = join(project, "child")
  await mkdir(childDir, { recursive: true })
  const child = await bindPreparedExtensions(parent.preparedExtensions, childDir)
  expect(child.errors).toEqual([])
  const hook = hookOf(child.extensions)
  const replaced = await hook(
    { type: "before_provider_request", payload: { model: "m", max_tokens: 1, messages: [] } },
    anthropicCtx(),
  )
  expect(replaced.speed).toBe("fast")
}, 30000)

// --- mock-wire: real streamAnthropic against injected fetch, no paid calls ---

function anthropicModel() {
  return {
    provider: "anthropic",
    api: "anthropic-messages",
    id: "claude-opus-5",
    baseUrl: "https://api.anthropic.com",
    reasoning: false,
    input: ["text"],
    contextWindow: 200000,
    maxTokens: 32000,
    cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
    identity: { class: "anthropic" },
    compat: { officialEndpoint: true },
  }
}

const fastUnsupportedBody = () =>
  JSON.stringify({
    type: "error",
    error: { type: "invalid_request_error", message: "invalid_request_error: model does not support the 'speed' parameter" },
  })

function mockFetch(responder) {
  const bodies = []
  const fetch = async (url, init) => {
    bodies.push(JSON.parse(init.body))
    return responder(bodies.length)
  }
  return { fetch, bodies }
}

const err400 = () => new Response(fastUnsupportedBody(), { status: 400, headers: { "content-type": "application/json" } })

async function collect(stream) {
  const events = []
  for await (const e of stream) events.push(e)
  return events
}

async function guardOnPayload(project) {
  const loaded = await loadFastExtension(project)
  expect(loaded.errors).toEqual([])
  const hook = hookOf(loaded.extensions)
  // The runner passes (payload, model) through; mirror sdk.ts onPayload shape.
  return async (payload, model) => hook({ type: "before_provider_request", payload }, { model })
}

test("mock wire: guard forces speed fast on every attempt, native failure surfaces outward", async () => {
  const { project } = await makeBase()
  const root = ompPkgRoot()
  const { streamAnthropic } = await import("file://" + join(root, "../pi-ai/src/providers/anthropic.ts"))
  const onPayload = await guardOnPayload(project)
  const { fetch, bodies } = mockFetch(() => err400())
  const events = await collect(
    streamAnthropic(anthropicModel(), { messages: [{ role: "user", content: "hi" }] }, {
      apiKey: "sk-ant-test",
      serviceTier: "priority",
      onPayload,
      fetch,
      providerSessionState: new Map(),
    }),
  )
  expect(bodies.length).toBe(2)
  expect(bodies.every((b) => b.speed === "fast")).toBe(true)
  expect(events.some((e) => e.type === "error")).toBe(true)
  expect(events.some((e) => e.type === "text_delta" && e.delta)).toBe(false)
}, 60000)

test("mock wire control: without guard native retry drops speed and succeeds", async () => {
  const { project } = await makeBase()
  const root = ompPkgRoot()
  const { streamAnthropic } = await import("file://" + join(root, "../pi-ai/src/providers/anthropic.ts"))
  const sseOk =
    'event: message_start\ndata: {"type":"message_start","message":{"id":"m","type":"message","role":"assistant","content":[],"model":"c","stop_reason":null,"usage":{"input_tokens":1,"output_tokens":1}}}\n\n' +
    'event: content_block_start\ndata: {"type":"content_block_start","index":0,"content_block":{"type":"text","text":""}}\n\n' +
    'event: content_block_delta\ndata: {"type":"content_block_delta","index":0,"delta":{"type":"text_delta","text":"ok"}}\n\n' +
    'event: content_block_stop\ndata: {"type":"content_block_stop","index":0}\n\n' +
    'event: message_delta\ndata: {"type":"message_delta","delta":{"stop_reason":"end_turn"},"usage":{"output_tokens":1}}\n\n' +
    'event: message_stop\ndata: {"type":"message_stop"}\n\n'
  let n = 0
  const { fetch, bodies } = mockFetch(() => (++n === 1 ? err400() : new Response(sseOk, { status: 200, headers: { "content-type": "text/event-stream" }})))
  const events = await collect(
    streamAnthropic(anthropicModel(), { messages: [{ role: "user", content: "hi" }] }, {
      apiKey: "sk-ant-test",
      serviceTier: "priority",
      fetch,
      providerSessionState: new Map(),
    }),
  )
  expect(bodies.length).toBe(2)
  expect(bodies[0].speed).toBe("fast")
  expect(bodies[1].speed).toBeUndefined()
  expect(events.some((e) => e.type === "text_delta" && e.delta === "ok")).toBe(true)
}, 60000)
