import { expect, test } from "bun:test";
import { readFile } from "node:fs/promises";

test("default and all profiles allow eight concurrent children", async () => {
  const config = Bun.JSONC.parse(await readFile(new URL("./omo.jsonc", import.meta.url), "utf8"));
  for (const profile of [{}, ...Object.values(config.profiles)]) {
    const task = { ...config["[senpi]"].task, ...profile["[senpi]"]?.task };
    expect(task.default_concurrency).toBe(8);
    expect(task.global_concurrency).toBe(8);
    expect(task.residency_max_children).toBe(8);
    expect(task.team.max_parallel_members).toBe(8);
  }
});

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
  }
});

// Append the sole free model (Muse) as the ultimate fallback to any route whose
// last entry is not already Muse. Muse may legitimately repeat (once as an
// earlier rung, once as the terminal free safety net); every other model must
// stay unique within a chain.
function withFreeTail(muse, models) {
  const last = models[models.length - 1];
  if (last.model === muse && last.reasoning === "xhigh") return models;
  return [...models, { model: muse, reasoning: "xhigh" }];
}

test("exact native routing matches requested order in base and every profile", async () => {
  const config = Bun.JSONC.parse(
    await readFile(new URL("./omo.jsonc", import.meta.url), "utf8"),
  );
  const astra = "openai-codex/gpt-6-astra";
  const sol = "openai-codex/gpt-5.6-sol";
  const terra = "openai-codex/gpt-5.6-terra";
  const luna = "openai-codex/gpt-5.6-luna-fast";
  const sonnet = "claude-sdk-oauth/claude-sonnet-5";
  const haiku = "claude-sdk-oauth/claude-haiku-4-5";
  const muse = "opencode/muse-spark-1.3-contributor-free";
  const expectedCategories = {
    ultrabrain: withFreeTail(muse, [
      { model: astra, reasoning: "max" },
      { model: sol, reasoning: "max" },
    ]),
    deep: withFreeTail(muse, [
      { model: astra, reasoning: "high" },
      { model: sol, reasoning: "medium" },
    ]),
    "unspecified-high": withFreeTail(muse, [
      { model: astra, reasoning: "high" },
      { model: sonnet, reasoning: "high" },
      { model: muse, reasoning: "xhigh" },
      { model: sol, reasoning: "high" },
    ]),
    quick: withFreeTail(muse, [
      { model: haiku, reasoning: "low" },
      { model: muse, reasoning: "xhigh" },
      { model: luna, reasoning: "low" },
    ]),
    git: withFreeTail(muse, [
      { model: haiku, reasoning: "low" },
      { model: muse, reasoning: "xhigh" },
      { model: luna, reasoning: "low" },
    ]),
    writing: withFreeTail(muse, [
      { model: sonnet, reasoning: "medium" },
      { model: muse, reasoning: "xhigh" },
      { model: terra, reasoning: "medium" },
    ]),
    artistry: withFreeTail(muse, [
      { model: sonnet, reasoning: "medium" },
      { model: muse, reasoning: "xhigh" },
      { model: terra, reasoning: "medium" },
    ]),
    "visual-engineering": withFreeTail(muse, [
      { model: sonnet, reasoning: "medium" },
      { model: muse, reasoning: "xhigh" },
      { model: terra, reasoning: "medium" },
    ]),
    "unspecified-low": withFreeTail(muse, [
      { model: sonnet, reasoning: "medium" },
      { model: muse, reasoning: "xhigh" },
      { model: terra, reasoning: "medium" },
    ]),
    architect: withFreeTail(muse, [
      { model: sonnet, reasoning: "high" },
      { model: muse, reasoning: "xhigh" },
      { model: sol, reasoning: "high" },
    ]),
  };
  const expectedAgents = {
    momus: withFreeTail(muse, [
      { model: astra, reasoning: "xhigh" },
      { model: sol, reasoning: "xhigh" },
    ]),
    oracle: withFreeTail(muse, [
      { model: sol, reasoning: "xhigh" },
      { model: sonnet, reasoning: "high" },
      { model: muse, reasoning: "xhigh" },
    ]),
    explore: withFreeTail(muse, [
      { model: haiku, reasoning: "low" },
      { model: muse, reasoning: "xhigh" },
      { model: luna, reasoning: "low" },
    ]),
    librarian: withFreeTail(muse, [
      { model: haiku, reasoning: "low" },
      { model: muse, reasoning: "xhigh" },
      { model: luna, reasoning: "low" },
    ]),
    "multimodal-looker": withFreeTail(muse, [
      { model: sonnet, reasoning: "medium" },
      { model: muse, reasoning: "xhigh" },
      { model: terra, reasoning: "medium" },
    ]),
    metis: withFreeTail(muse, [
      { model: sonnet, reasoning: "high" },
      { model: muse, reasoning: "xhigh" },
      { model: sol, reasoning: "high" },
    ]),
  };
  for (const section of [
    config["[senpi]"],
    ...Object.values(config.profiles).map((profile) => profile["[senpi]"]),
  ]) {
    expect(section.models.sisyphus).toEqual({ model: astra, reasoning: "medium" });
    for (const [name, models] of Object.entries(expectedCategories)) {
      expect(section.categories[name].models).toEqual(models);
    }
    for (const [name, models] of Object.entries(expectedAgents)) {
      expect(section.agents[name].models).toEqual(models);
    }
  }
});

test("every category and agent chain ends in the sole free model as ultimate fallback", async () => {
  const config = Bun.JSONC.parse(
    await readFile(new URL("./omo.jsonc", import.meta.url), "utf8"),
  );
  const muse = "opencode/muse-spark-1.3-contributor-free";
  for (const section of [
    config["[senpi]"],
    ...Object.values(config.profiles).map((profile) => profile["[senpi]"]),
  ]) {
    for (const group of ["categories", "agents"]) {
      for (const [name, route] of Object.entries(section[group])) {
        const models = route.models;
        const last = models[models.length - 1];
        expect(last).toEqual({ model: muse, reasoning: "xhigh" });
      }
    }
  }
});

test("approved fallback policy is uniform across base and profile routes", async () => {
  const config = Bun.JSONC.parse(
    await readFile(new URL("./omo.jsonc", import.meta.url), "utf8"),
  );
  const settings = JSON.parse(
    await readFile(new URL("./agent/settings.json", import.meta.url), "utf8"),
  );
  const muse = "opencode/muse-spark-1.3-contributor-free";
  const haiku = "claude-sdk-oauth/claude-haiku-4-5";
  const sonnet = "claude-sdk-oauth/claude-sonnet-5";
  const luna = "openai-codex/gpt-5.6-luna-fast";
  const terra = "openai-codex/gpt-5.6-terra";
  const sol = "openai-codex/gpt-5.6-sol";
  const astra = "openai-codex/gpt-6-astra";
  const quickLow = withFreeTail(muse, [
    { model: haiku, reasoning: "low" },
    { model: muse, reasoning: "xhigh" },
    { model: luna, reasoning: "low" },
  ]);
  const lowMedium = withFreeTail(muse, [
    { model: sonnet, reasoning: "medium" },
    { model: muse, reasoning: "xhigh" },
    { model: terra, reasoning: "medium" },
  ]);
  const highTrio = withFreeTail(muse, [
    { model: sonnet, reasoning: "high" },
    { model: muse, reasoning: "xhigh" },
    { model: sol, reasoning: "high" },
  ]);
  for (const section of [
    config["[senpi]"],
    ...Object.values(config.profiles).map((profile) => profile["[senpi]"]),
  ]) {
    expect(section.models.sisyphus).toEqual({
      model: "openai-codex/gpt-6-astra",
      reasoning: "medium",
    });
    for (const category of ["quick", "git"]) {
      expect(section.categories[category].models).toEqual(quickLow);
    }
    for (const category of ["unspecified-low", "artistry", "writing", "visual-engineering"]) {
      expect(section.categories[category].models).toEqual(lowMedium);
    }
    expect(section.categories["unspecified-high"].models).toEqual(withFreeTail(muse, [
      { model: astra, reasoning: "high" },
      { model: sonnet, reasoning: "high" },
      { model: muse, reasoning: "xhigh" },
      { model: sol, reasoning: "high" },
    ]));
    expect(section.categories.architect.models).toEqual(highTrio);
    expect(section.categories.deep.models).toEqual(withFreeTail(muse, [
      { model: astra, reasoning: "high" },
      { model: sol, reasoning: "medium" },
    ]));
    expect(section.categories.ultrabrain.models).toEqual(withFreeTail(muse, [
      { model: astra, reasoning: "max" },
      { model: sol, reasoning: "max" },
    ]));
    for (const agent of ["explore", "librarian"]) {
      expect(section.agents[agent].models).toEqual(quickLow);
    }
    expect(section.agents.oracle.models).toEqual(withFreeTail(muse, [
      { model: sol, reasoning: "xhigh" },
      { model: sonnet, reasoning: "high" },
      { model: muse, reasoning: "xhigh" },
    ]));
    expect(section.agents.momus.models).toEqual(withFreeTail(muse, [
      { model: astra, reasoning: "xhigh" },
      { model: sol, reasoning: "xhigh" },
    ]));
    expect(section.agents.metis.models).toEqual(highTrio);
    expect(section.agents["multimodal-looker"].models).toEqual(lowMedium);
    expect(section.models.hephaestus).toEqual({ model: muse, reasoning: "xhigh" });
  }
  expect(settings.defaultThinkingLevel).toBe("medium");
  expect(settings.modelThinkingLevels["openai-codex/gpt-6-astra"]).toBe("medium");
  expect(settings.modelThinkingLevels[muse]).toBe("xhigh");
  expect(settings.claudeSdkOauthProvider.enabled).toBe(true);
  for (const model of [muse, haiku, sonnet, luna, terra, sol]) {
    expect(settings.enabledModels).toContain(model);
  }
  expect(settings.enabledModels).toContain("opencode-go/glm-5.3");
  expect(settings.modelThinkingLevels["opencode-go/glm-5.3"]).toBe("max");
  expect(settings.modelServiceTiers).toMatchObject({
    [luna]: "priority",
    [sol]: "auto",
    "openai-codex/gpt-6-astra": "auto",
  });
  expect(settings.retry.fallbackRevertPolicy).toBe("cooldown-expiry");
  expect(settings.retry.fallbackChains["openai-codex/gpt-6-astra"]).toEqual([
    `${muse}:xhigh`,
    `${sonnet}:medium`,
    `${muse}:xhigh`,
  ]);
  expect(settings.retry.fallbackChains[muse]).toEqual([
    `${sonnet}:medium`,
    `${terra}:medium`,
  ]);
  expect(settings.retry.fallbackChains[haiku]).toEqual([`${luna}:low`, `${muse}:xhigh`]);
  expect(settings.retry.fallbackChains[sonnet]).toEqual([
    `${terra}:high`,
    `${sol}:high`,
    `${muse}:xhigh`,
  ]);
  expect(settings.retry.fallbackChains[terra]).toEqual([`${sol}:high`, `${muse}:xhigh`]);
  expect(JSON.stringify({ config, settings })).not.toContain('"anthropic/');
  for (const [primary, fallbacks] of Object.entries(settings.retry.fallbackChains)) {
    const models = fallbacks.map((entry) => entry.replace(/:[^:]+$/, ""));
    // The sole free model (Muse) may legitimately repeat as both an earlier
    // rung and the terminal ultimate fallback; every other model stays unique.
    const nonFreeModels = models.filter((model) => model !== muse);
    expect(models).not.toContain(primary === muse ? "__never__" : primary);
    expect(new Set(nonFreeModels).size).toBe(nonFreeModels.length);
  }
});

test("every fallback chain ends in the sole free model as ultimate fallback", async () => {
  const settings = JSON.parse(
    await readFile(new URL("./agent/settings.json", import.meta.url), "utf8"),
  );
  const muse = "opencode/muse-spark-1.3-contributor-free";
  for (const [primary, fallbacks] of Object.entries(settings.retry.fallbackChains)) {
    if (primary === muse) continue;
    expect(fallbacks[fallbacks.length - 1]).toBe(`${muse}:xhigh`);
  }
});

test("git attribution stays disabled at the shared top level", async () => {
  const config = Bun.JSONC.parse(await readFile(new URL("./omo.jsonc", import.meta.url), "utf8"));
  expect(config.git_master).toEqual({ commit_footer: false, include_co_authored_by: false });
});
