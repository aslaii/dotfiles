import { afterEach, expect, test } from "bun:test"
import { chmod, cp, mkdir, mkdtemp, readFile, readdir, realpath, rm, stat, symlink, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { basename, dirname, join, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const launch = fileURLToPath(new URL("./launch.sh", import.meta.url))
const argentVersion = (await readFile(new URL("../argent/version", import.meta.url), "utf8")).trim()
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

async function makeNpmShim(npmRoot) {
  const dir = await mkdtemp(join(tmpdir(), "omo npmshim "))
  cleanup.push(dir)
  await write(join(dir, "npm"), '#!/bin/sh\nif [ "$1" = "root" ] && [ "$2" = "-g" ]; then\n  printf \'%s\\n\' "$FAKE_NPM_ROOT"\n  exit 0\nfi\necho "npm shim: unsupported invocation: $*" >&2\nexit 1\n')
  await write(join(dir, "argent"), `#!/bin/sh\nif [ "$1" = "--version" ]; then printf '%s\\n' "${argentVersion}"; exit 0; fi\nexit 1\n`)
  await chmod(join(dir, "npm"), 0o755)
  await chmod(join(dir, "argent"), 0o755)
  return dir
}

async function fixtureNpmPackage(npmRoot, skillNames = ["npm-bundled-marker"]) {
  const pkg = join(npmRoot, "omo-ai")
  await write(join(pkg, "package.json"), JSON.stringify({ name: "omo-ai", version: "0.0.0-fixture" }))
  await write(
    join(pkg, "bin", "omo.js"),
    '#!/usr/bin/env node\nif (process.argv.includes("--help") || process.argv.includes("-h")) {\n  process.stdout.write("Usage: omo-fixture\\n");\n} else {\n  process.stdout.write("omo-fixture-stub\\n");\n}\n',
  )
  await chmod(join(pkg, "bin", "omo.js"), 0o755)
  await mkdir(join(pkg, "plugin", "skills"), { recursive: true })
  for (const name of skillNames) await skill(join(pkg, "plugin", "skills", name), name)
  const argent = join(npmRoot, "@swmansion", "argent")
  await write(join(argent, "package.json"), JSON.stringify({ name: "@swmansion/argent", version: argentVersion }))
  await write(join(argent, "dist", "cli.js"), "#!/usr/bin/env node\n")
  await skill(join(argent, "skills", "argent-device-interact"), "argent-device-interact")
  return pkg
}

async function realNpmPackage() {
  const candidates = []
  try {
    const child = Bun.spawn(["npm", "root", "-g"], { stdout: "pipe", stderr: "pipe" })
    const [out, exitCode] = await Promise.all([new Response(child.stdout).text(), child.exited])
    if (exitCode === 0 && out.trim()) candidates.push(join(out.trim(), "omo-ai"))
  } catch {}
  try {
    const versions = await readdir(join(process.env.HOME, ".nvm", "versions", "node"))
    const found = (
      await Promise.all(
        versions.map(async (version) => {
          const path = join(process.env.HOME, ".nvm", "versions", "node", version, "lib", "node_modules", "omo-ai")
          try {
            const info = await stat(path)
            return info.isDirectory() ? { path, mtime: info.mtimeMs } : null
          } catch {
            return null
          }
        }),
      )
    )
      .filter(Boolean)
      .sort((a, b) => b.mtime - a.mtime)
    for (const entry of found) candidates.push(entry.path)
  } catch {}
  for (const path of candidates) {
    try {
      const manifest = JSON.parse(await readFile(join(path, "package.json"), "utf8"))
      if (manifest?.name !== "omo-ai") continue
      await stat(join(path, "bin", "omo.js"))
      return path
    } catch {}
  }
  throw new Error("no complete npm omo-ai install found (npm root -g or ~/.nvm)")
}

async function realArgentPackage() {
  const child = Bun.spawn(["npm", "root", "-g"], { stdout: "pipe", stderr: "pipe" })
  const [out, exitCode] = await Promise.all([new Response(child.stdout).text(), child.exited])
  const path = join(out.trim(), "@swmansion", "argent")
  if (exitCode === 0) {
    try {
      const manifest = JSON.parse(await readFile(join(path, "package.json"), "utf8"))
      if (manifest.name === "@swmansion/argent" && manifest.version === argentVersion) return path
    } catch {}
  }
  throw new Error(`no complete @swmansion/argent@${argentVersion} install found`)
}

async function dryRun({ home, agentDir, bundled, args = [], cwd, npmRoot, extraPathDirs = [] }) {
  const prefixes = [...extraPathDirs]
  let fakeRootEnv = {}
  if (npmRoot !== undefined) {
    prefixes.push(await makeNpmShim(npmRoot))
    fakeRootEnv = { FAKE_NPM_ROOT: npmRoot }
  }
  const child = Bun.spawn(["bash", launch, ...args], {
    cwd: cwd ?? process.cwd(),
    env: {
      ...cleanEnv(),
      HOME: home,
      OMO_CODING_AGENT_DIR: agentDir,
      ...(bundled === undefined ? {} : { OMO_BUNDLED_SKILLS_DIR: bundled }),
      OMO_LAUNCH_DRY_RUN: "1",
      PATH: [...prefixes, process.env.PATH ?? ""].filter(Boolean).join(":"),
      ...fakeRootEnv,
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

test("launcher selects npm omo-ai even when Bun bin is earlier on PATH", async () => {
  const root = await freshRoot()
  const home = join(root, "home")
  const agentDir = join(home, ".omo", "agent")
  const npmRoot = join(root, "npm")
  const bunDir = join(root, "bunbin")
  await mkdir(agentDir, { recursive: true })
  await write(join(agentDir, "settings.json"), JSON.stringify({ packages: [] }))
  const pkg = await fixtureNpmPackage(npmRoot)
  await write(join(bunDir, "omo"), '#!/bin/sh\necho "bun decoy executed"\nexit 3\n')
  await chmod(join(bunDir, "omo"), 0o755)
  await skill(join(bunDir, "skills", "bun-decoy"), "bun-decoy")

  const dry = await dryRun({ home, agentDir, npmRoot, extraPathDirs: [bunDir] })
  expect(dry.exitCode).toBe(0)
  expect(dry.stderr).not.toContain("bun decoy")
  const binary = dry.stdout.split("\n").find((line) => line.startsWith("omo-binary: "))
  expect(binary).toBe(`omo-binary: ${join(pkg, "bin", "omo.js")}`)
  const explicit = explicitSkills(argv(dry.stdout))
  expect(explicit).toContain(join(pkg, "plugin", "skills", "npm-bundled-marker"))
  for (const path of explicit) expect(path).not.toContain("bunbin")
})

test("launcher without an npm omo-ai install instructs npm i -g omo-ai@beta", async () => {
  const root = await freshRoot()
  const home = join(root, "home")
  const agentDir = join(home, ".omo", "agent")
  await mkdir(agentDir, { recursive: true })
  await write(join(agentDir, "settings.json"), JSON.stringify({ packages: [] }))

  const dry = await dryRun({ home, agentDir, npmRoot: join(root, "empty-npm") })
  expect(dry.exitCode).toBe(127)
  expect(dry.stderr).toContain("npm i -g omo-ai@beta")
})

test("installed DefaultResourceLoader resolves native OMO and six Ponytail skills without imported or Caveman skills", async () => {
  const root = await freshRoot()
  const home = join(root, "home")
  const agentDir = join(home, ".omo", "agent")
  const project = join(root, "project")
  const npmRoot = join(root, "npm")
  // The launcher resolves the npm package through the shimmed npm root; link
  // the real install in so bundled skills and the Senpi driver stay genuine.
  await mkdir(npmRoot, { recursive: true })
  await symlink(await realNpmPackage(), join(npmRoot, "omo-ai"))
  await mkdir(join(npmRoot, "@swmansion"), { recursive: true })
  await symlink(await realArgentPackage(), join(npmRoot, "@swmansion", "argent"))
  const dist = join(npmRoot, "omo-ai", "node_modules", "@code-yeongyu", "senpi", "dist")
  const bundled = join(npmRoot, "omo-ai", "plugin", "skills")
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

  const dry = await dryRun({ home, agentDir, npmRoot, args: ["--print", "fixture"], cwd: project })
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

  const realBundled = await realpath(resolve(bundled))
  const expectedBundled = (
    await Promise.all(
      (await readdir(bundled, { withFileTypes: true }))
        .filter((entry) => entry.isDirectory())
        .map((entry) => join(bundled, entry.name, "SKILL.md"))
        .filter((path) => Bun.file(path).size > 0)
        .map((path) => realpath(resolve(path))),
    )
  ).sort()

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

  const launchedBundled = []
  for (const entry of results.launched.skills) {
    const real = await realpath(resolve(entry.filePath))
    if (real.startsWith(`${realBundled}/`)) launchedBundled.push(real)
  }
  launchedBundled.sort()
  expect(launchedBundled).toEqual(expectedBundled)
})

test("launcher loads owned Argent rule explicitly when present, omits when absent", async () => {
  const root = await freshRoot()
  const home = join(root, "home")
  const agentDir = join(home, ".omo", "agent")
  const bundled = join(root, "bundled")
  const npmRoot = join(root, "npm")
  await mkdir(agentDir, { recursive: true })
  await mkdir(bundled, { recursive: true })
  await fixtureNpmPackage(npmRoot, [])
  await write(join(agentDir, "settings.json"), JSON.stringify({ packages: [] }))
  await write(join(agentDir, "rules", "argent.md"), "# argent\n")

  const withRule = await dryRun({ home, agentDir, bundled, npmRoot })
  expect(withRule.exitCode).toBe(0)
  const withArgs = argv(withRule.stdout)
  const index = withArgs.indexOf("--append-system-prompt")
  expect(index).toBeGreaterThan(-1)
  expect(withArgs[index + 1]).toBe(join(agentDir, "rules", "argent.md"))

  await rm(join(agentDir, "rules", "argent.md"), { force: true })
  const withoutRule = await dryRun({ home, agentDir, bundled, npmRoot })
  expect(withoutRule.exitCode).toBe(0)
  expect(argv(withoutRule.stdout)).not.toContain("--append-system-prompt")
})

test("launcher rejects Claude MCP import globally and in project, fail closed", async () => {
  const root = await freshRoot()
  const home = join(root, "home")
  const agentDir = join(home, ".omo", "agent")
  const bundled = join(root, "bundled")
  const npmRoot = join(root, "npm")
  const project = join(root, "project")
  await mkdir(agentDir, { recursive: true })
  await mkdir(bundled, { recursive: true })
  await fixtureNpmPackage(npmRoot, [])
  await mkdir(project, { recursive: true })
  await write(join(agentDir, "settings.json"), JSON.stringify({ packages: [] }))

  await write(join(agentDir, "mcp.json"), JSON.stringify({ settings: { importConfigs: ["claude"] } }))
  const badGlobal = await dryRun({ home, agentDir, bundled, npmRoot, cwd: project })
  expect(badGlobal.exitCode).not.toBe(0)
  expect(badGlobal.stderr).toContain("Claude MCP")

  await rm(join(agentDir, "mcp.json"), { force: true })
  await write(join(project, ".omo", "mcp.json"), JSON.stringify({ settings: { importConfigs: ["claude"] } }))
  const badProject = await dryRun({ home, agentDir, bundled, npmRoot, cwd: project })
  expect(badProject.exitCode).not.toBe(0)
  expect(badProject.stderr).toContain("Claude MCP")
})

test("real launcher executes npm omo --help from a fixture project without a model call", async () => {
  const root = await freshRoot()
  const home = join(root, "home")
  const agentDir = join(home, ".omo", "agent")
  const npmRoot = join(root, "npm")
  const project = join(root, "project")
  await mkdir(agentDir, { recursive: true })
  await mkdir(npmRoot, { recursive: true })
  await symlink(await realNpmPackage(), join(npmRoot, "omo-ai"))
  await mkdir(join(npmRoot, "@swmansion"), { recursive: true })
  await symlink(await realArgentPackage(), join(npmRoot, "@swmansion", "argent"))
  await mkdir(project, { recursive: true })
  await write(join(agentDir, "settings.json"), JSON.stringify({ packages: [] }))
  const shim = await makeNpmShim(npmRoot)
  const child = Bun.spawn(["bash", launch, "--help"], {
    cwd: project,
    env: {
      ...cleanEnv(),
      HOME: home,
      OMO_CODING_AGENT_DIR: agentDir,
      FAKE_NPM_ROOT: npmRoot,
      PATH: `${shim}:${process.env.PATH ?? ""}`,
    },
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
