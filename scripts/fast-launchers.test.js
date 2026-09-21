import { expect, test } from "bun:test"
import { fileURLToPath } from "node:url"

for (const platform of ["macos", "wsl"]) {
  test(`${platform} omp-fast preserves arguments and uses the isolated launcher`, async () => {
    const functions = fileURLToPath(new URL(`../${platform}/zsh/zsh/functions.zsh`, import.meta.url))
    const child = Bun.spawn(["zsh", "-fc", `
      source "$1"
      function bun() { printf '%s\\n' "$@"; }
      omp-fast --print "urgent task with spaces"
    `, "fast-launcher-test", functions], {
      env: { ...process.env, DOTFILES_DIR: "/tmp/dot files" },
      stdout: "pipe",
      stderr: "pipe",
    })
    const [stdout, stderr, exitCode] = await Promise.all([
      new Response(child.stdout).text(),
      new Response(child.stderr).text(),
      child.exited,
    ])
    expect(stderr).toBe("")
    expect(exitCode).toBe(0)
    expect(stdout.trimEnd().split("\n")).toEqual([
      "/tmp/dot files/omp/launch.mjs",
      "--config",
      "/tmp/dot files/omp/fast.yml",
      "--extension",
      "/tmp/dot files/omp/fast.mjs",
      "--print",
      "urgent task with spaces",
    ])
  })
}
