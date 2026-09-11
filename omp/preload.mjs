import { realpathSync } from "node:fs";
import { dirname, join } from "node:path";

const ompBin = Bun.which("omp");
if (!ompBin) throw new Error("omp/preload: omp not found on PATH");
const real = realpathSync(ompBin);
if (!real.endsWith("/dist/cli.js")) throw new Error(`omp/preload: unexpected omp layout: ${real}`);
const pkgRoot = dirname(dirname(real));
const capPath = join(pkgRoot, "src", "capability", "index.ts");
const extensionRootsPath = join(pkgRoot, "src", "discovery", "omp-extension-roots.ts");

const { setDisabledProviders, setEnabledProviders } = await import(`file://${capPath}`);
const { injectOmpExtensionCliRoots } = await import(`file://${extensionRootsPath}`);

function agentDir() {
  if (process.env.PI_CODING_AGENT_DIR?.trim()) return process.env.PI_CODING_AGENT_DIR.trim();
  return join(process.env.HOME ?? "", ".omp", "agent");
}

const cfgPath = join(agentDir(), "config.yml");
const text = await Bun.file(cfgPath).text();
if (!text.trim()) throw new Error(`omp/preload: missing global config: ${cfgPath}`);
const data = Bun.YAML.parse(text);
if (!Array.isArray(data?.disabledProviders)) throw new Error(`omp/preload: disabledProviders missing in ${cfgPath}`);
setDisabledProviders(data.disabledProviders.filter((x) => typeof x === "string"));
if (data.enabledProviders !== undefined) {
  if (!Array.isArray(data.enabledProviders)) throw new Error(`omp/preload: enabledProviders malformed in ${cfgPath}`);
  setEnabledProviders(data.enabledProviders.filter((x) => typeof x === "string"));
}
if (process.env.OMP_ARGENT_ROOT?.trim()) {
  injectOmpExtensionCliRoots([process.env.OMP_ARGENT_ROOT.trim()], process.env.HOME ?? "", process.cwd());
}
