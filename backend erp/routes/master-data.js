const { express, uploadExcel, auth, xlsx, AllowedUser } = require("../config/dependenci.js");
const fs = require("fs");
const router = express.Router();

router.post("/upload-master-excel",
  auth,
  uploadExcel.single("file"),
  async (req, res) => {
    try {
      const userRole = req.user.role;
      if (userRole !== "teacher" && userRole !== "admin") {
        return res.status(403).json({
          message: "Permission Denied: Aap naya admission nahi kar sakte.",
        });
      }

      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: "Kripya excel file upload karein.",
        });
      }

      // Ab req.file.path sahi se local server ka path batayega 👍
      const workbook = xlsx.readFile(req.file.path, { cellDates: true });
      const sheetName = workbook.SheetNames[0];
      const sheetData = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);

      if (!sheetData || sheetData.length === 0) {
        if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
        return res.status(400).json({
          success: false,
          message: "Excel sheet khali hai yan headers galat hain!",
        });
      }

      let insertedCount = 0;

      for (let row of sheetData) {
        const uName = row.username || row.Username || row.USERNAME;
        const uEmail = row.email || row.Email || row.EMAIL;
        const uRole = row.role || row.Role || row.ROLE;

        if (!uName || !uEmail || !uRole) continue;

        const cleanEmail = uEmail.toString().trim().toLowerCase();
        const cleanRole = uRole.toString().trim().toLowerCase();

        const existing = await AllowedUser.findOne({ email: cleanEmail });

        if (!existing) {
          await AllowedUser.create({
            username: uName.toString().trim(),
            email: cleanEmail,
            role: cleanRole,
          });
          insertedCount++;
        }
      }

      // Kaam hone ke baad server se file delete ho jayegi
      if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);

      return res.status(200).json({
        success: true,
        message: `Excel sheet se ${insertedCount} naye users master list me save ho gaye!`,
      });
    } catch (error) {
      console.error("Excel upload error:", error);
      if (req.file && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }

      return res.status(500).json({
        success: false,
        message: "Excel process karne mein dikkat aayi: " + error.message,
      });
    }
  },
);

module.exports = router;
