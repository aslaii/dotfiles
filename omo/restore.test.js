import { afterEach, expect, test } from "bun:test"
import { chmod, cp, lstat, mkdir, mkdtemp, readFile, readdir, rm, symlink, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { dirname, join, resolve } from "node:path"

const restore = new URL("./restore.mjs", import.meta.url)
const cleanup = []

afterEach(async () => {
  await Promise.all(cleanup.splice(0).map((path) => rm(path, { recursive: true, force: true })))
})

async function write(path, contents) {
  await mkdir(dirname(path), { recursive: true })
  await writeFile(path, contents)
}

async function json(path) {
  return JSON.parse(await readFile(path, "utf8"))
}

async function runResult(script, home) {
  const child = Bun.spawn([process.execPath, script, "--home", home, "--skip-packages"], {
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

async function run(script, home) {
  const result = await runResult(script, home)
  if (result.exitCode !== 0) throw new Error(`${result.stdout}${result.stderr}`)
  return result
}

async function git(cwd, ...args) {
  const child = Bun.spawn(["git", "-c", "core.hooksPath=/dev/null", "-c", "commit.gpgsign=false", ...args], { cwd, stdout: "pipe", stderr: "pipe" })
  const [stdout, stderr, exitCode] = await Promise.all([
    new Response(child.stdout).text(),
    new Response(child.stderr).text(),
    child.exited,
  ])
  if (exitCode !== 0) throw new Error(`git ${args.join(" ")} failed: ${stdout}${stderr}`)
  return stdout
}

async function makeSkillRepo(root) {
  const repo = join(root, "skill-fixture")
  await mkdir(repo, { recursive: true })
  await git(repo, "init", "-q")
  await git(repo, "config", "user.email", "test@example.com")
  await git(repo, "config", "user.name", "test")
  await write(join(repo, "omo/skills/codex/SKILL.md"), "home: __OMO_HOME__\n")
  await write(join(repo, "omo/skills/codex/run.sh"), "#!/bin/sh\necho portable\n")
  await chmod(join(repo, "omo/skills/codex/run.sh"), 0o755)
  await write(join(repo, "omo/skills/codex/payload.bin.b64"), Buffer.from([0, 255, 10, 42]).toString("base64"))
  await write(join(repo, "omo/skills/codex/empty.pdf.b64"), "")
  await write(join(repo, "omo/skills/codex/link.txt"), "safe replacement\n")
  await write(join(repo, "omo/skills/shared/SHARED.md"), "shared\n")
  await write(join(repo, "omo/skills/codex/caller/run.sh"), "#!/bin/sh\nexec \"__OMO_HOME__/.codex/skills/caller/helper.sh\"\n")
  await write(join(repo, "omo/skills/codex/caller/helper.sh"), "#!/bin/sh\necho caller-helper-ok\n")
  await write(join(repo, "omo/skills/codex/envcaller/run.sh"), "#!/bin/sh\nexec \"$HOME/.codex/skills/envcaller/helper.sh\"\n")
  await write(join(repo, "omo/skills/codex/envcaller/helper.sh"), "#!/bin/sh\necho envcaller-helper-ok\n")
  await write(join(repo, "omo/skills/shared/echoer/run.sh"), "#!/bin/sh\nHELPER=\"~/.agents/skills/echoer/helper.sh\"\nexec \"$HELPER\"\n")
  await write(join(repo, "omo/skills/shared/echoer/helper.sh"), "#!/bin/sh\necho echoer-helper-ok\n")
  await write(join(repo, "omo/skills/codex/caller/paths.txt"), "bin: ~/.local/bin/dcg\nrule: __OMO_HOME__/.omo/agent/rules/RULE.md\nwork: __OMO_HOME__/work/mobii/gondoor-mono\nclaude: $HOME/.claude/settings.json\n")
  for (const script of ["omo/skills/codex/caller/run.sh", "omo/skills/codex/caller/helper.sh", "omo/skills/codex/envcaller/run.sh", "omo/skills/codex/envcaller/helper.sh", "omo/skills/shared/echoer/run.sh", "omo/skills/shared/echoer/helper.sh"]) {
    await chmod(join(repo, script), 0o755)
  }
  await git(repo, "add", ".")
  await git(repo, "commit", "-qm", "fixture")
  const commit = (await git(repo, "rev-parse", "HEAD")).trim()
  const tree = (await git(repo, "rev-parse", `${commit}:omo/skills`)).trim()
  return { repo, commit, tree }
}

async function skillTemps() {
  return (await readdir(tmpdir())).filter((name) => name.startsWith("omo-skills-")).sort()
}

function skillSourceManifest(fixture) {
  return {
    omoVersion: "5.0.0-0.beta.48",
    builtinExtensions: ["tps", "prompt-url-widget", "files", "diff"],
    resources: [{ source: "rules", target: ".omo/agent/rules" }],
    skillSource: {
      repository: fixture.repo,
      commit: fixture.commit,
      tree: fixture.tree,
      prefix: "omo/skills",
      snapshots: [
        { source: "codex", target: ".omo/agent/skill-library/codex" },
        { source: "shared", target: ".omo/agent/skill-library/shared" },
      ],
    },
  }
}

async function writePortableConfig(snapshot) {
  await write(join(snapshot, "omo.jsonc"), `// portable config
{
  "[senpi]": { "models": { "planner": { "model": "openai-codex/gpt-6-astra", "reasoning": "xhigh" } } },
  "portableOnly": true
}
`)
  await write(join(snapshot, "agent/settings.json"), JSON.stringify({
    defaultModel: "gpt-6-astra",
    packages: [
      "npm:@dietrichgebert/ponytail@4.9.0",
      "git:github.com/code-yeongyu/pi-comment-checker@0a38dd8ff362be1b6020f2baba7b5723cbc5ea76",
    ],
    skills: ["__OMO_HOME__/.omo/agent/skill-library/codex"],
  }))
  await write(join(snapshot, "agent/hooks.json"), JSON.stringify({
    hooks: { PreToolUse: [{ matcher: "bash", hooks: [{ type: "command", command: "dcg", timeout: 10 }] }] },
  }))
  await write(join(snapshot, "agent/auth.json"), "source credential")
  await write(join(snapshot, "agent/sessions/session.json"), "source session")
  await write(join(snapshot, "rules/RULE.md"), "rule\n")
}

async function writeDestinationConfig(home) {
  await write(join(home, ".omo/omo.jsonc"), `{
  "[senpi]": { "destinationPreference": true },
  "destinationOnly": { "kept": true }
}
`)
  await write(join(home, ".omo/agent/settings.json"), JSON.stringify({
    destinationPreference: true,
    packages: [
      "npm:@dietrichgebert/ponytail",
      "git:github.com/code-yeongyu/pi-comment-checker",
      { source: "npm:destination-package@1.0.0", skills: [] },
    ],
    skills: ["/destination-only/skills", "__OMO_HOME__/.claude/skills"],
  }))
  await write(join(home, ".omo/agent/hooks.json"), JSON.stringify({
    hooks: {
      PreToolUse: [{ matcher: "bash", hooks: [
        { type: "command", command: `${home}/.local/bin/dcg`, timeout: 10 },
        { type: "command", command: "keep" },
      ] }],
    },
  }))
  await write(join(home, ".omo/agent/auth.json"), "destination credential")
  await write(join(home, ".omo/agent/trust.json"), "destination trust")
  await write(join(home, ".omo/agent/sessions/session.json"), "destination session")
}

test("restore merges portable configuration, safely installs resources, and is idempotent", async () => {
  const root = await mkdtemp(join(tmpdir(), "omo restore "))
  cleanup.push(root)
  const snapshot = join(root, "snapshot")
  const home = join(root, "home with spaces")
  const external = join(root, "another checkout.txt")
  const externalRules = join(root, "existing claude checkout")
  const script = join(snapshot, "restore.mjs")
  await cp(restore, script)
  const fixture = await makeSkillRepo(root)
  const tempsBefore = await skillTemps()

  await write(join(snapshot, "restore.json"), JSON.stringify(skillSourceManifest(fixture)))
  await writePortableConfig(snapshot)
  // No checkout vendor directory: omo/skills is absent here on purpose.
  // Skills must arrive from the pinned skillSource instead.

  await writeDestinationConfig(home)
  await write(join(home, ".omo/agent/skill-library/codex/SKILL.md"), "old skill\n")
  await write(join(home, ".omo/agent/skill-library/codex/keep.txt"), "user keep\n")
  await write(join(home, ".omo/agent/skill-library/shared/custom.md"), "custom\n")
  await write(external, "outside checkout\n")
  await symlink(external, join(home, ".omo/agent/skill-library/codex/link.txt"))
  await write(join(home, ".codex/skills/SKILL.md"), "existing codex skill\n")
  await write(join(externalRules, "rules/RULE.md"), "rule\n")
  await write(join(externalRules, "settings.json"), "unrelated Claude settings\n")
  await symlink(externalRules, join(home, ".claude"))

  await run(script, home)

  const omo = await json(join(home, ".omo/omo.jsonc"))
  expect(omo.destinationOnly).toEqual({ kept: true })
  expect(omo["[senpi]"].destinationPreference).toBe(true)
  expect(omo["[senpi]"].models.planner).toEqual({ model: "openai-codex/gpt-6-astra", reasoning: "xhigh" })

  const settings = await json(join(home, ".omo/agent/settings.json"))
  expect(settings.destinationPreference).toBe(true)
  expect(settings.defaultModel).toBe("gpt-6-astra")
  expect(settings.packages).toEqual([
    "npm:@dietrichgebert/ponytail@4.9.0",
    "git:github.com/code-yeongyu/pi-comment-checker@0a38dd8ff362be1b6020f2baba7b5723cbc5ea76",
    { source: "npm:destination-package@1.0.0", skills: [] },
  ])
  expect(settings.skills).toEqual([
    join(home, ".omo/agent/skill-library/codex"),
  ])

  const hooks = await json(join(home, ".omo/agent/hooks.json"))
  expect(hooks.hooks).toEqual({
    PreToolUse: [{ matcher: "bash", hooks: [
      { type: "command", command: "dcg", timeout: 10 },
      { type: "command", command: "keep" },
    ] }],
  })
  expect(await readFile(join(home, ".omo/agent/auth.json"), "utf8")).toBe("destination credential")
  expect(await readFile(join(home, ".omo/agent/trust.json"), "utf8")).toBe("destination trust")
  expect(await readFile(join(home, ".omo/agent/sessions/session.json"), "utf8")).toBe("destination session")
  expect(await readFile(join(home, ".omo/agent/rules/RULE.md"), "utf8")).toBe("rule\n")

  expect(await readFile(join(home, ".omo/agent/skill-library/codex/SKILL.md"), "utf8")).toBe(`home: ${home}\n`)
  expect(await readFile(join(home, ".omo/agent/skill-library/codex/payload.bin"))).toEqual(Buffer.from([0, 255, 10, 42]))
  expect(await readFile(join(home, ".omo/agent/skill-library/codex/empty.pdf"))).toEqual(Buffer.alloc(0))
  expect(await readFile(join(home, ".omo/agent/skill-library/codex/payload.bin.b64")).catch(() => undefined)).toBeUndefined()
  expect((await lstat(join(home, ".omo/agent/skill-library/codex/run.sh"))).mode & 0o111).not.toBe(0)
  expect((await lstat(join(home, ".omo/agent/skill-library/codex/link.txt"))).isSymbolicLink()).toBe(false)
  expect(await readFile(join(home, ".omo/agent/skill-library/codex/link.txt"), "utf8")).toBe("safe replacement\n")
  expect(await readFile(join(home, ".omo/agent/skill-library/codex/keep.txt"), "utf8")).toBe("user keep\n")
  expect(await readFile(join(home, ".omo/agent/skill-library/shared/SHARED.md"), "utf8")).toBe("shared\n")
  expect(await readFile(join(home, ".omo/agent/skill-library/shared/custom.md"), "utf8")).toBe("custom\n")
  expect(await readFile(external, "utf8")).toBe("outside checkout\n")

  expect(await readFile(join(home, ".codex/skills/SKILL.md"), "utf8")).toBe("existing codex skill\n")
  expect((await lstat(join(home, ".claude"))).isSymbolicLink()).toBe(true)
  expect(await readFile(join(home, ".claude/settings.json"), "utf8")).toBe("unrelated Claude settings\n")

  const npmRoot = (await new Response(Bun.spawn(["npm", "root", "-g"], { stdout: "pipe" }).stdout).text()).trim()
  const builtinRoot = resolve(npmRoot, "omo-ai/node_modules/@code-yeongyu/senpi/dist/core/extensions/builtin")
  for (const extension of ["tps", "prompt-url-widget", "files", "diff"]) {
    expect(await readFile(join(home, ".omo/agent/extensions", `${extension}.js`), "utf8")).toContain(`file://${builtinRoot}/${extension}.js`)
  }

  const backups = join(home, ".omo/backups")
  const firstBackups = await readdir(backups)
  expect(firstBackups).toHaveLength(1)
  expect(await readFile(join(backups, firstBackups[0], ".omo/agent/skill-library/codex/SKILL.md"), "utf8")).toBe("old skill\n")
  expect((await lstat(join(backups, firstBackups[0], ".omo/agent/skill-library/codex/link.txt"))).isSymbolicLink()).toBe(true)

  expect(await skillTemps()).toEqual(tempsBefore)

  await run(script, home)
  expect(await readdir(backups)).toEqual(firstBackups)
  expect(await skillTemps()).toEqual(tempsBefore)
})

async function runScript(path) {
  const child = Bun.spawn([path], { stdout: "pipe", stderr: "pipe" })
  const [stdout, stderr, exitCode] = await Promise.all([
    new Response(child.stdout).text(),
    new Response(child.stderr).text(),
    child.exited,
  ])
  return { stdout, stderr, exitCode }
}

test("restored skill scripts are self-contained within the skill library", async () => {
  const root = await mkdtemp(join(tmpdir(), "omo restore "))
  cleanup.push(root)
  const snapshot = join(root, "snapshot")
  const home = join(root, "home with spaces")
  const script = join(snapshot, "restore.mjs")
  await cp(restore, script)
  const fixture = await makeSkillRepo(root)

  await write(join(snapshot, "restore.json"), JSON.stringify(skillSourceManifest(fixture)))
  await writePortableConfig(snapshot)
  await writeDestinationConfig(home)

  await run(script, home)

  const codexLib = join(home, ".omo/agent/skill-library/codex")
  const sharedLib = join(home, ".omo/agent/skill-library/shared")
  expect(await readFile(join(codexLib, "caller/run.sh"), "utf8")).toBe(`#!/bin/sh\nexec "${join(codexLib, "caller/helper.sh")}"\n`)
  expect(await readFile(join(codexLib, "envcaller/run.sh"), "utf8")).toBe(`#!/bin/sh\nexec "${join(codexLib, "envcaller/helper.sh")}"\n`)
  expect(await readFile(join(sharedLib, "echoer/run.sh"), "utf8")).toBe(`#!/bin/sh\nHELPER="${join(sharedLib, "echoer/helper.sh")}"\nexec "$HELPER"\n`)
  expect(await readFile(join(codexLib, "caller/paths.txt"), "utf8")).toBe(
    `bin: ~/.local/bin/dcg\nrule: ${join(home, ".omo/agent/rules/RULE.md")}\nwork: ${join(home, "work/mobii/gondoor-mono")}\nclaude: $HOME/.claude/settings.json\n`,
  )

  for (const [runner, expected] of [
    [join(codexLib, "caller/run.sh"), "caller-helper-ok\n"],
    [join(codexLib, "envcaller/run.sh"), "envcaller-helper-ok\n"],
    [join(sharedLib, "echoer/run.sh"), "echoer-helper-ok\n"],
  ]) {
    const result = await runScript(runner)
    if (result.exitCode !== 0) throw new Error(`${runner}: ${result.stdout}${result.stderr}`)
    expect(result.stdout).toBe(expected)
  }

  await run(script, home)
  for (const [runner, expected] of [
    [join(codexLib, "caller/run.sh"), "caller-helper-ok\n"],
    [join(codexLib, "envcaller/run.sh"), "envcaller-helper-ok\n"],
    [join(sharedLib, "echoer/run.sh"), "echoer-helper-ok\n"],
  ]) {
    expect((await runScript(runner)).stdout).toBe(expected)
  }
})

test("rejects a tampered skill pin before mutating targets and cleans up", async () => {
  const root = await mkdtemp(join(tmpdir(), "omo restore "))
  cleanup.push(root)
  const snapshot = join(root, "snapshot")
  const home = join(root, "home with spaces")
  const script = join(snapshot, "restore.mjs")
  await cp(restore, script)
  const fixture = await makeSkillRepo(root)
  const tempsBefore = await skillTemps()

  const badTree = fixture.tree.slice(0, -1) + (fixture.tree.endsWith("0") ? "1" : "0")
  const manifest = skillSourceManifest(fixture)
  manifest.skillSource.tree = badTree
  await write(join(snapshot, "restore.json"), JSON.stringify(manifest))
  await writePortableConfig(snapshot)

  await writeDestinationConfig(home)
  await write(join(home, ".omo/agent/skill-library/codex/SKILL.md"), "prior skill\n")
  await write(join(home, ".omo/agent/skill-library/codex/keep.txt"), "prior keep\n")

  const result = await runResult(script, home)
  expect(result.exitCode).not.toBe(0)
  expect(`${result.stdout}${result.stderr}`).toMatch(/skill pin mismatch/)

  expect(await readFile(join(home, ".omo/agent/skill-library/codex/SKILL.md"), "utf8")).toBe("prior skill\n")
  expect(await readFile(join(home, ".omo/agent/skill-library/codex/keep.txt"), "utf8")).toBe("prior keep\n")
  expect(await readFile(join(home, ".omo/agent/skill-library/codex/payload.bin")).catch(() => undefined)).toBeUndefined()
  const backupsInfo = await lstat(join(home, ".omo/backups")).catch(() => undefined)
  expect(backupsInfo).toBeUndefined()
  expect(await skillTemps()).toEqual(tempsBefore)
})

test("rejects non-isolated skill targets before mutating anything", async () => {
  const root = await mkdtemp(join(tmpdir(), "omo restore "))
  cleanup.push(root)
  const snapshot = join(root, "snapshot")
  const home = join(root, "home with spaces")
  const script = join(snapshot, "restore.mjs")
  await cp(restore, script)
  const fixture = await makeSkillRepo(root)
  const tempsBefore = await skillTemps()

  const manifest = skillSourceManifest(fixture)
  manifest.skillSource.snapshots = [{ source: "codex", target: ".codex/skills" }]
  await write(join(snapshot, "restore.json"), JSON.stringify(manifest))
  await writePortableConfig(snapshot)

  await writeDestinationConfig(home)
  await write(join(home, ".codex/skills/SKILL.md"), "prior codex\n")

  const result = await runResult(script, home)
  expect(result.exitCode).not.toBe(0)
  expect(`${result.stdout}${result.stderr}`).toMatch(/must stay inside \.omo\//)

  expect(await readFile(join(home, ".codex/skills/SKILL.md"), "utf8")).toBe("prior codex\n")
  const backupsInfo = await lstat(join(home, ".omo/backups")).catch(() => undefined)
  expect(backupsInfo).toBeUndefined()
  expect(await skillTemps()).toEqual(tempsBefore)
})

test("excluded skills are skipped on fresh install and pruned safely with backup", async () => {
  const root = await mkdtemp(join(tmpdir(), "omo restore "))
  cleanup.push(root)
  const snapshot = join(root, "snapshot")
  const home = join(root, "home with spaces")
  const script = join(snapshot, "restore.mjs")
  await cp(restore, script)
  const repo = join(root, "skill-fixture-excluded")
  await mkdir(repo, { recursive: true })
  await git(repo, "init", "-q")
  await git(repo, "config", "user.email", "test@example.com")
  await git(repo, "config", "user.name", "test")
  await write(join(repo, "omo/skills/codex/keep-native/SKILL.md"), "keep\n")
  await write(join(repo, "omo/skills/codex/keep-native/run.sh"), "#!/bin/sh\necho keep-ok\n")
  await chmod(join(repo, "omo/skills/codex/keep-native/run.sh"), 0o755)
  await write(join(repo, "omo/skills/codex/drop-codex/SKILL.md"), "drop\n")
  await write(join(repo, "omo/skills/shared/keep-shared/SKILL.md"), "keep shared\n")
  await write(join(repo, "omo/skills/shared/drop-shared/SKILL.md"), "drop shared\n")
  await git(repo, "add", ".")
  await git(repo, "commit", "-qm", "fixture")
  const commit = (await git(repo, "rev-parse", "HEAD")).trim()
  const tree = (await git(repo, "rev-parse", `${commit}:omo/skills`)).trim()
  const manifest = skillSourceManifest({ repo, commit, tree })
  manifest.skillSource.snapshots = [
    { source: "codex", target: ".omo/agent/skill-library/codex", excluded: ["drop-codex"] },
    { source: "shared", target: ".omo/agent/skill-library/shared", excluded: ["drop-shared"] },
  ]
  await write(join(snapshot, "restore.json"), JSON.stringify(manifest))
  await writePortableConfig(snapshot)
  await writeDestinationConfig(home)
  await write(join(home, ".omo/agent/skill-library/codex/drop-codex/old.md"), "old drop\n")
  await write(join(home, ".omo/agent/skill-library/shared/drop-shared/old.md"), "old drop shared\n")
  await write(join(home, ".omo/agent/skill-library/codex/custom-keep/note.md"), "custom\n")
  const tempsBefore = await skillTemps()

  await run(script, home)

  expect(await lstat(join(home, ".omo/agent/skill-library/codex/drop-codex")).catch(() => undefined)).toBeUndefined()
  expect(await lstat(join(home, ".omo/agent/skill-library/shared/drop-shared")).catch(() => undefined)).toBeUndefined()
  expect(await readFile(join(home, ".omo/agent/skill-library/codex/keep-native/SKILL.md"), "utf8")).toBe("keep\n")
  expect(await readFile(join(home, ".omo/agent/skill-library/shared/keep-shared/SKILL.md"), "utf8")).toBe("keep shared\n")
  expect(await readFile(join(home, ".omo/agent/skill-library/codex/custom-keep/note.md"), "utf8")).toBe("custom\n")
  const kept = await runScript(join(home, ".omo/agent/skill-library/codex/keep-native/run.sh"))
  expect(kept.exitCode).toBe(0)
  expect(kept.stdout).toBe("keep-ok\n")
  const backups = join(home, ".omo/backups")
  const names = await readdir(backups)
  expect(names.length).toBeGreaterThan(0)
  let found = false
  for (const name of names) {
    try {
      if (await readFile(join(backups, name, ".omo/agent/skill-library/codex/drop-codex/old.md"), "utf8") === "old drop\n") found = true
    } catch {}
  }
  expect(found).toBe(true)
  expect(await skillTemps()).toEqual(tempsBefore)

  const before = (await readdir(backups)).sort()
  await run(script, home)
  expect(await lstat(join(home, ".omo/agent/skill-library/codex/drop-codex")).catch(() => undefined)).toBeUndefined()
  expect(await lstat(join(home, ".omo/agent/skill-library/shared/drop-shared")).catch(() => undefined)).toBeUndefined()
  expect(await readdir(backups)).toEqual(before)
  expect((await runScript(join(home, ".omo/agent/skill-library/codex/keep-native/run.sh"))).stdout).toBe("keep-ok\n")
  expect(await skillTemps()).toEqual(tempsBefore)

  const fresh = join(root, "fresh home")
  await writeDestinationConfig(fresh)
  await run(script, fresh)
  expect(await lstat(join(fresh, ".omo/agent/skill-library/codex/drop-codex")).catch(() => undefined)).toBeUndefined()
  expect(await lstat(join(fresh, ".omo/agent/skill-library/shared/drop-shared")).catch(() => undefined)).toBeUndefined()
  expect(await readFile(join(fresh, ".omo/agent/skill-library/codex/keep-native/SKILL.md"), "utf8")).toBe("keep\n")
  expect(await skillTemps()).toEqual(tempsBefore)
})

test("rejects invalid excluded skill names before mutating anything", async () => {
  const root = await mkdtemp(join(tmpdir(), "omo restore "))
  cleanup.push(root)
  const snapshot = join(root, "snapshot")
  const home = join(root, "home with spaces")
  const script = join(snapshot, "restore.mjs")
  await cp(restore, script)
  const fixture = await makeSkillRepo(root)
  const tempsBefore = await skillTemps()
  const manifest = skillSourceManifest(fixture)
  manifest.skillSource.snapshots = [
    { source: "codex", target: ".omo/agent/skill-library/codex", excluded: ["../evil"] },
    { source: "shared", target: ".omo/agent/skill-library/shared" },
  ]
  await write(join(snapshot, "restore.json"), JSON.stringify(manifest))
  await writePortableConfig(snapshot)
  await writeDestinationConfig(home)
  await write(join(home, ".omo/agent/skill-library/codex/SKILL.md"), "prior skill\n")
  const result = await runResult(script, home)
  expect(result.exitCode).not.toBe(0)
  expect(`${result.stdout}${result.stderr}`).toMatch(/excluded/)
  expect(await readFile(join(home, ".omo/agent/skill-library/codex/SKILL.md"), "utf8")).toBe("prior skill\n")
  expect(await lstat(join(home, ".omo/backups")).catch(() => undefined)).toBeUndefined()
  expect(await skillTemps()).toEqual(tempsBefore)
})

test("production restore archives legacy local libraries and installs only the owned checker file", async () => {
  const root = await mkdtemp(join(tmpdir(), "omo restore production "))
  cleanup.push(root)
  const snapshot = join(root, "snapshot")
  const home = join(root, "home with spaces")
  const fresh = join(root, "fresh home")
  const script = join(snapshot, "restore.mjs")
  await cp(restore, script)
  await write(join(snapshot, "restore.json"), JSON.stringify({
    omoVersion: "5.0.0-0.beta.48",
    builtinExtensions: ["tps", "prompt-url-widget", "files", "diff"],
    resources: [
      { source: "rules", target: ".omo/agent/rules" },
      { source: "agent/extensions/comment-checker.js", target: ".omo/agent/extensions/comment-checker.js" },
    ],
  }))
  await writePortableConfig(snapshot)
  await write(join(snapshot, "agent/settings.json"), JSON.stringify({
    packages: [
      { source: "npm:@dietrichgebert/ponytail@4.9.0", skills: ["!caveman-*", "!cavecrew"] },
      "npm:@code-yeongyu/comment-checker@0.8.0",
      { source: "git:github.com/code-yeongyu/pi-comment-checker@0a38dd8ff362be1b6020f2baba7b5723cbc5ea76", extensions: [] },
    ],
    skills: ["!caveman-*", "!cavecrew"],
  }))
  await write(join(snapshot, "agent/extensions/comment-checker.js"), "export default function commentChecker() {}\n")
  await writeDestinationConfig(home)
  await write(join(home, ".omo/agent/skill-library/codex/legacy.md"), "legacy codex\n")
  await write(join(home, ".omo/agent/skill-library/shared/legacy.md"), "legacy shared\n")
  await write(join(home, ".omo/agent/extensions/herdr-presence.js"), "existing herdr\n")
  await write(join(home, ".codex/skills/external.md"), "external codex\n")
  await write(join(home, ".agents/skills/external.md"), "external agents\n")
  await write(join(home, ".claude/skills/external.md"), "external claude\n")

  await run(script, home)

  expect(await lstat(join(home, ".omo/agent/skill-library/codex")).catch(() => undefined)).toBeUndefined()
  expect(await lstat(join(home, ".omo/agent/skill-library/shared")).catch(() => undefined)).toBeUndefined()
  expect(await readFile(join(home, ".codex/skills/external.md"), "utf8")).toBe("external codex\n")
  expect(await readFile(join(home, ".agents/skills/external.md"), "utf8")).toBe("external agents\n")
  expect(await readFile(join(home, ".claude/skills/external.md"), "utf8")).toBe("external claude\n")
  expect(await readFile(join(home, ".omo/agent/extensions/comment-checker.js"), "utf8")).toBe("export default function commentChecker() {}\n")
  expect(await readFile(join(home, ".omo/agent/extensions/herdr-presence.js"), "utf8")).toBe("existing herdr\n")

  const settings = await json(join(home, ".omo/agent/settings.json"))
  expect(settings.packages).toEqual([
    { source: "npm:@dietrichgebert/ponytail@4.9.0", skills: ["!caveman-*", "!cavecrew"] },
    "npm:@code-yeongyu/comment-checker@0.8.0",
    { source: "git:github.com/code-yeongyu/pi-comment-checker@0a38dd8ff362be1b6020f2baba7b5723cbc5ea76", extensions: [] },
    { source: "npm:destination-package@1.0.0", skills: [] },
  ])

  const backups = join(home, ".omo/backups")
  const backupNames = await readdir(backups)
  expect(backupNames).toHaveLength(1)
  expect(await readFile(join(backups, backupNames[0], ".omo/agent/skill-library/codex/legacy.md"), "utf8")).toBe("legacy codex\n")
  expect(await readFile(join(backups, backupNames[0], ".omo/agent/skill-library/shared/legacy.md"), "utf8")).toBe("legacy shared\n")

  await run(script, home)
  expect(await readdir(backups)).toEqual(backupNames)

  await run(script, fresh)
  expect(await lstat(join(fresh, ".omo/agent/skill-library/codex")).catch(() => undefined)).toBeUndefined()
  expect(await lstat(join(fresh, ".omo/agent/skill-library/shared")).catch(() => undefined)).toBeUndefined()
  expect(await readFile(join(fresh, ".omo/agent/extensions/comment-checker.js"), "utf8")).toBe("export default function commentChecker() {}\n")
})

test("legacy library retirement refuses a symlinked parent and leaves its external target untouched", async () => {
  const root = await mkdtemp(join(tmpdir(), "omo restore retirement "))
  cleanup.push(root)
  const snapshot = join(root, "snapshot")
  const home = join(root, "home")
  const external = join(root, "external library")
  const script = join(snapshot, "restore.mjs")
  await cp(restore, script)
  await write(join(snapshot, "restore.json"), JSON.stringify({
    omoVersion: "5.0.0-0.beta.48",
    builtinExtensions: [],
    resources: [],
  }))
  await writePortableConfig(snapshot)
  await write(join(external, "codex/keep.md"), "external legacy\n")
  await mkdir(join(home, ".omo/agent"), { recursive: true })
  await symlink(external, join(home, ".omo/agent/skill-library"))

  const result = await runResult(script, home)
  expect(result.exitCode).not.toBe(0)
  expect(`${result.stdout}${result.stderr}`).toMatch(/symlink/)
  expect(await readFile(join(external, "codex/keep.md"), "utf8")).toBe("external legacy\n")
  expect((await lstat(join(home, ".omo/agent/skill-library"))).isSymbolicLink()).toBe(true)
})
