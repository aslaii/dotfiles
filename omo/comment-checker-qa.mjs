import assert from "node:assert/strict";
import { copyFile, mkdir, mkdtemp, realpath, rm } from "node:fs/promises";
import { existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const omoBin = process.env.OMO_BIN ?? Bun.which("omo");
assert.ok(omoBin, "OMO_BIN or an omo executable on PATH is required");
const omoRoot = dirname(dirname(await realpath(omoBin)));
const senpi = await import(pathToFileURL(join(omoRoot, "node_modules/@code-yeongyu/senpi/dist/index.js")).href);
const source = new URL("./agent/extensions/comment-checker.js", import.meta.url).pathname;
const cwd = await mkdtemp(join(tmpdir(), "omo-comment-checker-qa-"));
const runtimeAgentDir = join(cwd, "agent");
const extension = join(runtimeAgentDir, "extensions/comment-checker.js");
await mkdir(dirname(extension), { recursive: true });
await copyFile(source, extension);
const settings = senpi.SettingsManager.inMemory({ packages: [], permission: { "*": "allow" } });
const loader = new senpi.DefaultResourceLoader({
  cwd,
  agentDir: runtimeAgentDir,
  settingsManager: settings,
  additionalExtensionPaths: [extension],
  noSkills: true,
  noPromptTemplates: true,
  noThemes: true,
  noContextFiles: true,
  extensionsOverride: (base) => ({
    ...base,
    extensions: base.extensions.filter((item) =>
      item.path === "<builtin:gpt-apply-patch>"
      || item.path.includes("senpi-codemode")
      || item.path === extension),
  }),
});

const sessions = [];
let cleanChecks = 0;
let models;
const outputText = (result) => result.content.filter((item) => item.type === "text").map((item) => item.text).join("\n");
const warningEntries = (manager) => manager.getEntries().filter((entry) =>
  entry.type === "custom_message" && entry.customType === "omo-comment-checker:result");

async function createSession(model, tools) {
  assert.ok(model);
  const manager = senpi.SessionManager.inMemory(cwd);
  const created = await senpi.createAgentSession({
    cwd,
    agentDir: runtimeAgentDir,
    model,
    modelRuntime: models,
    resourceLoader: loader,
    settingsManager: settings,
    sessionManager: manager,
    tools,
  });
  const target = { session: created.session, manager };
  sessions.push(target);
  await target.session.bindExtensions({ mode: "json" });
  return target;
}

async function expectWarning(label, target, toolName, input, returned = true) {
  const before = warningEntries(target.manager).length;
  const result = await target.session.executeTool(toolName, input);
  if (returned) assert.match(outputText(result), /COMMENT\/DOCSTRING DETECTED/, `${label}: tool result`);
  const added = warningEntries(target.manager).slice(before);
  assert.equal(added.length, 1, `${label}: custom context warning`);
  assert.match(String(added[0].content), /COMMENT\/DOCSTRING DETECTED/, `${label}: custom context content`);
  return { result, warning: String(added[0].content) };
}

async function expectClean(label, target, toolName, input) {
  const before = warningEntries(target.manager).length;
  const result = await target.session.executeTool(toolName, input);
  assert.doesNotMatch(outputText(result), /COMMENT\/DOCSTRING DETECTED/, `${label}: tool result`);
  assert.equal(warningEntries(target.manager).length, before, `${label}: no custom context warning`);
  cleanChecks += 1;
  return result;
}

let runtimeReceipt;

try {
  await loader.reload();
  assert.deepEqual(loader.getExtensions().errors, []);
  assert.equal(loader.getExtensions().extensions.some((item) => item.path.includes("pi-comment-checker/src/index.ts")), false);
  assert.equal(loader.getExtensions().extensions.some((item) => item.path === extension), true);
  models = senpi.ModelRuntime.createSync({ modelsPath: null, agentDir: runtimeAgentDir });
  const normal = await createSession(models.getModel("anthropic", "claude-haiku-4-5"), ["write", "edit", "eval"]);
  await expectClean("clean write", normal, "write", { path: "edit.ts", content: "const e = 1;\n" });
  await expectWarning("direct write", normal, "write", { path: "write.ts", content: "// DIRECT WRITE\nconst w = 1;\n" });
  await expectWarning("direct native edit", normal, "edit", {
    path: "edit.ts",
    edits: [{ oldText: "const e = 1;", newText: "// DIRECT EDIT\nconst e = 2;" }],
  });
  await expectWarning("nested write with ignored return", normal, "eval", {
    language: "js",
    summary: "nested write checker QA",
    on_timeout: "error",
    code: `await tool.write(${JSON.stringify({ path: "nested-write.ts", content: "// NESTED WRITE\nconst n = 1;\n" })}); return "ignored"`,
  }, false);
  await expectClean("nested edit setup", normal, "write", { path: "nested-edit.ts", content: "const n = 1;\n" });
  await expectWarning("nested native edit with ignored return", normal, "eval", {
    language: "js",
    summary: "nested edit checker QA",
    on_timeout: "error",
    code: `await tool.edit(${JSON.stringify({ path: "nested-edit.ts", edits: [{ oldText: "const n = 1;", newText: "// NESTED EDIT\nconst n = 2;" }] })}); return "ignored"`,
  }, false);

  const gpt = await createSession(models.getModel("openai-codex", "gpt-5.6-sol"), ["apply_patch", "eval"]);
  const multifile = "*** Begin Patch\n*** Add File: multi-a.ts\n+// MULTI A\n+const a = 1;\n*** Add File: multi-b.ts\n+// MULTI B\n+const b = 1;\n*** End Patch\n";
  const multi = await expectWarning("direct multifile apply_patch", gpt, "apply_patch", { input: multifile });
  assert.match(multi.warning, /file="multi-a\.ts"/);
  assert.match(multi.warning, /file="multi-b\.ts"/);

  const nestedPatch = "*** Begin Patch\n*** Add File: nested-patch.ts\n+// NESTED PATCH\n+const p = 1;\n*** End Patch\n";
  await expectWarning("nested apply_patch with ignored return", gpt, "eval", {
    language: "js",
    summary: "nested patch checker QA",
    on_timeout: "error",
    code: `await tool.apply_patch(${JSON.stringify({ input: nestedPatch })}); return "ignored"`,
  }, false);

  const moveSetup = "*** Begin Patch\n*** Add File: move-source.ts\n+const move = 1;\n*** End Patch\n";
  await expectClean("partial move setup", gpt, "apply_patch", { input: moveSetup });
  const partialPatch = "*** Begin Patch\n*** Update File: move-source.ts\n*** Move to: moved.ts\n@@\n-const move = 1;\n+// PARTIAL MOVE\n+const move = 2;\n*** Update File: missing.ts\n@@\n-const missing = 1;\n+// FAILED CHANGE\n+const missing = 2;\n*** End Patch\n";
  const partial = await expectWarning("real partial moved apply_patch", gpt, "apply_patch", { input: partialPatch });
  assert.equal(partial.result.details.result.hasPartialSuccess, true);
  assert.deepEqual(partial.result.details.result.appliedFiles.map((path) => resolve(cwd, path)), [join(cwd, "moved.ts")]);
  assert.match(partial.warning, /file="moved\.ts"/);
  assert.doesNotMatch(partial.warning, /file="missing\.ts"/);
  runtimeReceipt = {
    multifile: ["multi-a.ts", "multi-b.ts"],
    partialAppliedFiles: partial.result.details.result.appliedFiles,
    partialFailureFiles: partial.result.details.result.failures.map((failure) => failure.filePath),
    cleanChecks,
    cleanCustomMessagesAdded: 0,
  };
} finally {
  const failures = [];
  for (const target of sessions.reverse()) {
    try {
      if (target.session.extensionRunner.hasHandlers("session_shutdown")) {
        await target.session.extensionRunner.emit({ type: "session_shutdown", reason: "quit" });
      }
    } catch (error) {
      failures.push(error);
    } finally {
      target.session.dispose();
    }
  }
  try {
    await rm(cwd, { recursive: true, force: true });
  } catch (error) {
    failures.push(error);
  }
  assert.equal(existsSync(cwd), false, "temporary QA directory was removed");
  console.log(`CLEANUP: ${JSON.stringify({ sessionsDisposed: sessions.length, codeModeShutdownAwaited: true, tempDir: cwd, tempRemoved: true })}`);
  if (failures.length > 0) throw new AggregateError(failures, "runtime QA cleanup failed");
}

console.log(`PASS: ${JSON.stringify(runtimeReceipt)}`);
