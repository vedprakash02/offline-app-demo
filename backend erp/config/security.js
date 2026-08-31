const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

let generatedSecret = "";
const getJwtSecret = () => {
  if (process.env.JWT_SECRET && process.env.JWT_SECRET.trim().length >= 32) return process.env.JWT_SECRET.trim();
  if (generatedSecret) return generatedSecret;
  const secretPath = process.env.JWT_SECRET_FILE || path.join(process.cwd(), ".school-erp-jwt-secret");
  try {
    if (fs.existsSync(secretPath)) generatedSecret = fs.readFileSync(secretPath, "utf8").trim();
    if (generatedSecret.length < 32) {
      generatedSecret = crypto.randomBytes(48).toString("base64url");
      fs.writeFileSync(secretPath, generatedSecret, { encoding: "utf8", mode: 0o600 });
      console.warn("JWT_SECRET is not set; created a persistent local signing secret.");
    }
  } catch (error) {
    generatedSecret = crypto.randomBytes(48).toString("base64url");
    console.warn(`JWT secret file unavailable (${error.message}); sessions will reset after restart.`);
  }
  return generatedSecret;
};

module.exports = { getJwtSecret };
