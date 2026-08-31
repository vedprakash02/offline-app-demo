const { express, Student, Marks, auth } = require("../config/dependenci.js");
const mongoose = require("mongoose");
const router = express.Router();
const { isValidAcademicSession, sessionStudentQuery, studentForSession } = require("../utils/academicSession.js");
const { SCHOOL_CLASSES, EXAMS, getSubjects } = require("../config/academic.js");

router.get("/fetch-students/:className", auth, async (req, res) => {
  try {
    if (req.user.role !== "teacher" && req.user.role !== "admin") {
      return res.status(403).json({ success: false, message: "Access Denied: Only teachers or admins can view students" });
    }

    const { className } = req.params;
    const { stream, academicYear } = req.query;
    if (!isValidAcademicSession(academicYear)) return res.status(400).json({ success: false, message: "Valid academicYear query required hai." });

    // 1. Base Class Query Filter Setup (Case-Insensitive for safety)
    let queryFilter = sessionStudentQuery(academicYear);

    // 2. Agar Class 11th ya 12th hai aur stream bheji gayi hai, to dynamic regex query add karein
    if ((className.includes("11") || className.includes("12")) && stream) {
      // Is logic se Science, science, arts, Arts, Scince sab match ho jayenge automatically
      // Stream is applied after historical enrollment is resolved.
    }

    // 3. Database operation trigger check execution
    const students = (await Student.find(queryFilter).lean())
      .map((student) => studentForSession(student, academicYear))
      .filter((student) => student.class?.toLowerCase() === className.trim().toLowerCase())
      .filter((student) => !stream || student.stream?.toLowerCase() === stream.trim().toLowerCase())
      .sort((a, b) => a.name.localeCompare(b.name));

    res.status(200).json({
      success: true,
      students,
    });
  } catch (error) {
    console.error("Student fetching internal failure:", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
});

router.get("/exam-subjects", auth, async (req, res) => {
  try {
    const { class: className, academicYear, stream = "" } = req.query;
    if (!SCHOOL_CLASSES.includes(className) || !isValidAcademicSession(academicYear)) return res.status(400).json({ success: false, message: "Valid class aur session required hai." });
    const savedSubjects = await Marks.distinct("subjectName", { class: className, academicYear });
    return res.status(200).json({ success: true, subjects: [...new Set([...getSubjects(className, stream), ...savedSubjects])].sort((a, b) => a.localeCompare(b)) });
  } catch (error) { return res.status(500).json({ success: false, message: "Subjects load nahi ho paye." }); }
});

const generateCleanMatrix = (studentsList, marksRecords) => {
  const subjectsSet = new Set();
  const subjectMeta = {};

  const studentsMatrix = studentsList.map((student) => {
    const studentIdStr = student._id.toString();
    const studentMarksMap = {};

    marksRecords.forEach((record) => {
      if (record.subjectName) {
        subjectsSet.add(record.subjectName);
        const inferredPractical = record.examType === "Annual" && record.students?.some((item) => Number(item.practicalMarks || 0) > 0);
        const practicalEnabled = Boolean(record.practicalEnabled || inferredPractical);
        subjectMeta[record.subjectName] = { practicalEnabled, theoryMaxMarks: Number(record.theoryMaxMarks || 75), practicalMaxMarks: practicalEnabled ? Number(record.practicalMaxMarks || 30) : 0, passingMarks: Number(record.passingMarks || 33) };
      }

      const matchedStudent = record.students?.find(
        (s) => s.studentId && s.studentId.toString() === studentIdStr
      );

      if (matchedStudent) {
        studentMarksMap[record.subjectName] = {
          theoryMarks: matchedStudent.theoryMarks ?? "-",
          practicalMarks: matchedStudent.practicalMarks ?? "-",
          ...subjectMeta[record.subjectName],
        };
      }
    });

    return {
      ...student, // 🌟 Sabhi details (fatherName, dob, etc.) ko safe rakhne ke liye pure object ko spread kiya
      studentId: student._id,
      name: student.name,
      rollNo: student.rollNo,
      admissionNo: student.admissionNo || "-",
      marks: studentMarksMap,
    };
  });

  return {
    subjects: Array.from(subjectsSet),
    subjectMeta,
    studentsMatrix,
  };
};
///////////////////////////////////////////////////////


router.get("/view-marks-matrix", auth, async (req, res) => {
  try {
    if (req.user.role !== "teacher" && req.user.role !== "admin") {
      return res.status(403).json({ success: false, message: "Access Denied!" });
    }

    const { class: className, academicYear, examType, stream, subjectName } = req.query;

    if (!SCHOOL_CLASSES.includes(className) || !isValidAcademicSession(academicYear) || !EXAMS.includes(examType)) {
      return res.status(400).json({ success: false, message: "Class, Session aur Exam Type zaroori hain." });
    }

    // 🚀 1. NEW ADVANCED STUDENT QUERY SETUP
    // Yeh query check karegi ki student ya toh abhi us class/session me ho, ya pichle saal usme tha (History array se)
    let studentQuery = {
      $or: [
        {
          // Condition A: Agar student abhi current session aur is class me padh raha hai
          class: className,
          academicSession: academicYear
        },
        {
          // Condition B: Agar student promote ho chuka hai par uski history array me yeh class aur session lock hain
          academicHistory: {
            $elemMatch: {
              class: className,
              academicSession: academicYear
            }
          }
        }
      ]
    };

    // 1.1 Stream Filter Configuration for 11th and 12th
    if ((className.includes("11") || className.includes("12")) && stream && stream !== "undefined" && stream !== "") {
      // Hamein Stream filter dono jagah lagana hoga (Current data par bhi aur History Array par bhi)
      studentQuery.$or = [
        {
          class: className,
          academicSession: academicYear,
          stream: { $regex: `^${stream.trim()}$`, $options: "i" }
        },
        {
          academicHistory: {
            $elemMatch: {
              class: className,
              academicSession: academicYear,
              stream: { $regex: `^${stream.trim()}$`, $options: "i" }
            }
          }
        }
      ];
    }

    // 2. Marks Search Query Setup (Yeh pehle jaisa hi rahega kyunki marks document hamesha purane session par lock rehta hai)
    let marksQuery = { class: className, academicYear, examType };

    if (subjectName && subjectName.trim() !== "") {
      marksQuery.subjectName = subjectName;
    }

    // 3. Parallel Database Fetch
    const [marksData, students] = await Promise.all([
      Marks.find(marksQuery).lean(),
      // Naya Optimized Code (Saare biodata fields select kiye):
      Student.find(studentQuery)
        .select("_id name fatherName motherName dob gender cast class address phone stream profileImage admissionDate admissionNo imageUrl rollNo EnrollmentNo ApaarId PenNo academicSession academicHistory")
        .sort({ name: 1 })
        .lean()

    ]);

    // 🚀 4. DYNAMIC ROLL NUMBER RESOLUTION
    // Jab baccha promote hota hai toh main profile par class/rollNo badal jata hai.
    // Matrix grid render hone ke liye hamein student ka vahi purana rollNo dikhana hoga jo us saal tha.
    const mappedStudents = students.map(student => {
      // Agar baccha abhi naye saal me hai par hum purana saal dekh rahe hain:
      if (student.academicSession !== academicYear) {
        // History array se us specific year ka record nikalo
        const historicalRecord = student.academicHistory.find(
          h => h.class === className && h.academicSession === academicYear
        );
        return {
          ...student,
          class: className, // Override temporarily for UI matrix grid
          stream: historicalRecord ? historicalRecord.stream : student.stream,
          rollNo: historicalRecord ? historicalRecord.rollNo : null // Purana roll number select kiya
        };
      }
      return student; // Agar current year ka hi hai toh data badalne ki jarurat nahi hai
    });

    // 5. Generate response matrix grid using helper function
    // Yahan hum original 'students' ki jagah hamara 'mappedStudents' bhejenge
    const { subjects, studentsMatrix, subjectMeta } = generateCleanMatrix(mappedStudents, marksData || []);

    let savedStudentsMarks = [];
    if (subjectName && marksData.length > 0) {
      savedStudentsMarks = marksData[0].students || [];
    }

    res.status(200).json({
      success: true,
      subjects: subjectName ? [subjectName] : subjects,
      studentsMatrix: studentsMatrix,
      savedStudentsMarks: savedStudentsMarks,
      originalRecords: marksData,
      subjectMeta
    });

  } catch (error) {
    console.error("Matrix view system failure log:", error);
    res.status(500).json({ success: false, message: "Server error: " + error.message });
  }
});

router.post("/save-bulk-marks", auth, async (req, res) => {
  try {
    const userRole = req.user.role;
    if (userRole !== "teacher" && userRole !== "admin") {
      return res.status(403).json({
        success: false,
        message:
          "Permission Denied: Sirf Teachers hi marks enter/update kar sakte hain.",
      });
    }

    const {
      class: className,
      subjectName,
      examType,
      academicYear,
      students,
      stream,
      practicalEnabled = false,
      theoryMaxMarks = 75,
      practicalMaxMarks = 30,
    } = req.body;

    const validClasses = SCHOOL_CLASSES;
    const validExams = EXAMS;

    if (
      !validClasses.includes(className) ||
      !subjectName ||
      !examType ||
      !isValidAcademicSession(academicYear) ||
      !students ||
      students.length === 0
    ) {
      return res
        .status(400)
        .json({ success: false, message: "Sari fields mandatory hain." });
    }

    if (!validExams.includes(examType) || typeof subjectName !== "string" || !subjectName.trim() || students.length > 5000) {
      return res.status(400).json({ success: false, message: "Exam, subject ya students data invalid hai." });
    }
    if (subjectName.trim().length > 60 || !/^[\p{L}\p{N} .&()/-]+$/u.test(subjectName.trim())) {
      return res.status(400).json({ success: false, message: "Subject name valid nahi hai." });
    }

    const validTheoryMax = Number(theoryMaxMarks) > 0 && Number(theoryMaxMarks) <= 200;
    const validPracticalMax = Number(practicalMaxMarks) >= 0 && Number(practicalMaxMarks) <= 100;
    if (!validTheoryMax || !validPracticalMax) {
      return res.status(400).json({ success: false, message: "Max marks range invalid hai (Theory: 1-200, Practical: 0-100)." });
    }

    const invalidMarks = students.some((student) =>
      !mongoose.Types.ObjectId.isValid(student.studentId) ||
      !Number.isFinite(Number(student.theoryMarks)) || Number(student.theoryMarks) < 0 || Number(student.theoryMarks) > Number(theoryMaxMarks) ||
      !Number.isFinite(Number(student.practicalMarks)) || Number(student.practicalMarks) < 0 || Number(student.practicalMarks) > Number(practicalMaxMarks)
    );
    if (invalidMarks) return res.status(400).json({ success: false, message: `Theory marks 0-${theoryMaxMarks} aur practical marks 0-${practicalMaxMarks} ke beech hone chahiye.` });
    if (examType !== "Annual" && students.some((student) => Number(student.practicalMarks) !== 0)) {
      return res.status(400).json({ success: false, message: "Practical marks sirf Annual exam me save kiye ja sakte hain." });
    }
    if (examType !== "Annual" && practicalEnabled) return res.status(400).json({ success: false, message: "Practical option sirf Annual exam me available hai." });

    const submittedIds = students.map((student) => student.studentId.toString());
    if (new Set(submittedIds).size !== submittedIds.length) {
      return res.status(400).json({ success: false, message: "Ek student ki duplicate marks row request me mili." });
    }

    const allowedStudents = (await Student.find(sessionStudentQuery(academicYear)).lean())
      .map((student) => studentForSession(student, academicYear))
      .filter((student) => student.class === className);
    const normalizedStream = String(stream || "").trim().toLowerCase();
    if (["11th", "12th"].includes(className) && !normalizedStream) return res.status(400).json({ success: false, message: "11th/12th ke liye stream required hai." });
    const streamStudents = normalizedStream ? allowedStudents.filter((student) => String(student.stream || "").trim().toLowerCase() === normalizedStream) : allowedStudents;
    const allowedIds = new Set(streamStudents.map((student) => student._id.toString()));
    if (students.some((student) => !allowedIds.has(student.studentId.toString()))) {
      return res.status(400).json({ success: false, message: "Request me selected session ke bahar ka student mila." });
    }

    const masterRecord = await Marks.findOne({
      class: className,
      subjectName,
      examType,
      academicYear,
    });

    if (!masterRecord) {
      const formattedStudents = students.map((s) => ({
        studentId: s.studentId,
        theoryMarks: Number(s.theoryMarks || 0),
        practicalMarks: Number(s.practicalMarks || 0),
      }));

      const newMarks = new Marks({
        class: className,
        subjectName,
        examType,
        academicYear,
        practicalEnabled: examType === "Annual" && Boolean(practicalEnabled),
        theoryMaxMarks: Number(theoryMaxMarks),
        practicalMaxMarks: examType === "Annual" && practicalEnabled ? Number(practicalMaxMarks) : 0,
        passingMarks: 33,
        students: formattedStudents,
      });

      await newMarks.save();
      return res.status(200).json({
        success: true,
        message: "Marks successfully save ho gaye!",
        data: newMarks,
      });
    }

    for (let incomingStudent of students) {
      const studentIndex = masterRecord.students.findIndex(
        (s) => s.studentId.toString() === incomingStudent.studentId.toString(),
      );

      if (studentIndex > -1) {
        masterRecord.students[studentIndex].theoryMarks = Number(
          incomingStudent.theoryMarks || 0,
        );
        masterRecord.students[studentIndex].practicalMarks = Number(
          incomingStudent.practicalMarks || 0,
        );
      } else {
        masterRecord.students.push({
          studentId: incomingStudent.studentId,
          theoryMarks: Number(incomingStudent.theoryMarks || 0),
          practicalMarks: Number(incomingStudent.practicalMarks || 0),
        });
      }
    }
    masterRecord.practicalEnabled = examType === "Annual" && Boolean(practicalEnabled);
    masterRecord.theoryMaxMarks = Number(theoryMaxMarks);
    masterRecord.practicalMaxMarks = masterRecord.practicalEnabled ? Number(practicalMaxMarks) : 0;
    masterRecord.passingMarks = 33;

    await masterRecord.save();

    res.status(200).json({
      success: true,
      message:
        "Marks successfully update ho gaye hain aur baki ka data safe hai!",
      data: masterRecord,
    });
  } catch (error) {
    console.error("Bulk marks operation error:", error);
    res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message,
    });
  }
});

router.delete("/delete-student-marks/:studentId", auth, async (req, res) => {
  try {
    const { studentId } = req.params;

    // safe check for user role
    const userRole = req.user?.role;

    if (userRole !== "teacher" && userRole !== "admin") {
      return res.status(403).json({
        success: false,
        message:
          "Permission Denied: Aap kisi student ke marks delete nahi kar sakte.",
      });
    }

    const { class: className, academicYear, examType } = req.query;

    if (!mongoose.Types.ObjectId.isValid(studentId) || !className || !isValidAcademicSession(academicYear) || !examType) {
      return res.status(400).json({
        success: false,
        message: "Class, Session aur Exam Type parameters zaroori hain.",
      });
    }

    // 💡 MongoDB me Id string me ho ya ObjectId me, dono ko ek sath handle karne ke liye array banaya
    const idVariants = [studentId];
    if (mongoose.Types.ObjectId.isValid(studentId)) {
      idVariants.push(new mongoose.Types.ObjectId(studentId));
    }

    // Is filters ke dynamic subject records se bache ko pull karenge
    const updateResult = await Marks.updateMany(
      { class: className, academicYear, examType },
      { $pull: { students: { studentId: { $in: idVariants } } } }, // 👈 Dono me se koi bhi type match ho jaye
    );

    console.log("MongoDB Pull Result Stats:", {
      matched: updateResult.matchedCount,
      modified: updateResult.modifiedCount,
    });

    res.status(200).json({
      success: true,
      message: "Student ke marks row se successfully clear kar diye gaye hain!",
      details: updateResult,
    });
  } catch (error) {
    console.error("Marks conditional row delete error:", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
});

module.exports = router;
