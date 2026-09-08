import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import process from "node:process";

const nativeRuntime = { env: process.env, process, spawnSync };
const ownerTag = Symbol.for("dotfiles.omo.herdr-presence.v1");
const source = "custom:omo-presence";

function errorDetail(error) {
  return error instanceof Error
    ? `${error.code ? `${error.code}: ` : ""}${error.message}`
    : String(error);
}

export default function herdrPresence(api, runtime = nativeRuntime) {
  let owner;
  let retired = false;

  function transport(action) {
    const args = ["pane", `${action}-agent`, owner.paneId, "--source", source, "--agent", "omo"];
    if (action === "report") args.push("--state", "unknown");
    let result;
    try {
      result = runtime.spawnSync(owner.binPath, args, {
        env: owner.env,
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
        timeout: 1000,
        killSignal: "SIGKILL",
        maxBuffer: 65536,
      });
    } catch (error) {
      return `spawnSync threw: ${errorDetail(error)}`;
    }
    if (!result.error && result.status === 0 && !result.signal) return;
    return [
      result.error && errorDetail(result.error),
      `status=${result.status}`,
      result.signal && `signal=${result.signal}`,
      result.stderr && result.stderr.slice(0, 400).trim(),
    ].filter(Boolean).join("; ");
  }

  function retire() {
    if (retired) return;
    retired = true;
    runtime.process.removeListener("exit", onExit);
  }

  function dispose() {
    if (!owner || retired) return;
    // Invalidate before IPC so no saved callback can release or report again.
    retire();
    const failure = transport("release");
    if (failure) runtime.process.stderr.write(`Herdr OMO presence release failed: ${failure}\n`);
  }

  function onExit() {
    dispose();
  }

  api.on("session_start", (_event, ctx) => {
    if (retired || ctx.mode !== "tui") return;
    if (!owner) {
      const env = runtime.env;
      if (env.HERDR_ENV !== "1" || !env.HERDR_BIN_PATH || !env.HERDR_SOCKET_PATH || !env.HERDR_PANE_ID) return;
      owner = {
        env: { ...env },
        binPath: env.HERDR_BIN_PATH,
        socketPath: env.HERDR_SOCKET_PATH,
        paneId: env.HERDR_PANE_ID,
        installedPath: resolve(ctx.agentDir, "extensions/herdr-presence.js"),
      };
      // The listener itself carries ownership across reload-safe module imports.
      for (const listener of runtime.process.listeners("exit")) {
        const previous = listener[ownerTag];
        if (previous?.socketPath === owner.socketPath && previous.paneId === owner.paneId) previous.retire();
      }
      onExit[ownerTag] = { socketPath: owner.socketPath, paneId: owner.paneId, retire };
      runtime.process.on("exit", onExit);
    }
    const failure = transport("report");
    if (failure) ctx.ui.notify(`Herdr OMO visibility failed: ${failure}. Use /reload after transport is restored.`, "warning");
  });

  api.on("session_shutdown", (event) => {
    if (event.reason === "quit") dispose();
  });

  api.on("session_extensions_removed", (event) => {
    if (!owner || retired) return;
    if (event.removed.some((extension) => extension.resolvedPath === owner.installedPath)) dispose();
  });
}
