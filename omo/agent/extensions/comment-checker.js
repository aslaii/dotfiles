import { spawn } from "node:child_process";
import { homedir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const CHECKER_SOURCE = "git/github.com/code-yeongyu/pi-comment-checker/src";
const CUSTOM_TYPE = "omo-comment-checker:result";
const MAX_OUTPUT_BYTES = 64 * 1024;
const TIMEOUT_MS = 30_000;
const SUPPORTED_TOOLS = new Set(["write", "edit", "multiedit", "multi_edit", "apply_patch"]);

export function resolveAgentDir(env = process.env, home = homedir(), cwd = process.cwd()) {
  for (const key of ["OMO_CODING_AGENT_DIR", "SENPI_CODING_AGENT_DIR", "PI_CODING_AGENT_DIR"]) {
    const value = env[key]?.trim();
    if (value) return resolve(cwd, value);
  }
  return join(home, ".omo", "agent");
}

export async function loadPinnedChecker(agentDir = resolveAgentDir()) {
  const source = join(agentDir, CHECKER_SOURCE);
  const core = await import(pathToFileURL(join(source, "core.ts")).href);
  const cli = await import(pathToFileURL(join(source, "cli.ts")).href);
  return {
    extract: core.extractCommentCheckRequests,
    toHookInput: core.toHookInput,
    run: cli.runCommentChecker,
  };
}

export function normalizeToolResult(event) {
  if (event.toolName.toLowerCase() !== "edit" || !Array.isArray(event.input.edits)) return event;
  const edits = event.input.edits.flatMap((edit) => {
    if (!edit || typeof edit !== "object") return [];
    const oldString = edit.oldText ?? edit.oldString ?? edit.old_string;
    const newString = edit.newText ?? edit.newString ?? edit.new_string;
    return typeof oldString === "string" && typeof newString === "string"
      ? [{ oldString, newString }]
      : [];
  });
  return { ...event, toolName: "multiedit", input: { ...event.input, edits } };
}

function appliedPaths(details) {
  const result = details && typeof details === "object" && details.result;
  if (!result || typeof result !== "object") return [];
  if (Array.isArray(result.appliedFiles)) return result.appliedFiles.filter((path) => typeof path === "string");
  const operations = result.details && typeof result.details === "object" && result.details.appliedOperations;
  if (!Array.isArray(operations)) return [];
  return operations.flatMap((operation) => {
    const preview = operation && typeof operation === "object" && operation.preview;
    const path = preview && typeof preview === "object" && (preview.movePath ?? preview.filePath);
    return typeof path === "string" ? [path] : [];
  });
}

export function extractRequests(event, extract, cwd = process.cwd()) {
  const toolName = event.toolName.toLowerCase();
  const paths = toolName === "apply_patch" && event.isError ? appliedPaths(event.details) : [];
  if (event.isError && paths.length === 0) return [];
  const normalized = normalizeToolResult(paths.length > 0 ? { ...event, isError: false, content: [] } : event);
  const requests = extract(normalized);
  if (paths.length === 0) return requests;
  const applied = new Set(paths.map((path) => resolve(cwd, path)));
  return requests.filter((request) => applied.has(resolve(cwd, request.filePath)));
}

function outputCollector(limit) {
  let text = "";
  let bytes = 0;
  let truncated = false;
  return {
    append(chunk) {
      if (truncated) return;
      const buffer = Buffer.from(chunk);
      const remaining = limit - bytes;
      text += buffer.subarray(0, Math.max(0, remaining)).toString("utf8");
      bytes += Math.min(buffer.byteLength, Math.max(0, remaining));
      truncated = buffer.byteLength > remaining;
    },
    text(stream) {
      return truncated ? `${text}\n[${stream} truncated after ${limit} bytes]` : text;
    },
  };
}

export function spawnCheckerProcess(command, args, stdin, options = {}) {
  const timeoutMs = options.timeoutMs ?? TIMEOUT_MS;
  const maxOutputBytes = options.maxOutputBytes ?? MAX_OUTPUT_BYTES;
  return new Promise((resolve) => {
    const stdout = outputCollector(maxOutputBytes);
    const stderr = outputCollector(maxOutputBytes);
    const child = spawn(command, args, { stdio: ["pipe", "pipe", "pipe"] });
    let transportError;
    let timedOut = false;
    let settled = false;
    const timer = setTimeout(() => {
      timedOut = true;
      stderr.append(`comment-checker process timed out after ${timeoutMs} ms`);
      child.kill("SIGKILL");
    }, timeoutMs);
    timer.unref();
    const finish = (exitCode) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve({
        exitCode: timedOut || transportError ? null : exitCode,
        stdout: stdout.text("stdout"),
        stderr: transportError ? `${stderr.text("stderr")}comment-checker transport failed: ${transportError.message}` : stderr.text("stderr"),
      });
    };
    child.stdout.on("data", (chunk) => stdout.append(chunk));
    child.stderr.on("data", (chunk) => stderr.append(chunk));
    child.stdin.on("error", (error) => { transportError = error; });
    child.on("error", (error) => { transportError = error; finish(null); });
    child.on("close", finish);
    child.stdin.end(stdin);
  });
}

function diagnostic(message) {
  const clean = String(message || "unknown checker failure").trim().slice(0, 4000);
  return `[comment-checker] ERROR: ${clean}`;
}

function isCheckableMutation(event) {
  const name = event.toolName.toLowerCase();
  if (!SUPPORTED_TOOLS.has(name)) return false;
  if (event.isError) return name === "apply_patch" && appliedPaths(event.details).length > 0;
  if (name !== "apply_patch") return true;
  const patch = event.input.input ?? event.input.patch;
  if (typeof patch !== "string") return true;
  return /^\*\*\* (?:Add|Update) File: /m.test(patch) && /^\+/m.test(patch);
}

function surfaced(event, message, sendMessage) {
  sendMessage(message, event);
  return { content: [...(event.content ?? []), { type: "text", text: `\n\n${message}` }] };
}

export function createCommentCheckerHandler(deps) {
  return async (event, ctx) => {
    let requests;
    try {
      requests = extractRequests(event, deps.extract, ctx.cwd);
    } catch (error) {
      requests = [];
      const message = diagnostic(error instanceof Error ? error.message : error);
      return surfaced(event, message, deps.sendMessage);
    }
    if (requests.length === 0) {
      if (!isCheckableMutation(event)) return undefined;
      const message = diagnostic(`skipped invalid input for ${event.toolName}; no check was run`);
      return surfaced(event, message, deps.sendMessage);
    }

    const messages = [];
    for (const request of requests) {
      try {
        const input = deps.toHookInput(request, {
          sessionId: ctx.sessionManager?.getSessionId?.() ?? "unknown",
          cwd: ctx.cwd,
        });
        const result = await deps.run(input, { executor: deps.executor ?? spawnCheckerProcess });
        const skipped = result.status === "pass" && /^\[check-comments\] Skipping:/m.test(result.stderr ?? "");
        if (result.status === "warning" && result.message.trim()) messages.push(result.message.trim().slice(0, 4000));
        else if (skipped) messages.push(diagnostic(result.stderr));
        else if (result.status === "missing" || result.status === "error") messages.push(diagnostic(result.message));
      } catch (error) {
        messages.push(diagnostic(error instanceof Error ? error.message : error));
      }
    }
    if (messages.length === 0) return undefined;
    const message = messages.join("\n\n");
    return surfaced(event, message, deps.sendMessage);
  };
}

export function registerCommentChecker(api, load = loadPinnedChecker) {
  const dependency = Promise.resolve().then(load).then(
    (checker) => ({ checker }),
    (error) => ({ error }),
  );
  const sendMessage = (content, event) => api.sendMessage({
    customType: CUSTOM_TYPE,
    content,
    display: true,
    details: { toolName: event.toolName },
  }, { triggerTurn: false, deliverAs: "steer" });
  let handler;
  api.on("tool_result", async (event, ctx) => {
    const loaded = await dependency;
    if (loaded.error !== undefined) {
      if (!isCheckableMutation(event)) return undefined;
      const reason = loaded.error instanceof Error ? loaded.error.message : loaded.error;
      return surfaced(event, diagnostic(`dependency unavailable: ${reason}`), sendMessage);
    }
    handler ??= createCommentCheckerHandler({ ...loaded.checker, sendMessage });
    return handler(event, ctx);
  });
}

export default function commentCheckerExtension(api) {
  registerCommentChecker(api);
}
