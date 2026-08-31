const { express, Student, Marks, auth } = require("../config/dependenci.js");

const router = express.Router();
const { isValidAcademicSession } = require("../utils/academicSession.js");
const allowedNextClass = { "9th": "10th", "10th": "11th", "11th": "12th" };
const nextAcademicSession = (session) => {
  if (!isValidAcademicSession(session)) return "";
  const [start, end] = session.split("-").map(Number);
  return `${start + 1}-${end + 1}`;
};

router.post("/promote-students", auth, async (req, res) => {
  try {
    const userRole = req.user.role; 
    if (userRole !== "teacher" && userRole !== "admin") {
      return res.status(403).json({ message: "Aapko bacho ko promote karne ki permission nahi hai." });
    }

    const { studentIds, nextSession, nextClass } = req.body;

    if (!studentIds || studentIds.length === 0 || !nextSession || !nextClass) {
      return res.status(400).json({ message: "Sari fields aur students select karna zaroori hai." });
    }

    // 🚀 NEW LOGIC: Har student ke document ko loop karke history save karenge
    for (const id of studentIds) {
      const student = await Student.findById(id);
      
      if (student) {
        // 1. Pehle check karein ki kahin yeh same session history me pehle se toh nahi hai (double entry se bachne ke liye)
        const historyExists = student.academicHistory.some(
          (h) => h.academicSession === student.academicSession && h.class === student.class
        );

        if (!historyExists) {
          // 2. Student ka current data uski personal History Array me push karein
          student.academicHistory.push({
            class: student.class,
            stream: student.stream || "",
            academicSession: student.academicSession,
            rollNo: student.rollNo,
            promotedAt: new Date()
          });
        }

        // 3. Ab student ki main profile par nayi class aur naya session update karein
        student.class = nextClass;
        student.academicSession = nextSession;
        
        // 🌟 IMP: Agli class me jaate hi roll number reset ho jata hai jab tak naya na mile
        student.rollNo = null; 

        // 4. Save the document back to database
        await student.save();
      }
    }

    return res.status(200).json({ 
      success: true, 
      message: `${studentIds.length} Students ka purana data history me lock karke unhe safely Session ${nextSession} aur Class ${nextClass} me promote kar diya gaya hai.` 
    });

  } catch (err) {
    console.error("Promotion Error:", err.message);
    return res.status(500).json({ message: "Server Error: " + err.message });
  }
});

router.put("/promote-student/:id", auth, async (req, res) => {
  try {
    if (req.user.role !== "teacher" && req.user.role !== "admin") {
      return res.status(403).json({ message: "Student promote karne ki permission nahi hai." });
    }
    const { id } = req.params;
    const { nextClass, nextStream, nextAcademicSession: targetSession, currentClass, currentAcademicSession, examType } = req.body;

    // 1. Basic Validation check karein
    if (!nextClass) {
      return res.status(400).json({ message: "Agli class chunna zaroori hai." });
    }
    if ((nextClass === "11th" || nextClass === "12th") && !nextStream) {
      return res.status(400).json({ message: "Class 11th aur 12th ke liye stream chunna zaroori hai." });
    }
    if (!isValidAcademicSession(targetSession) || !isValidAcademicSession(currentAcademicSession)) {
      return res.status(400).json({ message: "Naya academic session chunna zaroori hai." });
    }

    // 2. Student ko database me dhoondhein
    const existingStudent = await Student.findById(id);
    if (!existingStudent) {
      return res.status(404).json({ message: "Student nahi mila database me." });
    }

    if (existingStudent.class !== currentClass || existingStudent.academicSession !== currentAcademicSession) {
      return res.status(409).json({ message: `Student ab ${existingStudent.class} (${existingStudent.academicSession}) me hai. List refresh karein.` });
    }
    if (allowedNextClass[currentClass] !== nextClass) {
      return res.status(400).json({ message: `${currentClass} se direct ${nextClass} promotion allowed nahi hai.` });
    }
    if (nextAcademicSession(currentAcademicSession) !== targetSession) {
      return res.status(400).json({ message: `Target session ${nextAcademicSession(currentAcademicSession)} hona chahiye.` });
    }

    // Promotion result sirf frontend par trust nahi hoga; saved marks backend par bhi verify honge.
    if (!examType) return res.status(400).json({ message: "Promotion ke liye exam type required hai." });
    const marksRecords = await Marks.find({ class: currentClass, academicYear: currentAcademicSession, examType }).lean();
    if (!marksRecords.length) return res.status(400).json({ message: `${examType} ke marks available nahi hain.` });
    const hasFailedSubject = marksRecords.some((record) => {
      const score = record.students?.find((item) => item.studentId?.toString() === id);
      const total = Number(score?.theoryMarks || 0) + (record.practicalEnabled ? Number(score?.practicalMarks || 0) : 0);
      return !score || total < Number(record.passingMarks || 33);
    });
    if (hasFailedSubject) return res.status(400).json({ message: "Student sabhi saved subjects me pass nahi hai; promotion blocked." });

    // Double-check: Agar student ko usi class me firse promote kiya ja raha hai toh rokhein
    if (existingStudent.class === nextClass && existingStudent.academicSession === targetSession) {
      return res.status(400).json({ message: "Student pehle se hi is class aur session me hai." });
    }

    // 3. Database Update Loop (Purana data history me jayega aur naya data primary fields me)
    const updatedStudent = await Student.findByIdAndUpdate(
      id,
      {
        // 💾 Purane saal ka saara data history array me push karein
        $push: {
          academicHistory: {
            class: existingStudent.class,
            stream: existingStudent.stream || "",
            academicSession: existingStudent.academicSession,
            rollNo: existingStudent.rollNo || null,
            promotedAt: new Date()
          }
        },
        // 🚀 Main profile par naye saal ka data set karein
        $set: {
          class: nextClass,
          stream: (nextClass === "11th" || nextClass === "12th") ? nextStream : "",
          academicSession: targetSession,
          rollNo: null // Naye saal me roll number shuruat me khali (null) rahega jab tak dobara na mile
        }
      },
      { returnDocument: "after" } // Naya updated data return karein
    );

    res.status(200).json({
      message: `${updatedStudent.name} successfully ${nextClass} me promote ho gaya hai.`,
      data: updatedStudent,
    });

  } catch (err) {
    console.error("Promotion Error backend:", err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
