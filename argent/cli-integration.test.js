import { afterEach, expect, test } from "bun:test"
import { chmod, mkdir, mkdtemp, readFile, realpath, rm, symlink, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

const root = fileURLToPath(new URL("../", import.meta.url))
const install = join(root, "argent", "install.sh")
const omoLaunch = join(root, "omo", "launch.sh")
const ompLaunch = join(root, "omp", "launch.mjs")
const nodeDir = dirname(Bun.which("node"))
const cleanup = []

afterEach(async () => {
  await Promise.all(cleanup.splice(0).map((path) => rm(path, { recursive: true, force: true })))
})

async function write(path, contents, mode) {
  await mkdir(dirname(path), { recursive: true })
  await writeFile(path, contents)
  if (mode !== undefined) await chmod(path, mode)
}

async function freshRoot() {
  const path = await mkdtemp(join(tmpdir(), "argent cli integration "))
  cleanup.push(path)
  return path
}

async function run(command, args, options = {}) {
  const child = Bun.spawn([command, ...args], {
    cwd: options.cwd ?? root,
    env: options.env ?? process.env,
    stdout: "pipe",
    stderr: "pipe",
  })
  const [stdout, stderr, exitCode] = await Promise.all([
    new Response(child.stdout).text(),
    new Response(child.stderr).text(),
    child.exited,
  ])
  return { stdout, stderr, exitCode }
}

test("shared installer pins Argent and disables telemetry without configuring MCP", async () => {
  const fixture = await freshRoot()
  const bin = join(fixture, "bin")
  const calls = join(fixture, "calls")
  const versionState = join(fixture, "version")
  const home = join(fixture, "home")
  const omoMcp = join(home, ".omo", "agent", "mcp.json")
  const ompMcp = join(home, ".omp", "agent", "mcp.json")
  await write(join(bin, "npm"), `#!/bin/sh
printf 'npm %s\\n' "$*" >>"$FAKE_CALLS"
if [ "$1" = "install" ]; then printf '%s\\n' "$EXPECTED_VERSION" >"$FAKE_VERSION_STATE"; fi
`, 0o755)
  await write(join(bin, "argent"), `#!/bin/sh
if [ "$1" = "--version" ]; then
  if [ -f "$FAKE_VERSION_STATE" ]; then cat "$FAKE_VERSION_STATE"; else printf '0.0.0\\n'; fi
  exit 0
fi
printf 'argent %s\\n' "$*" >>"$FAKE_CALLS"
`, 0o755)
  await write(omoMcp, JSON.stringify({ mcpServers: { argent: { command: "argent", args: ["mcp"] } } }))
  await write(ompMcp, JSON.stringify({
    mcpServers: {
      argent: { command: "argent", args: ["mcp"] },
      foreign: { command: "foreign", args: [] },
    },
  }))

  const env = {
    ...process.env,
    HOME: home,
    PATH: `${bin}:${nodeDir}:/usr/bin:/bin`,
    FAKE_CALLS: calls,
    FAKE_VERSION_STATE: versionState,
    EXPECTED_VERSION: "0.25.0",
  }
  const first = await run("bash", [install], { env })
  expect(first.exitCode, first.stderr).toBe(0)
  const second = await run("bash", [install], { env })
  expect(second.exitCode, second.stderr).toBe(0)

  const recorded = await readFile(calls, "utf8")
  expect(recorded.match(/npm install -g @swmansion\/argent@0\.25\.0/g)).toHaveLength(1)
  expect(recorded.match(/argent telemetry disable/g)).toHaveLength(2)
  expect(recorded).not.toContain("argent init")
  expect(recorded).not.toContain("argent mcp")
  expect(await readFile(omoMcp, "utf8").catch(() => undefined)).toBeUndefined()
  expect(JSON.parse(await readFile(ompMcp, "utf8")).mcpServers).toEqual({
    foreign: { command: "foreign", args: [] },
  })
})

test("OMO launcher loads pinned Argent skills and CLI transport rule", async () => {
  const fixture = await freshRoot()
  const home = join(fixture, "home")
  const agentDir = join(home, ".omo", "agent")
  const npmRoot = join(fixture, "npm")
  const bin = join(fixture, "bin")
  const omo = join(npmRoot, "omo-ai")
  const argent = join(npmRoot, "@swmansion", "argent")
  await write(join(bin, "npm"), `#!/bin/sh
if [ "$1" = "root" ] && [ "$2" = "-g" ]; then printf '%s\\n' "$FAKE_NPM_ROOT"; exit 0; fi
exit 1
`, 0o755)
  await write(join(omo, "bin", "omo.js"), "#!/usr/bin/env node\n", 0o755)
  await write(join(omo, "plugin", "skills", "bundled", "SKILL.md"), "---\nname: bundled\ndescription: fixture\n---\n")
  await write(join(argent, "package.json"), JSON.stringify({ name: "@swmansion/argent", version: "0.25.0" }))
  await write(join(argent, "dist", "cli.js"), "#!/bin/sh\n[ \"$1\" = \"--version\" ] && printf '0.25.0\\n'\n", 0o755)
  await symlink(join(argent, "dist", "cli.js"), join(bin, "argent"))
  await write(join(argent, "skills", "argent-device-interact", "SKILL.md"), "---\nname: argent-device-interact\ndescription: fixture\n---\n")
  await write(join(agentDir, "settings.json"), JSON.stringify({ packages: [] }))
  await write(join(agentDir, "rules", "argent.md"), "# upstream rule\n")
  await write(join(agentDir, "rules", "argent-cli.md"), "# CLI-only transport\n")

  const result = await run("bash", [omoLaunch], {
    env: {
      ...process.env,
      HOME: home,
      OMO_CODING_AGENT_DIR: agentDir,
      OMO_LAUNCH_DRY_RUN: "1",
      FAKE_NPM_ROOT: npmRoot,
      PATH: `${bin}:${nodeDir}:/usr/bin:/bin`,
    },
  })
  expect(result.exitCode, result.stderr).toBe(0)
  expect(result.stdout).toContain(`arg: ${join(argent, "skills", "argent-device-interact")}`)
  expect(result.stdout).toContain(`arg: ${join(agentDir, "rules", "argent.md")}`)
  expect(result.stdout).toContain(`arg: ${join(agentDir, "rules", "argent-cli.md")}`)
})

test("OMP launcher exposes the pinned Argent package as a CLI-only extension root", async () => {
  const fixture = await freshRoot()
  const home = join(fixture, "home")
  const agentDir = join(home, ".omp", "agent")
  const bin = join(fixture, "bin")
  const omp = join(fixture, "omp-package")
  const argent = join(fixture, "@swmansion", "argent")
  const required = ["claude", "claude-md", "claude-plugins", "agent-plugins", "mcp-json"]
  await mkdir(bin, { recursive: true })
  await write(join(omp, "dist", "cli.js"), "#!/usr/bin/env bun\n", 0o755)
  await write(join(omp, "src", "cli.ts"), "")
  await symlink(join(omp, "dist", "cli.js"), join(bin, "omp"))
  await write(join(argent, "package.json"), JSON.stringify({ name: "@swmansion/argent", version: "0.25.0" }))
  await write(join(argent, "dist", "cli.js"), "#!/bin/sh\n[ \"$1\" = \"--version\" ] && printf '0.25.0\\n'\n", 0o755)
  await symlink(join(argent, "dist", "cli.js"), join(bin, "argent"))
  await write(join(agentDir, "config.yml"), `disabledProviders:\n${required.map((name) => `  - ${name}`).join("\n")}\n`)

  const result = await run(process.execPath, [ompLaunch], {
    env: {
      ...process.env,
      HOME: home,
      PI_CODING_AGENT_DIR: agentDir,
      OMP_LAUNCH_DRY_RUN: "1",
      PATH: `${bin}:/usr/bin:/bin`,
    },
  })
  expect(result.exitCode, result.stderr).toBe(0)
  expect(result.stdout).toContain(`extension: ${await realpath(argent)}`)
  expect(result.stdout).not.toContain("argent mcp")
})

test("both harnesses carry an explicit CLI-only transport override", async () => {
  for (const path of [
    join(root, "omo", "rules", "argent-cli.md"),
    join(root, "omp", "agent", "rules", "argent-cli.md"),
  ]) {
    const rule = await readFile(path, "utf8")
    expect(rule).toContain("CLI-only")
    expect(rule).toContain("argent run")
    expect(rule).toContain("argent tools describe")
    expect(rule).toContain("does not register an MCP server")
  }
})
