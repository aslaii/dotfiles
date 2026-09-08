import { realpathSync } from "node:fs"
import { dirname, join } from "node:path"
import { pathToFileURL } from "node:url"

export const FAST_GPT_ENTRY = "openai-codex/gpt-6-astra:medium"
const installed = Symbol.for("dotfiles.omo-fast")
const claudeModels = new Set()

export async function resolveSenpiDistLive() {
  const binary = process.env.OMO_BIN || Bun.which("omo")
  if (!binary) throw new Error("omo-fast: omo is not on PATH")
  return join(dirname(dirname(realpathSync(binary))), "node_modules", "@code-yeongyu", "senpi", "dist")
}

export async function installFast() {
  const dist = await resolveSenpiDistLive()
  const [{ ModelRuntime }, { SettingsManager }] = await Promise.all([
    import(pathToFileURL(join(dist, "core/model-runtime.js")).href),
    import(pathToFileURL(join(dist, "core/settings-manager.js")).href),
  ])
  if (ModelRuntime.prototype[installed]) return
  const prepare = ModelRuntime.prototype.prepareRequest
  const compatibility = ModelRuntime.prototype.getCompatibilityRequestConfig
  const fallback = SettingsManager.prototype.getRetryFallbackSettings
  if ([prepare, compatibility, fallback].some((method) => typeof method !== "function")) {
    throw new Error("omo-fast: installed OMO request/fallback APIs are incompatible")
  }

  // Native sessions resolve their displayed tier here, including after fallback.
  ModelRuntime.prototype.getCompatibilityRequestConfig = function (model, env) {
    const config = compatibility.call(this, model, env)
    return ["openai", "openai-codex"].includes(model.provider)
      ? { ...config, serviceTier: "priority" }
      : config
  }

  // This request-level boundary also covers child sessions and completions.
  // An extension event's ctx.model can instead refer to the parent model.
  ModelRuntime.prototype.prepareRequest = async function (model, options, slotAuth) {
    if (model.provider === "anthropic") claudeModels.add(`${model.provider}/${model.id}`)
    const request = await prepare.call(this, model, options, slotAuth)
    const provider = request.model.provider
    if (!["anthropic", "openai", "openai-codex"].includes(provider)) return request
    if (provider === "anthropic") {
      const headers = { ...request.options.headers }
      const key = Object.keys(headers).find((key) => key.toLowerCase() === "anthropic-beta") ?? "anthropic-beta"
      const betas = (headers[key] ?? "").split(",").map((value) => value.trim()).filter(Boolean)
      headers[key] = [...new Set([...betas, "fast-mode-2026-02-01"])].join(",")
      request.options.headers = headers
    } else {
      request.options.serviceTier = "priority"
    }
    const onPayload = request.options.onPayload
    request.options.onPayload = async (payload, ...args) => {
      const transformed = (await onPayload?.(payload, ...args)) ?? payload
      return provider === "anthropic"
        ? { ...transformed, speed: "fast" }
        : { ...transformed, service_tier: "priority" }
    }
    return request
  }

  // Read-time overrides survive settings reloads without changing normal sessions.
  SettingsManager.prototype.getRetryFallbackSettings = function () {
    const settings = fallback.call(this)
    const chains = { ...settings.chains }
    const keys = new Set([...Object.keys(chains), ...claudeModels])
    for (const key of keys) {
      if (!key.startsWith("anthropic/")) continue
      chains[key] = [
        FAST_GPT_ENTRY,
        ...(chains[key] ?? []).filter((entry) => entry.split(":")[0] !== "openai-codex/gpt-6-astra"),
      ]
    }
    return { ...settings, modelFallback: true, chains }
  }
  ModelRuntime.prototype[installed] = true
}

export default async function fastExtension(api) {
  await installFast()
  api.on("session_start", (_event, ctx) => {
    for (const model of ctx.modelRegistry.getAll()) {
      if (model.provider === "anthropic") claudeModels.add(`${model.provider}/${model.id}`)
    }
  })
}
