import { ChildProcess } from "node:child_process";

const installed = Symbol.for("omo.sdk-process-group");

export default function install() {
    if (process.platform === "win32" || ChildProcess.prototype[installed]) return;
    const spawn = ChildProcess.prototype.spawn;
    ChildProcess.prototype.spawn = function (options) {
        const args = options.args;
        if ((options.env?.HERDR_ENV === "1" || options.envPairs?.includes("HERDR_ENV=1")) &&
            args.some((arg, index) => arg === "--input-format" && args[index + 1] === "stream-json") &&
            args.some((arg, index) => arg === "--output-format" && args[index + 1] === "stream-json")) {
            options = { ...options, detached: true };
        }
        return spawn.call(this, options);
    };
    Object.defineProperty(ChildProcess.prototype, installed, { value: true });
}
