import assert from "node:assert/strict";
import { once } from "node:events";
import { spawn } from "node:child_process";
import { test } from "bun:test";
import install from "./sdk-process-group.js";

install();

async function groupOf(pid) {
    const child = spawn("/bin/ps", ["-o", "pgid=", "-p", String(pid)]);
    let output = "";
    child.stdout.setEncoding("utf8");
    child.stdout.on("data", (chunk) => { output += chunk; });
    const [code] = await once(child, "close");
    assert.equal(code, 0);
    return Number(output.trim());
}

async function childGroup(args, insideHerdr) {
    const child = spawn(process.execPath, [
        "-e", 'process.stdout.write("READY\\n"); process.stdin.resume();', "--", ...args,
    ], { env: { ...process.env, HERDR_ENV: insideHerdr ? "1" : "0" } });
    const closed = once(child, "close");
    try {
        await once(child.stdout, "data", { signal: AbortSignal.timeout(5000) });
        return { pid: child.pid, group: await groupOf(child.pid) };
    } finally {
        child.kill("SIGTERM");
        await closed;
    }
}

test("SDK stream helpers leave the foreground group inside herdr", async () => {
    // given
    const parentGroup = await groupOf(process.pid);

    // when
    const child = await childGroup(["--input-format", "stream-json", "--output-format", "stream-json"], true);

    // then
    assert.equal(child.group, child.pid);
    assert.notEqual(child.group, parentGroup);
});

test("ordinary commands retain the foreground group", async () => {
    // given
    const parentGroup = await groupOf(process.pid);

    // when
    const child = await childGroup([], true);

    // then
    assert.equal(child.group, parentGroup);
});

test("SDK stream helpers outside herdr retain the foreground group", async () => {
    // given
    const parentGroup = await groupOf(process.pid);

    // when
    const child = await childGroup(["--input-format", "stream-json", "--output-format", "stream-json"], false);

    // then
    assert.equal(child.group, parentGroup);
});
