import { expect, test } from "bun:test";
import {
  createCommentCheckerHandler, extractRequests, loadPinnedChecker, normalizeToolResult,
  registerCommentChecker, resolveAgentDir, spawnCheckerProcess,
} from "./agent/extensions/comment-checker.js";

const checker = await loadPinnedChecker();
const text = (result) => result?.content?.filter((item) => item.type === "text").map((item) => item.text).join("\n") ?? "";
const context = { cwd: "/workspace", sessionManager: { getSessionId: () => "session-1" } };
const writeEvent = (content = "const value = 1;\n") => ({
  toolName: "write",
  input: { path: "src/example.ts", content },
  content: [{ type: "text", text: "wrote src/example.ts" }],
  isError: false,
});

function fakeHandler(run) {
  const sent = [];
  return {
    sent,
    handle: createCommentCheckerHandler({
      ...checker,
      run,
      sendMessage: (message, event) => sent.push({ message, toolName: event.toolName }),
    }),
  };
}

test("native edit is normalized to the checker's MultiEdit schema", () => {
  const event = {
    toolName: "edit",
    input: {
      path: "src/example.ts",
      edits: [{ oldText: "const value = 1;", newText: "// explain value\nconst value = 2;" }],
    },
    content: [{ type: "text", text: "Successfully replaced 1 block(s) in src/example.ts." }],
    isError: false,
  };

  expect(checker.extract(event)).toEqual([]);
  expect(extractRequests(event, checker.extract)).toEqual([{
    sourceToolName: "multiedit",
    toolName: "MultiEdit",
    filePath: "src/example.ts",
    toolInput: {
      file_path: "src/example.ts",
      edits: [{ old_string: "const value = 1;", new_string: "// explain value\nconst value = 2;" }],
    },
  }]);
});

test("legacy scalar edit remains an Edit request", () => {
  const event = {
    toolName: "edit",
    input: { path: "x.ts", oldString: "const x = 1;", newString: "const x = 2;" },
    content: [{ type: "text", text: "edited x.ts" }],
    isError: false,
  };

  expect(normalizeToolResult(event)).toBe(event);
  expect(extractRequests(event, checker.extract)[0].toolName).toBe("Edit");
});

test("agent directory resolution matches launch precedence, trimming, and relative paths", () => {
  expect(resolveAgentDir({
    OMO_CODING_AGENT_DIR: " \t",
    OMO_LAUNCH_AGENT_DIR: "/stale-internal",
    SENPI_CODING_AGENT_DIR: " relative/senpi ",
    PI_CODING_AGENT_DIR: "/pi",
  }, "/home", "/work")).toBe("/work/relative/senpi");
  expect(resolveAgentDir({
    OMO_CODING_AGENT_DIR: " ./omo-agent ",
    SENPI_CODING_AGENT_DIR: "/senpi",
  }, "/home", "/work")).toBe("/work/omo-agent");
  expect(resolveAgentDir({ PI_CODING_AGENT_DIR: " /pi " }, "/home", "/work")).toBe("/pi");
  expect(resolveAgentDir({ OMO_LAUNCH_AGENT_DIR: "/stale-internal" }, "/home", "/work")).toBe("/home/.omo/agent");
});

test("multifile apply_patch checks every added or updated file", async () => {
  const calls = [];
  const fixture = fakeHandler(async (input) => {
    calls.push(input.tool_input.file_path);
    return { status: "pass", message: "", stderr: "" };
  });
  const patch = "*** Begin Patch\n*** Add File: a.ts\n+// A\n*** Add File: b.ts\n+// B\n*** End Patch\n";

  const result = await fixture.handle({ toolName: "apply_patch", input: { input: patch }, content: [], isError: false }, context);

  expect(calls).toEqual(["a.ts", "b.ts"]);
  expect(result).toBeUndefined();
  expect(fixture.sent).toEqual([]);
});

test("partial moved patch matches absolute applied-file identity and excludes failures", () => {
  const patch = "*** Begin Patch\n*** Update File: source.ts\n*** Move to: moved.ts\n@@\n-const value = 1;\n+// APPLIED MOVE\n+const value = 2;\n*** Add File: failed.ts\n+// FAILED\n*** End Patch\n";
  const event = {
    toolName: "apply_patch",
    input: { input: patch },
    content: [{ type: "text", text: "partially failed" }],
    details: { result: { appliedFiles: ["/workspace/moved.ts"], failures: [{ filePath: "failed.ts" }] } },
    isError: true,
  };

  expect(extractRequests(event, checker.extract, "/workspace").map((request) => request.filePath)).toEqual(["moved.ts"]);
});

test("partial apply_patch checks applied files only despite isError", async () => {
  const calls = [];
  const fixture = fakeHandler(async (input) => {
    calls.push(input.tool_input.file_path);
    return { status: "pass", message: "", stderr: "" };
  });
  const patch = "*** Begin Patch\n*** Add File: applied.ts\n+// APPLIED\n*** Add File: failed.ts\n+// FAILED\n*** End Patch\n";
  const event = {
    toolName: "apply_patch",
    input: { input: patch },
    content: [{ type: "text", text: "partially failed" }],
    details: { result: { appliedFiles: ["applied.ts"], failures: [{ filePath: "failed.ts" }] } },
    isError: true,
  };

  expect(await fixture.handle(event, context)).toBeUndefined();
  expect(calls).toEqual(["applied.ts"]);
});

test("missing plugin dependency still registers a visibly failing mutation hook", async () => {
  const handlers = new Map();
  const sent = [];
  const api = {
    on: (name, handler) => handlers.set(name, handler),
    sendMessage: (message) => sent.push(message),
  };
  registerCommentChecker(api, async () => { throw new Error("pinned plugin missing"); });

  const result = await handlers.get("tool_result")(writeEvent(), context);

  expect(text(result)).toContain("dependency unavailable: pinned plugin missing");
  expect(sent).toEqual([expect.objectContaining({ customType: "omo-comment-checker:result", display: true })]);
});

test("warning is appended to tool_result and injected as a visible custom message", async () => {
  const fixture = fakeHandler(async () => ({ status: "warning", message: "COMMENT/DOCSTRING DETECTED", stderr: "" }));

  const result = await fixture.handle(writeEvent("// explain value\nconst value = 1;\n"), context);

  expect(text(result)).toContain("COMMENT/DOCSTRING DETECTED");
  expect(fixture.sent).toEqual([{ message: "COMMENT/DOCSTRING DETECTED", toolName: "write" }]);
});

test("clean checker result leaves tool output and context unchanged", async () => {
  const fixture = fakeHandler(async () => ({ status: "pass", message: "", stderr: "[check-comments] Success" }));

  expect(await fixture.handle(writeEvent(), context)).toBeUndefined();
  expect(fixture.sent).toEqual([]);
});

for (const [label, result, expected] of [
  ["missing binary", { status: "missing", message: "binary not found" }, "binary not found"],
  ["checker error", { status: "error", message: "process timed out" }, "process timed out"],
  ["native exit-zero skip", { status: "pass", message: "", stderr: "[check-comments] Skipping: Invalid input format" }, "Skipping: Invalid input format"],
]) {
  test(`${label} is surfaced in both result and context`, async () => {
    const fixture = fakeHandler(async () => result);

    const handled = await fixture.handle(writeEvent(), context);

    expect(text(handled)).toContain(`[comment-checker] ERROR:`);
    expect(text(handled)).toContain(expected);
    expect(fixture.sent[0].message).toContain(expected);
  });
}

test("supported mutation with invalid input is visibly skipped", async () => {
  const fixture = fakeHandler(async () => { throw new Error("runner must not be called"); });
  const event = { toolName: "edit", input: { path: "x.ts", edits: [{}] }, content: [], isError: false };

  const result = await fixture.handle(event, context);

  expect(text(result)).toContain("skipped invalid input for edit");
  expect(fixture.sent).toHaveLength(1);
});

test("failed mutation and deletion-only patch do not claim a check ran", async () => {
  const fixture = fakeHandler(async () => { throw new Error("runner must not be called"); });
  const failed = { ...writeEvent(), isError: true };
  const deletion = {
    toolName: "apply_patch",
    input: { input: "*** Begin Patch\n*** Delete File: x.ts\n*** End Patch\n" },
    content: [],
    isError: false,
  };

  expect(await fixture.handle(failed, context)).toBeUndefined();
  expect(await fixture.handle(deletion, context)).toBeUndefined();
  expect(fixture.sent).toEqual([]);
});

test("runner exceptions are surfaced rather than swallowed", async () => {
  const fixture = fakeHandler(async () => { throw new Error("spawn exploded"); });

  const result = await fixture.handle(writeEvent(), context);

  expect(text(result)).toContain("spawn exploded");
  expect(fixture.sent[0].message).toContain("spawn exploded");
});

test("transport timeout returns an error without polling or fixed sleeps", async () => {
  const result = await spawnCheckerProcess(process.execPath, ["-e", "setInterval(() => {}, 1000)"], "", { timeoutMs: 30 });

  expect(result.exitCode).toBeNull();
  expect(result.stderr).toContain("timed out after 30 ms");
});

test("stdin EPIPE is captured and cannot crash the host", async () => {
  const stdin = "x".repeat(16 * 1024 * 1024);

  const result = await spawnCheckerProcess(process.execPath, ["-e", "process.stdin.destroy(); process.exit(0)"], stdin);

  expect(result.exitCode).toBeNull();
  expect(result.stderr).toContain("transport failed");
});

test("installed native checker reports clean writes and native edit comments", async () => {
  const clean = fakeHandler(checker.run);
  const warned = fakeHandler(checker.run);
  const edit = {
    toolName: "edit",
    input: { path: "x.ts", edits: [{ oldText: "const x = 1;", newText: "// explain value\nconst x = 2;" }] },
    content: [{ type: "text", text: "edited x.ts" }],
    isError: false,
  };

  expect(await clean.handle(writeEvent(), context)).toBeUndefined();
  expect(text(await warned.handle(edit, context))).toContain("COMMENT/DOCSTRING DETECTED");
  expect(warned.sent).toHaveLength(1);
});
