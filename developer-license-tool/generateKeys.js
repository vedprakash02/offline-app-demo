const crypto = require("crypto"),
  fs = require("fs"),
  path = require("path");
const privatePath = path.join(__dirname, "private", "license-private.pem"),
  publicPath = path.join(__dirname, "license-public.pem");
if (fs.existsSync(privatePath) || fs.existsSync(publicPath))
  throw new Error("Keys already exist; overwrite blocked.");
fs.mkdirSync(path.dirname(privatePath), { recursive: true });
const { publicKey, privateKey } = crypto.generateKeyPairSync("ed25519");
fs.writeFileSync(
  privatePath,
  privateKey.export({ type: "pkcs8", format: "pem" }),
  { mode: 0o600 },
);
fs.writeFileSync(publicPath, publicKey.export({ type: "spki", format: "pem" }));
console.log("License signing keys generated.");
