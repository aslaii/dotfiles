import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";

const disabled = [
  "caveman-commit", "caveman-compress", "caveman-help",
  "caveman-review", "caveman-stats", "cavecrew",
];
const paths = [
  new URL("./config.template.toml", import.meta.url),
  process.argv[2] ?? join(homedir(), ".codex/config.toml"),
];
for (const [index, path] of paths.entries()) {
  const config = Bun.TOML.parse(await readFile(path, "utf8"));
  const entries = config.skills?.config ?? [];
  for (const name of disabled) {
    assert(entries.some(entry => entry.name === name && entry.enabled === false), `${path}: ${name} must be disabled`);
  }
  assert(!entries.some(entry => entry.name === "ponytail" && entry.enabled === false));
  if (index === 1) assert.equal(config.plugins?.["ponytail@ponytail"]?.enabled, true);
  console.log(`PASS: ${path}`);
}
