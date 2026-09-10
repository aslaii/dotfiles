#!/usr/bin/env bun
import { chmod, lstat, mkdir, mkdtemp, readFile, readdir, rename, rm, stat, writeFile } from "node:fs/promises"
import { homedir, tmpdir } from "node:os"
import { dirname, isAbsolute, join, relative, resolve } from "node:path"
import { randomUUID } from "node:crypto"
import { fileURLToPath, pathToFileURL } from "node:url"

const sourceRoot = dirname(fileURLToPath(import.meta.url))
const token = "__OMO_HOME__"

function fail(message) {
  throw new Error(`restore: ${message}`)
}

function isObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value)
}

function stableJson(value) {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`
  if (!isObject(value)) return JSON.stringify(value)
  return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`).join(",")}}`
}

function unique(values) {
  const seen = new Set()
  return values.filter((value) => {
    const key = stableJson(value)
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

function packageIdentity(entry) {
  const source = packageSource(entry)
  if (source.startsWith("npm:")) {
    return source.slice(4).replace(/(?!^)@[^@]+$/, "")
  }
  if (source.startsWith("git:")) return source.replace(/@[^/@]+$/, "")
  return source
}

function mergePackages(destination, source) {
  const seen = new Set()
  const result = []
  for (const entry of [...source, ...destination]) {
    const key = packageIdentity(entry)
    if (seen.has(key)) continue
    seen.add(key)
    result.push(structuredClone(entry))
  }
  return result
}

function mergeArrays(destination, source, key, mergeAllArrays) {
  if (key === "packages") return mergePackages(destination, source)
  if (key === "skills") return structuredClone(source)
  if (mergeAllArrays || /(?:skill|path|root)/i.test(key)) return unique([...destination, ...source]).map((value) => structuredClone(value))
  return structuredClone(source)
}

function merge(destination, source, key = "", mergeAllArrays = false) {
  if (Array.isArray(destination) && Array.isArray(source)) {
    return mergeArrays(destination, source, key, mergeAllArrays)
  }
  if (isObject(destination) && isObject(source)) {
    const result = structuredClone(destination)
    for (const [childKey, childValue] of Object.entries(source)) {
      result[childKey] = Object.hasOwn(result, childKey)
        ? merge(result[childKey], childValue, childKey, mergeAllArrays)
        : structuredClone(childValue)
    }
    return result
  }
  return structuredClone(source)
}

function retireManagedNativeConfig(config) {
  for (const [section, names] of [
    [config["[senpi]"]?.agents, ["metis", "momus"]],
    [config["[senpi]"]?.models, ["sisyphus", "prometheus", "atlas", "hephaestus", "planner"]],
    [config.profiles, ["fast", "gpt", "claude", "mixed"]],
  ]) {
    if (!isObject(section)) continue
    for (const name of names) delete section[name]
  }
  return config
}

function mergeHooks(destination, source, home) {
  const result = merge(destination, source, "", true)
  for (const [event, entries] of Object.entries(result.hooks ?? {})) {
    const grouped = new Map()
    for (const { hooks, ...selector } of entries) {
      const key = stableJson(selector)
      const normalized = hooks.map((hook) => {
        const prefix = `${home}/.local/bin/`
        if (hook.command?.startsWith(prefix) && /^(dcg|rtk)( |$)/.test(hook.command.slice(prefix.length))) {
          return { ...hook, command: hook.command.slice(prefix.length) }
        }
        return hook
      })
      grouped.set(key, {
        ...selector,
        hooks: unique([...(grouped.get(key)?.hooks ?? []), ...normalized]),
      })
    }
    result.hooks[event] = [...grouped.values()]
  }
  return result
}

async function lstatOrUndefined(path) {
  try {
    return await lstat(path)
  } catch (error) {
    if (error?.code === "ENOENT") return undefined
    throw error
  }
}

function isWithin(root, path) {
  const pathRelative = relative(root, path)
  return pathRelative === "" || (!pathRelative.startsWith("..") && !isAbsolute(pathRelative))
}

function manifestPath(root, value, label) {
  if (typeof value !== "string" || !value || isAbsolute(value)) fail(`${label} must be a non-empty relative path`)
  const path = resolve(root, value)
  if (!isWithin(root, path)) fail(`${label} escapes its intended root: ${value}`)
  return path
}

async function requireRegularSource(path, label) {
  const info = await lstatOrUndefined(path)
  if (!info) fail(`missing ${label}: ${path}`)
  if (!info.isFile() || info.isSymbolicLink()) fail(`${label} must be a regular file: ${path}`)
}

async function requireDirectorySource(path, label) {
  const info = await lstatOrUndefined(path)
  if (!info) fail(`missing ${label}: ${path}`)
  if (!info.isDirectory() || info.isSymbolicLink()) fail(`${label} must be a directory, not a symlink: ${path}`)
}

async function readSourceText(path, label) {
  await requireRegularSource(path, label)
  return readFile(path, "utf8")
}

function parseJson(text, label, parser = JSON.parse) {
  let parsed
  try {
    parsed = parser(text)
  } catch (error) {
    fail(`invalid ${label}: ${error.message}`)
  }
  if (!isObject(parsed)) fail(`${label} must contain an object`)
  return parsed
}

async function readDestinationObject(path, label, parser = JSON.parse) {
  const info = await lstatOrUndefined(path)
  if (!info || info.isSymbolicLink() || !info.isFile()) return {}
  return parseJson(await readFile(path, "utf8"), label, parser)
}

function parseOptions(args) {
  let home = homedir()
  let skipPackages = false
  for (let index = 0; index < args.length; index++) {
    const arg = args[index]
    if (arg === "--home") {
      home = args[++index]
      if (!home) fail("--home requires a path")
    } else if (arg === "--skip-packages") {
      skipPackages = true
    } else {
      fail(`unknown option: ${arg}`)
    }
  }
  return { home: resolve(home), skipPackages }
}

async function prepareHome(home) {
  const info = await lstatOrUndefined(home)
  if (!info) {
    await mkdir(home, { recursive: true })
    return
  }
  if (!info.isDirectory() || info.isSymbolicLink()) fail(`--home must be a real directory, not a symlink: ${home}`)
}

async function createBackupRoot(state) {
  if (state.backupRoot) return state.backupRoot

  const omo = join(state.home, ".omo")
  const omoInfo = await lstatOrUndefined(omo)
  if (omoInfo && (!omoInfo.isDirectory() || omoInfo.isSymbolicLink())) {
    fail(`refusing to replace the OMO directory or its state: ${omo}`)
  }

  if (!omoInfo) await mkdir(omo)
  const backups = join(omo, "backups")
  const backupsInfo = await lstatOrUndefined(backups)
  if (backupsInfo && (!backupsInfo.isDirectory() || backupsInfo.isSymbolicLink())) {
    fail(`refusing to write backups through non-directory path: ${backups}`)
  }
  const root = join(backups, randomUUID())
  await mkdir(root, { recursive: true })
  state.backupRoot = root
  return root
}

async function backup(path, state) {
  const info = await lstatOrUndefined(path)
  if (!info) return
  if (!isWithin(state.home, path)) fail(`refusing to back up path outside home: ${path}`)
  const root = await createBackupRoot(state)
  const target = join(root, relative(state.home, path))
  await mkdir(dirname(target), { recursive: true })
  await rename(path, target)
}

async function prepareParent(path, state) {
  if (!isWithin(state.home, path)) fail(`refusing to write outside home: ${path}`)
  const parts = relative(state.home, dirname(path)).split(/[/\\]/).filter(Boolean)
  let current = state.home
  for (const part of parts) {
    current = join(current, part)
    const info = await lstatOrUndefined(current)
    if (!info) {
      await mkdir(current)
      continue
    }
    if (info.isDirectory() && !info.isSymbolicLink()) continue
    if (info.isSymbolicLink()) fail(`refusing to modify files through directory symlink: ${current}`)
    await backup(current, state)
    if (!await lstatOrUndefined(current)) await mkdir(current)
  }
}

async function ensureDirectory(path, state) {
  const info = await lstatOrUndefined(path)
  if (info?.isDirectory() && !info.isSymbolicLink()) return
  if (info?.isSymbolicLink() && (await stat(path)).isDirectory()) return
  await prepareParent(path, state)
  if (info) await backup(path, state)
  if (!await lstatOrUndefined(path)) await mkdir(path)
}

function sameBytes(left, right) {
  return left.byteLength === right.byteLength && Buffer.from(left).equals(Buffer.from(right))
}

async function writeManagedFile(path, bytes, state, mode) {
  const info = await lstatOrUndefined(path)
  if (info?.isFile() && sameBytes(await readFile(path), bytes)) {
    if (mode !== undefined && (info.mode & 0o777) !== mode) {
      await prepareParent(path, state)
      await chmod(path, mode)
    }
    return
  }
  await prepareParent(path, state)
  if (info) {
    await backup(path, state)
  }
  await writeFile(path, bytes)
  if (mode !== undefined) await chmod(path, mode)
}

function textWithHome(bytes, home) {
  for (const byte of bytes) {
    if (byte === 0 || byte < 7 || (byte > 13 && byte < 32)) return bytes
  }
  let text
  try {
    text = new TextDecoder("utf-8", { fatal: true }).decode(bytes)
  } catch {
    return bytes
  }
  return Buffer.from(text.replaceAll(token, home))
}

function rebaseSkillRefs(bytes, home) {
  let text
  try {
    text = new TextDecoder("utf-8", { fatal: true }).decode(bytes)
  } catch {
    return bytes
  }
  if (!text.includes(".codex/skills") && !text.includes(".agents/skills")) return bytes
  const codex = `${home}/.omo/agent/skill-library/codex`
  const shared = `${home}/.omo/agent/skill-library/shared`
  for (const [oldRoot, newRoot] of [
    [`${home}/.codex/skills`, codex],
    [`${home}/.agents/skills`, shared],
    ["~/.codex/skills", codex],
    ["~/.agents/skills", shared],
    ["$HOME/.codex/skills", codex],
    ["$HOME/.agents/skills", shared],
    ["${HOME}/.codex/skills", codex],
    ["${HOME}/.agents/skills", shared],
  ]) {
    text = text.replaceAll(oldRoot, newRoot)
  }
  return Buffer.from(text)
}

function decodeBase64(bytes, label) {
  const encoded = Buffer.from(bytes).toString("ascii").replace(/\s/g, "")
  if (encoded.length % 4 === 1 || !/^[A-Za-z0-9+/]*={0,2}$/.test(encoded)) {
    fail(`invalid base64 payload: ${label}`)
  }
  return Buffer.from(encoded, "base64")
}

async function copyDirectory(source, target, state, rebase = false, excludedTop = undefined) {
  await ensureDirectory(target, state)
  const entries = (await readdir(source, { withFileTypes: true })).sort((left, right) => left.name.localeCompare(right.name))
  const outputNames = new Set()
  for (const entry of entries) {
    const name = entry.isFile() && entry.name.endsWith(".b64") ? entry.name.slice(0, -4) : entry.name
    if (excludedTop?.has(name)) continue
    if (!name || outputNames.has(name)) fail(`resource has conflicting output paths: ${source}/${name}`)
    outputNames.add(name)
  }

  for (const entry of entries) {
    const sourcePath = join(source, entry.name)
    const targetName = entry.isFile() && entry.name.endsWith(".b64") ? entry.name.slice(0, -4) : entry.name
    if (excludedTop?.has(targetName)) continue
    const targetPath = join(target, targetName)
    const info = await lstat(sourcePath)
    if (info.isSymbolicLink()) fail(`resource snapshots cannot contain symlinks: ${sourcePath}`)
    if (info.isDirectory()) {
      await copyDirectory(sourcePath, targetPath, state, rebase)
    } else if (info.isFile()) {
      const contents = await readFile(sourcePath)
      const staged = entry.name.endsWith(".b64") ? decodeBase64(contents, sourcePath) : textWithHome(contents, state.home)
      const bytes = rebase && !entry.name.endsWith(".b64") ? rebaseSkillRefs(staged, state.home) : staged
      await writeManagedFile(targetPath, bytes, state, info.mode & 0o777)
    } else {
      fail(`resource contains unsupported entry: ${sourcePath}`)
    }
  }
}

async function assertNoSymlinkParent(path, state) {
  const parent = dirname(path)
  const rel = relative(state.home, parent)
  if (rel === "") return
  if (rel.startsWith("..") || isAbsolute(rel)) fail(`refusing to prune path outside home: ${path}`)
  let current = state.home
  for (const part of rel.split("/").filter(Boolean)) {
    current = join(current, part)
    const info = await lstatOrUndefined(current)
    if (!info) return
    if (info.isSymbolicLink()) fail(`refusing to modify files through directory symlink: ${current}`)
    if (!info.isDirectory()) fail(`refusing to prune through non-directory parent: ${current}`)
  }
}

async function retireLegacySkillLibraries(state) {
  for (const relativePath of [
    ".omo/agent/skill-library/codex",
    ".omo/agent/skill-library/shared",
  ]) {
    const target = manifestPath(state.home, relativePath, "legacy skill library")
    await assertNoSymlinkParent(target, state)
    await backup(target, state)
  }
}

async function pruneExcludedSkills(target, excluded, state) {
  for (const name of excluded) {
    const victim = join(target, name)
    if (!isWithin(state.home, victim)) fail(`refusing to prune path outside home: ${victim}`)
    await assertNoSymlinkParent(victim, state)
    const info = await lstatOrUndefined(victim)
    if (!info) continue
    await backup(victim, state)
  }
}

async function gitBytes(args) {
  const child = Bun.spawn(["git", ...args], { stdout: "pipe", stderr: "pipe" })
  const [stdout, stderr, exitCode] = await Promise.all([
    new Response(child.stdout).arrayBuffer(),
    new Response(child.stderr).text(),
    child.exited,
  ])
  if (exitCode !== 0) fail(`git ${args.join(" ")} failed: ${stderr.trim()}`)
  return Buffer.from(stdout)
}

async function hasLocalCommit(dir, commit) {
  try {
    const child = Bun.spawn(["git", "-C", dir, "cat-file", "-t", commit], { stdout: "pipe", stderr: "pipe" })
    const [stdout, , exitCode] = await Promise.all([
      new Response(child.stdout).text(),
      new Response(child.stderr).text(),
      child.exited,
    ])
    return exitCode === 0 && stdout.trim() === "commit"
  } catch {
    return false
  }
}

function validateSkillSource(value) {
  if (value === undefined) return undefined
  if (!isObject(value)) fail("restore.json skillSource must be an object")
  const { repository, commit, tree, prefix, snapshots } = value
  if (typeof repository !== "string" || !repository) fail("restore.json skillSource.repository is required")
  if (typeof commit !== "string" || !/^[0-9a-f]{40}$/.test(commit)) fail("restore.json skillSource.commit must be a full commit sha")
  if (typeof tree !== "string" || !/^[0-9a-f]{40}$/.test(tree)) fail("restore.json skillSource.tree must be a full tree sha")
  if (typeof prefix !== "string" || !prefix || isAbsolute(prefix)) fail("restore.json skillSource.prefix must be a non-empty relative path")
  if (prefix.split("/").includes("..") || prefix.split("/").some((part) => !part)) fail(`restore.json skillSource.prefix is not a safe relative path: ${prefix}`)
  if (!Array.isArray(snapshots) || snapshots.length === 0) fail("restore.json skillSource.snapshots must be a non-empty array")
  const normalized = []
  for (const [index, entry] of snapshots.entries()) {
    if (!isObject(entry)) fail(`restore.json skillSource.snapshots[${index}] must be an object`)
    if (typeof entry.source !== "string" || !entry.source || isAbsolute(entry.source)) fail(`restore.json skillSource.snapshots[${index}].source must be a non-empty relative path`)
    if (entry.source.split("/").includes("..") || entry.source.split("/").some((part) => !part)) fail(`restore.json skillSource.snapshots[${index}].source escapes its root: ${entry.source}`)
    if (typeof entry.target !== "string" || !entry.target || isAbsolute(entry.target)) fail(`restore.json skillSource.snapshots[${index}].target must be a non-empty relative path`)
    if (entry.target.split("/").includes("..") || entry.target.split("/").some((part) => !part)) fail(`restore.json skillSource.snapshots[${index}].target escapes home: ${entry.target}`)
    if (!entry.target.startsWith(".omo/")) fail(`restore.json skillSource.snapshots[${index}].target must stay inside .omo/: ${entry.target}`)
    let excluded = []
    if (entry.excluded !== undefined) {
      if (!Array.isArray(entry.excluded)) fail(`restore.json skillSource.snapshots[${index}].excluded must be an array`)
      for (const [excludedIndex, name] of entry.excluded.entries()) {
        if (typeof name !== "string" || !/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(name)) fail(`restore.json skillSource.snapshots[${index}].excluded[${excludedIndex}] must be a simple skill name: ${String(name)}`)
      }
      excluded = [...new Set(entry.excluded)]
    }
    normalized.push({ source: entry.source, target: entry.target, excluded })
  }
  return { repository, commit, tree, prefix, snapshots: normalized }
}

async function materializeSkillSource(skillSource) {
  const tempDir = await mkdtemp(join(tmpdir(), "omo-skills-"))
  try {
    let scope
    if (await hasLocalCommit(sourceRoot, skillSource.commit)) {
      const toplevel = (await gitBytes(["-C", sourceRoot, "rev-parse", "--show-toplevel"])).toString("utf8").trim()
      if (!toplevel) fail("could not locate repository top level for pinned skills")
      scope = ["-C", toplevel]
    } else {
      const gitDir = join(tempDir, "fetch.git")
      await gitBytes(["init", "--bare", gitDir])
      await gitBytes(["--git-dir", gitDir, "fetch", "--depth", "1", skillSource.repository, skillSource.commit])
      scope = ["--git-dir", gitDir]
    }
    const actualTree = (await gitBytes([...scope, "rev-parse", `${skillSource.commit}:${skillSource.prefix}`])).toString("utf8").trim()
    if (actualTree !== skillSource.tree) fail(`skill pin mismatch for ${skillSource.prefix}: ${actualTree} != pinned ${skillSource.tree}`)
    const listing = (await gitBytes(["-c", "core.quotePath=false", ...scope, "ls-tree", "-r", skillSource.commit, "--", skillSource.prefix])).toString("utf8")
    const payloadRoot = join(tempDir, "payload")
    const modes = new Map()
    for (const line of listing.split("\n")) {
      if (!line) continue
      const tab = line.indexOf("\t")
      if (tab === -1) fail(`unexpected ls-tree line: ${line}`)
      const [mode, type] = line.slice(0, tab).split(" ")
      const path = line.slice(tab + 1)
      if (type !== "blob") fail(`skill snapshots cannot contain non-file entry: ${path}`)
      if (mode === "120000" || mode === "160000") fail(`skill snapshots cannot contain symlinks: ${path}`)
      if (path !== skillSource.prefix && !path.startsWith(`${skillSource.prefix}/`)) fail(`skill entry escapes prefix: ${path}`)
      if (!isWithin(payloadRoot, join(payloadRoot, path))) fail(`skill entry escapes payload: ${path}`)
      modes.set(path, parseInt(mode, 8) & 0o777)
    }
    if (modes.size === 0) fail(`skill pin contains no files: ${skillSource.prefix}`)
    const archive = await gitBytes([...scope, "archive", skillSource.commit, "--", skillSource.prefix])
    await mkdir(payloadRoot, { recursive: true })
    let tar
    try {
      tar = Bun.spawn(["tar", "-x", "-C", payloadRoot], { stdin: "pipe", stdout: "pipe", stderr: "pipe" })
    } catch {
      fail("tar is required to extract the pinned skill snapshot")
    }
    tar.stdin.write(archive)
    tar.stdin.end()
    const [tarStderr, tarExit] = await Promise.all([new Response(tar.stderr).text(), tar.exited])
    if (tarExit !== 0) fail(`tar extraction failed: ${tarStderr.trim()}`)
    for (const [path, mode] of modes) {
      await chmod(join(payloadRoot, path), mode)
    }
    return { tempDir, payloadRoot }
  } catch (error) {
    await rm(tempDir, { recursive: true, force: true })
    throw error
  }
}

async function verifyOmo(version) {
  let child
  try {
    child = Bun.spawn(["omo", "--version"], { stdout: "pipe", stderr: "pipe" })
  } catch {
    fail(`OMO ${version} is required. Install it with: npm install -g omo-ai@${version}`)
  }
  const [stdout, stderr, exitCode] = await Promise.all([
    new Response(child.stdout).text(),
    new Response(child.stderr).text(),
    child.exited,
  ])
  const found = `${stdout}\n${stderr}`.match(/omo\s+([^\s]+)/i)?.[1]
  if (exitCode !== 0 || found !== version) {
    const actual = found ? `found ${found}` : "omo was not runnable"
    fail(`OMO ${version} is required (${actual}). Install it with: npm install -g omo-ai@${version}`)
  }
}

async function builtinRoot() {
  let child
  try {
    child = Bun.spawn(["npm", "root", "-g"], { stdout: "pipe", stderr: "pipe" })
  } catch {
    fail("npm is required to locate the installed omo-ai package")
  }
  const [stdout, stderr, exitCode] = await Promise.all([
    new Response(child.stdout).text(),
    new Response(child.stderr).text(),
    child.exited,
  ])
  const npmRoot = stdout.trim()
  if (exitCode !== 0 || !npmRoot) fail(`could not locate npm global root: ${stderr.trim()}`)
  let root = resolve(npmRoot, "omo-ai/node_modules/@code-yeongyu/senpi/dist/core/extensions/builtin")
  if (!(await lstatOrUndefined(join(root, "tps.js")))) {
    root = resolve(process.env.BUN_INSTALL || join(homedir(), ".bun"), "install/global/node_modules/@code-yeongyu/senpi/dist/core/extensions/builtin")
  }
  await requireDirectorySource(root, "installed OMO builtin extensions")
  return root
}

async function installBuiltinExtensions(extensions, state) {
  if (!Array.isArray(extensions) || extensions.some((extension) => typeof extension !== "string" || !extension)) {
    fail("restore.json builtinExtensions must be an array of names")
  }
  const root = await builtinRoot()
  for (const extension of extensions) {
    if (!/^[A-Za-z0-9_-]+$/.test(extension)) fail(`invalid builtin extension name: ${extension}`)
    const source = join(root, `${extension}.js`)
    await requireRegularSource(source, `installed builtin extension ${extension}`)
    const loader = `// Generated by omo. Delete this file to stop loading the default global extension.\nexport { default } from ${JSON.stringify(pathToFileURL(source).href)};\n`
    await writeManagedFile(join(state.home, ".omo", "agent", "extensions", `${extension}.js`), Buffer.from(loader), state)
  }
}

function packageSource(entry) {
  if (typeof entry === "string" && entry) return entry
  if (!isObject(entry)) fail("settings.packages entries must be strings or package objects")
  if (typeof entry.source === "string" && entry.source) return entry.source
  fail("settings.packages entry is missing source")
}

async function installPackages(packages, state) {
  for (const entry of packages) {
    const source = packageSource(entry)
    const child = Bun.spawn(["omo", "install", source], {
      cwd: state.home,
      stdout: "inherit",
      stderr: "inherit",
      env: {
        ...process.env,
        HOME: state.home,
        OMO_CONFIG_DIR: join(state.home, ".omo"),
        OMO_CODING_AGENT_DIR: join(state.home, ".omo", "agent"),
        SENPI_CODING_AGENT_DIR: join(state.home, ".omo", "agent"),
        PI_CODING_AGENT_DIR: join(state.home, ".omo", "agent"),
      },
    })
    if (await child.exited !== 0) fail(`failed to install portable package: ${source}`)
  }
}

async function restore() {
  const { home, skipPackages } = parseOptions(process.argv.slice(2))

  const manifestFile = manifestPath(sourceRoot, "restore.json", "restore manifest")
  const manifest = parseJson(await readSourceText(manifestFile, "restore manifest"), "restore manifest")
  if (typeof manifest.omoVersion !== "string" || !manifest.omoVersion) fail("restore.json omoVersion is required")
  if (!Array.isArray(manifest.resources)) fail("restore.json resources must be an array")
  const skillSource = validateSkillSource(manifest.skillSource)
  const resources = []
  for (const [index, resource] of manifest.resources.entries()) {
    if (!isObject(resource)) fail(`restore.json resources[${index}] must be an object`)
    const source = manifestPath(sourceRoot, resource.source, `resources[${index}].source`)
    const target = manifestPath(home, resource.target, `resources[${index}].target`)
    const info = await lstatOrUndefined(source)
    if (!info) fail(`missing resource source ${resource.source}: ${source}`)
    if (info.isSymbolicLink() || (!info.isDirectory() && !info.isFile())) {
      fail(`resource source must be a regular file or directory, not a symlink: ${source}`)
    }
    resources.push({ source, target, info })
  }
  await verifyOmo(manifest.omoVersion)

  let staging = undefined
  try {
    if (skillSource) staging = await materializeSkillSource(skillSource)
    await prepareHome(home)
    const state = { home, backupRoot: undefined }
    if (!skillSource) await retireLegacySkillLibraries(state)
    const omoSource = manifestPath(sourceRoot, "omo.jsonc", "portable omo config")
    const settingsSource = manifestPath(sourceRoot, "agent/settings.json", "portable agent settings")
    const hooksSource = manifestPath(sourceRoot, "agent/hooks.json", "portable agent hooks")
    const portableOmo = parseJson((await readSourceText(omoSource, "portable omo config")).replaceAll(token, home), "portable omo config", Bun.JSONC.parse)
    const portableSettings = parseJson((await readSourceText(settingsSource, "portable agent settings")).replaceAll(token, home), "portable agent settings")
    const portableHooks = parseJson((await readSourceText(hooksSource, "portable agent hooks")).replaceAll(token, home), "portable agent hooks")

    const omoTarget = join(home, ".omo", "omo.jsonc")
    const settingsTarget = join(home, ".omo", "agent", "settings.json")
    const hooksTarget = join(home, ".omo", "agent", "hooks.json")
    const existingOmo = retireManagedNativeConfig(await readDestinationObject(omoTarget, "existing omo config", Bun.JSONC.parse))
    const mergedOmo = merge(existingOmo, portableOmo)
    const mergedSettings = merge(await readDestinationObject(settingsTarget, "existing agent settings"), portableSettings)
    const mergedHooks = mergeHooks(await readDestinationObject(hooksTarget, "existing agent hooks"), portableHooks, home)
    await writeManagedFile(omoTarget, Buffer.from(`${JSON.stringify(mergedOmo, null, 2)}\n`), state)
    await writeManagedFile(settingsTarget, Buffer.from(`${JSON.stringify(mergedSettings, null, 2)}\n`), state)
    await writeManagedFile(hooksTarget, Buffer.from(`${JSON.stringify(mergedHooks, null, 2)}\n`), state)

    for (const resource of resources) {
      if (resource.info.isDirectory()) {
        await copyDirectory(resource.source, resource.target, state)
      } else {
        const bytes = textWithHome(await readFile(resource.source), state.home)
        await writeManagedFile(resource.target, bytes, state, resource.info.mode & 0o777)
      }
    }

    if (staging) {
      for (const [index, snapshot] of skillSource.snapshots.entries()) {
        const source = join(staging.payloadRoot, skillSource.prefix, snapshot.source)
        const target = manifestPath(home, snapshot.target, `skillSource.snapshots[${index}].target`)
        const excluded = Array.isArray(snapshot.excluded) ? snapshot.excluded : []
        await requireDirectorySource(source, `skill snapshot ${snapshot.source}`)
        await copyDirectory(source, target, state, true, new Set(excluded))
        await pruneExcludedSkills(target, excluded, state)
      }
    }

    await installBuiltinExtensions(manifest.builtinExtensions, state)
    if (!skipPackages) await installPackages(Array.isArray(portableSettings.packages) ? portableSettings.packages : [], state)
    console.log(`Restored OMO configuration into ${home}${skipPackages ? " (packages skipped)" : ""}.`)
  } finally {
    if (staging) await rm(staging.tempDir, { recursive: true, force: true })
  }
}

restore().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
})
