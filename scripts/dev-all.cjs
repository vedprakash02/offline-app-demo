const { spawn } = require("node:child_process");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const npm = process.platform === "win32" ? "npm.cmd" : "npm";
const appDataRoot = process.env.LOCALAPPDATA || path.join(root, ".local-data");
const sharedUploadsDir = path.join(appDataRoot, "Vidya Prabandh Demo", "uploads");
const runScript = (cwd, script, env = {}) => {
  const options = { cwd, stdio: "inherit", env: { ...process.env, ...env } };
  if (process.platform === "win32") return spawn(`${npm} run ${script}`, { ...options, shell: true });
  return spawn(npm, ["run", script], options);
};

const children = [
  runScript(root, "dev:frontend"),
  runScript(path.join(root, "backend erp"), "dev", { UPLOADS_DIR: sharedUploadsDir }),
  runScript(path.join(root, "backend id"), "dev"),
];

console.log(`Using shared uploads folder: ${sharedUploadsDir}`);
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