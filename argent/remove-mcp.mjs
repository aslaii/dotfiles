#!/usr/bin/env node
import { lstat, readFile, rm, writeFile } from "node:fs/promises"

for (const path of process.argv.slice(2)) {
  let info
  try {
    info = await lstat(path)
  } catch (error) {
    if (error?.code === "ENOENT") continue
    throw error
  }
  if (!info.isFile() || info.isSymbolicLink()) {
    throw new Error(`refusing to edit non-regular MCP config: ${path}`)
  }

  const config = JSON.parse(await readFile(path, "utf8"))
  const servers = config?.mcpServers
  if (!servers || typeof servers !== "object" || Array.isArray(servers) || !Object.hasOwn(servers, "argent")) {
    continue
  }

  delete servers.argent
  if (Object.keys(servers).length === 0) delete config.mcpServers
  if (Object.keys(config).every((key) => key === "$schema")) {
    await rm(path)
  } else {
    await writeFile(path, `${JSON.stringify(config, null, 2)}\n`)
  }
}
