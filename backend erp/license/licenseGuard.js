const { getLicenseStatus } = require("./licenseService.js");
const allowedMutations = new Set(["/login", "/signup", "/license/activate"]);
module.exports = (req, res, next) => {
  if (!["POST", "PUT", "PATCH", "DELETE"].includes(req.method) || allowedMutations.has(req.path)) return next();
  const status = getLicenseStatus();
  if (status.valid) { req.license = status.license; return next(); }
  return res.status(402).json({ success: false, ...status, readOnly: true });
};