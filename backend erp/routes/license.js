const express = require("express");
const multer = require("multer");
const auth = require("../authorigetion/auth.js");
const { activateLicense, getLicenseStatus } = require("../license/licenseService.js");
const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 64 * 1024 } });
router.get("/license/status", (_req, res) => res.json(getLicenseStatus()));
router.post("/license/activate", auth, upload.single("license"), (req, res) => {
  if (!req.file) return res.status(400).json({ message: "License .lic file select karein." });
  const result = activateLicense(req.file.buffer); return res.status(result.valid ? 200 : 400).json(result);
});
module.exports = router;