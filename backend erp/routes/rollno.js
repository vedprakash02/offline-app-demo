const { express, Student, auth } = require("../config/dependenci.js");

const router = express.Router();
const { isValidAcademicSession } = require("../utils/academicSession.js");
const { SCHOOL_CLASSES } = require("../config/academic.js");
const validClasses = new Set(SCHOOL_CLASSES);

router.get("/students-filter", auth, async (req, res) => {
  try {
    const { session, class: studentClass } = req.query;

    if (!session || !studentClass) {
      return res.status(400).json({ message: "Session aur Class query required hain." });
    }

    // Database me filter laga kar data dhundna
    const students = await Student.find({
      academicSession: session,
      class: studentClass
    });

    return res.status(200).json({ success: true, students });
  } catch (err) {
    return res.status(500).json({ message: "Server Error: " + err.message });
  }
});

router.put("/generate-roll-no", auth, async (req, res) => {
  try {
    if (req.user.role !== "teacher" && req.user.role !== "admin") {
      return res.status(403).json({ message: "Access Denied: Only teachers or admins can generate roll numbers" });
    }

    const { className, academicSession } = req.body; 

    if (!validClasses.has(className) || !isValidAcademicSession(academicSession)) {
      return res.status(400).json({ message: "Kripya Class select karein." });
    }

    // 1. Us Class ke sabhi bachho ko database se fetch karein
    const students = await Student.find({ class: className, academicSession }); 

    if (students.length === 0) {
      return res.status(404).json({ message: `Class ${className} me koi student nahi mila.` });
    }

    // 🌟 CUSTOM SORTING LOGIC: Stream ke mutabik aur fir Alphabetical sorting
    if (className === "11th" || className === "12th") {
      // Stream ki priority set karein (Arts pehle, fir Science, fir Commerce)
      const streamPriority = {
        'arts': 1,
        'science - maths': 2,
        'science': 2,
        'science - biology': 3,
        'commerce': 4,
      };

      students.sort((a, b) => {
        const streamA = (a.stream || "").toLowerCase().trim();
        const streamB = (b.stream || "").toLowerCase().trim();

        // Pehle check karein dono ki stream alag hai ya nahi
        if (streamPriority[streamA] !== streamPriority[streamB]) {
          const priorityA = streamPriority[streamA] || 99; // Agar koi stream nahi h toh use end me rkhein
          const priorityB = streamPriority[streamB] || 99;
          return priorityA - priorityB; // Kam priority number (Arts) pehle aayega
        }

        // Agar stream bilkul SAME hai, toh unhe Name ke alphabetical order (A to Z) me sort karein
        return a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
      });
    } else {
      // Class 9th aur 10th ke liye normal alphabetical sort (A to Z)
      students.sort((a, b) => a.name.localeCompare(b.name));
    }

    // 💡 Class ke hisab se Starting Roll Number set karna
    let startingRollNo = 1; 

    if (className === "9th") {
      startingRollNo = 9001;
    } else if (className === "10th") {
      startingRollNo = 10001;
    } else if (className === "11th") {
      startingRollNo = 11001;
    } else if (className === "12th") {
      startingRollNo = 12001;
    } else if (className === "Nursery") {
      startingRollNo = 101;
    } else if (className === "KG1") {
      startingRollNo = 101;
    } else if (className === "KG2") {
      startingRollNo = 201;
    } else {
      const classNum = parseInt(className);
      if (!isNaN(classNum)) {
        startingRollNo = classNum * 1000 + 1; 
      }
    }

    // 2. Loop chalakar har student ko sequential order me roll number assign karein aur save karein
    await Student.bulkWrite(students.map((student, index) => ({
      updateOne: {
        filter: { _id: student._id, class: className, academicSession },
        update: { $set: { rollNo: startingRollNo + index } },
      },
    })), { ordered: true });

    return res.status(200).json({ 
      message: `Class ${className} ke sabhi ${students.length} bachho ka Roll Number Stream-wise (Arts → Science) aur Alphabetical order me successfully generate ho gaya hai!` 
    });

  } catch (error) {
    console.error("Roll No Generation Error:", error);
    return res.status(500).json({ message: "Server Error: " + error.message });
  }
});

module.exports = router;
