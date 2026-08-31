const { express, Student, SchoolProfile, auth } = require("../config/dependenci.js");

const router = express.Router();
const { isValidAcademicSession, sessionStudentQuery, studentForSession } = require("../utils/academicSession.js");

router.get("/all-idcards", auth, async (req, res) => {
  try {
    const userId = req.user.id; // auth middleware se login teacher ki ID mili

    // 1. Is teacher ki school profile fetch karein
    const schoolProfile = await SchoolProfile.findOne({ userId });

    // Agar profile nahi bani toh default naam rakh lo fallback ke liye
    const schoolName = schoolProfile ? schoolProfile.schoolName : "MY SCHOOL";
    const schoolCode = schoolProfile ? schoolProfile.schoolCode : "";
    const schoolImag = schoolProfile ? schoolProfile.schoolImage : "";
    const signeture = schoolProfile ? schoolProfile.schoolSignature : "";

    // 2. Database se saare bacchon ka data fetch karein
    const { academicSession } = req.query;
    if (!isValidAcademicSession(academicSession)) return res.status(400).json({ message: "Valid academicSession query required hai." });
    const students = (await Student.find(sessionStudentQuery(academicSession)).lean()).map((student) => studentForSession(student, academicSession));

    // 3. Response me schoolName aur students dono ek sath bhej dein
    return res.status(200).json({
      schoolName,
      students,
      schoolCode,
      schoolImag,
      schoolImage: schoolImag,
      signeture,
      schoolSignature: signeture
    });
  } catch (error) {
    console.error("ID Cards Fetch Error:", error);
    return res
      .status(500)
      .json({ message: "Server error", error: error.message });
  }
});

module.exports = router;
