const crypto = require("crypto"),
  fs = require("fs"),
  path = require("path");
const values = process.argv.slice(2),
  args = {};
for (let i = 0; i < values.length; i++)
  if (values[i].startsWith("--")) args[values[i].slice(2)] = values[i + 1];
if (!args.school || !args.machine || (!args.months && !args.days)) {
  console.error(
    'Usage: node generateLicense.js --school "School" --machine ID --months 12 --plan annual --students 500',
  );
  process.exit(1);
}
const today = new Date(),
  expiry = new Date(today);
if (args.days) expiry.setUTCDate(expiry.getUTCDate() + Number(args.days));
else expiry.setUTCMonth(expiry.getUTCMonth() + Number(args.months));
const date = (d) => d.toISOString().slice(0, 10);
const license = {
  version: 1,
  licenseId: args.id || `SCH-${Date.now()}`,
  schoolName: args.school.trim(),
  machineId: args.machine.trim().toUpperCase(),
  issuedAt: date(today),
  expiresAt: date(expiry),
  plan: args.plan || (args.days ? "demo" : "annual"),
  studentLimit: Number(args.students || 500),
  modules: String(
    args.modules || "students,attendance,fees,exams,idcards,documents,backup",
  )
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean)
    .sort(),
};
const key = fs.readFileSync(
  path.join(__dirname, "private", "license-private.pem"),
);
license.signature = crypto
  .sign(null, Buffer.from(JSON.stringify(license)), key)
  .toString("base64");
const output = path.resolve(
  args.out || path.join(__dirname, "generated", `${license.licenseId}.lic`),
);
fs.mkdirSync(path.dirname(output), { recursive: true });
fs.writeFileSync(output, JSON.stringify(license, null, 2));
console.log(`License: ${output}\nExpiry: ${license.expiresAt}`);
