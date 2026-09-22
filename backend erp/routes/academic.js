const { express, auth } = require("../config/dependenci.js");
const ClassSubject = require("../models/classSubject.js");
const { SCHOOL_CLASSES } = require("../config/academic.js");
const { isValidAcademicSession } = require("../utils/academicSession.js");

const router = express.Router();
const seniorClasses = new Set(["11th", "12th"]);
const canManageAcademicSetup = (user) => ["admin", "principal", "teacher"].includes(user?.role);

router.get("/academic/class-subjects", auth, async (req, res) => {
  try {
    const { academicSession, className, stream = "" } = req.query;
    if (!isValidAcademicSession(academicSession)) {
      return res.status(400).json({ message: "Valid academic session required hai." });
    }

    if (className && !SCHOOL_CLASSES.includes(className)) {
      return res.status(400).json({ message: "Valid class required hai." });
    }

    if (className) {
      const record = await ClassSubject.findOne({
        academicSession,
        className,
        stream: seniorClasses.has(className) ? String(stream).trim() : "",
      }).lean();
      return res.json({ subjects: record?.subjects || [] });
    }

    const records = await ClassSubject.find({ academicSession }).sort({ className: 1, stream: 1 }).lean();
    return res.json({
      classes: Object.fromEntries(records.map((record) => [
        `${record.className}${record.stream ? `|${record.stream}` : ""}`,
        record.subjects,
      ])),
    });
  } catch (error) {
    console.error("Academic subjects load nahi hue:", error);
    return res.status(500).json({ message: "Academic subjects load nahi hue." });
  }
});

router.post("/academic/class-subjects", auth, async (req, res) => {
  try {
    if (!canManageAcademicSetup(req.user)) {
      return res.status(403).json({ message: "Academic setup ke liye permission nahi hai." });
    }

    const { academicSession, className } = req.body;
    const subjects = Array.isArray(req.body.subjects) ? req.body.subjects : [];
    if (!isValidAcademicSession(academicSession) || !SCHOOL_CLASSES.includes(className)) {
      return res.status(400).json({ message: "Valid class aur academic session required hai." });
    }

    const stream = seniorClasses.has(className) ? String(req.body.stream || "").trim() : "";
    if (seniorClasses.has(className) && !stream) {
      return res.status(422).json({ message: "11th/12th ke liye stream select karein." });
    }

    const cleanSubjects = [...new Map(subjects
      .map((subject) => String(subject).trim())
      .filter(Boolean)
      .map((subject) => [subject.toLowerCase(), subject])).values()];
    if (!cleanSubjects.length) {
      return res.status(422).json({ message: "Kam se kam ek subject add karein." });
    }

    const record = await ClassSubject.findOneAndUpdate(
      { academicSession, className, stream },
      { $set: { subjects: cleanSubjects } },
      { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true },
    ).lean();

    return res.json({
      message: "Class subjects saved successfully.",
      className: record.className,
      stream: record.stream,
      subjects: record.subjects,
    });
  } catch (error) {
    console.error("Academic subjects save nahi hue:", error);
    return res.status(500).json({ message: "Academic subjects save nahi hue." });
  }
});

module.exports = router;
