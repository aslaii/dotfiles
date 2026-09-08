#!/usr/bin/env bash
# omo/launch.sh - isolated OMO launcher.
# Resolves the globally npm-installed omo-ai package (never a Bun-installed
# `omo` from PATH).
# Always --no-skills plus one explicit --skill per allowed native agent,
# bundled omo-ai, and active-package skill. Imported snapshots and skill names
# matching caveman/caveman-* or cavecrew are never passed to OMO.
# Fails closed on Claude MCP import (global + project .omo/mcp.json) and on
# missing settings/bundled skills. Never passes --no-extensions.
# Residual (honest, out of skills/MCP/plugins scope): context discovery still
# falls back to CLAUDE.md and the rules engine still scans .claude/rules
# alongside .omo/rules and AGENTS.md.

set -euo pipefail

trim() {
  local v="$1"
  v="${v#"${v%%[![:space:]]*}"}"
  v="${v%"${v##*[![:space:]]}"}"
  printf '%s' "$v"
}

AGENT_DIR=""
for var in OMO_CODING_AGENT_DIR SENPI_CODING_AGENT_DIR PI_CODING_AGENT_DIR; do
  v="${!var-}"
  v="$(trim "$v")"
  if [[ -n "$v" ]]; then
    if [[ "$v" == /* ]]; then AGENT_DIR="$v"; else AGENT_DIR="$PWD/$v"; fi
    break
  fi
done
[[ -z "$AGENT_DIR" ]] && AGENT_DIR="${HOME:?HOME is required}/.omo/agent"

NPM_ROOT="$(npm root -g 2>/dev/null || true)"
NPM_PKG="$NPM_ROOT/omo-ai"
[[ -n "$NPM_ROOT" && -f "$NPM_PKG/bin/omo.js" ]] || { echo "omo/launch.sh: globally npm-installed omo-ai not found; run: npm i -g omo-ai@beta" >&2; exit 127; }
OMO_BIN="$NPM_PKG/bin/omo.js"
# In-process extensions (omo/fast.mjs) resolve Senpi from OMO_BIN, keeping
# them on the selected npm package. The omo launcher itself overwrites
# OMO_BIN for its own children.
export OMO_BIN

if [[ -n "${OMO_BUNDLED_SKILLS_DIR-}" ]]; then
  BUNDLED_SKILLS="$OMO_BUNDLED_SKILLS_DIR"
else
  # Bundled skills always come from the selected npm package.
  BUNDLED_SKILLS="$NPM_PKG/plugin/skills"
fi
[[ -d "${BUNDLED_SKILLS-}" ]] || { echo "omo/launch.sh: bundled OMO skills not found in $NPM_PKG; run: npm i -g omo-ai@beta" >&2; exit 127; }
[[ -f "$AGENT_DIR/settings.json" ]] || { echo "omo/launch.sh: missing $AGENT_DIR/settings.json" >&2; exit 127; }

# Fail closed on Claude MCP import (parsed JSON, global + project).
export OMO_LAUNCH_AGENT_DIR="$AGENT_DIR"
if ! node -e '
const fs = require("fs"), path = require("path");
const agentDir = process.env.OMO_LAUNCH_AGENT_DIR;
const files = [path.join(agentDir, "mcp.json"), path.join(process.cwd(), ".omo", "mcp.json")];
for (const f of files) {
  let raw;
  try { raw = fs.readFileSync(f, "utf8"); } catch { continue; }
  let data;
  try { data = JSON.parse(raw); } catch (e) { console.error(`omo/launch.sh: invalid JSON: ${f}: ${e.message}`); process.exit(1); }
  const list = data?.settings?.importConfigs;
  if (Array.isArray(list) && list.includes("claude")) {
    console.error(`omo/launch.sh: refusing: ${f} imports Claude MCP (settings.importConfigs includes "claude")`);
    process.exit(1);
  }
}
'; then
  exit 1
fi

# Candidate roots: native agent + bundled OMO + active package skills only.
SKILL_ROOTS=()
[[ -d "$AGENT_DIR/skills" ]] && SKILL_ROOTS+=("$AGENT_DIR/skills")
SKILL_ROOTS+=("$BUNDLED_SKILLS")

while IFS= read -r d; do
  [[ -z "$d" ]] && continue
  [[ -d "$d" ]] && SKILL_ROOTS+=("$d")
done < <(OMO_LAUNCH_AGENT_DIR="$AGENT_DIR" node -e '
const fs = require("fs"), path = require("path");
const agentDir = process.env.OMO_LAUNCH_AGENT_DIR;
let settings;
try { settings = JSON.parse(fs.readFileSync(path.join(agentDir, "settings.json"), "utf8")); }
catch (e) { console.error(`omo/launch.sh: invalid settings.json: ${e.message}`); process.exit(1); }
const pkgs = Array.isArray(settings.packages) ? settings.packages : [];
const out = [];
const npmBase = path.join(agentDir, "npm", "node_modules");
const gitBase = path.join(agentDir, "git");
for (const entry of pkgs) {
  const src = typeof entry === "string" ? entry : entry?.source;
  if (typeof src !== "string" || !src) continue;
  if (src.startsWith("npm:")) {
    let spec = src.slice(4);
    const at = spec.lastIndexOf("@");
    if (at > 0) spec = spec.slice(0, at);
    if (spec) out.push(path.join(npmBase, spec, "skills"));
  } else if (src.startsWith("git:")) {
    let rest = src.slice(4);
    const at = rest.lastIndexOf("@");
    if (at > 0 && rest.slice(at + 1).match(/^[A-Za-z0-9._\-\/]+$/)) {
      const maybeRef = rest.slice(at + 1);
      if (!maybeRef.includes("/") || maybeRef.match(/^[v0-9a-f]{4,}/)) rest = rest.slice(0, at);
    }
    rest = rest.replace(/^ssh:\/\//, "").replace(/^https?:\/\//, "").replace(/^git@/, "").replace(/:/, "/");
    if (rest) out.push(path.join(gitBase, rest, "skills"));
  } else if (src.startsWith("/") || src.startsWith("./") || src.startsWith("../")) {
    const base = path.resolve(agentDir, src);
    try { if (fs.statSync(base).isDirectory()) out.push(path.join(base, "skills")); } catch {}
  }
}
console.log(out.join("\n"));
' || exit 1)

is_forbidden_skill_name() {
  case "$1" in
    caveman|caveman-*|cavecrew) return 0 ;;
    *) return 1 ;;
  esac
}

ARGS=(--no-skills)
for root in "${SKILL_ROOTS[@]}"; do
  if [[ -f "$root/SKILL.md" ]] && ! is_forbidden_skill_name "$(basename "$root")"; then
    ARGS+=(--skill "$root")
  fi
  while IFS= read -r -d '' d; do
    [[ -f "$d/SKILL.md" ]] || continue
    is_forbidden_skill_name "$(basename "$d")" && continue
    ARGS+=(--skill "$d")
  done < <(find "$root" -mindepth 1 -maxdepth 1 -type d -print0)
done
# Owned Argent rule is outside the built-in finder scan roots, load explicitly.
if [[ -f "$AGENT_DIR/rules/argent.md" ]]; then
  ARGS+=(--append-system-prompt "$AGENT_DIR/rules/argent.md")
fi

if [[ "${OMO_LAUNCH_DRY_RUN-}" == "1" ]]; then
  printf 'omo-binary: %s\n' "$OMO_BIN"
  for a in "${ARGS[@]}"; do printf 'arg: %s\n' "$a"; done
  for a in "$@"; do printf 'arg: %s\n' "$a"; done
  exit 0
fi

exec node "$OMO_BIN" "${ARGS[@]}" "$@"
