const { express, Student, auth } = require("../config/dependenci.js");
const mongoose = require("mongoose");
const UnitTestMarks = require("../models/unitTestMarks.js");
const router = express.Router();
const { SCHOOL_CLASSES, getSubjects } = require("../config/academic.js");
const { isValidAcademicSession, sessionStudentQuery, studentForSession } = require("../utils/academicSession.js");

const UNITS = ["Unit Test 1", "Unit Test 2", "Unit Test 3"];
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const allowed = (req) => ["teacher", "admin"].includes(req.user?.role);
const clean = (value) => String(value || "").trim();

async function studentsFor(className, stream, academicYear) {
  const all = (await Student.find(sessionStudentQuery(academicYear)).lean())
    .map((student) => studentForSession(student, academicYear))
    .filter((student) => student.class === className)
    .filter((student) => !stream || clean(student.stream).toLowerCase() === clean(stream).toLowerCase())
    .sort((a, b) => clean(a.name).localeCompare(clean(b.name)));
  return all;
}

function validFilters({ class: className, academicYear, unit, month, subjectName }) {
  return SCHOOL_CLASSES.includes(className) && isValidAcademicSession(academicYear) && UNITS.includes(unit) && MONTHS.includes(month) && clean(subjectName);
}

router.get("/unit-test-subjects", auth, async (req, res) => {
  try {
    const { class: className, academicYear, stream = "" } = req.query;
    if (!allowed(req)) return res.status(403).json({ success: false, message: "Access denied." });
    if (!SCHOOL_CLASSES.includes(className) || !isValidAcademicSession(academicYear)) return res.status(400).json({ success: false, message: "Class aur session required hain." });
    const saved = await UnitTestMarks.distinct("subjectName", { class: className, academicYear, stream: clean(stream) });
    res.json({ success: true, subjects: [...new Set([...getSubjects(className, stream), ...saved])].sort() });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

router.get("/unit-test-matrix", auth, async (req, res) => {
  try {
    if (!allowed(req)) return res.status(403).json({ success: false, message: "Access denied." });
    const filters = req.query;
    if (!validFilters(filters)) return res.status(400).json({ success: false, message: "Class, session, unit, month aur subject required hain." });
    const stream = clean(filters.stream);
    const [students, record] = await Promise.all([
      studentsFor(filters.class, stream, filters.academicYear),
      UnitTestMarks.findOne({ class: filters.class, stream, academicYear: filters.academicYear, unit: filters.unit, month: filters.month, subjectName: clean(filters.subjectName) }).lean(),
    ]);
    const saved = new Map((record?.students || []).map((item) => [item.studentId.toString(), item.marks]));
    res.json({ success: true, maxMarks: record?.maxMarks || 20, students: students.map((student) => ({ studentId: student._id, name: student.name, rollNo: student.rollNo, admissionNo: student.admissionNo, marks: saved.has(student._id.toString()) ? saved.get(student._id.toString()) : "" })) });
  } catch (error) { res.status(500).json({ success: false, message: "Unit test register load nahi hua: " + error.message }); }
});

router.post("/unit-test-marks", auth, async (req, res) => {
  try {
    if (!allowed(req)) return res.status(403).json({ success: false, message: "Access denied." });
    const { class: className, stream = "", academicYear, unit, month, subjectName, maxMarks = 20, students } = req.body;
    if (!validFilters({ class: className, academicYear, unit, month, subjectName }) || !Array.isArray(students) || !students.length) return res.status(400).json({ success: false, message: "Saari required details bharna zaroori hai." });
    const cleanStream = clean(stream), marksLimit = Number(maxMarks);
    if (!Number.isFinite(marksLimit) || marksLimit < 1 || marksLimit > 100 || clean(subjectName).length > 60) return res.status(400).json({ success: false, message: "Max marks 1 se 100 ke beech hone chahiye." });
    const ids = students.map((student) => String(student.studentId));
    if (new Set(ids).size !== ids.length || students.some((student) => !mongoose.Types.ObjectId.isValid(student.studentId) || !Number.isFinite(Number(student.marks)) || Number(student.marks) < 0 || Number(student.marks) > marksLimit)) return res.status(400).json({ success: false, message: "Student ya marks data valid nahi hai." });
    const enrolled = await studentsFor(className, cleanStream, academicYear);
    const enrolledIds = new Set(enrolled.map((student) => student._id.toString()));
    if (ids.some((id) => !enrolledIds.has(id))) return res.status(400).json({ success: false, message: "Selected class/session ke bahar ka student mila." });
    const record = await UnitTestMarks.findOneAndUpdate(
      { class: className, stream: cleanStream, academicYear, unit, month, subjectName: clean(subjectName) },
      { $set: { maxMarks: marksLimit, students: students.map((student) => ({ studentId: student.studentId, marks: Number(student.marks) })) } },
      { new: true, upsert: true, setDefaultsOnInsert: true },
    );
    res.json({ success: true, message: "Unit test marks save ho gaye.", data: record });
  } catch (error) { res.status(500).json({ success: false, message: "Unit test marks save nahi hue: " + error.message }); }
});

router.get("/unit-test-summary", auth, async (req, res) => {
  try {
    if (!allowed(req)) return res.status(403).json({ success: false, message: "Access denied." });
    const { class: className, stream = "", academicYear, unit, month } = req.query;
    if (!SCHOOL_CLASSES.includes(className) || !isValidAcademicSession(academicYear) || !UNITS.includes(unit) || !MONTHS.includes(month)) return res.status(400).json({ success: false, message: "Class, session, unit aur month required hain." });
    const cleanStream = clean(stream);
    const [students, records] = await Promise.all([studentsFor(className, cleanStream, academicYear), UnitTestMarks.find({ class: className, stream: cleanStream, academicYear, unit, month }).lean()]);
    const subjects = records.map((record) => record.subjectName).sort();
    const rows = students.map((student) => {
      const marks = {}; let total = 0; let maximum = 0;
      records.forEach((record) => { const mark = record.students?.find((item) => item.studentId.toString() === student._id.toString())?.marks; marks[record.subjectName] = mark ?? ""; total += Number(mark || 0); maximum += Number(record.maxMarks || 20); });
      return { studentId: student._id, name: student.name, rollNo: student.rollNo, admissionNo: student.admissionNo, marks, total, maximum };
    });
    res.json({ success: true, subjects, rows });
  } catch (error) { res.status(500).json({ success: false, message: "Unit test summary load nahi hui: " + error.message }); }
});

module.exports = router;
