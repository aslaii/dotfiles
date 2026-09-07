import { expect, test } from "bun:test";
import { readFile } from "node:fs/promises";

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
        reasoning: "xhigh",
      });
    }
    expect(section.agents.metis.models[0]).toEqual({
      model: "openai-codex/gpt-6-astra",
      reasoning: "xhigh",
    });
  }
});
