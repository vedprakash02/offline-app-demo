const express = require("express");
const mongoose = require("mongoose");
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const auth = require("../authorigetion/auth.js");
const User = require("../models/user.js");
const AuditLog = require("../models/auditLog.js");
const EJSON = mongoose.mongo.BSON.EJSON;

const router = express.Router();
const backupUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 150 * 1024 * 1024 } });
const sqliteBaseUrl = process.env.ID_BACKEND_URL || "http://127.0.0.1:4173";
const idAdminKeyPath = path.join(process.env.LOCALAPPDATA || process.cwd(), "SIRF ID Attendance", "admin.key");
const getIdAdminKey = () => String(process.env.ERP_ID_ADMIN_KEY || (fs.existsSync(idAdminKeyPath) ? fs.readFileSync(idAdminKeyPath, "utf8") : "")).trim();
const requireAdmin = (req, res, next) => req.user?.role === "admin" ? next() : res.status(403).json({ message: "Sirf admin is action ko chala sakta hai." });
const safeCollections = async () => (await mongoose.connection.db.listCollections({}, { nameOnly: true }).toArray()).map((item) => item.name).filter((name) => !name.startsWith("system."));

const mongoSnapshot = async () => {
  const data = {};
  for (const name of await safeCollections()) data[name] = await mongoose.connection.db.collection(name).find({}).toArray();
  return data;
};
const sqliteRequest = async (pathname, options = {}) => {
  try {
    const response = await fetch(`${sqliteBaseUrl}${pathname}`, { ...options, signal: AbortSignal.timeout(10000) });
    if (!response.ok) throw new Error(`SQLite service ${response.status}`);
    return await response.json();
  } catch (error) {
    return { available: false, error: error.message };
  }
};
const uploadSnapshot = () => {
  const directory = process.env.UPLOADS_DIR || path.join(process.cwd(), "uploads");
  if (!fs.existsSync(directory)) return [];
  return fs.readdirSync(directory, { withFileTypes: true }).filter((entry) => entry.isFile()).map((entry) => {
    const filePath = path.join(directory, entry.name);
    return { name: entry.name, data: fs.readFileSync(filePath).toString("base64") };
  });
};

router.get("/admin/backup", auth, requireAdmin, async (_req, res) => {
  try {
    const backup = {
      format: "school-erp-backup-v1",
      createdAt: new Date().toISOString(),
      mongoDatabase: mongoose.connection.name,
      mongo: await mongoSnapshot(),
      sqlite: await sqliteRequest("/api/backup"),
      uploads: uploadSnapshot(),
    };
    const stamp = backup.createdAt.replace(/[:.]/g, "-");
    res.setHeader("Content-Disposition", `attachment; filename=school-erp-backup-${stamp}.json`);
    res.type("application/json").send(EJSON.stringify({ ...backup, format: "school-erp-backup-v2" }, { relaxed: false }));
  } catch (error) {
    res.status(500).json({ message: `Backup create nahi hua: ${error.message}` });
  }
});

router.post("/admin/restore", auth, requireAdmin, backupUpload.single("backup"), async (req, res) => {
  try {
    if (req.body?.confirmation !== "RESTORE SCHOOL DATA") return res.status(400).json({ message: "Restore confirmation phrase sahi nahi hai." });
    if (!req.file) return res.status(400).json({ message: "Backup JSON file select karein." });
    const backup = JSON.parse(req.file.buffer.toString("utf8"));
    if (backup.format !== "school-erp-backup-v1" || !backup.mongo) return res.status(400).json({ message: "Invalid School ERP backup file." });
    if (backup.sqlite?.tables && !getIdAdminKey()) return res.status(503).json({ message: "Safe SQLite restore ke liye ID backend ko ek baar start karein, taki local restore security key taiyar ho. Koi data change nahi hua." });

    const safetyDirectory = path.join(process.cwd(), "backups");
    fs.mkdirSync(safetyDirectory, { recursive: true });
    const safety = { format: "school-erp-backup-v1", createdAt: new Date().toISOString(), reason: "automatic-pre-restore", mongo: await mongoSnapshot(), sqlite: await sqliteRequest("/api/backup"), uploads: [] };
    fs.writeFileSync(path.join(safetyDirectory, `pre-restore-${Date.now()}.json`), JSON.stringify(safety));

    const existing = new Set(await safeCollections());
    for (const [name, documents] of Object.entries(backup.mongo)) {
      if (!/^[a-zA-Z0-9_.-]+$/.test(name) || !Array.isArray(documents)) continue;
      const collection = mongoose.connection.db.collection(name);
      if (existing.has(name)) await collection.deleteMany({});
      if (documents.length) await collection.insertMany(documents, { ordered: false });
    }

    let sqlite = { skipped: true };
    if (backup.sqlite?.available !== false && backup.sqlite?.tables) {
      sqlite = await sqliteRequest("/api/restore", { method: "POST", headers: { "Content-Type": "application/json", "X-ERP-Admin-Key": getIdAdminKey() }, body: JSON.stringify({ confirmation: "RESTORE SQLITE DATA", tables: backup.sqlite.tables }) });
    }
    const uploadsDirectory = process.env.UPLOADS_DIR || path.join(process.cwd(), "uploads");
    fs.mkdirSync(uploadsDirectory, { recursive: true });
    for (const file of backup.uploads || []) {
      const safeName = path.basename(String(file.name || ""));
      if (safeName && file.data) fs.writeFileSync(path.join(uploadsDirectory, safeName), Buffer.from(file.data, "base64"));
    }
    res.json({ success: true, reauthRequired: true, message: "Backup restore ho gaya. Security ke liye ab dobara login karein.", sqlite });
  } catch (error) {
    res.status(500).json({ message: `Restore nahi hua: ${error.message}` });
  }
});

router.get("/admin/student-validation", auth, async (req, res) => {
  try {
    const session = String(req.query.academicSession || "").trim();
    const query = session ? { academicSession: session } : {};
    const students = await mongoose.connection.db.collection("students").find(query).toArray();
    const duplicateMap = (field) => {
      const groups = new Map();
      students.forEach((student) => { const key = String(student[field] || "").trim().toLowerCase(); if (key) groups.set(key, [...(groups.get(key) || []), student]); });
      return [...groups.entries()].filter(([, rows]) => rows.length > 1).map(([value, rows]) => ({ field, value, studentIds: rows.map((row) => row._id), names: rows.map((row) => row.name) }));
    };
    const issues = students.map((student) => {
      const missing = [];
      if (!student.EnrollmentNo) missing.push("Enrollment No");
      if (!student.ApaarId) missing.push("APAAR ID");
      if (!student.PenNo) missing.push("PEN No");
      if (!student.AadhaarNo && !student.aadharNo) missing.push("Aadhaar No");
      if (!student.imageUrl && !student.profileImage) missing.push("Photo");
      const invalid = [];
      if (student.phone && !/^\d{10}$/.test(String(student.phone).replace(/\D/g, ""))) invalid.push("Phone must be 10 digits");
      const aadhaar = String(student.AadhaarNo || student.aadharNo || "").replace(/\D/g, "");
      if (aadhaar && aadhaar.length !== 12) invalid.push("Aadhaar must be 12 digits");
      return { _id: student._id, name: student.name, admissionNo: student.admissionNo, class: student.class, missing, invalid };
    }).filter((item) => item.missing.length || item.invalid.length);
    const duplicates = [...duplicateMap("admissionNo"), ...duplicateMap("EnrollmentNo"), ...duplicateMap("ApaarId"), ...duplicateMap("PenNo")];
    res.json({ totalStudents: students.length, affectedStudents: issues.length, issueCount: issues.reduce((sum, item) => sum + item.missing.length + item.invalid.length, 0) + duplicates.length, issues, duplicates });
  } catch (error) {
    res.status(500).json({ message: `Validation report nahi bani: ${error.message}` });
  }
});

router.get("/admin/users", auth, requireAdmin, async (_req, res) => {
  const users = await User.find({}).select("username email role active permissions createdAt").sort({ username: 1 }).lean();
  res.json({ users });
});
router.put("/admin/users/:id/access", auth, requireAdmin, async (req, res) => {
  try {
    const roles = ["admin", "principal", "teacher", "accountant", "operator", "student"];
    const { role, active, permissions = [] } = req.body;
    if (!roles.includes(role) || !Array.isArray(permissions)) return res.status(400).json({ message: "Valid role aur permissions required hain." });
    if (String(req.params.id) === String(req.user.id) && active === false) return res.status(400).json({ message: "Aap apna admin account inactive nahi kar sakte." });
    const user = await User.findByIdAndUpdate(req.params.id, { role, active: active !== false, permissions: permissions.map(String).slice(0, 50) }, { new: true }).select("username email role active permissions");
    if (!user) return res.status(404).json({ message: "User nahi mila." });
    res.json({ success: true, user, message: "User access update ho gaya. Naya role next request se apply hoga." });
  } catch (error) { res.status(500).json({ message: error.message }); }
});
router.get("/admin/audit-logs", auth, requireAdmin, async (req, res) => {
  const limit = Math.min(500, Math.max(1, Number(req.query.limit || 100)));
  const logs = await AuditLog.find({}).sort({ createdAt: -1 }).limit(limit).lean();
  res.json({ logs });
});
module.exports = router;