const { express, Student, auth } = require("../config/dependenci.js");

const router = express.Router();
const { isValidAcademicSession } = require("../utils/academicSession.js");

const readCell = (row, aliases) => {
  const normalized = Object.fromEntries(Object.entries(row || {}).map(([key, value]) => [key.trim().toLowerCase(), value]));
  for (const alias of aliases) {
    const value = normalized[alias.toLowerCase()];
    if (value !== undefined && value !== null && String(value).trim() !== "") return String(value).trim();
  }
  return "";
};

router.post("/upload-namankan-excel", auth, async (req, res) => {
  try {
    if (!["teacher", "admin"].includes(req.user.role)) return res.status(403).json({ success: false, message: "Data upload karne ki permission nahi hai." });
    const { studentData, className, academicSession } = req.body;
    if (!isValidAcademicSession(academicSession) || !["9th", "10th", "11th", "12th"].includes(className)) return res.status(400).json({ success: false, message: "Valid class aur academic session required hai." });
    if (!Array.isArray(studentData) || studentData.length === 0) return res.status(400).json({ success: false, message: "Excel data khali ya invalid hai." });
    if (studentData.length > 5000) return res.status(400).json({ success: false, message: "Ek baar me maximum 5000 rows upload karein." });

    const students = await Student.find({ class: className, academicSession }).select("_id name admissionNo").lean();
    const byAdmission = new Map(students.map((student) => [String(student.admissionNo || "").trim().toLowerCase(), student]));
    const byName = new Map();
    students.forEach((student) => {
      const key = String(student.name || "").trim().toLowerCase();
      if (!byName.has(key)) byName.set(key, []);
      byName.get(key).push(student);
    });

    const operations = [];
    const summary = { totalRows: studentData.length, updated: 0, notFound: 0, ambiguous: 0, noData: 0 };
    for (const row of studentData) {
      const admissionNo = readCell(row, ["Admission No", "AdmissionNo", "Admission Number"]);
      const name = readCell(row, ["Student Name", "Name"]);
      let matched = admissionNo ? byAdmission.get(admissionNo.toLowerCase()) : null;
      if (!matched && name) {
        const matches = byName.get(name.toLowerCase()) || [];
        if (matches.length > 1) { summary.ambiguous += 1; continue; }
        matched = matches[0];
      }
      if (!matched) { summary.notFound += 1; continue; }
      const enrollmentNo = readCell(row, ["Enrollment No", "EnrollmentNo", "Enrollment Number"]);
      const apaarId = readCell(row, ["Apaar ID", "ApaarId", "APAAR ID"]);
      const penNo = readCell(row, ["PEN No", "PenNo", "PEN Number"]);
      const update = {};
      if (enrollmentNo) update.EnrollmentNo = enrollmentNo;
      if (apaarId) update.ApaarId = apaarId;
      if (penNo) update.PenNo = penNo;
      if (!Object.keys(update).length) { summary.noData += 1; continue; }
      operations.push({ updateOne: { filter: { _id: matched._id, class: className, academicSession }, update: { $set: update } } });
    }

    if (operations.length) {
      const result = await Student.bulkWrite(operations, { ordered: false });
      summary.updated = result.modifiedCount;
    }
    return res.status(200).json({ success: true, message: `${summary.updated} student records update hue.`, summary });
  } catch (error) {
    console.error("Excel Upload Error:", error);
    return res.status(500).json({ success: false, message: "Server Error: " + error.message });
  }
});

router.post("/upload-namankan-excel-legacy", auth, async (req, res) => {
  try {
    if (req.user.role !== "teacher" && req.user.role !== "admin") {
      return res.status(403).json({ success: false, message: "Data upload karne ki permission nahi hai." });
    }
    // 💡 Frontend se ab studentData ke sath className bhi aayega
    const { studentData, className, academicSession } = req.body; 

    if (!className || !isValidAcademicSession(academicSession)) {
      return res.status(400).json({ success: false, message: "Kripya Class ka naam bhejein." });
    }

    if (!studentData || studentData.length === 0) {
      return res.status(400).json({ success: false, message: "Excel data khali hai." });
    }

    // 1. Select ki gayi Class ke saare bachho ko database se ek hi baar me nikal lo
    const allClassStudents = await Student.find({ class: className, academicSession });
    let updatedCount = 0;

    for (const item of studentData) {
      // Flexible headers extraction (Naye fields ke sath)
      const rawName = item["Student Name"] || item["name"] || item["Name"] || item["STUDENT NAME"];
      const rawEnrollmentNo = item["Enrollment No"] || item["EnrollmentNo"] || item["enrollment no"];
      const rawApaarId = item["Apaar ID"] || item["ApaarId"] || item["apaar id"] || item["APAAR ID"];
      const rawPenNo = item["PEN No"] || item["PenNo"] || item["pen no"] || item["PEN NO"];

      if (rawName) {
        // Excel wale naam ko saaf aur small letters me badlein
        const cleanExcelName = String(rawName).trim().toLowerCase();

        // 2. Database ke bachho me se bilkul sahi match dhoondhein
        const matchedStudent = allClassStudents.find(stu => {
          const cleanDbName = String(stu.name).trim().toLowerCase();
          return cleanDbName === cleanExcelName;
        });

        // 3. Agar match mil gaya, to jo jo data excel me maujood hai use update karo
        if (matchedStudent) {
          const updateData = {};
          
          if (rawEnrollmentNo) updateData.EnrollmentNo = String(rawEnrollmentNo).trim();
          if (rawApaarId) updateData.ApaarId = String(rawApaarId).trim(); // Schema key check kar lein
          if (rawPenNo) updateData.PenNo = String(rawPenNo).trim();     // Schema key check kar lein

          // Agar koi bhi naya data mila hai tabhi update query chalayein
          if (Object.keys(updateData).length > 0) {
            await Student.findByIdAndUpdate(matchedStudent._id, updateData);
            updatedCount++;
          }
        } else {
          console.log(`⚠️ Match nahi mila Class ${className} me: '${rawName.trim()}'`);
        }
      }
    }

    return res.status(200).json({
      success: true,
      message: `Excel se Class ${className} ke kul ${updatedCount} bachho ka data (Enrollment/Apaar/PEN) sahi se update ho gaya hai!`
    });

  } catch (error) {
    console.error("Excel Upload Error:", error);
    return res.status(500).json({ success: false, message: "Server Error: " + error.message });
  }
});

module.exports = router;
