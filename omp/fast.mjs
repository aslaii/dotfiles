// omp-fast guard extension (opt-in only).
//
// Load alongside --config fast.yml:
//   omp --config /Users/aslaii/dotfiles/omp/fast.yml --extension /Users/aslaii/dotfiles/omp/fast.mjs ...
//
// Enforces speed:"fast" on direct-Anthropic wire payloads in
// before_provider_request. pi-ai invokes that hook via options.onPayload
// AFTER dropAnthropicFastMode on EVERY prepareParams rebuild (initial plus
// each in-provider retry), so the native silent standard-Claude retry can
// never send standard: either the persisted fast-mode beta carries fast, or
// the repeated 400 surfaces outward to retry.fallbackChains (fast GPT).
// Gated on ctx.model.provider exactly like the native speed assignment, so
// Bedrock/Vertex passthroughs, OpenAI/Codex, OpenRouter and Muse/Zen relays
// are untouched. No imports, no settings access, no side effects; safe to
// inherit into every subagent depth via the native
// preloadedPreparedExtensions re-bind.
export default function fast(pi) {
	pi.on("before_provider_request", (event, ctx) => {
		if (ctx?.model?.provider !== "anthropic") return undefined;
		const payload = event?.payload;
		if (!payload || typeof payload !== "object" || Array.isArray(payload)) return undefined;
		if (payload.speed === "fast") return undefined;
		return { ...payload, speed: "fast" };
	});
}
