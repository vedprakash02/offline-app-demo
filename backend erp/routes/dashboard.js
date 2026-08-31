const { express, Student, auth } = require("../config/dependenci.js");

const router = express.Router();
const { isValidAcademicSession, sessionStudentQuery } = require("../utils/academicSession.js");

router.get("/dashboard", auth, async (req, res) => {
  try {
    const { academicSession } = req.query;
    if (!isValidAcademicSession(academicSession)) return res.status(400).json({ message: "Valid academicSession query required hai." });
    // 💡 countDocuments completely live calculation bhejta hai bina cache ke
    const totalStudentsCount = await Student.countDocuments(sessionStudentQuery(academicSession));

    return res.status(200).json({
      success: true,
      totalStudents: totalStudentsCount,
      // baaki fields jo aap bhej rahe the...
    });
  } catch (error) {
    return res
      .status(500)
      .json({ success: false, message: "Error loading dashboard" });
  }
});

module.exports = router;
