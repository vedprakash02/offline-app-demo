const crypto = require("crypto");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { execFileSync } = require("child_process");

const dataDirectory = process.env.ERP_LICENSE_DIR || path.join(process.env.LOCALAPPDATA || process.cwd(), "Vidya Prabandh", "license");
const licensePath = path.join(dataDirectory, "school-license.lic");
const statePath = path.join(dataDirectory, "license-state.json");
const demoTrialPath = path.join(dataDirectory, "demo-trial-state.json");
// The ERP server is shipped as a single executable. Keep the verification key
// in the bundle because companion files are not guaranteed beside the sidecar.
// This is a public key, so embedding it does not expose the signing key.
const publicKey = Buffer.from(`-----BEGIN PUBLIC KEY-----
MCowBQYDK2VwAyEAObG1xEsTdRp+jGLbvhjX8KW+TQlKDz/W0qtoxTLHbb0=
-----END PUBLIC KEY-----
`);
fs.mkdirSync(dataDirectory, { recursive: true });

const machineSource = () => {
  if (process.platform === "win32") {
    try {
      const output = execFileSync("reg", ["query", "HKLM\\SOFTWARE\\Microsoft\\Cryptography", "/v", "MachineGuid"], { encoding: "utf8", windowsHide: true });
      const match = output.match(/MachineGuid\s+REG_SZ\s+([^\r\n]+)/i);
      if (match) return `win:${match[1].trim()}`;
    } catch {}
  }
  const macs = Object.values(os.networkInterfaces()).flat().filter((item) => item && !item.internal && item.mac && item.mac !== "00:00:00:00:00:00").map((item) => item.mac).sort();
  return [os.hostname(), os.platform(), os.arch(), macs[0] || "no-mac"].join("|");
};
const machineId = crypto.createHash("sha256").update(machineSource()).digest("hex").toUpperCase();
const canonical = (license) => JSON.stringify({
  version: Number(license.version || 1), licenseId: String(license.licenseId || ""), schoolName: String(license.schoolName || ""),
  machineId: String(license.machineId || "").toUpperCase(), issuedAt: String(license.issuedAt || ""), expiresAt: String(license.expiresAt || ""),
  plan: String(license.plan || ""), studentLimit: Number(license.studentLimit || 0), modules: [...(license.modules || [])].map(String).sort(),
});
const stateKey = () => crypto.createHash("sha256").update(`vidya-license-state-v1:${machineId}`).digest();
const signState = (payload) => crypto.createHmac("sha256", stateKey()).update(JSON.stringify(payload)).digest("hex");
const readState = () => { try { const value = JSON.parse(fs.readFileSync(statePath, "utf8")); const { signature, ...payload } = value; return crypto.timingSafeEqual(Buffer.from(signature || ""), Buffer.from(signState(payload))) ? payload : null; } catch { return null; } };
const writeState = (licenseId, timestamp) => { const payload = { licenseId, lastRunAt: new Date(timestamp).toISOString() }; fs.writeFileSync(statePath, JSON.stringify({ ...payload, signature: signState(payload) })); };
const signDemoTrial = (payload) => crypto.createHmac("sha256", stateKey()).update(JSON.stringify(payload)).digest("hex");
const readDemoTrial = () => { try { const value = JSON.parse(fs.readFileSync(demoTrialPath, "utf8")); const { signature, ...payload } = value; return crypto.timingSafeEqual(Buffer.from(signature || ""), Buffer.from(signDemoTrial(payload))) ? payload : null; } catch { return null; } };
const writeDemoTrial = (payload) => fs.writeFileSync(demoTrialPath, JSON.stringify({ ...payload, signature: signDemoTrial(payload) }));
const dateOnly = (timestamp) => new Date(timestamp).toISOString().slice(0, 10);
const getDemoTrialStatus = () => {
  const months = Number(process.env.DEMO_TRIAL_MONTHS || 0);
  if (!Number.isInteger(months) || months < 1) return null;
  const now = Date.now(); let trial = readDemoTrial();
  if (!trial) { const expiry = new Date(now); expiry.setMonth(expiry.getMonth() + months); trial = { version: 1, machineId, startedAt: dateOnly(now), expiresAt: dateOnly(expiry), lastRunAt: new Date(now).toISOString() }; writeDemoTrial(trial); }
  if (trial.machineId !== machineId) return { valid: false, code: "LICENSE_MACHINE_MISMATCH", message: "Demo is computer ke liye valid nahi hai." };
  const expiry = Date.parse(`${trial.expiresAt}T23:59:59.999Z`); const lastRun = Date.parse(trial.lastRunAt || "");
  if (!Number.isFinite(expiry)) return { valid: false, code: "LICENSE_INVALID", message: "Demo expiry invalid hai." };
  if (Number.isFinite(lastRun) && now < lastRun - 5 * 60 * 1000) return { valid: false, code: "CLOCK_TAMPERED", message: "Computer date/time pichhe ki gayi hai. Sahi date set karein." };
  const license = { licenseId: `DEMO-${machineId.slice(0, 12)}`, schoolName: "Vidya Prabandh Demo", machineId, issuedAt: trial.startedAt, expiresAt: trial.expiresAt, plan: `${months}-month demo`, studentLimit: 0, modules: ["demo"] };
  if (now > expiry) return { valid: false, expired: true, code: "LICENSE_EXPIRED", message: `3-month demo ${trial.expiresAt} ko expire ho gaya.`, license };
  if (!Number.isFinite(lastRun) || now - lastRun > 5 * 60 * 1000) writeDemoTrial({ ...trial, lastRunAt: new Date(now).toISOString() });
  return { valid: true, code: "LICENSE_VALID", message: "3-month demo active hai.", daysRemaining: Math.max(0, Math.ceil((expiry - now) / 86400000)), license };
};

const verifyLicenseObject = (license, { updateClock = true } = {}) => {
  try {
    if (!license?.signature) return { valid: false, code: "LICENSE_INVALID", message: "License signature missing hai." };

    const signatureValid = crypto.verify(null, Buffer.from(canonical(license)), publicKey, Buffer.from(license.signature, "base64"));
    if (!signatureValid) return { valid: false, code: "LICENSE_INVALID", message: "License file modified ya invalid hai." };
    if (String(license.machineId).toUpperCase() !== machineId) return { valid: false, code: "LICENSE_MACHINE_MISMATCH", message: "License is computer ke liye issue nahi hua hai." };
    const now = Date.now(); const issued = Date.parse(`${license.issuedAt}T00:00:00.000Z`); const expiry = Date.parse(`${license.expiresAt}T23:59:59.999Z`);
    if (!Number.isFinite(issued) || !Number.isFinite(expiry) || expiry < issued) return { valid: false, code: "LICENSE_INVALID", message: "License dates invalid hain." };
    const state = readState(); const lastRun = state?.licenseId === license.licenseId ? Date.parse(state.lastRunAt) : 0;
    if (lastRun && now < lastRun - 5 * 60 * 1000) return { valid: false, code: "CLOCK_TAMPERED", message: "Computer date/time pichhe ki gayi hai. Sahi date set karein." };
    if (now > expiry) return { valid: false, expired: true, code: "LICENSE_EXPIRED", message: `License ${license.expiresAt} ko expire ho gaya.`, license: { ...license, signature: undefined } };
    if (now < issued - 24 * 60 * 60 * 1000) return { valid: false, code: "LICENSE_NOT_STARTED", message: `License ${license.issuedAt} se valid hoga.` };
    if (updateClock && (!lastRun || now - lastRun > 5 * 60 * 1000)) writeState(license.licenseId, now);
    return { valid: true, code: "LICENSE_VALID", message: "License active hai.", daysRemaining: Math.max(0, Math.ceil((expiry - now) / 86400000)), license: { ...license, signature: undefined } };
  } catch (error) { return { valid: false, code: "LICENSE_INVALID", message: `License verify nahi hua: ${error.message}` }; }
};
const getLicenseStatus = () => { if (process.env.DEVELOPER_BYPASS_LICENSE === "1") return { valid: true, code: "DEVELOPER_MODE", message: "Developer license bypass active.", machineId, daysRemaining: 9999, license: { licenseId: "DEVELOPER", schoolName: "Developer workspace", machineId, issuedAt: "2000-01-01", expiresAt: "2099-12-31", plan: "Developer", studentLimit: 0, modules: ["all"] } }; try { return { ...verifyLicenseObject(JSON.parse(fs.readFileSync(licensePath, "utf8"))), machineId }; } catch { const demo = getDemoTrialStatus(); return demo ? { ...demo, machineId } : { valid: false, code: "LICENSE_REQUIRED", message: "Valid license activate karein.", machineId }; } };
const activateLicense = (buffer) => {
  let license; try { license = JSON.parse(buffer.toString("utf8")); } catch { return { valid: false, code: "LICENSE_INVALID", message: "License file JSON valid nahi hai." }; }
  const result = verifyLicenseObject(license, { updateClock: false }); if (!result.valid) return { ...result, machineId };
  const temporaryPath = `${licensePath}.tmp`; fs.writeFileSync(temporaryPath, JSON.stringify(license, null, 2)); fs.renameSync(temporaryPath, licensePath); writeState(license.licenseId, Date.now()); return { ...result, machineId, message: "License successfully activate ho gaya." };
};
module.exports = { activateLicense, getLicenseStatus, machineId };