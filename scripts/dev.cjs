const { spawn } = require("node:child_process");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const npm = process.platform === "win32" ? "npm.cmd" : "npm";
const spawnOptions = { stdio: "inherit", shell: process.platform === "win32" };
const children = [
  spawn(npm, ["run", "dev:frontend"], { cwd: root, ...spawnOptions }),
  spawn(npm, ["run", "dev"], { cwd: path.join(root, "backend erp"), ...spawnOptions }),
];

const stop = () => {
  for (const child of children) {
    if (!child.killed) child.kill();
  }
};
process.on("SIGINT", stop);
process.on("SIGTERM", stop);
for (const child of children) {
  child.on("exit", (code) => {
    if (code && code !== 0) {
      stop();
      process.exitCode = code;
    }
  });
}