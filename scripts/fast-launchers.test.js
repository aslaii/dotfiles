import { expect, test } from "bun:test"
import { fileURLToPath } from "node:url"

for (const platform of ["macos", "wsl"]) {
  for (const name of ["omo", "omp"]) {
    test(`${platform} ${name}-fast preserves arguments and uses the isolated launcher`, async () => {
      const functions = fileURLToPath(new URL(`../${platform}/zsh/zsh/functions.zsh`, import.meta.url))
      const child = Bun.spawn(["zsh", "-fc", `
        source "$1"
        function bash() { printf 'profile: %s\\n' "$OMO_PROFILE"; printf '%s\\n' "$@"; }
        function bun() { printf '%s\\n' "$@"; }
        \${2}-fast --print "urgent task with spaces"
      `, "fast-launcher-test", functions, name], {
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
        ...(name === "omo" ? ["profile: fast"] : []),
        `/tmp/dot files/${name}/${name === "omo" ? "launch.sh" : "launch.mjs"}`,
        name === "omo" ? "--extension" : "--config",
        `/tmp/dot files/${name}/${name === "omo" ? "fast.mjs" : "fast.yml"}`,
        ...(name === "omp" ? ["--extension", "/tmp/dot files/omp/fast.mjs"] : []),
        "--print",
        "urgent task with spaces",
      ])
    })
  }
}
