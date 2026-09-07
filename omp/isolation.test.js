import { afterEach, expect, test } from "bun:test"
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises"
import { realpathSync } from "node:fs"
import { tmpdir } from "node:os"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

const launch = fileURLToPath(new URL("./launch.mjs", import.meta.url))
const preload = fileURLToPath(new URL("./preload.mjs", import.meta.url))
const trackedConfig = fileURLToPath(new URL("./agent/config.yml", import.meta.url))
const cleanup = []

afterEach(async () => {
  await Promise.all(cleanup.splice(0).map((p) => rm(p, { recursive: true, force: true })))
})

async function write(path, contents) {
  await mkdir(dirname(path), { recursive: true })
  await writeFile(path, contents)
}

async function freshRoot(prefix) {
  const r = await mkdtemp(join(tmpdir(), prefix))
  cleanup.push(r)
  return r
}

function ompPkgRoot() {
  const which = Bun.which("omp")
  if (!which) throw new Error("omp not found on PATH")
  const real = realpathSync(which)
  if (!real.endsWith("/dist/cli.js")) throw new Error(`unexpected omp layout: ${real}`)
  return dirname(dirname(real))
}

async function readDisabled(path) {
  const text = await readFile(path, "utf8")
  const data = Bun.YAML.parse(text)
  if (!Array.isArray(data?.disabledProviders)) throw new Error(`disabledProviders missing in ${path}`)
  return data.disabledProviders
}

test("tracked and live configs block claude-md plus claude providers", async () => {
  const live = join(process.env.HOME || "", ".omp/agent/config.yml")
  for (const p of [trackedConfig, live]) {
    const list = await readDisabled(p)
    for (const id of ["claude", "claude-md", "claude-plugins", "agent-plugins", "mcp-json"]) {
      expect(list).toContain(id)
    }
    expect(list).not.toContain("native")
    expect(list).not.toContain("omp-plugins")
  }
})

async function makeSentinel() {
  const root = await freshRoot("omp isolation ")
  const home = join(root, "home")
  const agentDir = join(root, "agent")
  const project = join(root, "proj")
  const denylist = [
    "agent-plugins", "agents-md", "agents", "claude", "claude-md", "claude-plugins",
    "cline", "codex", "cursor", "gemini", "github", "mcp-json", "opencode", "ssh-json", "vscode", "windsurf",
  ]
  await write(join(agentDir, "config.yml"), `disabledProviders:\n${denylist.map((d) => `  - ${d}`).join("\n")}\n`)
  await write(join(agentDir, "skills", "own-prompt", "SKILL.md"), `---\nname: own-prompt\ndescription: own omp prompt sentinel\n---\n\n# own\n`)
  await write(join(project, ".claude", "skills", "fake-claude-skill", "SKILL.md"), `---\nname: fake-claude-skill\ndescription: fake claude sentinel skill\n---\n\n# fake\n`)
  await write(join(project, ".claude", ".mcp.json"), JSON.stringify({ mcpServers: { "fake-claude-mcp": { command: "false", args: [] } } }))
  await write(join(project, "CLAUDE.md"), "# fake claude root sentinel\n")
  await write(join(project, ".claude", "settings.json"), JSON.stringify({ fakeClaudeSentinel: { marker: true } }))
  return { root, home, agentDir, project }
}

async function spawnPreloadDriver({ home, agentDir, project, file }) {
  const child = Bun.spawn([process.execPath, "--preload", preload, file], {
    env: { ...process.env, HOME: home, PI_CODING_AGENT_DIR: agentDir },
    cwd: project,
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

test("source driver under preload spawn path blocks Claude sentinels including settings", async () => {
  const { home, agentDir, project } = await makeSentinel()
  const root = ompPkgRoot()
  const driver = join(project, "driver.mjs")
  await write(driver, `
import { Settings } from ${JSON.stringify("file://" + join(root, "src/config/settings.ts"))};
import * as disc from ${JSON.stringify("file://" + join(root, "src/discovery/index.ts"))};
const s = await Settings.loadReadOnly({ cwd: ${JSON.stringify(project)}, agentDir: ${JSON.stringify(agentDir)} });
disc.initializeWithSettings(s);
const out = {};
for (const cap of ["skills", "context-files", "mcps"]) {
  const r = await disc.loadCapability(cap, { cwd: ${JSON.stringify(project)} });
  out[cap] = r.items.map((x) => ({ name: x.name, provider: x._source?.provider }));
}
let ps = {};
try { ps = s.getProjectSettings(); } catch {}
console.log(JSON.stringify({ out, hasSettingsSentinel: ps?.fakeClaudeSentinel !== undefined }));
`)
  const { stdout, stderr, exitCode } = await spawnPreloadDriver({ home, agentDir, project, file: driver })
  if (exitCode !== 0) throw new Error(`driver failed: ${stdout}${stderr}`)
  const { out, hasSettingsSentinel } = JSON.parse(stdout)
  expect(out.skills.map((x) => x.name)).toContain("own-prompt")
  expect(out.skills.map((x) => x.name)).not.toContain("fake-claude-skill")
  expect(out.skills.every((x) => x.provider !== "claude" && x.provider !== "claude-plugins")).toBe(true)
  expect(out.mcps.map((x) => x.name)).not.toContain("fake-claude-mcp")
  expect(hasSettingsSentinel).toBe(false)
}, 30000)

test("real launcher --version from sentinel settings project shares preload module (no model)", async () => {
  const { home, agentDir, project } = await makeSentinel()
  const child = Bun.spawn([process.execPath, launch, "--version"], {
    env: { ...process.env, HOME: home, PI_CODING_AGENT_DIR: agentDir },
    cwd: project,
    stdout: "pipe",
    stderr: "pipe",
  })
  const [stdout, stderr, exitCode] = await Promise.all([
    new Response(child.stdout).text(),
    new Response(child.stderr).text(),
    child.exited,
  ])
  expect(exitCode).toBe(0)
  expect(stderr).toBe("")
  expect(stdout).toMatch(/omp\/\d+\.\d+\.\d+/)
}, 30000)

test("real launcher plugin list keeps Ponytail without model call", async () => {
  const child = Bun.spawn([process.execPath, launch, "plugin", "list"], {
    env: { ...process.env },
    stdout: "pipe",
    stderr: "pipe",
  })
  const [stdout, , exitCode] = await Promise.all([
    new Response(child.stdout).text(),
    new Response(child.stderr).text(),
    child.exited,
  ])
  expect(exitCode).toBe(0)
  expect(stdout).toContain("ponytail")
}, 30000)

test("launcher fails closed when denylist is missing required ids", async () => {
  const root = await freshRoot("omp isolation ")
  const agentDir = join(root, "agent")
  await write(join(agentDir, "config.yml"), "disabledProviders:\n  - claude\n")
  const child = Bun.spawn([process.execPath, launch, "--version"], {
    env: { ...process.env, PI_CODING_AGENT_DIR: agentDir },
    stdout: "pipe",
    stderr: "pipe",
  })
  const [stdout, stderr, exitCode] = await Promise.all([
    new Response(child.stdout).text(),
    new Response(child.stderr).text(),
    child.exited,
  ])
  expect(exitCode).not.toBe(0)
  expect(stderr).toContain("disabledProviders missing")
  expect(stdout).not.toMatch(/omp\/\d+/)
})
