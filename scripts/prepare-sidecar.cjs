const fs = require("node:fs");
const path = require("node:path");
const { execFileSync } = require("node:child_process");

if (process.platform !== "win32") {
  throw new Error("Backend SEA sidecar build filhaal sirf Windows ke liye configured hai.");
}

const root = path.resolve(__dirname, "..");
const backendDir = path.join(root, "backend");
const rustArch = {
  x64: "x86_64",
  arm64: "aarch64",
}[process.arch];

if (!rustArch) {
  throw new Error(`Unsupported Windows architecture: ${process.arch}`);
}

const binariesDir = path.join(root, "src-tauri", "binaries");
const destination = path.join(
  binariesDir,
  `server-${rustArch}-pc-windows-msvc.exe`,
);

if (fs.existsSync(destination) && !process.argv.includes("--force")) {
  console.log(`Existing Tauri sidecar reused: ${destination}`);
  process.exit(0);
}

const source = path.join(
  backendDir,
  "dist",
  `backend-sidecar-${process.pid}.exe`,
);
const npmCli = path.join(
  path.dirname(process.execPath),
  "node_modules",
  "npm",
  "bin",
  "npm-cli.js",
);

execFileSync(process.execPath, [npmCli, "run", "build-exe"], {
  cwd: backendDir,
  stdio: "inherit",
  env: { ...process.env, SEA_OUTPUT: source },
});

fs.mkdirSync(binariesDir, { recursive: true });
fs.copyFileSync(source, destination);

console.log(`Tauri sidecar ready: ${destination}`);
