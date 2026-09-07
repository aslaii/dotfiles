import { afterEach, expect, test } from "bun:test"
import { execFileSync } from "node:child_process"
import { createHash } from "node:crypto"
import { mkdir, mkdtemp, readFile, rm, stat, symlink, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { dirname, join, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const scriptDir = dirname(fileURLToPath(import.meta.url))
const repoRoot = resolve(scriptDir, "..")
const installer = join(scriptDir, "restore-tools.mjs")
const manifest = JSON.parse(await readFile(join(scriptDir, "tools-source.json"), "utf8"))
const cleanup = []

afterEach(async () => {
  await Promise.all(cleanup.splice(0).map((path) => rm(path, { recursive: true, force: true })))
})

async function run(args, env = {}) {
  const child = Bun.spawn([process.execPath, installer, ...args], {
    stdout: "pipe",
    stderr: "pipe",
    env: { ...process.env, ...env },
  })
  const [stdout, stderr, exitCode] = await Promise.all([
    new Response(child.stdout).text(),
    new Response(child.stderr).text(),
    child.exited,
  ])
  return { stdout, stderr, exitCode }
}

function dest(home, path) {
  return join(home, manifest.installDir, path)
}

function gitText(repo, ...args) {
  return execFileSync("git", ["-C", repo, ...args], { encoding: "utf8" })
}

function gitType(repo, sha) {
  try {
    return gitText(repo, "cat-file", "-t", sha).trim()
  } catch {
    return null
  }
}

function gitBytes(repo, ...args) {
  return execFileSync("git", ["-C", repo, ...args], { encoding: "buffer" })
}

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex")
}

// Post-untrack checkout shape: a clone whose working tree no longer carries
// the payload files (objects for the pinned commit are still present).
async function freshShapeSource(root) {
  const src = join(root, "src")
  execFileSync("git", ["clone", "-q", repoRoot, src], { stdio: ["ignore", "ignore", "ignore"] })
  await Promise.all(manifest.files.map((entry) => rm(join(src, entry.path), { force: true })))
  return src
}

async function expectInstalledFromObjects(home, source) {
  for (const entry of manifest.files) {
    const want = gitBytes(source, "show", `${manifest.commit}:${entry.path}`)
    expect(sha256(want)).toBe(entry.sha256)
    const got = await readFile(dest(home, entry.path))
    expect(got.equals(want)).toBe(true)
    const mode = (await stat(dest(home, entry.path))).mode & 0o777
    expect(mode).toBe(parseInt(entry.mode, 8))
  }
}

test("installs pinned payload into isolated HOME, verified against git objects", async () => {
  const root = await mkdtemp(join(tmpdir(), "dotfiles tools "))
  cleanup.push(root)
  const home = join(root, "home with spaces")
  const src = await freshShapeSource(root)
  // Prove the fresh shape: payload absent from the working tree.
  for (const entry of manifest.files) {
    expect(await stat(join(src, entry.path)).then(() => true, () => false)).toBe(false)
  }

  const first = await run(["--home", home, "--source", src])
  if (first.exitCode !== 0) throw new Error(`${first.stdout}${first.stderr}`)
  expect(first.stdout).toContain("installed")
  await expectInstalledFromObjects(home, src)
})

test("fetches the immutable pin when the source checkout lacks it", async () => {
  const root = await mkdtemp(join(tmpdir(), "dotfiles tools "))
  cleanup.push(root)
  const home = join(root, "home")
  const src = join(root, "shallow")
  execFileSync("git", ["init", "-q", "-b", "main", src])
  execFileSync("git", ["-c", "user.email=tools@test", "-c", "user.name=tools", "-C", src,
    "commit", "--allow-empty", "-qm", "init"])
  expect(gitType(src, manifest.commit)).not.toBe("commit")

  // repoRoot acts as the remote over local transport (no network in tests).
  const result = await run(["--home", home, "--source", src, "--origin", repoRoot])
  if (result.exitCode !== 0) throw new Error(`${result.stdout}${result.stderr}`)
  expect(gitType(src, manifest.commit)).toBe("commit")
  await expectInstalledFromObjects(home, src)
})

test("removed --verify-upstream flag is rejected", async () => {
  const root = await mkdtemp(join(tmpdir(), "dotfiles tools "))
  cleanup.push(root)
  const result = await run(["--home", join(root, "home"), "--source", repoRoot, "--verify-upstream"])
  expect(result.exitCode).not.toBe(0)
  expect(`${result.stdout}${result.stderr}`).toContain("unknown argument")
})

test("refuses to overwrite a modified managed file and names it", async () => {
  const root = await mkdtemp(join(tmpdir(), "dotfiles tools "))
  cleanup.push(root)
  const home = join(root, "home")
  const target = dest(home, "setups/rave_setup.sh")

  const first = await run(["--home", home, "--source", repoRoot])
  if (first.exitCode !== 0) throw new Error(`${first.stdout}${first.stderr}`)
  await writeFile(target, "# user modification\n")

  const second = await run(["--home", home, "--source", repoRoot])
  expect(second.exitCode).not.toBe(0)
  expect(`${second.stdout}${second.stderr}`).toContain(target)
  expect(await readFile(target, "utf8")).toBe("# user modification\n")
})

test("refuses to write through a symlinked managed target", async () => {
  const root = await mkdtemp(join(tmpdir(), "dotfiles tools "))
  cleanup.push(root)
  const home = join(root, "home")
  const outside = join(root, "live-file.txt")
  await writeFile(outside, "live data\n")
  const target = dest(home, "setups/rave_setup.sh")
  await mkdir(dirname(target), { recursive: true })
  await symlink(outside, target)

  const result = await run(["--home", home, "--source", repoRoot])
  expect(result.exitCode).not.toBe(0)
  expect(`${result.stdout}${result.stderr}`).toContain(target)
  expect(await readFile(outside, "utf8")).toBe("live data\n")
})

test("refuses to install under a symlinked managed parent", async () => {
  const root = await mkdtemp(join(tmpdir(), "dotfiles tools "))
  cleanup.push(root)
  const home = join(root, "home")
  const real = join(root, "elsewhere")
  await mkdir(real, { recursive: true })
  const parent = join(home, manifest.installDir, "setups")
  await mkdir(dirname(parent), { recursive: true })
  await symlink(real, parent)

  const result = await run(["--home", home, "--source", repoRoot])
  expect(result.exitCode).not.toBe(0)
  expect(`${result.stdout}${result.stderr}`).toContain(parent)
})

test("idempotent rerun installs nothing and preserves pre-existing files", async () => {
  const root = await mkdtemp(join(tmpdir(), "dotfiles tools "))
  cleanup.push(root)
  const home = join(root, "home")
  const custom = join(home, manifest.installDir, "notes.txt")

  await mkdir(dirname(custom), { recursive: true })
  await writeFile(custom, "user file\n")
  const first = await run(["--home", home, "--source", repoRoot])
  if (first.exitCode !== 0) throw new Error(`${first.stdout}${first.stderr}`)

  const second = await run(["--home", home, "--source", repoRoot])
  if (second.exitCode !== 0) throw new Error(`${second.stdout}${second.stderr}`)
  expect(second.stdout).toContain("0 installed")
  expect(second.stdout).toContain(`${manifest.files.length} unchanged`)
  expect(await readFile(custom, "utf8")).toBe("user file\n")
  for (const entry of manifest.files) {
    expect(second.stdout).toContain(`unchanged ${entry.path}`)
  }
})

test("--check verifies a good install and fails without writing on empty HOME", async () => {
  const root = await mkdtemp(join(tmpdir(), "dotfiles tools "))
  cleanup.push(root)
  const home = join(root, "home")

  const before = await run(["--home", home, "--source", repoRoot, "--check"])
  expect(before.exitCode).not.toBe(0)
  expect(await stat(home).then(() => true, () => false)).toBe(false)

  const install = await run(["--home", home, "--source", repoRoot])
  if (install.exitCode !== 0) throw new Error(`${install.stdout}${install.stderr}`)
  const check = await run(["--home", home, "--source", repoRoot, "--check"])
  if (check.exitCode !== 0) throw new Error(`${check.stdout}${check.stderr}`)
  expect(check.stdout).toContain("verified")
})

test("installed shell payload passes syntax check and alias targets resolve", async () => {
  const root = await mkdtemp(join(tmpdir(), "dotfiles tools "))
  cleanup.push(root)
  const home = join(root, "home")
  const install = await run(["--home", home, "--source", repoRoot])
  if (install.exitCode !== 0) throw new Error(`${install.stdout}${install.stderr}`)

  // Syntax-check only: never execute project launchers.
  for (const entry of manifest.files.filter((file) => file.path.endsWith(".sh"))) {
    const child = Bun.spawn(["bash", "-n", dest(home, entry.path)], { stdout: "pipe", stderr: "pipe" })
    const [stdout, stderr, exitCode] = await Promise.all([
      new Response(child.stdout).text(),
      new Response(child.stderr).text(),
      child.exited,
    ])
    if (exitCode !== 0) throw new Error(`bash -n ${entry.path}: ${stdout}${stderr}`)
  }

  // Every alias pointing into the tools store must resolve to an installed file,
  // and no alias may still point at a payload path inside the repo checkout.
  const aliasFiles = ["macos/zsh/zsh/aliases.zsh", "wsl/zsh/zsh/aliases.zsh"]
  const payloadNames = new Set(manifest.files.map((file) => file.path.split("/").pop()))
  let storeRefs = 0
  for (const aliasFile of aliasFiles) {
    const text = await readFile(join(repoRoot, aliasFile), "utf8")
    for (const match of text.matchAll(/\.local\/share\/dotfiles-tools\/([A-Za-z0-9_./-]+)/g)) {
      storeRefs++
      const target = dest(home, match[1].replace(/["'\s;]+$/, ""))
      const info = await stat(target)
      expect(info.isFile()).toBe(true)
    }
    for (const line of text.split("\n")) {
      if (!line.startsWith("alias ")) continue
      for (const name of payloadNames) {
        expect(line.includes(`~/dotfiles/`) && line.includes(name)).toBe(false)
      }
    }
  }
  expect(storeRefs).toBeGreaterThan(0)
})
