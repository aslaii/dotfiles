const ENTRY_TYPE = "omo.mode-status";
const CAVEMAN_LEVELS = ["lite", "full", "ultra", "wenyan-lite", "wenyan-full", "wenyan-ultra", "off"];
const PONYTAIL_LEVELS = ["lite", "full", "ultra", "off"];

function compact(value, digits) {
  return value.toFixed(digits).replace(/\.?0+$/, "");
}

export function formatTokens(tokens) {
  if (tokens >= 1_000_000) return `${compact(tokens / 1_000_000, 2)}M`;
  if (tokens >= 100_000) return `${Math.round(tokens / 1_000)}K`;
  if (tokens >= 1_000) return `${compact(tokens / 1_000, 1)}K`;
  return String(tokens);
}

function savedModes(entries) {
  for (let index = entries.length - 1; index >= 0; index -= 1) {
    const entry = entries[index];
    if (entry.type !== "custom" || entry.customType !== ENTRY_TYPE) continue;
    const caveman = CAVEMAN_LEVELS.includes(entry.data?.caveman) ? entry.data.caveman : "lite";
    const ponytail = PONYTAIL_LEVELS.includes(entry.data?.ponytail) ? entry.data.ponytail : "full";
    return { caveman, ponytail };
  }
  return { caveman: "lite", ponytail: "full" };
}

function totalTokens(ctx) {
  const usage = ctx.sessionManager.getUsageTotals();
  return usage.input + usage.output + usage.cacheRead + usage.cacheWrite;
}

function modeDirective(systemPrompt, modes) {
  return `${systemPrompt}

<omo-session-modes>
Current session modes override their startup defaults:
- Caveman: ${modes.caveman}
- Ponytail: ${modes.ponytail}
Apply these exact levels until changed in this session.
</omo-session-modes>`;
}

export default function modeStatus(pi) {
  let modes = { caveman: "lite", ponytail: "full" };
  let context;

  const render = (ctx) => {
    context = ctx;
    if (!ctx.hasUI) return;
    ctx.ui.setStatus("10-caveman", `Caveman: ${modes.caveman.toUpperCase()}`);
    ctx.ui.setStatus("20-ponytail", `Ponytail: ${modes.ponytail.toUpperCase()}`);
    ctx.ui.setStatus("30-total-tokens", `Total tokens: ${formatTokens(totalTokens(ctx))}`);
  };

  const save = (ctx) => {
    pi.appendEntry(ENTRY_TYPE, { ...modes });
    render(ctx);
  };

  const command = (name, levels) => ({
    description: `Show or set ${name} mode`,
    argumentHint: `[${levels.join("|")}]`,
    getArgumentCompletions: (prefix) => levels
      .filter((level) => level.startsWith(prefix.trim().toLowerCase()))
      .map((level) => ({ value: level, label: level })),
    handler: async (args, ctx) => {
      const level = args.trim().toLowerCase();
      if (!level) {
        ctx.ui.notify(`${name}: ${modes[name].toUpperCase()}`, "info");
        return;
      }
      if (!levels.includes(level)) {
        ctx.ui.notify(`Usage: /${name} ${levels.join("|")}`, "error");
        return;
      }
      modes = { ...modes, [name]: level };
      save(ctx);
      ctx.ui.notify(`${name}: ${level.toUpperCase()}`, "info");
    },
  });

  pi.registerCommand("caveman", command("caveman", CAVEMAN_LEVELS));
  pi.registerCommand("ponytail", command("ponytail", PONYTAIL_LEVELS));

  pi.on("session_start", (_event, ctx) => {
    modes = savedModes(ctx.sessionManager.getEntries());
    render(ctx);
  });

  pi.on("input", (event, ctx) => {
    const text = event.text.trim().toLowerCase();
    if (text === "normal mode") {
      modes = { caveman: "off", ponytail: "off" };
      save(ctx);
    } else if (text.includes("stop caveman")) {
      modes = { ...modes, caveman: "off" };
      save(ctx);
    } else if (text.includes("stop ponytail")) {
      modes = { ...modes, ponytail: "off" };
      save(ctx);
    }
    return { action: "continue" };
  });

  pi.on("before_agent_start", (event) => ({
    systemPrompt: modeDirective(event.systemPrompt, modes),
  }));

  pi.on("agent_settled", (_event, ctx) => render(ctx));

  pi.on("session_shutdown", () => {
    if (!context?.hasUI) return;
    context.ui.setStatus("10-caveman", undefined);
    context.ui.setStatus("20-ponytail", undefined);
    context.ui.setStatus("30-total-tokens", undefined);
  });
}
