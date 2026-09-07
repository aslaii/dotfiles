import { afterEach, expect, test } from "bun:test"
import { mkdir, mkdtemp, readdir, rm, stat, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

const launch = fileURLToPath(new URL("./launch.sh", import.meta.url))
const cleanup = []

afterEach(async () => {
  await Promise.all(cleanup.splice(0).map((p) => rm(p, { recursive: true, force: true })))
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

function omoSenpiDist() {
  const { existsSync, realpathSync } = require("node:fs")
  const { dirname: dname, join: pjoin } = require("node:path")
  const which = Bun.which("omo")
  if (which) {
    try {
      const real = realpathSync(which)
      const pkgRoot = dname(dname(real))
      const cand = pjoin(pkgRoot, "node_modules", "@code-yeongyu", "senpi", "dist")
      if (existsSync(join(cand, "core", "resource-loader.js"))) return cand
      const direct = pjoin(dname(real), "..", "node_modules", "@code-yeongyu", "senpi", "dist")
      void direct
    } catch {}
  }
  try {
    const { execFileSync } = require("node:child_process")
    const npmRoot = execFileSync("npm", ["root", "-g"], { encoding: "utf8" }).trim()
    const cand = join(npmRoot, "omo-ai", "node_modules", "@code-yeongyu", "senpi", "dist")
    if (require("node:fs").existsSync(join(cand, "core", "resource-loader.js"))) return cand
  } catch {}
  throw new Error("omo senpi dist not found")
}

async function dryRun({ home, agentDir, bundled, args = [], cwd }) {
  const child = Bun.spawn(["bash", launch, ...args], {
    cwd: cwd ?? process.cwd(),
    env: { ...cleanEnv(), HOME: home, OMO_CODING_AGENT_DIR: agentDir, OMO_BUNDLED_SKILLS_DIR: bundled, OMO_LAUNCH_DRY_RUN: "1" },
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
  return stdout.split("\n").filter((l) => l.startsWith("arg: ")).map((l) => l.slice(5))
}

async function freshRoot() {
  const r = await mkdtemp(join(tmpdir(), "omo isolation "))
  cleanup.push(r)
  return r
}

test("launcher passes only library+native+bundled+active skills, never disables extensions", async () => {
  const root = await freshRoot()
  const home = join(root, "home")
  const agentDir = join(home, ".omo", "agent")
  const bundled = join(root, "bundled", "skills")
  await mkdir(join(agentDir, "skill-library", "codex"), { recursive: true })
  await mkdir(join(agentDir, "skill-library", "shared"), { recursive: true })
  await mkdir(join(agentDir, "skills", "native-own"), { recursive: true })
  await mkdir(join(bundled, "bundled-own"), { recursive: true })
  const activeSkills = join(agentDir, "npm", "node_modules", "@dietrichgebert", "ponytail", "skills")
  const disabledSkills = join(agentDir, "npm", "node_modules", "disabled-pkg", "skills")
  await mkdir(join(activeSkills, "ponytail"), { recursive: true })
  await mkdir(join(disabledSkills, "ghost"), { recursive: true })
  await write(join(agentDir, "settings.json"), JSON.stringify({ packages: ["npm:@dietrichgebert/ponytail@4.9.0"] }))

  const r = await dryRun({ home, agentDir, bundled, args: ["--print", "hi"] })
  expect(r.exitCode).toBe(0)
  const args = argv(r.stdout)
  expect(args).toContain("--no-skills")
  expect(args).toContain(join(agentDir, "skill-library", "codex"))
  expect(args).toContain(join(agentDir, "skill-library", "shared"))
  expect(args).toContain(join(agentDir, "skills"))
  expect(args).toContain(bundled)
  expect(args).toContain(activeSkills)
  expect(args.join("\n")).not.toContain("disabled-pkg")
  expect(args).not.toContain("--no-extensions")
  expect(args.slice(-2)).toEqual(["--print", "hi"])
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
  const a1 = argv(withRule.stdout)
  const i = a1.indexOf("--append-system-prompt")
  expect(i).toBeGreaterThan(-1)
  expect(a1[i + 1]).toBe(join(agentDir, "rules", "argent.md"))

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
  const project = join(root, "proj")
  await mkdir(agentDir, { recursive: true })
  await mkdir(bundled, { recursive: true })
  await mkdir(project, { recursive: true })
  await write(join(agentDir, "settings.json"), JSON.stringify({ packages: [] }))

  await write(join(agentDir, "mcp.json"), JSON.stringify({ settings: { importConfigs: ["claude"] } }))
  const badGlobal = Bun.spawn(["bash", launch, "--help"], {
    cwd: project,
    env: { ...cleanEnv(), HOME: home, OMO_CODING_AGENT_DIR: agentDir, OMO_BUNDLED_SKILLS_DIR: bundled },
    stdout: "pipe",
    stderr: "pipe",
  })
  const [gsOut, gsErr, gsCode] = await Promise.all([
    new Response(badGlobal.stdout).text(),
    new Response(badGlobal.stderr).text(),
    badGlobal.exited,
  ])
  expect(gsCode).not.toBe(0)
  expect(gsErr).toContain("Claude MCP")
  expect(gsOut).not.toContain("Usage:")

  await rm(join(agentDir, "mcp.json"), { force: true })
  await write(join(project, ".omo", "mcp.json"), JSON.stringify({ settings: { importConfigs: ["claude"] } }))
  const badProject = Bun.spawn(["bash", launch, "--help"], {
    cwd: project,
    env: { ...cleanEnv(), HOME: home, OMO_CODING_AGENT_DIR: agentDir, OMO_BUNDLED_SKILLS_DIR: bundled },
    stdout: "pipe",
    stderr: "pipe",
  })
  const [psOut, psErr, psCode] = await Promise.all([
    new Response(badProject.stdout).text(),
    new Response(badProject.stderr).text(),
    badProject.exited,
  ])
  expect(psCode).not.toBe(0)
  expect(psErr).toContain("Claude MCP")
  expect(psOut).not.toContain("Usage:")
})

test("fresh loader without launcher leaks agents skills; launcher list is green", async () => {
  const root = await freshRoot()
  const home = join(root, "home")
  const agentDir = join(home, ".omo", "agent")
  await skill(join(home, ".agents", "skills", "fake-agents-sentinel"), "fake-agents-sentinel")
  await skill(join(agentDir, "skill-library", "codex", "own-codex"), "own-codex")
  await skill(join(agentDir, "skill-library", "shared", "own-shared"), "own-shared")
  await skill(join(root, "bundled", "skills", "bundled-own"), "bundled-own")
  await skill(join(agentDir, "npm", "node_modules", "@dietrichgebert", "ponytail", "skills", "ponytail"), "ponytail")
  await write(join(agentDir, "settings.json"), JSON.stringify({ packages: ["npm:@dietrichgebert/ponytail@4.9.0"] }))
  const project = join(root, "proj")
  await mkdir(project, { recursive: true })

  const dist = omoSenpiDist()
  const driver = join(root, "resolve.mjs")
  await write(driver, `
import { DefaultResourceLoader } from ${JSON.stringify("file://" + join(dist, "core", "resource-loader.js"))};
import { SettingsManager } from ${JSON.stringify("file://" + join(dist, "core", "settings-manager.js"))};
const agentDir = ${JSON.stringify(agentDir)};
const cwd = ${JSON.stringify(project)};
const explicit = ${JSON.stringify([join(agentDir, "skill-library", "codex"), join(agentDir, "skill-library", "shared"), join(root, "bundled", "skills"), join(agentDir, "npm", "node_modules", "@dietrichgebert", "ponytail", "skills")])};
async function load({ noSkills, extra }) {
  const sm = SettingsManager.create(cwd, agentDir, { projectTrusted: false });
  await sm.reload();
  const loader = new DefaultResourceLoader({ cwd, agentDir, settingsManager: sm, additionalSkillPaths: extra, noSkills, noExtensions: false, noPromptTemplates: true, noThemes: true, noContextFiles: true });
  await loader.reload();
  return loader.getSkills().skills.map((s) => s.name).sort();
}
const leaky = await load({ noSkills: false, extra: [] });
const clean = await load({ noSkills: true, extra: explicit });
process.stdout.write("RESULT " + JSON.stringify({ leaky, clean }) + "\\n");
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
  const line = stdout.split("\n").find((l) => l.startsWith("RESULT "))
  if (!line) throw new Error(`resolver missing RESULT: ${stdout}${stderr}`)
  const { leaky, clean } = JSON.parse(line.slice(7))
  expect(leaky).toContain("fake-agents-sentinel")
  for (const n of ["own-codex", "own-shared", "bundled-own", "ponytail"]) expect(clean).toContain(n)
  expect(clean).not.toContain("fake-agents-sentinel")
})

test("real launcher executes omo --help from sentinel project (no model)", async () => {
  const root = await freshRoot()
  const home = join(root, "home")
  const agentDir = join(home, ".omo", "agent")
  const bundled = join(root, "bundled")
  const project = join(root, "proj")
  await mkdir(join(agentDir, "skill-library", "codex"), { recursive: true })
  await mkdir(bundled, { recursive: true })
  await write(join(agentDir, "settings.json"), JSON.stringify({ packages: [] }))
  await mkdir(project, { recursive: true })
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

test("live skill-library counts, settings paths, and Argent file exist (no prose asserts)", async () => {
  const home = process.env.HOME ?? ""
  const codex = await readdir(join(home, ".omo", "agent", "skill-library", "codex"))
  const shared = await readdir(join(home, ".omo", "agent", "skill-library", "shared"))
  expect(codex.length).toBe(30)
  expect(shared.length).toBe(66)
  const settings = JSON.parse(await (await Bun.file(join(home, ".omo", "agent", "settings.json")).text()))
  expect(Array.isArray(settings.skills)).toBe(true)
  expect(settings.skills).toContain(join(home, ".omo", "agent", "skill-library", "codex"))
  expect(settings.skills).toContain(join(home, ".omo", "agent", "skill-library", "shared"))
  const st = await stat(join(home, ".omo", "agent", "rules", "argent.md"))
  expect(st.size).toBeGreaterThan(0)
})
