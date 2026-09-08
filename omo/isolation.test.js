import { afterEach, expect, test } from "bun:test"
import { cp, mkdir, mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { basename, dirname, join, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const launch = fileURLToPath(new URL("./launch.sh", import.meta.url))
const cleanup = []
const ponytailNames = [
  "ponytail",
  "ponytail-audit",
  "ponytail-debt",
  "ponytail-gain",
  "ponytail-help",
  "ponytail-review",
]

afterEach(async () => {
  await Promise.all(cleanup.splice(0).map((path) => rm(path, { recursive: true, force: true })))
})

async function write(path, contents) {
  await mkdir(dirname(path), { recursive: true })
  await writeFile(path, contents)
}

async function skill(path, name) {
  await write(join(path, "SKILL.md"), `---\nname: ${name}\ndescription: sentinel ${name}\n---\n\n# ${name}\n`)
}

function cleanEnv() {
  const env = { ...process.env }
  delete env.OMO_CODING_AGENT_DIR
  delete env.SENPI_CODING_AGENT_DIR
  delete env.PI_CODING_AGENT_DIR
  return env
}

async function npmRoot() {
  const child = Bun.spawn(["npm", "root", "-g"], { stdout: "pipe", stderr: "pipe" })
  const [stdout, stderr, exitCode] = await Promise.all([
    new Response(child.stdout).text(),
    new Response(child.stderr).text(),
    child.exited,
  ])
  if (exitCode !== 0 || !stdout.trim()) throw new Error(`npm root -g failed: ${stderr}`)
  return stdout.trim()
}

async function dryRun({ home, agentDir, bundled, args = [], cwd }) {
  const child = Bun.spawn(["bash", launch, ...args], {
    cwd: cwd ?? process.cwd(),
    env: {
      ...cleanEnv(),
      HOME: home,
      OMO_CODING_AGENT_DIR: agentDir,
      OMO_BUNDLED_SKILLS_DIR: bundled,
      OMO_LAUNCH_DRY_RUN: "1",
    },
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

function argv(stdout) {
  return stdout.split("\n").filter((line) => line.startsWith("arg: ")).map((line) => line.slice(5))
}

function explicitSkills(args) {
  const paths = []
  for (let index = 0; index < args.length; index++) {
    if (args[index] === "--skill") paths.push(args[++index])
  }
  return paths
}

async function freshRoot() {
  const root = await mkdtemp(join(tmpdir(), "omo isolation "))
  cleanup.push(root)
  return root
}

async function loadProductionSettings(home) {
  const source = await readFile(new URL("./agent/settings.json", import.meta.url), "utf8")
  return JSON.parse(source.replaceAll("__OMO_HOME__", home))
}

test("production manifest selects only native OMO and filtered Ponytail resources", async () => {
  const settings = await loadProductionSettings("/fixture-home")
  expect(settings.skills).toEqual([
    "!/fixture-home/.agents/skills/**",
    "!/fixture-home/.claude/skills/**",
    "!caveman-*",
    "!cavecrew",
  ])
  expect(settings.packages).toContainEqual({
    source: "npm:@dietrichgebert/ponytail@4.9.0",
    skills: ["!caveman-*", "!cavecrew"],
  })
  expect(settings.packages).toContainEqual({
    source: "git:github.com/code-yeongyu/pi-comment-checker@0a38dd8ff362be1b6020f2baba7b5723cbc5ea76",
    extensions: [],
  })

  const manifest = JSON.parse(await readFile(new URL("./restore.json", import.meta.url), "utf8"))
  expect(manifest).not.toHaveProperty("skillSource")
  expect(manifest.resources).toContainEqual({
    source: "agent/extensions/comment-checker.js",
    target: ".omo/agent/extensions/comment-checker.js",
  })
})

test("installed DefaultResourceLoader resolves native OMO and six Ponytail skills without imported or Caveman skills", async () => {
  const root = await freshRoot()
  const home = join(root, "home")
  const agentDir = join(home, ".omo", "agent")
  const project = join(root, "project")
  const globalRoot = await npmRoot()
  const dist = join(globalRoot, "omo-ai", "node_modules", "@code-yeongyu", "senpi", "dist")
  const bundled = join(globalRoot, "omo-ai", "plugin", "skills")
  const installedPonytail = join(process.env.HOME, ".omo", "agent", "npm", "node_modules", "@dietrichgebert", "ponytail")
  const fixturePonytail = join(agentDir, "npm", "node_modules", "@dietrichgebert", "ponytail")

  await mkdir(project, { recursive: true })
  await cp(installedPonytail, fixturePonytail, { recursive: true })
  await skill(join(agentDir, "skills", "native-omo-fixture"), "native-omo-fixture")
  await skill(join(agentDir, "skills", "caveman-native"), "caveman-native")
  await skill(join(agentDir, "skills", "cavecrew"), "cavecrew")
  await skill(join(agentDir, "skill-library", "codex", "imported-codex"), "imported-codex")
  await skill(join(agentDir, "skill-library", "shared", "imported-shared"), "imported-shared")
  await skill(join(fixturePonytail, "skills", "caveman-package"), "caveman-package")
  await skill(join(fixturePonytail, "skills", "cavecrew"), "cavecrew")
  await skill(join(home, ".agents", "skills", "external-agents"), "external-agents")
  await skill(join(home, ".claude", "skills", "external-claude"), "external-claude")

  const settings = await loadProductionSettings(home)
  settings.packages = settings.packages.filter((entry) => {
    const source = typeof entry === "string" ? entry : entry.source
    return source.startsWith("npm:@dietrichgebert/ponytail@")
  })
  await write(join(agentDir, "settings.json"), `${JSON.stringify(settings, null, 2)}\n`)

  const dry = await dryRun({ home, agentDir, bundled, args: ["--print", "fixture"], cwd: project })
  expect(dry.exitCode).toBe(0)
  const args = argv(dry.stdout)
  expect(args).toContain("--no-skills")
  expect(args).not.toContain("--no-extensions")
  expect(args.slice(-2)).toEqual(["--print", "fixture"])
  const explicit = explicitSkills(args)
  expect(explicit.length).toBeGreaterThan(0)
  for (const path of explicit) {
    expect(path).not.toMatch(/[/\\]skill-library[/\\](?:codex|shared)(?:[/\\]|$)/)
    expect(basename(path)).not.toMatch(/^(?:caveman(?:-|$)|cavecrew$)/)
  }

  const expectedBundled = (await readdir(bundled, { withFileTypes: true }))
    .filter((entry) => entry.isDirectory())
    .map((entry) => join(bundled, entry.name, "SKILL.md"))
    .filter((path) => Bun.file(path).size > 0)
    .map((path) => resolve(path))
    .sort()

  const driver = join(root, "resolve.mjs")
  await write(driver, `
import { DefaultResourceLoader } from ${JSON.stringify("file://" + join(dist, "core", "resource-loader.js"))};
import { SettingsManager } from ${JSON.stringify("file://" + join(dist, "core", "settings-manager.js"))};
const agentDir = ${JSON.stringify(agentDir)};
const cwd = ${JSON.stringify(project)};
const explicit = ${JSON.stringify(explicit)};
async function load(noSkills, additionalSkillPaths) {
  const settingsManager = SettingsManager.create(cwd, agentDir, { projectTrusted: false });
  await settingsManager.reload();
  const loader = new DefaultResourceLoader({
    cwd, agentDir, settingsManager, additionalSkillPaths, noSkills,
    noExtensions: true, noPromptTemplates: true, noThemes: true, noContextFiles: true,
  });
  await loader.reload({ settingsAlreadyReloadedFor: settingsManager });
  const result = loader.getSkills();
  return { diagnostics: result.diagnostics, skills: result.skills.map(({ name, filePath }) => ({ name, filePath })) };
}
process.stdout.write("RESULT " + JSON.stringify({
  raw: await load(false, []),
  launched: await load(true, explicit),
}) + "\\n");
`)
  const child = Bun.spawn([process.execPath, driver], {
    env: { ...cleanEnv(), HOME: home, OMO_CODING_AGENT_DIR: agentDir },
    stdout: "pipe",
    stderr: "pipe",
  })
  const [stdout, stderr, exitCode] = await Promise.all([
    new Response(child.stdout).text(),
    new Response(child.stderr).text(),
    child.exited,
  ])
  if (exitCode !== 0) throw new Error(`resolver failed: ${stdout}${stderr}`)
  const resultLine = stdout.split("\n").find((line) => line.startsWith("RESULT "))
  if (!resultLine) throw new Error(`resolver missing RESULT: ${stdout}${stderr}`)
  const results = JSON.parse(resultLine.slice(7))

  for (const [label, result] of Object.entries(results)) {
    expect(result.diagnostics).toEqual([])
    const names = result.skills.map((entry) => entry.name)
    expect(names).toContain("native-omo-fixture")
    for (const forbidden of [
      "caveman-native", "caveman-package", "cavecrew", "imported-codex", "imported-shared",
      "external-agents", "external-claude",
    ]) expect(names).not.toContain(forbidden)
    const packageNames = result.skills
      .filter((entry) => resolve(entry.filePath).startsWith(`${resolve(join(fixturePonytail, "skills"))}/`))
      .map((entry) => entry.name)
      .sort()
    expect(packageNames, label).toEqual([...ponytailNames].sort())
  }

  const launchedBundled = results.launched.skills
    .map((entry) => resolve(entry.filePath))
    .filter((path) => path.startsWith(`${resolve(bundled)}/`))
    .sort()
  expect(launchedBundled).toEqual(expectedBundled)
})

test("launcher loads owned Argent rule explicitly when present, omits when absent", async () => {
  const root = await freshRoot()
  const home = join(root, "home")
  const agentDir = join(home, ".omo", "agent")
  const bundled = join(root, "bundled")
  await mkdir(agentDir, { recursive: true })
  await mkdir(bundled, { recursive: true })
  await write(join(agentDir, "settings.json"), JSON.stringify({ packages: [] }))
  await write(join(agentDir, "rules", "argent.md"), "# argent\n")

  const withRule = await dryRun({ home, agentDir, bundled })
  expect(withRule.exitCode).toBe(0)
  const withArgs = argv(withRule.stdout)
  const index = withArgs.indexOf("--append-system-prompt")
  expect(index).toBeGreaterThan(-1)
  expect(withArgs[index + 1]).toBe(join(agentDir, "rules", "argent.md"))

  await rm(join(agentDir, "rules", "argent.md"), { force: true })
  const withoutRule = await dryRun({ home, agentDir, bundled })
  expect(withoutRule.exitCode).toBe(0)
  expect(argv(withoutRule.stdout)).not.toContain("--append-system-prompt")
})

test("launcher rejects Claude MCP import globally and in project, fail closed", async () => {
  const root = await freshRoot()
  const home = join(root, "home")
  const agentDir = join(home, ".omo", "agent")
  const bundled = join(root, "bundled")
  const project = join(root, "project")
  await mkdir(agentDir, { recursive: true })
  await mkdir(bundled, { recursive: true })
  await mkdir(project, { recursive: true })
  await write(join(agentDir, "settings.json"), JSON.stringify({ packages: [] }))

  await write(join(agentDir, "mcp.json"), JSON.stringify({ settings: { importConfigs: ["claude"] } }))
  const badGlobal = await dryRun({ home, agentDir, bundled, cwd: project })
  expect(badGlobal.exitCode).not.toBe(0)
  expect(badGlobal.stderr).toContain("Claude MCP")

  await rm(join(agentDir, "mcp.json"), { force: true })
  await write(join(project, ".omo", "mcp.json"), JSON.stringify({ settings: { importConfigs: ["claude"] } }))
  const badProject = await dryRun({ home, agentDir, bundled, cwd: project })
  expect(badProject.exitCode).not.toBe(0)
  expect(badProject.stderr).toContain("Claude MCP")
})

test("real launcher executes omo --help from a fixture project without a model call", async () => {
  const root = await freshRoot()
  const home = join(root, "home")
  const agentDir = join(home, ".omo", "agent")
  const bundled = join(root, "bundled")
  const project = join(root, "project")
  await mkdir(agentDir, { recursive: true })
  await mkdir(bundled, { recursive: true })
  await mkdir(project, { recursive: true })
  await write(join(agentDir, "settings.json"), JSON.stringify({ packages: [] }))
  const child = Bun.spawn(["bash", launch, "--help"], {
    cwd: project,
    env: { ...cleanEnv(), HOME: home, OMO_CODING_AGENT_DIR: agentDir, OMO_BUNDLED_SKILLS_DIR: bundled },
    stdout: "pipe",
    stderr: "pipe",
  })
  const [stdout, stderr, exitCode] = await Promise.all([
    new Response(child.stdout).text(),
    new Response(child.stderr).text(),
    child.exited,
  ])
  expect(exitCode).toBe(0)
  expect(stdout).toContain("Usage:")
  expect(stderr).not.toContain("Claude MCP")
})
