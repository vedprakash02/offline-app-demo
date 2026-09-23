const fs = require("node:fs");
const path = require("node:path");
const { execFileSync } = require("node:child_process");

if (process.platform !== "win32") {
  throw new Error("Backend sidecar build is configured only for Windows.");
}

const root = path.resolve(__dirname, "..");
const rustArch = { x64: "x86_64", arm64: "aarch64" }[process.arch];
if (!rustArch) throw new Error(`Unsupported Windows architecture: ${process.arch}`);

const npmCli = path.join(path.dirname(process.execPath), "node_modules", "npm", "bin", "npm-cli.js");
const binariesDir = path.join(root, "src-tauri", "binaries");
const sidecars = [
  { directory: "backend erp", binaryName: "backend-erp" },
  { directory: "backend id", binaryName: "backend-id" },
];

fs.mkdirSync(binariesDir, { recursive: true });
for (const { directory, binaryName } of sidecars) {
  const backendDir = path.join(root, directory);
  const output = path.join(backendDir, "dist", `${binaryName}-sidecar-${process.pid}.exe`);
  const destination = path.join(binariesDir, `${binaryName}-${rustArch}-pc-windows-msvc.exe`);

  execFileSync(process.execPath, [npmCli, "install", "--no-audit", "--no-fund"], {
    cwd: backendDir,
    stdio: "inherit",
  });
  execFileSync(process.execPath, [npmCli, "run", "build-exe"], {
    cwd: backendDir,
    stdio: "inherit",
    env: { ...process.env, SEA_OUTPUT: output },
  });

  fs.copyFileSync(output, destination);
  fs.unlinkSync(output);
  console.log(`Tauri sidecar ready: ${destination}`);
}