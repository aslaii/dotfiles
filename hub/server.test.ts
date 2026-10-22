import { expect, test } from "bun:test";
import { parseStatus } from "./server";

test("running KeepAlive service", () => {
  const out = "gui/501/com.jobapply.worker = {\n\tactive count = 1\n\tpath = /x.plist\n\tstate = running\n\n\tpid = 92470\n\tlast exit code = (never exited)\n\tendpoints = {\n\t\tstate = active\n\t}\n}\n";
  expect(parseStatus(out)).toEqual({ loaded: true, running: true, pid: 92470, lastExit: "(never exited)" });
});

test("loaded but idle scheduled job: nested state is ignored", () => {
  const out = "gui/501/com.aslaii.connecteam = {\n\tstate = not running\n\tlast exit code = 0\n\tspawn = {\n\t\tstate = active\n\t}\n}\n";
  expect(parseStatus(out)).toEqual({ loaded: true, running: false, pid: undefined, lastExit: "0" });
});

test("service not loaded", () => {
  expect(parseStatus(null)).toEqual({ loaded: false, running: false });
});
