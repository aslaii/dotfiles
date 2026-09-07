#!/usr/bin/env node
// scripts/restore-tools.mjs — reinstall project-specific tooling from a pinned
// git commit into ~/.local/share/dotfiles-tools.
//
// The payload (project launchers + helpers listed in tools-source.json) is
// being untracked from this repo but must keep working via the zsh aliases.
// This installer fetches exact bytes with `git show <commit>:<path>` from a
// source checkout (no clone/checkout bloat, no remote writes), verifies
// sha256 + blob id against the manifest, and writes files idempotently.
//
// Source guarantees:
// - The pinned commit is immutable. If the source checkout does not contain
//   it (e.g. a shallow clone), it is fetched by exact sha from the manifest
//   repository (overridable with --origin). Nothing is ever read from the
//   source working tree, so this keeps working after the payload is
//   untracked.
// - Existing managed files are never silently overwritten: a managed path
//   whose bytes differ from the pin aborts the run naming the path.
// - Symlinks in the managed tree (parents, install root, or targets) are
//   refused so the installer cannot write through to unrelated live files.
// - Nothing under the install dir is ever deleted.
//
// Usage:
//   node scripts/restore-tools.mjs [--home DIR] [--source REPO]
//                                   [--origin URL] [--check]
//   --home DIR   install into DIR (default: $HOME)
//   --source     git checkout to read/fetch objects from (default: this repo)
//   --origin     remote to fetch the pinned commit from when absent
//                (default: manifest repository)
//   --check      verify installed files, write nothing
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { chmodSync, lstatSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const manifestPath = join(scriptDir, "tools-source.json");

function fail(message) {
  console.error(`restore-tools: error: ${message}`);
  process.exit(1);
}

function parseArgs(argv) {
  const opts = { home: homedir(), source: null, origin: null, check: false };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--home" && argv[i + 1]) opts.home = argv[++i];
    else if (arg === "--source" && argv[i + 1]) opts.source = argv[++i];
    else if (arg === "--origin" && argv[i + 1]) opts.origin = argv[++i];
    else if (arg === "--check") opts.check = true;
    else if (arg === "--help" || arg === "-h") {
      console.log("Usage: restore-tools.mjs [--home DIR] [--source REPO] [--origin URL] [--check]");
      process.exit(0);
    } else fail(`unknown argument: ${arg}`);
  }
  return opts;
}

function git(source, ...args) {
  try {
    return execFileSync("git", ["-C", source, ...args], { encoding: "buffer", stdio: ["ignore", "pipe", "pipe"] });
  } catch (error) {
    fail(`git ${args.join(" ")} failed in ${source}: ${String(error.stderr ?? error.message).trim() || error.message}`);
  }
}

function objectType(source, sha) {
  try {
    return execFileSync("git", ["-C", source, "cat-file", "-t", sha],
      { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
  } catch {
    return null;
  }
}

function ensurePin(source, commit, origin) {
  if (objectType(source, commit) === "commit") return;
  if (typeof origin !== "string" || !origin) {
    fail(`pinned commit ${commit} is absent in ${source} and no origin is configured to fetch it from`);
  }
  console.log(`restore-tools: fetching pinned commit ${commit} from ${origin}`);
  try {
    execFileSync("git", ["-C", source, "fetch", "--no-tags", origin, commit],
      { stdio: ["ignore", "pipe", "pipe"] });
  } catch (error) {
    fail(`cannot fetch pinned commit ${commit} from ${origin}: ${String(error.stderr ?? error.message).trim() || error.message}`);
  }
  if (objectType(source, commit) !== "commit") {
    fail(`fetch did not produce pinned commit ${commit} (source: ${source}, origin: ${origin})`);
  }
}

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function lstatOrNull(path) {
  try {
    return lstatSync(path);
  } catch (error) {
    if (error.code === "ENOENT") return null;
    throw error;
  }
}

function main() {
  const opts = parseArgs(process.argv.slice(2));
  const home = resolve(opts.home);
  const source = opts.source ? resolve(opts.source) : resolve(scriptDir, "..");

  let manifest;
  try {
    manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  } catch (error) {
    fail(`cannot read manifest ${manifestPath}: ${error.message}`);
  }
  const { commit, files, installDir } = manifest;
  if (typeof commit !== "string" || !/^[0-9a-f]{40}$/.test(commit)) fail("manifest commit must be a full sha");
  if (!Array.isArray(files) || files.length === 0) fail("manifest files must be a non-empty array");
  if (typeof installDir !== "string" || !installDir || installDir.startsWith("/")) fail("manifest installDir must be a relative path");

  try {
    execFileSync("git", ["-C", source, "rev-parse", "--git-dir"], { stdio: ["ignore", "ignore", "ignore"] });
  } catch {
    fail(`source is not a git repository: ${source}`);
  }
  if (opts.check && objectType(source, commit) !== "commit") {
    fail(`--check: pinned commit ${commit} is missing; run restoration first`);
  }
  ensurePin(source, commit, opts.origin || manifest.repository);

  const destRoot = join(home, installDir);
  let installed = 0;
  let unchanged = 0;
  for (const [index, entry] of files.entries()) {
    const { path, mode, sha256: expected, blob } = entry;
    if (typeof path !== "string" || !path || path.startsWith("/") || path.split("/").includes("..")) {
      fail(`files[${index}].path is not a safe relative path: ${JSON.stringify(path)}`);
    }
    if (mode !== "755" && mode !== "644") fail(`files[${index}].mode must be "755" or "644": ${path}`);
    if (typeof expected !== "string" || !/^[0-9a-f]{64}$/.test(expected)) fail(`files[${index}].sha256 invalid: ${path}`);

    const bytes = git(source, "show", `${commit}:${path}`);
    if (sha256(bytes) !== expected) fail(`integrity mismatch for ${path}: sha256 differs from manifest`);
    if (typeof blob === "string" && blob) {
      const actual = execFileSync("git", ["hash-object", "-t", "blob", "--stdin"],
        { input: bytes, encoding: "utf8" }).trim();
      if (actual !== blob) fail(`integrity mismatch for ${path}: blob ${actual} != manifest ${blob}`);
    }

    const dest = join(destRoot, path);
    const resolvedDest = resolve(dest);
    const resolvedRoot = resolve(destRoot);
    if (resolvedDest !== resolvedRoot && !resolvedDest.startsWith(resolvedRoot + sep)) {
      fail(`install target escapes install dir: ${path}`);
    }

    // Refuse symlink ancestry (install root and every managed parent) so a
    // pre-existing link cannot redirect writes to unrelated live files.
    const ancestors = [destRoot];
    {
      let cursor = destRoot;
      for (const part of relative(destRoot, dirname(dest)).split(sep).filter(Boolean)) {
        cursor = join(cursor, part);
        ancestors.push(cursor);
      }
    }
    for (const ancestor of ancestors) {
      const st = lstatOrNull(ancestor);
      if (st && st.isSymbolicLink()) fail(`refusing: symlink in managed path: ${ancestor}`);
      if (ancestor === destRoot && st && !st.isDirectory()) {
        fail(`refusing: install root is not a directory: ${ancestor}`);
      }
    }
    const current = lstatOrNull(dest);
    if (current && current.isSymbolicLink()) fail(`refusing: managed target is a symlink: ${dest}`);
    if (current && !current.isFile()) fail(`refusing: managed target is not a regular file: ${dest}`);
    const bytesOk = current ? readFileSync(dest).equals(bytes) : false;
    const modeOk = current ? (current.mode & 0o777).toString(8) === mode : false;
    if (opts.check) {
      if (!current) fail(`--check: missing ${dest}`);
      if (!bytesOk) fail(`--check: ${path} differs from pinned source`);
      if (!modeOk) {
        fail(`--check: ${path} mode ${(current.mode & 0o777).toString(8)} != ${mode}`);
      }
      console.log(`  verified ${path}`);
      unchanged++;
      continue;
    }
    if (current && !bytesOk) {
      fail(`refusing to overwrite modified file (move it aside or delete it to reinstall): ${dest}`);
    }
    if (current && modeOk) {
      console.log(`  unchanged ${path}`);
      unchanged++;
      continue;
    }
    mkdirSync(dirname(dest), { recursive: true });
    if (!current) writeFileSync(dest, bytes);
    chmodSync(dest, parseInt(mode, 8));
    console.log(`  installed ${path}`);
    installed++;
  }

  console.log(`restore-tools: done — ${installed} installed, ${unchanged} unchanged -> ${destRoot}`);
}

main();
