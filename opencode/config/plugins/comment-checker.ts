import { spawnSync } from "node:child_process"
import { existsSync } from "node:fs"
import { homedir } from "node:os"
import { join } from "node:path"

const CHECKER_TIMEOUT_MS = 30_000
const CHECKED_TOOLS = new Set(["write", "edit", "multiedit", "multi_edit"])

function resolveChecker(): string | null {
  const candidates = [
    process.env.COMMENT_CHECKER_BIN,
    join(homedir(), ".local", "bin", "comment-checker"),
    join(homedir(), "go", "bin", "comment-checker"),
    "/usr/local/bin/comment-checker",
    "/opt/homebrew/bin/comment-checker",
  ].filter((value): value is string => typeof value === "string" && value.length > 0)

  for (const candidate of candidates) {
    if (existsSync(candidate)) return candidate
  }
  if (typeof Bun !== "undefined" && typeof Bun.which === "function") {
    return Bun.which("comment-checker") ?? null
  }
  return null
}

function hookPayload(tool: string, args: Record<string, unknown>) {
  if (tool === "write") {
    return {
      tool_name: "Write",
      tool_input: { file_path: args.filePath ?? args.path, content: args.content },
    }
  }

  if (tool === "multiedit" || tool === "multi_edit") {
    const edits = Array.isArray(args.edits) ? args.edits : []
    return {
      tool_name: "MultiEdit",
      tool_input: {
        file_path: args.filePath ?? args.path,
        edits: edits.map((edit) => ({
          old_string: (edit as Record<string, unknown>).oldString,
          new_string: (edit as Record<string, unknown>).newString,
        })),
      },
    }
  }

  return {
    tool_name: "Edit",
    tool_input: {
      file_path: args.filePath ?? args.path,
      old_string: args.oldString,
      new_string: args.newString,
    },
  }
}

let warnedMissing = false
let warnedBroken = false

function check(tool: string, args: Record<string, unknown>, cwd: string) {
  const binary = resolveChecker()
  if (!binary) {
    if (!warnedMissing) {
      warnedMissing = true
      console.warn("[comment-checker] binary not found; comment checks skipped for this session")
    }
    return
  }

  const payload = JSON.stringify({
    session_id: "opencode",
    cwd,
    ...hookPayload(tool, args),
  })

  const result = spawnSync(binary, ["--prompt", ""], {
    input: payload,
    encoding: "utf8",
    timeout: CHECKER_TIMEOUT_MS,
    maxBuffer: 1024 * 1024,
  })

  if (result.error) {
    if (!warnedBroken) {
      warnedBroken = true
      console.warn(`[comment-checker] check failed: ${result.error.message}`)
    }
    return
  }

  if (result.status === 2) {
    const reason = (result.stderr || result.stdout || "").trim()
    throw new Error(reason || "comment-checker rejected this change: remove unnecessary comments")
  }

  if (result.status !== 0 && !warnedBroken) {
    warnedBroken = true
    console.warn(`[comment-checker] check failed with exit ${result.status}; continuing`)
  }
}

function intercept(tool: string | undefined, args: Record<string, unknown> | undefined, cwd: string) {
  if (!tool || !args) return
  if (!CHECKED_TOOLS.has(tool.toLowerCase())) return
  check(tool.toLowerCase(), args, cwd)
}

export default {
  id: "comment-checker",
  async setup(ctx: any) {
    await ctx.tool.hook("execute.before", (event: any) => {
      intercept(event.tool, event.input, ctx.location?.directory ?? process.cwd())
    })
  },
  async server() {
    return {
      "tool.execute.before": async (input: any, output: any) => {
        intercept(input.tool, output?.args, process.cwd())
      },
    }
  },
}
