import { expect, test } from "bun:test";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { mkdtemp, mkdir, readFile, realpath, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createInterface } from "node:readline";
import { fileURLToPath } from "node:url";

test("native RPC startup applies profiles but preserves an explicit model", async () => {
  const binary = await realpath(process.env.OMO_BIN || Bun.which("omo"));
  const portable = Bun.JSONC.parse(await readFile(new URL("./omo.jsonc", import.meta.url), "utf8"));
  for (const [profile, args, provider, model, thinking] of [
    ["deep-work", [], "openai-codex", "gpt-6-astra", "xhigh"],
    ["capable", [], "claude-sdk-oauth", "claude-sonnet-5", "high"],
    ["deep-work", ["--model", "openai-codex/gpt-5.6-luna-fast:low"], "openai-codex", "gpt-5.6-luna", "low"],
  ]) {
    const home = await mkdtemp(join(tmpdir(), "omo native config "));
    const agentDir = join(home, ".omo", "agent");
    await mkdir(agentDir, { recursive: true });
    const config = structuredClone(portable);
    config["[senpi]"].model_profile = profile;
    const settings = {
      defaultProvider: "openai-codex",
      defaultModel: "gpt-5.6-luna-fast",
      defaultThinkingLevel: "low",
      recommendedModels: ["gpt-5.6-luna-fast"],
      claudeSdkOauthProvider: { enabled: true },
      packages: [],
      skills: [],
    };
    await writeFile(join(home, ".omo", "omo.jsonc"), JSON.stringify(config));
    await writeFile(join(agentDir, "settings.json"), JSON.stringify(settings));
    const oauth = { type: "oauth", access: "fixture-unused", refresh: "fixture-unused", expires: 4102444800000 };
    await writeFile(join(agentDir, "auth.json"), JSON.stringify({
      "openai-codex": oauth,
      "claude-sdk-oauth": oauth,
      opencode: { type: "api_key", key: "fixture-no-model-requests" },
    }));
    const env = { ...process.env };
    for (const key of Object.keys(env)) {
      if (/^(OMO_|SENPI_|PI_|OPENCODE_|OCX_)/.test(key) || /(?:API_KEY|TOKEN|SECRET|AUTH_TOKEN)$/.test(key)) delete env[key];
    }
    Object.assign(env, {
      HOME: home,
      XDG_CONFIG_HOME: join(home, "config"),
      XDG_DATA_HOME: join(home, "data"),
      XDG_CACHE_HOME: join(home, "cache"),
      OMO_CONFIG_DIR: join(home, ".omo"),
      OMO_CODING_AGENT_DIR: agentDir,
      SENPI_CODING_AGENT_DIR: agentDir,
    });
    const child = spawn("node", [
      binary, "--mode", "rpc", "--no-session", "--no-skills",
      "--omo-senpi-memory-disabled", "--omo-senpi-builtin-mcps-disabled", ...args,
    ], { cwd: home, env, stdio: ["pipe", "pipe", "pipe"] });
    const lines = createInterface({ input: child.stdout });
    let stderr = "";
    child.stderr.on("data", (data) => { stderr += data; });
    const stateResponse = new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error(`Native startup timed out: ${stderr}`)), 45_000);
      const settle = (error, result) => {
        clearTimeout(timeout);
        error ? reject(error) : resolve(result);
      };
      child.once("error", (error) => settle(error));
      child.once("exit", (code, signal) => settle(new Error(`Native startup exited ${code}/${signal}: ${stderr}`)));
      lines.on("line", (line) => {
        // The installed profile logger also writes human-readable notices to stdout.
        if (!line.startsWith('{"')) return;
        try {
          const message = JSON.parse(line);
          if (message.id === "native-state") settle(undefined, message);
        } catch (error) {
          settle(new Error(`Invalid native RPC output: ${line}`, { cause: error }));
        }
      });
    });
    try {
      child.stdin.write(`${JSON.stringify({ id: "native-state", type: "get_state" })}\n`);
      const response = await stateResponse;
      expect(response.success, stderr).toBe(true);
      expect(response.data.model.provider, stderr).toBe(provider);
      expect(response.data.model.id, stderr).toBe(model);
      expect(response.data.thinkingLevel, stderr).toBe(thinking);
      const saved = JSON.parse(await readFile(join(agentDir, "settings.json"), "utf8"));
      expect(saved.defaultProvider).toBe(settings.defaultProvider);
      expect(saved.defaultModel).toBe(settings.defaultModel);
      expect(saved.defaultThinkingLevel).toBe(settings.defaultThinkingLevel);
    } finally {
      lines.close();
      if (child.exitCode === null && child.signalCode === null) {
        const exited = once(child, "exit", { signal: AbortSignal.timeout(15_000) });
        child.kill("SIGTERM");
        await exited;
      }
      await rm(home, { recursive: true, force: true });
    }
  }
}, 180_000);

test("macOS and WSL fast launchers retain arguments without retired profile selection", async () => {
  for (const platform of ["macos", "wsl"]) {
    const functions = new URL(`../${platform}/zsh/zsh/functions.zsh`, import.meta.url);
    const script = 'unset OMO_PROFILE; source "$1"; function bash() { printf "%s\\n" "${OMO_PROFILE-unset}" "$@"; }; omo-fast --model user/model';
    const child = Bun.spawn(["zsh", "-fc", script, "--", fileURLToPath(functions)], {
      env: { ...process.env, DOTFILES_DIR: "/fixture/dotfiles" },
      stdout: "pipe", stderr: "pipe",
    });
    const [stdout, stderr, exit] = await Promise.all([
      new Response(child.stdout).text(), new Response(child.stderr).text(), child.exited,
    ]);
    expect(exit, stderr).toBe(0);
    expect(stdout.trim().split("\n")).toEqual([
      "unset", "/fixture/dotfiles/omo/launch.sh",
      "--extension", "/fixture/dotfiles/omo/fast.mjs", "--model", "user/model",
    ]);
  }
});
