import { expect, test } from "bun:test";
import { readFile } from "node:fs/promises";

const configFile = new URL("./omo.jsonc", import.meta.url);
const settingsFile = new URL("./agent/settings.json", import.meta.url);
const config = async () => Bun.JSONC.parse(await readFile(configFile, "utf8"));
const settings = async () => JSON.parse(await readFile(settingsFile, "utf8"));

test("portable Native routing starts on Sonnet and saves GPT quota on bulk work", async () => {
  const native = await config();
  const engine = await settings();
  expect(native.model_profile).toBe("anthropic-subscription/claude-sonnet-5:medium");
  expect(native.categories["deep-low"].models[0]).toEqual({
    model: "commandcode/deepseek/deepseek-v4.1-flash",
    reasoning: "high",
  });
  expect(native.categories.quick.models[0]).toEqual({
    model: "commandcode/deepseek/deepseek-v4.1-flash",
    reasoning: "low",
  });
  expect(native.categories["visual-engineering"].models[0].model).toBe(
    "anthropic-subscription/claude-opus-5-5",
  );
  expect(engine.retry.fallbackChains["anthropic-subscription/claude-sonnet-5"]).toEqual([
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
    "explore", "librarian", "plan-consultant", "plan-reviewer",
  ]);
  for (const name of ["architect", "visual-engineering", "unspecified-high"]) {
    expect(primary(native.categories[name])).toBe("anthropic-subscription/claude-opus-5-5");
  }
  for (const name of ["deep-high", "ultrabrain", "artistry"]) {
    expect(primary(native.categories[name])).toBe("anthropic-subscription/claude-opus-5-5");
  }
  expect(primary(native.categories.writing)).toBe("anthropic-subscription/claude-sonnet-5");
  expect(primary(native.agents["plan-consultant"])).toBe("anthropic-subscription/claude-opus-5-5");
  expect(primary(native.agents["plan-reviewer"])).toBe("anthropic-subscription/claude-opus-5-5");
  for (const name of ["explore", "librarian"]) {
    expect(primary(native.agents[name])).toBe("commandcode/deepseek/deepseek-v4.1-flash");
  }
});

test("JR profile reserves Astra for fallback and keeps quick tasks on Command Code", async () => {
  const native = await config();
  expect(native.categories.ultrabrain.models[1].model).toBe("chatgpt-subscription/gpt-6-astra");
  expect(native.categories.quick.models[0].model).toBe(
    "commandcode/deepseek/deepseek-v4.1-flash",
  );
  expect(native.categories.quick.models[1].model).toBe("chatgpt-subscription/gpt-6-luna");
  expect(Object.keys(native.profiles)).toEqual(["opus-main"]);
});

test("all configured Command Code models belong to the three-model allowlist", async () => {
  const native = await config();
  const engine = await settings();
  const allowed = new Set([
    "commandcode/deepseek/deepseek-v4.1-flash",
    "commandcode/z-ai/glm-5.3-flash",
    "commandcode/meta/muse-spark-1.3-contributor",
  ]);
  for (const section of [native, native.profiles["opus-main"]]) {
    for (const group of ["categories", "agents"]) {
      for (const route of Object.values(section[group] ?? {})) {
        for (const { model } of route.models) {
          if (model.startsWith("commandcode/")) expect(allowed.has(model)).toBe(true);
          expect(model.endsWith("-fast")).toBe(false);
          expect(engine.enabledModels).toContain(model);
        }
      }
    }
  }
  expect(engine.modelServiceTiers["chatgpt-subscription/gpt-6-sol"]).toBe("auto");
  expect(engine.modelServiceTiers["chatgpt-subscription/gpt-6-luna"]).toBe("auto");
});

test("main fallback stays within Claude and preserves other settings", async () => {
  const native = await config();
  const engine = await settings();
  expect(engine.defaultProvider).toBe("anthropic-subscription");
  expect(engine.defaultModel).toBe("claude-sonnet-5");
  expect(engine.defaultThinkingLevel).toBe("medium");
  expect(engine.retry.modelFallback).toBe(true);
  expect(engine.retry.fallbackChains).toEqual({
    "anthropic-subscription/claude-sonnet-5": ["anthropic-subscription/claude-opus-5-5:medium"],
    "anthropic-subscription/claude-opus-5-5": [],
  });
  expect(native.git_master).toEqual({
    commit_footer: false,
    include_co_authored_by: false,
  });
  expect(engine.packages).toHaveLength(4);
  expect(engine.permission).toEqual({ "*": "allow" });
});

test("native task and team concurrency limits remain eight", async () => {
  const { task } = await config();
  expect(task.default_concurrency).toBe(8);
  expect(task.global_concurrency).toBe(8);
  expect(task.residency_max_children).toBe(8);
  expect(task.team.max_parallel_members).toBe(8);
});

test("JR portable routing keeps the main session on Claude", async () => {
  const native = await config();
  const engine = await settings();
  expect(native.model_profile).toBe("anthropic-subscription/claude-sonnet-5:medium");
  expect(native.profiles["opus-main"].model_profile).toBe(
    "anthropic-subscription/claude-opus-5-5:medium",
  );
  expect(engine.retry.fallbackChains["anthropic-subscription/claude-sonnet-5"]).toEqual([
    "anthropic-subscription/claude-opus-5-5:medium",
  ]);
  expect(engine.retry.fallbackChains["anthropic-subscription/claude-opus-5-5"]).toEqual([]);
});
