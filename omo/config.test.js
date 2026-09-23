import { expect, test } from "bun:test";
import { readFile } from "node:fs/promises";

const configFile = new URL("./omo.jsonc", import.meta.url);
const settingsFile = new URL("./agent/settings.json", import.meta.url);
const config = async () => Bun.JSONC.parse(await readFile(configFile, "utf8"));
const settings = async () => JSON.parse(await readFile(settingsFile, "utf8"));

test("portable Native routing starts on GPT-6 Sol and saves GPT quota on bulk work", async () => {
  const native = await config();
  const engine = await settings();
  expect(native.model_profile).toBe("chatgpt-subscription/gpt-6-sol:medium");
  expect(native.categories["deep-low"].models[0]).toEqual({
    model: "commandcode/deepseek/deepseek-v4.1-flash",
    reasoning: "high",
  });
  expect(native.categories.quick.models[0]).toEqual({
    model: "chatgpt-subscription/gpt-6-luna",
    reasoning: "low",
  });
  expect(native.categories["visual-engineering"].models[0].model).toBe(
    "anthropic-subscription/claude-opus-5-5",
  );
  expect(engine.retry.fallbackChains["chatgpt-subscription/gpt-6-sol"]).toEqual([
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
  expect(primary(native.categories["deep-high"])).toBe("chatgpt-subscription/gpt-6-sol");
  expect(primary(native.categories.ultrabrain)).toBe("chatgpt-subscription/gpt-6-astra");
  expect(primary(native.agents["plan-consultant"])).toBe("anthropic-subscription/claude-opus-5-5");
  expect(primary(native.agents["plan-reviewer"])).toBe("chatgpt-subscription/gpt-6-astra");
  for (const name of ["explore", "librarian"]) {
    expect(primary(native.agents[name])).toBe("commandcode/deepseek/deepseek-v4.1-flash");
  }
});

test("100-dollar profile conserves Astra and quick-task allowance", async () => {
  const native = await config();
  const pro100 = native.profiles.pro100;
  expect(pro100.model_profile).toBeUndefined();
  expect(pro100.categories.ultrabrain.models[0]).toEqual({
    model: "chatgpt-subscription/gpt-6-sol",
    reasoning: "max",
  });
  expect(pro100.categories.quick.models[0].model).toBe(
    "commandcode/deepseek/deepseek-v4.1-flash",
  );
  expect(pro100.agents["plan-reviewer"].models[0].model).toBe(
    "chatgpt-subscription/gpt-6-sol",
  );
});

test("all configured Command Code models belong to the three-model allowlist", async () => {
  const native = await config();
  const engine = await settings();
  const allowed = new Set([
    "commandcode/deepseek/deepseek-v4.1-flash",
    "commandcode/z-ai/glm-5.3-flash",
    "commandcode/meta/muse-spark-1.3-contributor",
  ]);
  for (const section of [native, native.profiles.pro100]) {
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

test("main fallback stays on Opus 5.5 and preserves other settings", async () => {
  const native = await config();
  const engine = await settings();
  expect(engine.defaultProvider).toBe("chatgpt-subscription");
  expect(engine.defaultModel).toBe("gpt-6-sol");
  expect(engine.defaultThinkingLevel).toBe("medium");
  expect(engine.retry.modelFallback).toBe(true);
  expect(engine.retry.fallbackChains).toEqual({
    "chatgpt-subscription/gpt-6-sol": ["anthropic-subscription/claude-opus-5-5:medium"],
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
