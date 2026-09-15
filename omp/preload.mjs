import { realpathSync } from "node:fs";
import { dirname, join } from "node:path";

const ompBin = Bun.which("omp");
if (!ompBin) throw new Error("omp/preload: omp not found on PATH");
const real = realpathSync(ompBin);
if (!real.endsWith("/dist/cli.js")) throw new Error(`omp/preload: unexpected omp layout: ${real}`);
const pkgRoot = dirname(dirname(real));
const capPath = join(pkgRoot, "src", "capability", "index.ts");
const segmentsPath = join(pkgRoot, "src", "modes", "components", "status-line", "segments.ts");

Bun.plugin({
  name: "caveman-status",
  setup(build) {
    build.onLoad({ filter: /\/modes\/components\/status-line\/segments\.ts$/ }, async ({ path }) => {
      const source = await Bun.file(path).text();
      if (path !== segmentsPath) return { contents: source, loader: "ts" };
      return {
        loader: "ts",
        contents: `${source}
const cavemanStatusSegment = SEGMENTS.status;
SEGMENTS.status = {
  ...cavemanStatusSegment,
  render(ctx) {
    const rendered = cavemanStatusSegment.render(ctx);
    const caveman = \`🪨 \${theme.fg("muted", "caveman: ")}\${theme.fg("text", "LITE")}\`;
    return rendered.visible && rendered.content
      ? { ...rendered, content: \`\${rendered.content} · \${caveman}\` }
      : { ...rendered, content: caveman, visible: true };
  },
};`,
      };
    });
  },
});

const { setDisabledProviders, setEnabledProviders } = await import(`file://${capPath}`);

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
