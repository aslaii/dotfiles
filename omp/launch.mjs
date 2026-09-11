#!/usr/bin/env bun
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { realpathSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const preload = join(here, "preload.mjs");
const REQUIRED = ["claude", "claude-md", "claude-plugins", "agent-plugins", "mcp-json"];
const argentVersion = (await Bun.file(join(here, "..", "argent", "version")).text()).trim();

const ompBin = Bun.which("omp");
if (!ompBin) {
  console.error("omp/launch: omp not found on PATH");
  process.exit(127);
}
const real = realpathSync(ompBin);
if (!real.endsWith("/dist/cli.js")) {
  console.error(`omp/launch: unexpected omp layout: ${real}`);
  process.exit(127);
}
const pkgRoot = dirname(dirname(real));
const srcCli = join(pkgRoot, "src", "cli.ts");
if (!existsSync(srcCli) || !existsSync(preload)) {
  console.error("omp/launch: required source entry missing (src/cli.ts or preload.mjs)");
  process.exit(127);
}

const argentBin = Bun.which("argent");
if (!argentBin) {
  console.error(`omp/launch: Argent ${argentVersion} not found; run: ${join(here, "..", "argent", "install.sh")}`);
  process.exit(127);
}
const argentRoot = dirname(dirname(realpathSync(argentBin)));
let argentManifest;
try {
  argentManifest = JSON.parse(await Bun.file(join(argentRoot, "package.json")).text());
} catch {
  console.error(`omp/launch: invalid Argent package at ${argentRoot}`);
  process.exit(127);
}
if (argentManifest.name !== "@swmansion/argent" || argentManifest.version !== argentVersion) {
  console.error(`omp/launch: expected Argent ${argentVersion}; run: ${join(here, "..", "argent", "install.sh")}`);
  process.exit(127);
}

function agentDir() {
  if (process.env.PI_CODING_AGENT_DIR?.trim()) return process.env.PI_CODING_AGENT_DIR.trim();
  return join(process.env.HOME ?? "", ".omp", "agent");
}

const dir = agentDir();
const cfgPath = join(dir, "config.yml");
if (!existsSync(cfgPath)) {
  console.error(`omp/launch: missing global config: ${cfgPath}`);
  process.exit(127);
}
const data = Bun.YAML.parse(await Bun.file(cfgPath).text());
if (!Array.isArray(data?.disabledProviders)) {
  console.error(`omp/launch: disabledProviders missing in ${cfgPath}`);
  process.exit(127);
}
const missing = REQUIRED.filter((id) => !data.disabledProviders.includes(id));
if (missing.length) {
  console.error(`omp/launch: ${cfgPath} disabledProviders missing ${missing.join(", ")}`);
  process.exit(127);
}

const userArgs = process.argv.slice(2);
if (process.env.OMP_LAUNCH_DRY_RUN === "1") {
  console.log(`omp-binary: ${srcCli}`);
  console.log(`preload: ${preload}`);
  console.log(`extension: ${argentRoot}`);
  for (const a of userArgs) console.log(`arg: ${a}`);
  process.exit(0);
}

const child = spawn(process.execPath, ["--preload", preload, srcCli, ...userArgs], {
  stdio: "inherit",
  env: { ...process.env, OMP_ARGENT_ROOT: argentRoot },
});
child.on("exit", (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  else process.exit(code ?? 1);
});
child.on("error", (err) => {
  console.error(`omp/launch: spawn failed (${err.message})`);
  process.exit(127);
});
