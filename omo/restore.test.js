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

async function run(script, home) {
  const child = Bun.spawn([process.execPath, script, "--home", home, "--skip-packages"], {
    stdout: "pipe",
    stderr: "pipe",
  })
  const [stdout, stderr, exitCode] = await Promise.all([
    new Response(child.stdout).text(),
    new Response(child.stderr).text(),
    child.exited,
  ])
  if (exitCode !== 0) throw new Error(`${stdout}${stderr}`)
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

  await write(join(snapshot, "restore.json"), JSON.stringify({
    omoVersion: "5.0.0-0.beta.48",
    builtinExtensions: ["tps", "prompt-url-widget", "files", "diff"],
    resources: [
      { source: "skills/codex", target: ".codex/skills" },
      { source: "skills/shared", target: ".agents/skills" },
      { source: "rules", target: ".claude/rules" },
    ],
  }))
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
    skills: ["__OMO_HOME__/.agents/skills/portable"],
  }))
  await write(join(snapshot, "agent/hooks.json"), JSON.stringify({
    hooks: { PreToolUse: [{ matcher: "bash", hooks: [{ type: "command", command: "dcg", timeout: 10 }] }] },
  }))
  await write(join(snapshot, "agent/auth.json"), "source credential")
  await write(join(snapshot, "agent/sessions/session.json"), "source session")
  await write(join(snapshot, "skills/codex/SKILL.md"), "home: __OMO_HOME__\n")
  await write(join(snapshot, "skills/codex/run.sh"), "#!/bin/sh\necho portable\n")
  await chmod(join(snapshot, "skills/codex/run.sh"), 0o755)
  await write(join(snapshot, "skills/codex/payload.bin.b64"), Buffer.from([0, 255, 10, 42]).toString("base64"))
  await write(join(snapshot, "skills/codex/empty.pdf.b64"), "")
  await write(join(snapshot, "skills/codex/link.txt"), "safe replacement\n")
  await write(join(snapshot, "skills/shared/SHARED.md"), "shared\n")
  await write(join(snapshot, "rules/RULE.md"), "rule\n")

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
    skills: ["/destination-only/skills"],
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
  await write(join(home, ".codex/skills/SKILL.md"), "old skill\n")
  await write(join(home, ".codex/skills/unchanged.txt"), "keep\n")
  await write(external, "outside checkout\n")
  await symlink(external, join(home, ".codex/skills/link.txt"))
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
    "/destination-only/skills",
    join(home, ".agents/skills/portable"),
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
  expect(await readFile(join(home, ".codex/skills/SKILL.md"), "utf8")).toBe(`home: ${home}\n`)
  expect(await readFile(join(home, ".codex/skills/payload.bin"))).toEqual(Buffer.from([0, 255, 10, 42]))
  expect(await readFile(join(home, ".codex/skills/empty.pdf"))).toEqual(Buffer.alloc(0))
  expect(await readFile(join(home, ".codex/skills/payload.bin.b64")).catch(() => undefined)).toBeUndefined()
  expect((await lstat(join(home, ".codex/skills/run.sh"))).mode & 0o111).not.toBe(0)
  expect((await lstat(join(home, ".codex/skills/link.txt"))).isSymbolicLink()).toBe(false)
  expect(await readFile(join(home, ".codex/skills/link.txt"), "utf8")).toBe("safe replacement\n")
  expect(await readFile(external, "utf8")).toBe("outside checkout\n")
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
  expect(await readFile(join(backups, firstBackups[0], ".codex/skills/SKILL.md"), "utf8")).toBe("old skill\n")
  expect((await lstat(join(backups, firstBackups[0], ".codex/skills/link.txt"))).isSymbolicLink()).toBe(true)

  await run(script, home)
  expect(await readdir(backups)).toEqual(firstBackups)
})
