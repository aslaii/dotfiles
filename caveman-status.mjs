export default function cavemanStatus(pi) {
  pi.on("session_start", (_event, ctx) => {
    ctx?.ui?.setStatus?.("caveman", "🪨 caveman: LITE")
  })
}
