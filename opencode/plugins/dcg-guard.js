export const DcgGuard = async () => {
  const dcg =
    Bun.which("dcg") ??
    `${process.env.HOME ?? "/Users/joyrideadmin"}/.local/bin/dcg`;

  return {
    "tool.execute.before": async (input, output) => {
      if (input.tool !== "bash") return;

      const command = output.args?.command;
      if (typeof command !== "string") {
        throw new Error("dcg blocked a malformed bash tool request");
      }

      const payload = JSON.stringify({
        tool_name: "Bash",
        tool_input: { command },
      });
      const proc = Bun.spawn([dcg], {
        stdin: "pipe",
        stdout: "pipe",
        stderr: "pipe",
        env: {
          ...process.env,
          DCG_FAIL_CLOSED: "1",
          DCG_ROBOT: "1",
        },
      });
      proc.stdin.write(payload);
      proc.stdin.end();

      const [exitCode, out, err] = await Promise.all([
        proc.exited,
        new Response(proc.stdout).text(),
        new Response(proc.stderr).text(),
      ]);
      if (exitCode !== 0) {
        throw new Error(err.trim() || `dcg failed closed (exit ${exitCode})`);
      }

      const last = out.trimEnd().split("\n").pop();
      if (!last) return;

      const result = JSON.parse(last);
      if (result?.hookSpecificOutput?.permissionDecision === "deny") {
        throw new Error(
          result.hookSpecificOutput.permissionDecisionReason ??
            "blocked by dcg",
        );
      }
    },
  };
};
