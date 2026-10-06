import { expect, test } from "bun:test";
import { readFile } from "node:fs/promises";

const configFile = new URL("./omo.jsonc", import.meta.url);
const settingsFile = new URL("./agent/settings.json", import.meta.url);
const config = async () => Bun.JSONC.parse(await readFile(configFile, "utf8"));
const settings = async () => JSON.parse(await readFile(settingsFile, "utf8"));

test("portable Native routing uses Geeky Normal and Luna Fast workers", async () => {
  const native = await config();
  const engine = await settings();
  expect(native.model_profile).toBe("geeky-normal");
  expect(native.categories["deep-low"].models[0]).toEqual({
    model: "chatgpt-subscription/gpt-6.1-sol",
    reasoning: "medium",
  });
  expect(native.categories.quick.models[0]).toEqual({
    model: "chatgpt-subscription/gpt-6-luna-fast",
    reasoning: "low",
  });
  expect(native.categories["visual-engineering"].models[0].model).toBe(
    "anthropic-subscription/claude-opus-5-5",
  );
  expect(engine.retry.fallbackChains["chatgpt-subscription/gpt-6.1-sol"]).toEqual([
    "anthropic-subscription/claude-opus-5-5:medium",
  ]);
  expect(engine.retry.fallbackChains["chatgpt-subscription/gpt-6.1-sol-fast"]).toEqual([
    "anthropic-subscription/claude-opus-5-5:medium",
  ]);
});

test("premium models stay on high-impact categories and plan agents", async () => {
  const native = await config();
  const primary = (route) => route.models[0].model;
  expect(Object.keys(native.categories).sort()).toEqual([
    "architect", "artistry", "deep-high", "deep-low", "quick",
    "ultrabrain", "unspecified-high", "unspecified-low", "visual-engineering", "writing",
  ]);
  expect(Object.keys(native.agents).sort()).toEqual([
    "explore", "librarian", "omo-bonsai", "omo-native-qa-executor", "plan-consultant", "plan-reviewer",
  ]);
  expect(primary(native.categories["visual-engineering"])).toBe("anthropic-subscription/claude-opus-5-5");
  expect(primary(native.categories.architect)).toBe("anthropic-subscription/claude-opus-5-5");
  expect(primary(native.categories["unspecified-high"])).toBe("anthropic-subscription/claude-opus-5-5");
  expect(primary(native.categories["deep-high"])).toBe("chatgpt-subscription/gpt-6.1-sol");
  expect(primary(native.categories.ultrabrain)).toBe("chatgpt-subscription/gpt-6-astra");
  expect(primary(native.agents["plan-consultant"])).toBe("anthropic-subscription/claude-opus-5-5");
  expect(primary(native.agents["plan-reviewer"])).toBe("chatgpt-subscription/gpt-6-astra");
  for (const name of ["explore", "librarian"]) {
    expect(primary(native.agents[name])).toBe("chatgpt-subscription/gpt-6-luna-fast");
  }
});

test("native QA explicitly uses Sol 6.1 and routing has no old Sol selectors", async () => {
  const native = await config();
  expect(native.agents["omo-native-qa-executor"].models).toEqual([
    { model: "chatgpt-subscription/gpt-6.1-sol", reasoning: "medium" },
    { model: "opencode-go/deepseek-v4.1-flash", reasoning: "high" },
  ]);
  for (const value of [native, await settings()]) {
    expect(JSON.stringify(value)).not.toContain("gpt-6-sol");
  }
});

test("100-dollar profile conserves Astra and routes quick tasks to Luna", async () => {
  const native = await config();
  const pro100 = native.profiles.pro100;
  expect(pro100.model_profile).toBeUndefined();
  expect(pro100.categories.ultrabrain.models[0]).toEqual({
    model: "chatgpt-subscription/gpt-6-sol",
    reasoning: "max",
  });
  expect(pro100.categories.quick.models[0].model).toBe(
    "chatgpt-subscription/gpt-6-luna",
  );
  expect(pro100.agents["plan-reviewer"].models[0].model).toBe(
    "chatgpt-subscription/gpt-6-sol",
  );
});

test("all configured Go models belong to the approved two-model allowlist", async () => {
  const native = await config();
  const engine = await settings();
  const allowed = new Set([
    "opencode-go/glm-5.3-flash",
    "opencode-go/deepseek-v4.1-flash",
  ]);
  for (const section of [native, native.profiles.pro100]) {
    for (const group of ["categories", "agents"]) {
      for (const route of Object.values(section[group] ?? {})) {
        for (const { model, reasoning } of route.models) {
          if (model.startsWith("opencode-go/")) expect(allowed.has(model)).toBe(true);
          if (model === "opencode-go/glm-5.3-flash") expect(reasoning).toBe("low");
          expect(model.startsWith("commandcode/")).toBe(false);
          if (model.endsWith("-fast")) expect(model).toBe("chatgpt-subscription/gpt-6-luna-fast");
          if (model !== "bonsai-local/model") expect(engine.enabledModels).toContain(model);
        }
      }
    }
  }
  expect(engine.enabledModels.filter((model) => model.startsWith("opencode-go/")).sort())
    .toEqual([...allowed].sort());
  expect(native.categories.quick.models[1].reasoning).toBe("low");
  expect(engine.modelServiceTiers["chatgpt-subscription/gpt-6.1-sol"]).toBe("priority");
  expect(engine.modelServiceTiers["chatgpt-subscription/gpt-6-luna"]).toBe("priority");
});

test("main fallback switches providers and preserves other settings", async () => {
  const native = await config();
  const engine = await settings();
  expect(engine.defaultProvider).toBe("chatgpt-subscription");
  expect(engine.defaultModel).toBe("gpt-6.1-sol-fast");
  expect(engine.defaultThinkingLevel).toBe("medium");
  expect(engine.retry.modelFallback).toBe(true);
  for (const [primary, fallback] of Object.entries(engine.retry.fallbackChains)) {
    const providers = [primary, ...fallback].map((model) => model.split("/")[0]);
    expect(new Set(providers).size).toBe(providers.length);
  }
  for (const group of [native.categories, native.agents]) {
    for (const route of Object.values(group)) {
      const providers = route.models.map(({ model }) => model.split("/")[0]);
      expect(new Set(providers).size).toBe(providers.length);
    }
  }
  expect(native.git_master).toEqual({
    commit_footer: false,
    include_co_authored_by: false,
  });
  expect(engine.packages).toHaveLength(4);
  expect(engine.permission).toEqual({ "*": "allow" });
});

test("Claude roles fall back to GPT before OpenCode without Space Bunny", async () => {
  const native = await config();
  for (const group of [native.categories, native.agents]) {
    for (const route of Object.values(group)) {
      const models = route.models.map(({ model }) => model);
      expect(models.some((model) => model.includes("space-bunny"))).toBe(false);
      if (models[0].startsWith("anthropic-subscription/")) {
        expect(models[1].startsWith("chatgpt-subscription/")).toBe(true);
        expect(models[2].startsWith("opencode-go/")).toBe(true);
      }
    }
  }
  const engine = await settings();
  expect(engine.retry.fallbackChains["anthropic-subscription/claude-opus-5-5"]).toEqual([
    "chatgpt-subscription/gpt-6.1-sol:high",
    "opencode-go/deepseek-v4.1-flash:high",
  ]);
  expect(engine.retry.fallbackChains["anthropic-subscription/claude-sonnet-5-5"]).toEqual([
    "chatgpt-subscription/gpt-6-luna-fast:medium",
    "opencode-go/glm-5.3-flash:low",
  ]);
});

test("native task and team concurrency limits remain eight", async () => {
  const { task } = await config();
  expect(task.default_concurrency).toBe(8);
  expect(task.global_concurrency).toBe(8);
  expect(task.residency_max_children).toBe(8);
  expect(task.team.max_parallel_members).toBe(8);
});

test("Astra Fast is blocked without disabling standard Astra or Sol Fast", async () => {
  const models = JSON.parse(await readFile(new URL("./agent/models.json", import.meta.url), "utf8"));
  const blacklist = models.providers["chatgpt-subscription"].blacklist;
  expect(blacklist).toContain("gpt-6-astra-fast");
  expect(blacklist).not.toContain("gpt-6-astra");
  expect(blacklist).not.toContain("gpt-6.1-sol-fast");
  expect(blacklist).not.toContain("gpt-6-luna-fast");
});
