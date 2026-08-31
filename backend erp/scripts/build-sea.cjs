const fs = require("node:fs");
const path = require("node:path");
const { execFileSync } = require("node:child_process");

const root = path.resolve(__dirname, "..");
const output = process.env.SEA_OUTPUT
  ? path.resolve(process.env.SEA_OUTPUT)
  : path.join(root, "dist", "backend.exe");
const blob = path.join(root, "dist", "sea-prep.blob");
const postject = path.join(root, "node_modules", "postject", "dist", "cli.js");

fs.copyFileSync(process.execPath, output);
const kitsBin = path.join(process.env["ProgramFiles(x86)"] || "C:\\Program Files (x86)", "Windows Kits", "10", "bin");
const sdkVersions = fs.existsSync(kitsBin)
  ? fs.readdirSync(kitsBin).filter((name) => /^\d+\.\d+/.test(name)).sort().reverse()
  : [];
const signTool = sdkVersions
  .map((version) => path.join(kitsBin, version, "x64", "signtool.exe"))
  .find(fs.existsSync);
if (!signTool) {
  throw new Error("signtool.exe nahi mila. Visual Studio Build Tools mein Windows SDK install karein.");
}
execFileSync(signTool, ["remove", "/s", output], { stdio: "inherit" });
execFileSync(process.execPath, [postject,
  output,
  "NODE_SEA_BLOB",
  blob,
  "--sentinel-fuse",
  "NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2",
], { stdio: "inherit" });

console.log(`Backend executable created: ${output}`);
