#!/usr/bin/env bun
import { spawn, spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { realpathSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const preload = join(here, "preload.mjs");
const bootstrap = join(here, "bootstrap.mjs");
const REQUIRED = ["claude", "claude-md", "claude-plugins", "agent-plugins", "mcp-json"];

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
const workerHost = join(dirname(pkgRoot), "pi-utils", "src", "worker-host.ts");
if (![srcCli, workerHost, preload, bootstrap].every(existsSync)) {
  console.error("omp/launch: required source entry missing");
  process.exit(127);
}

function agentDir() {
  if (process.env.PI_CODING_AGENT_DIR?.trim()) return process.env.PI_CODING_AGENT_DIR.trim();
  return join(process.env.HOME ?? "", ".omp", "agent");
}

const herdrOwner =
  process.env.HERDR_ENV === "1" &&
  process.env.HERDR_BIN_PATH &&
  process.env.HERDR_SOCKET_PATH &&
  process.env.HERDR_PANE_ID
    ? {
        binPath: process.env.HERDR_BIN_PATH,
        paneId: process.env.HERDR_PANE_ID,
        env: { ...process.env },
      }
    : undefined;
let herdrReleased = false;

function releaseHerdrAgent() {
  if (!herdrOwner || herdrReleased) return;
  herdrReleased = true;
  try {
    spawnSync(
      herdrOwner.binPath,
      ["pane", "release-agent", herdrOwner.paneId, "--source", "custom:omp", "--agent", "omp"],
      { env: herdrOwner.env, stdio: "ignore", timeout: 1000, killSignal: "SIGKILL" },
    );
  } catch {}
}

const dir = agentDir();
const herdrExtension = join(dir, "extensions", "herdr-omp-agent-state.ts");
if (existsSync(herdrExtension)) {
  const source = await Bun.file(herdrExtension).text();
  const patched = source.replace('const source = "herdr:omp";', 'const source = "custom:omp";');
  if (patched !== source) await Bun.write(herdrExtension, patched);
}
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

const args = process.argv.slice(2);
if (process.env.OMP_LAUNCH_DRY_RUN === "1") {
  console.log(`omp-binary: ${srcCli}`);
  console.log(`preload: ${preload}`);
  console.log(`bootstrap: ${bootstrap}`);
  for (const a of args) console.log(`arg: ${a}`);
  process.exit(0);
}

const child = spawn(process.execPath, [bootstrap, ...args], {
  stdio: "inherit",
  env: {
    ...process.env,
    BUN_RUNTIME_TRANSPILER_CACHE_PATH: "0",
    OMP_SOURCE_CLI: srcCli,
    OMP_WORKER_HOST: workerHost,
  },
});
const forwardedSignals = new Map();
for (const [signal, forward] of [["SIGTERM", true], ["SIGHUP", true], ["SIGINT", false]]) {
  const handler = () => {
    if (forward && child.exitCode === null && child.signalCode === null) child.kill(signal);
  };
  forwardedSignals.set(signal, handler);
  process.on(signal, handler);
}
child.on("exit", (code, signal) => {
  releaseHerdrAgent();
  for (const [name, handler] of forwardedSignals) process.off(name, handler);
  if (signal) process.kill(process.pid, signal);
  else process.exit(code ?? 1);
});
child.on("error", (err) => {
  console.error(`omp/launch: spawn failed (${err.message})`);
  process.exit(127);
});
