import { expect, test } from "bun:test";
import { readFile } from "node:fs/promises";

test("fast profile keeps routes and reasoning, with GPT immediately after Claude", async () => {
  const config = Bun.JSONC.parse(await readFile(new URL("./omo.jsonc", import.meta.url), "utf8"));
  const base = config["[senpi]"];
  const fast = config.profiles.fast?.["[senpi]"];
  expect(fast).toBeDefined();
  expect(fast.models).toEqual(base.models);
  expect(fast.task.default_concurrency).toBe(8);
  expect(fast.task.global_concurrency).toBe(8);
  expect(fast.task.residency_max_children).toBe(8);
  expect(fast.task.team.max_members).toBe(8);
  expect(fast.task.team.max_parallel_members).toBe(8);
  for (const group of ["categories", "agents"]) {
    expect(Object.keys(fast[group])).toEqual(Object.keys(base[group]));
    for (const [name, route] of Object.entries(base[group])) {
      const models = fast[group][name].models;
      expect(models[0]).toEqual(route.models[0]);
      expect(models.filter((entry) => entry.model.startsWith("opencode"))).toEqual(
        route.models.filter((entry) => entry.model.startsWith("opencode")),
      );
      for (const entry of route.models) expect(models).toContainEqual(entry);
      for (let i = 0; i < models.length; i++) {
        if (models[i].model.startsWith("anthropic/")) {
          expect(models[i + 1]?.model.startsWith("openai-codex/")).toBe(true);
        }
      }
    }
  }
});

test("planning roles use Astra at maximum reasoning in every profile", async () => {
  const config = Bun.JSONC.parse(
    await readFile(new URL("./omo.jsonc", import.meta.url), "utf8"),
  );
  const sections = [
    config["[senpi]"],
    ...Object.values(config.profiles).map((profile) => profile["[senpi]"]),
  ];
  for (const section of sections) {
    for (const role of ["planner", "prometheus", "atlas"]) {
      expect(section.models[role]).toEqual({
        model: "openai-codex/gpt-6-astra",
        reasoning: "max",
      });
    }
    expect(section.agents.metis.models[0]).toEqual({
      model: "openai-codex/gpt-6-astra",
      reasoning: "max",
    });
  }
});

test("main uses medium while Muse replaces Terra and Luna throughout routing", async () => {
  const config = Bun.JSONC.parse(
    await readFile(new URL("./omo.jsonc", import.meta.url), "utf8"),
  );
  const settings = JSON.parse(
    await readFile(new URL("./agent/settings.json", import.meta.url), "utf8"),
  );
  const muse = "opencode/muse-spark-1.3-contributor-free";
  for (const section of [
    config["[senpi]"],
    ...Object.values(config.profiles).map((profile) => profile["[senpi]"]),
  ]) {
    expect(section.models.sisyphus).toEqual({
      model: "openai-codex/gpt-6-astra",
      reasoning: "medium",
    });
  }
  expect(config["[senpi]"].categories.deep.models[0]).toEqual({
    model: muse,
    reasoning: "xhigh",
  });
  expect(settings.defaultThinkingLevel).toBe("medium");
  expect(settings.modelThinkingLevels["openai-codex/gpt-6-astra"]).toBe("medium");
  expect(settings.modelThinkingLevels[muse]).toBe("xhigh");
  expect(settings.enabledModels).toContain(muse);
  expect(settings.enabledModels).toContain("opencode-go/glm-5.3");
  expect(settings.modelThinkingLevels["opencode-go/glm-5.3"]).toBe("max");
  expect(JSON.stringify({ config, settings })).not.toMatch(/gpt-5\.6-(terra|luna)/);
  for (const [primary, fallbacks] of Object.entries(settings.retry.fallbackChains)) {
    const models = fallbacks.map((entry) => entry.replace(/:[^:]+$/, ""));
    expect(models).not.toContain(primary);
    expect(new Set(models).size).toBe(models.length);
  }
});
