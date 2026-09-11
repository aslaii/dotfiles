import { beforeAll, expect, test } from "bun:test"
import { mkdtemp, rm } from "node:fs/promises"
import { createRequire } from "node:module"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { pathToFileURL } from "node:url"
import { FAST_GPT_ENTRY, installFast, resolveSenpiDistLive } from "./fast.mjs"

const dist = await resolveSenpiDistLive()
const { ModelRuntime } = await import(pathToFileURL(join(dist, "core/model-runtime.js")).href)
const { SettingsManager } = await import(pathToFileURL(join(dist, "core/settings-manager.js")).href)
const { RetryFallbackController } = await import(pathToFileURL(join(dist, "core/retry-fallback/controller.js")).href)

beforeAll(installFast)

function runtime() {
  return ModelRuntime.createSync({ modelsPath: null })
}

function prepared(rt, provider, id, options = {}) {
  return rt.prepareRequest({ provider, id }, { apiKey: "test-dummy", ...options })
}

function payload(request, body) {
  return request.options.onPayload?.(body, request.model, { model: request.model }) ?? body
}

test("installing twice does not wrap requests again", async () => {
  const before = ModelRuntime.prototype.prepareRequest
  await installFast()
  expect(ModelRuntime.prototype.prepareRequest).toBe(before)
})

test("Claude gets the real fast beta while preserving existing headers and payload", async () => {
  const headers = { "Anthropic-Beta": "existing-beta", "x-keep": "yes" }
  const request = await prepared(runtime(), "anthropic", "claude-sonnet-5", { headers })
  expect(request.options.headers["Anthropic-Beta"].split(",")).toEqual([
    "existing-beta", "fast-mode-2026-02-01",
  ])
  expect(request.options.headers["x-keep"]).toBe("yes")
  expect(headers["Anthropic-Beta"]).toBe("existing-beta")
  expect(await payload(request, { model: "claude-sonnet-5", other: 1 })).toEqual({
    model: "claude-sonnet-5", other: 1, speed: "fast",
  })
})

test("GPT priority is applied after existing payload hooks, retaining request metadata", async () => {
  for (const provider of ["openai", "openai-codex"]) {
    const seen = []
    const request = await prepared(runtime(), provider, "gpt-5.6-sol", {
      onPayload: async (body, _model, metadata) => {
        seen.push(metadata.model.provider)
        return { ...body, marker: "hook", service_tier: "auto" }
      },
    })
    expect(await payload(request, { model: "gpt-5.6-sol" })).toEqual({
      model: "gpt-5.6-sol", marker: "hook", service_tier: "priority",
    })
    expect(seen).toEqual([provider])
    expect(request.options.serviceTier).toBe("priority")
    expect(request.options.headers?.["anthropic-beta"]).toBeUndefined()
  }
})

test("native model metadata exposes priority for GPT without changing Muse or Go", () => {
  const rt = runtime()
  for (const provider of ["openai", "openai-codex"]) {
    expect(rt.getCompatibilityRequestConfig({ provider, id: "gpt-5.6-sol" }).serviceTier).toBe("priority")
  }
  for (const [provider, id] of [
    ["opencode", "muse-spark-1.3-contributor-free"],
    ["opencode-go", "glm-5.3"],
    ["anthropic", "claude-sonnet-5"],
  ]) {
    expect(rt.getCompatibilityRequestConfig({ provider, id }).serviceTier).toBeUndefined()
  }
})

test("concurrent main and child runtime instances keep provider settings separate", async () => {
  const cases = [
    ["anthropic", "claude-sonnet-5", { speed: "fast" }],
    ["openai-codex", "gpt-5.6-sol", { service_tier: "priority" }],
    ["opencode", "muse-spark-1.3-contributor-free", {}],
    ["opencode-go", "glm-5.3", {}],
  ]
  await Promise.all(cases.map(async ([provider, id, extra]) => {
    const onPayload = (body) => body
    const request = await prepared(runtime(), provider, id, { headers: { "x-keep": "yes" }, onPayload })
    expect(await payload(request, { model: id })).toEqual({ model: id, ...extra })
    if (provider.startsWith("opencode")) {
      expect(request.options.headers).toEqual({ "x-keep": "yes" })
      expect(request.options.onPayload).toBe(onPayload)
    }
  }))
})

test("Claude authentication failure still registers its GPT fallback", async () => {
  const rt = runtime()
  rt.getAuth = async () => undefined
  await expect(prepared(rt, "anthropic", "claude-unavailable")).rejects.toThrow("not configured")
  expect(SettingsManager.inMemory().getRetryFallbackSettings().chains["anthropic/claude-unavailable"]?.[0])
    .toBe(FAST_GPT_ENTRY)
})

test("native fallback selects fast GPT without changing saved settings or other providers", async () => {
  const original = {
    retry: {
      modelFallback: false,
      fallbackRevertPolicy: "never",
      fallbackChains: {
        "anthropic/claude-sonnet-5": ["opencode/muse-spark-1.3-contributor-free:xhigh"],
        "opencode-go/glm-5.3": ["opencode/muse-spark-1.3-contributor-free:xhigh"],
      },
    },
  }
  const settings = SettingsManager.inMemory(original)
  const rt = runtime()
  const claude = rt.getModel("anthropic", "claude-sonnet-5")
  let current = { model: claude, thinkingLevel: "high" }
  const controller = new RetryFallbackController({
    getSettings: () => settings.getRetryFallbackSettings(),
    getCurrentSelector: () => current,
    registry: {
      find: (provider, id) => rt.getModel(provider, id),
      getAll: () => rt.getModels(),
      isFallbackEligible: () => true,
    },
    cooldowns: { isSuppressed: () => false, note() {} },
    isAuthAvailable: (provider) => provider === "openai-codex",
    switchModel: async (model, thinkingLevel) => { current = { model, thinkingLevel } },
    logger: { debug() {}, info() {} },
    emit() {},
  })
  expect(await controller.tryFallback("hard-error", { errorMessage: "Claude unavailable" })).toBe(true)
  expect(current.model.provider).toBe("openai-codex")
  expect(current.model.id).toBe("gpt-5.6-sol")
  expect(current.thinkingLevel).toBe("xhigh")
  expect(await payload(await prepared(rt, current.model.provider, current.model.id), {}))
    .toEqual({ service_tier: "priority" })
  expect(settings.getGlobalSettings()).toEqual(original)
  expect(settings.getRetryFallbackSettings().chains["opencode-go/glm-5.3"])
    .toEqual(original.retry.fallbackChains["opencode-go/glm-5.3"])
})

test("real Anthropic transport sends fast headers and body to a local HTTP endpoint", async () => {
  const received = []
  const server = Bun.serve({
    hostname: "127.0.0.1",
    port: 0,
    async fetch(request) {
      received.push({ beta: request.headers.get("anthropic-beta"), body: await request.json() })
      return Response.json({ type: "error", error: { type: "invalid_request_error", message: "test rejection" } }, { status: 400 })
    },
  })
  try {
    const rt = runtime()
    rt.getAuth = async () => ({ auth: { apiKey: "test-dummy", baseUrl: server.url.origin } })
    const result = await rt.streamSimple(rt.getModel("anthropic", "claude-sonnet-5"), {
      messages: [{ role: "user", content: "test", timestamp: 0 }],
    }, { maxRetries: 0, signal: AbortSignal.timeout(5000) }).result()
    expect(result.stopReason).toBe("error")
    expect(received).toHaveLength(1)
    expect(received[0].body.speed).toBe("fast")
    expect(received[0].beta.split(",")).toContain("fast-mode-2026-02-01")
  } finally {
    server.stop(true)
  }
})

test("real OMO child fallback keeps GPT priority on the wire and in session metadata", async () => {
  // Native OMO loads its plugin through Jiti with Senpi's dependency aliases.
  const require = createRequire(join(dist, "core/extensions/loader.js"))
  const { createJiti } = require("jiti")
  const load = createJiti(import.meta.url, {
    interopDefault: false,
    alias: {
      typebox: require.resolve("typebox"),
      "@earendil-works/pi-tui": require.resolve("@earendil-works/pi-tui"),
      "@code-yeongyu/senpi": join(dist, "index.js"),
    },
  })
  const { createInProcessJudgeRunner } = await load.import(join(dist, "../../../../plugin/extensions/omo-task.js"))
  const { createAgentSession } = await import(pathToFileURL(join(dist, "core/sdk.js")).href)
  const { AuthStorage } = await import(pathToFileURL(join(dist, "core/auth-storage.js")).href)
  const directory = await mkdtemp(join(tmpdir(), "omo-fast-child-"))
  const requests = []
  const server = Bun.serve({
    hostname: "127.0.0.1",
    port: 0,
    async fetch(request) {
      const bytes = new Uint8Array(await request.arrayBuffer())
      const decoded = request.headers.get("content-encoding") === "zstd" ? Bun.zstdDecompressSync(bytes) : bytes
      const body = JSON.parse(new TextDecoder().decode(decoded))
      requests.push(body)
      if (body.model.startsWith("claude")) {
        return Response.json({
          type: "error",
          error: { type: "invalid_request_error", message: "This model does not support the speed parameter" },
        }, { status: 400 })
      }
      const item = { type: "message", id: "msg_test", role: "assistant", content: [] }
      const events = [
        { type: "response.output_item.added", output_index: 0, item },
        { type: "response.content_part.added", item_id: item.id, output_index: 0, content_index: 0, part: { type: "output_text", text: "", annotations: [] } },
        { type: "response.output_text.delta", item_id: item.id, output_index: 0, content_index: 0, delta: "OK" },
        { type: "response.completed", response: { id: "resp_test", status: "completed", output: [], service_tier: "priority", usage: { input_tokens: 1, output_tokens: 1 } } },
      ]
      return new Response(events.map((event) => `data: ${JSON.stringify(event)}\n\n`).join(""), {
        headers: { "content-type": "text/event-stream" },
      })
    },
  })
  let session
  let handle
  try {
    const auth = AuthStorage.inMemory({
      anthropic: { type: "api_key", key: "test-dummy" },
      "openai-codex": {
        type: "oauth", access: "test-dummy", refresh: "test-refresh", expires: 4102444800000,
      },
    })
    const rt = await ModelRuntime.create({
      credentials: auth, modelsPath: null, agentDir: directory, allowModelNetwork: false,
    })
    expect(rt.hasConfiguredAuth("openai-codex")).toBe(true)
    rt.getAuth = async () => ({ auth: { apiKey: "test-dummy", baseUrl: server.url.origin } })
    const runner = createInProcessJudgeRunner({
      createSession: async (options) => {
        options.settingsManager.applyOverrides({ transport: "sse", retry: { enabled: true, maxRetries: 0 } })
        session = (await createAgentSession(options)).session
        expect(session.settingsManager.getRetryFallbackSettings().chains["anthropic/claude-haiku-4-5"]?.[0])
          .toBe(FAST_GPT_ENTRY)
        return session
      },
    })
    handle = await runner.start({
      taskId: "fast-child-test",
      parentSessionId: "parent-test",
      rootSessionId: "parent-test",
      cwd: directory,
      agentDir: directory,
      sessionDir: join(directory, "sessions"),
      depth: 1,
      prompt: "Return OK.",
      promptEnvelope: "bare",
      selectedModel: "anthropic/claude-haiku-4-5",
      model: rt.getModel("anthropic", "claude-haiku-4-5"),
      thinkingLevel: "low",
      modelRuntime: rt,
      authStorage: auth,
      toolAllowlist: [],
      fallbackModels: [{ provider: "openai-codex", model_id: "gpt-5.6-sol", reasoning_effort: "xhigh" }],
      retry: { maxRetries: 0 },
    })
    const outcome = await handle.waitForIdle()
    expect(outcome).toMatchObject({ status: "completed" })
    expect(requests).toHaveLength(2)
    expect(requests[0].speed).toBe("fast")
    expect(requests[1].service_tier).toBe("priority")
    expect(session.model.provider).toBe("openai-codex")
    expect(session.serviceTier).toBe("priority")
    expect(session.isFastModeActive()).toBe(true)
  } finally {
    await handle?.abort()
    handle?.dispose()
    server.stop(true)
    await rm(directory, { recursive: true, force: true })
  }
}, 15000)
