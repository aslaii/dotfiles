import assert from "node:assert/strict";
import { mkdtempSync, rmSync, symlinkSync, unlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "bun:test";

const hook = fileURLToPath(new URL("./omo.zsh", import.meta.url));

async function runShell(bin, insideHerdr, command = "omo HERDR_AGENT") {
    const child = Bun.spawn(["/bin/zsh", "-f", "-c", 'source "$1"; ' + command, "qa", hook], {
        env: {
            ...process.env,
            PATH: `${bin}:/usr/bin:/bin`,
            HERDR_ENV: insideHerdr ? "1" : "0",
            HERDR_AGENT: "claude",
        },
        stdout: "pipe",
        stderr: "pipe",
    });
    const output = await new Response(child.stdout).text();
    const error = await new Response(child.stderr).text();
    assert.equal(await child.exited, 0, error);
    return output;
}

test("the shell hint identifies OmO without leaking to other commands", async () => {
    // given
    const bin = mkdtempSync(join(tmpdir(), "omo-hint-"));
    symlinkSync("/usr/bin/printenv", join(bin, "omo"));
    try {
        // when
        const output = await runShell(bin, true, "omo HERDR_AGENT; command printenv HERDR_AGENT");

        // then
        assert.equal(output, "pi\nclaude\n");
    } finally {
        rmSync(bin, { recursive: true });
    }
});

test("the shell leaves non-herdr launches unchanged", async () => {
    // given
    const bin = mkdtempSync(join(tmpdir(), "omo-hint-"));
    symlinkSync("/usr/bin/printenv", join(bin, "omo"));
    try {
        // when
        const output = await runShell(bin, false);

        // then
        assert.equal(output, "claude\n");
    } finally {
        rmSync(bin, { recursive: true });
    }
});

test("the shell follows a replaced package command after an update", async () => {
    // given
    const bin = mkdtempSync(join(tmpdir(), "omo-update-"));
    const command = join(bin, "omo");
    symlinkSync("/usr/bin/printenv", command);
    assert.equal(await runShell(bin, true), "pi\n");
    unlinkSync(command);
    symlinkSync("/bin/echo", command);
    try {
        // when
        const output = await runShell(bin, true, "omo after-update --version");

        // then
        assert.equal(output, "after-update --version\n");
    } finally {
        rmSync(bin, { recursive: true });
    }
});
