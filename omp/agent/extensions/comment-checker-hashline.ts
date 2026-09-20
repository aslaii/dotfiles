import type {
  ExtensionAPI,
  ExtensionContext,
  ToolResultEvent,
} from "@oh-my-pi/pi-coding-agent";
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

const CUSTOM_TYPE = "omp-comment-checker-hashline:result";
const POLICY_ADDENDUM = "\n\nREPO POLICY (overrides priority 3 above): config, key-value, and other self-evidently simple files/lines are NEVER a \"necessary comment\" exception, no matter the justification. Rewording, shortening, or moving a flagged comment does NOT satisfy priority 4 — only deleting it (or leaving genuinely complex code, matching the priority-3 examples, untouched) does.";
const TIMEOUT_MS = 30_000;
const MAX_OUTPUT_BYTES = 64 * 1024;
const COVERED_TOOLS = new Set(["edit", "apply_patch", "multiedit"]);

type HookInput = {
  session_id: string;
  tool_name: "Edit";
  transcript_path: string;
  cwd: string;
  hook_event_name: "PostToolUse";
  tool_input: { file_path: string; old_string: string; new_string: string };
};

type FileRequest = { filePath: string; oldText: string; newText: string };

function resolveBinary(): string | undefined {
  const override = process.env.OMP_COMMENT_CHECKER_BIN?.trim();
  if (override && existsSync(override)) return override;
  const fromPath = Bun.which("comment-checker");
  if (fromPath) return fromPath;
  const localBinPath = join(homedir(), ".local", "bin", "comment-checker");
  return existsSync(localBinPath) ? localBinPath : undefined;
}

function parseDiffChangedText(diff: string): { oldText: string; newText: string } | undefined {
  const oldLines: string[] = [];
  const newLines: string[] = [];
  const linePattern = /^([ +-])\s*\d+\|(.*)$/;
  for (const line of diff.split("\n")) {
    const match = linePattern.exec(line);
    if (!match) continue;
    if (match[1] === "-") oldLines.push(match[2]);
    else if (match[1] === "+") newLines.push(match[2]);
  }
  return oldLines.length === 0 && newLines.length === 0
    ? undefined
    : { oldText: oldLines.join("\n"), newText: newLines.join("\n") };
}

function fileRequestFrom(file: { path?: string; oldText?: string; newText?: string; diff?: string }): FileRequest | undefined {
  if (!file.path) return undefined;
  if (typeof file.newText === "string") return { filePath: file.path, oldText: file.oldText ?? "", newText: file.newText };
  if (typeof file.diff === "string") {
    const changed = parseDiffChangedText(file.diff);
    if (changed) return { filePath: file.path, oldText: changed.oldText, newText: changed.newText };
  }
  return undefined;
}

function requestsFor(event: ToolResultEvent): FileRequest[] {
  if (event.isError || !COVERED_TOOLS.has(event.toolName.toLowerCase())) return [];
  const details = event.details as
    | {
        path?: string;
        oldText?: string;
        newText?: string;
        diff?: string;
        perFileResults?: Array<{ path: string; oldText?: string; newText?: string; diff?: string }>;
      }
    | undefined;
  if (!details) return [];
  if (Array.isArray(details.perFileResults) && details.perFileResults.length > 0) {
    const requests: FileRequest[] = [];
    for (const file of details.perFileResults) {
      const request = fileRequestFrom(file);
      if (request) requests.push(request);
    }
    return requests;
  }
  const single = fileRequestFrom(details);
  return single ? [single] : [];
}

function boundedCollector(limit: number) {
  let text = "";
  let bytes = 0;
  return {
    append(chunk: Uint8Array) {
      const remaining = limit - bytes;
      if (remaining <= 0) return;
      const buffer = Buffer.from(chunk);
      text += buffer.subarray(0, remaining).toString("utf8");
      bytes += Math.min(buffer.byteLength, remaining);
    },
    text: () => text,
  };
}

async function runChecker(
  binary: string,
  input: HookInput,
): Promise<{ exitCode: number | null; stdout: string; stderr: string }> {
  const proc = Bun.spawn([binary, "check"], { stdin: "pipe", stdout: "pipe", stderr: "pipe" });
  proc.stdin.write(JSON.stringify(input));
  proc.stdin.end();
  const stdout = boundedCollector(MAX_OUTPUT_BYTES);
  const stderr = boundedCollector(MAX_OUTPUT_BYTES);
  const killTimer = setTimeout(() => proc.kill("SIGKILL"), TIMEOUT_MS);
  try {
    const [, exitCode] = await Promise.all([
      (async () => {
        for await (const chunk of proc.stdout) stdout.append(chunk);
      })(),
      proc.exited,
      (async () => {
        for await (const chunk of proc.stderr) stderr.append(chunk);
      })(),
    ]);
    return { exitCode, stdout: stdout.text(), stderr: stderr.text() };
  } finally {
    clearTimeout(killTimer);
  }
}

export default function commentCheckerHashlineExtension(pi: ExtensionAPI): void {
  const binary = resolveBinary();
  if (!binary) return;

  pi.on("tool_result", async (event: ToolResultEvent, ctx: ExtensionContext) => {
    const requests = requestsFor(event);
    if (requests.length === 0) return;

    const messages: string[] = [];
    for (const request of requests) {
      const hookInput: HookInput = {
        session_id: ctx.sessionManager.getSessionId(),
        tool_name: "Edit",
        transcript_path: "",
        cwd: ctx.cwd,
        hook_event_name: "PostToolUse",
        tool_input: { file_path: request.filePath, old_string: request.oldText, new_string: request.newText },
      };
      try {
        const result = await runChecker(binary, hookInput);
        if (result.exitCode === 2) {
          const message = (result.stderr || result.stdout).trim();
          if (message) messages.push(`${message}${POLICY_ADDENDUM}`.slice(0, 4000));
        } else if (result.exitCode !== 0) {
          pi.logger.warn(`[comment-checker-hashline] ${request.filePath}: exit ${result.exitCode}: ${result.stderr.trim()}`);
        }
      } catch (error) {
        pi.logger.warn(`[comment-checker-hashline] ${request.filePath}: ${error instanceof Error ? error.message : error}`);
      }
    }
    if (messages.length === 0) return;
    const combined = messages.join("\n\n");
    pi.sendMessage(
      { customType: CUSTOM_TYPE, content: combined, display: true, details: { toolName: event.toolName } },
      { triggerTurn: false, deliverAs: "steer" },
    );
    return { content: [...event.content, { type: "text", text: `\n\n${combined}` }] };
  });
}
