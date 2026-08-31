const AuditLog = require("../models/auditLog.js");
const safeBody = (body) => {
  if (!body || typeof body !== "object") return {};
  const hidden = new Set(["password", "token", "backup", "file", "data"]);
  return Object.fromEntries(Object.entries(body).filter(([key]) => !hidden.has(key.toLowerCase())).slice(0, 20).map(([key, value]) => [key, typeof value === "string" ? value.slice(0, 200) : Array.isArray(value) ? `[${value.length} items]` : value]));
};
module.exports = (req, res, next) => {
  if (!["POST", "PUT", "PATCH", "DELETE"].includes(req.method)) return next();
  res.on("finish", () => {
    if (!req.user || res.statusCode >= 400 || req.path === "/login") return;
    AuditLog.create({ userId: req.user.id, username: req.user.username || "", role: req.user.role || "", action: `${req.method} ${req.path}`, method: req.method, path: req.originalUrl.split("?")[0], statusCode: res.statusCode, ip: req.ip, details: safeBody(req.body) }).catch((error) => console.error("Audit log error:", error.message));
  });
  next();
};