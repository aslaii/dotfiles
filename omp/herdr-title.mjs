import { spawnSync } from "node:child_process"

const ownerTag = Symbol.for("dotfiles.omp.herdr-title.v1")
const source = "custom:omp"

export default function herdrTitle(pi) {
  const { HERDR_BIN_PATH: bin, HERDR_ENV, HERDR_PANE_ID: pane } = process.env
  if (HERDR_ENV !== "1" || !bin || !process.env.HERDR_SOCKET_PATH || !pane) return

  process[ownerTag]?.()

  let lastTitle
  let unsubscribe

  function report(title) {
    if (title === lastTitle) return
    lastTitle = title
    spawnSync(
      bin,
      ["pane", "report-metadata", pane, "--source", source, ...(title ? ["--title", title] : ["--clear-title"])],
      { env: process.env, stdio: "ignore", timeout: 1000, killSignal: "SIGKILL" },
    )
  }

  function follow(ctx) {
    unsubscribe?.()
    report(pi.getSessionName())
    const subscribe = ctx?.sessionManager?.onSessionNameChanged
    unsubscribe = typeof subscribe === "function" ? subscribe.call(ctx.sessionManager, () => report(pi.getSessionName())) : undefined
  }

  function retire(clear = false) {
    unsubscribe?.()
    unsubscribe = undefined
    if (clear) {
      lastTitle = undefined
      spawnSync(
        bin,
        ["pane", "report-metadata", pane, "--source", source, "--clear-title"],
        { env: process.env, stdio: "ignore", timeout: 1000, killSignal: "SIGKILL" },
      )
    }
  }

  process[ownerTag] = retire
  pi.on("session_start", (_event, ctx) => ctx?.hasUI === true && follow(ctx))
  pi.on("session_switch", (_event, ctx) => ctx?.hasUI === true && follow(ctx))
  pi.on("session_shutdown", () => {
    retire(true)
    if (process[ownerTag] === retire) delete process[ownerTag]
  })
}
