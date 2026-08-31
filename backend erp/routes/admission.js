const { express, uploadImage, Student, Dashboard, Marks, auth } = require("../config/dependenci.js");
const Counter = require("../models/counter.js");

const router = express.Router();
const { isValidAcademicSession, sessionStudentQuery, studentForSession } = require("../utils/academicSession.js");

router.post("/admission",
  auth,
  uploadImage.single("profileimage"), 
  async (req, res) => {
    try {
      const userId = req.user.id; 
      const userRole = req.user.role; 

      if (!userId) {
        return res.status(400).json({
          message: "Validation Error: userId missing hai.",
        });
      }

      if (userRole !== "teacher" && userRole !== "admin") {
        return res.status(403).json({
          message: "Permission Denied: Aap naya admission nahi kar sakte.",
        });
      }

      const {
        name,
        fatherName,
        motherName,
        dob,
        gender,
        cast,
        class: studentClass,
        stream,
        address,
        phone,
        academicSession,
        AadhaarNo,
      } = req.body;
      

      if (!isValidAcademicSession(academicSession)) {
        return res.status(400).json({ message: "Academic Session chunna zaroori hai!" });
      }

      const imageFilename = req.file ? req.file.filename : null;

      if (!imageFilename) {
        return res.status(400).json({ message: "Profile image is required" });
      }

      const requiredText = { name, fatherName, motherName, gender, cast, class: studentClass, address, phone };
      const missingField = Object.entries(requiredText).find(([, value]) => !String(value || "").trim());
      if (missingField) return res.status(400).json({ message: `${missingField[0]} is required.` });
      if (!/^\d{10}$/.test(String(phone))) return res.status(400).json({ message: "Phone number exactly 10 digits ka hona chahiye." });
      if (AadhaarNo && !/^\d{12}$/.test(String(AadhaarNo))) return res.status(400).json({ message: "Aadhaar number exactly 12 digits ka hona chahiye." });
      const birthDate = new Date(dob);
      if (!dob || Number.isNaN(birthDate.getTime()) || birthDate > new Date()) return res.status(400).json({ message: "Valid date of birth required hai." });
      if (!["Male", "Female", "Other"].includes(gender)) return res.status(400).json({ message: "Valid gender select karein." });
      if (!["gen", "obc", "sc", "st"].includes(cast)) return res.status(400).json({ message: "Valid category select karein." });
      if ((studentClass === "11th" || studentClass === "12th") && !stream) {
        return res
          .status(400)
          .json({ message: "For class 11th and 12th, stream is required." });
      }
      
      // 🔥 MUKHYA BADLAV: Serial Wise Admission Number Logic 🔥
      const latestStudent = await Student.findOne({ admissionNo: /^SCH-\d{6}$/ }, { admissionNo: 1 })
        .sort({ admissionNo: -1 })
        .lean();
      const existingMaximum = latestStudent ? Number(latestStudent.admissionNo.slice(4)) : 0;
      const counter = await Counter.findOneAndUpdate(
        { key: "studentAdmissionNo" },
        [{ $set: { value: { $add: [{ $max: [{ $ifNull: ["$value", 0] }, existingMaximum] }, 1] } } }],
        // Mongoose 9 requires explicit opt-in for an aggregation update pipeline.
        { new: true, upsert: true, updatePipeline: true },
      );
      const nextSerial = counter.value;
      const formattedSerial = String(nextSerial).padStart(6, "0");
      const admissionNo = `SCH-${formattedSerial}`;

      // Naya student save karein dynamic serial number ke sath
      const newStudent = new Student({
        userId, 
        name: name.trim(),
        fatherName: fatherName.trim(),
        motherName: motherName.trim(),
        dob: birthDate,
        gender,
       cast,
        class: studentClass,
        stream: studentClass === "11th" || studentClass === "12th" ? stream : "", 
        address: address.trim(),
        phone,
        admissionNo, // Naya dynamic id insert hoga
        imageUrl: imageFilename, 
        academicSession,
        AadhaarNo: String(AadhaarNo || "").trim(),
      });

      await newStudent.save();

      // Dashboard me student ki sankhya 1 se badhayein
      await Dashboard.updateOne(
        {},
        { $inc: { totalStudents: 1 } },
        { upsert: true },
      );

      return res
        .status(201)
        .json({ message: `Admission Successful for session ${academicSession}!`, student: newStudent });
        
    } catch (err) {
      console.error("Admission Error:", err);
      if (err?.code === 11000) return res.status(409).json({ message: "Admission number conflict hua. Please submit again." });
      if (err?.name === "ValidationError") return res.status(400).json({ message: Object.values(err.errors).map((item) => item.message).join(", ") });
      return res
        .status(500)
        .json({ message: "Server Error: " + err.message });
    }
  },
);

router.get("/all-students", auth, async (req, res) => {
  try {
    if (req.user.role === "teacher" || req.user.role === "admin") {
      const { search, studentClass, academicSession } = req.query;
      if (!isValidAcademicSession(academicSession)) return res.status(400).json({ message: "Valid academicSession query required hai." });
      let query = sessionStudentQuery(academicSession);

      // Agar class filter select kiya hai
      if (studentClass) {
        query.$and = [{ $or: [{ class: studentClass }, { academicHistory: { $elemMatch: { academicSession, class: studentClass } } }] }];
      }

      // Agar name, admissionNo ya phone se search kiya hai
      if (search) {
        query.$and = [...(query.$and || []), { $or: [
          { name: { $regex: search, $options: "i" } }, // 'i' matlab case-insensitive (choti-badi ABC farq nahi padega)
          { admissionNo: { $regex: search, $options: "i" } },
          { phone: { $regex: search, $options: "i" } },
        ] }];
      }

      const students = await Student.find(query).sort({ admissionNo: 1 }).lean();
      return res.status(200).json(students.map((student) => studentForSession(student, academicSession)));
    } else {
      // ⚠️ YEH JODNA ZAROORI THA: Agar user student hai toh yeh chalega
      return res.status(403).json({
        message: "Access Denied: Only teachers or admins can view students",
      });
    }
  } catch (err) {
    console.error("Search Error:", err.message);
    return res.status(500).json({ error: err.message });
  }
});

router.get("/edit-student/:id", auth, async (req, res) => {
  try {
    if (req.user.role === "teacher" || req.user.role === "admin") {
      const { id } = req.params;
      // MongoDB se ID ke aadhar par student dhoodhein
      const student = await Student.findById(id);

      // Agar student nahi milta hai
      if (!student) {
        return res.status(404).json({ message: "Student nahi mila." });
      }
      return res.status(200).json(student);
    } else {
      return res
        .status(403)
        .json({ message: "Access Denied: Only teachers can view students" });
    }

    // Student ka poora data response me bhejein
  } catch (err) {
    console.error("Fetch Single Student Error:", err.message);

    // Agar MongoDB ID galat format me ho (CastError)
    if (err.kind === "ObjectId") {
      return res.status(400).json({ message: "Sahi ID format nahi hai." });
    }

    return res.status(500).json({ error: err.message });
  }
});

router.put("/update-student/:id",
  auth,
  // 💡 BADLAV 1: 'uploadImg' ki jagah aapna local middleware 'uploadImage' lagayein
  uploadImage.single("profileimage"), 
  async (req, res) => {
    try {
      if (req.user.role !== "teacher" && req.user.role !== "admin") {
        return res.status(403).json({ message: "Student update karne ki permission nahi hai." });
      }
      const { id } = req.params;

      const {
        name,
        fatherName,
        motherName,
        dob,
        gender,
        cast,
        class: studentClass,
        stream,
        address,
       
        phone,
        imageUrl,
        AadhaarNo,
      } = req.body;

      // 1. Phone number validation
      if (phone && (phone.toString().length !== 10 || isNaN(phone))) {
        return res
          .status(400)
          .json({ message: "Phone number exactly 10 digits ka hona chahiye." });
      }

      // 2. Class 11th aur 12th ke liye stream validation
      const requiredText = { name, fatherName, motherName, gender, cast, class: studentClass, address, phone };
      const missingField = Object.entries(requiredText).find(([, value]) => !String(value || "").trim());
      if (missingField) return res.status(400).json({ message: `${missingField[0]} is required.` });
      if (!/^\d{10}$/.test(String(phone))) return res.status(400).json({ message: "Phone number exactly 10 digits ka hona chahiye." });
      if (AadhaarNo && !/^\d{12}$/.test(String(AadhaarNo))) return res.status(400).json({ message: "Aadhaar number exactly 12 digits ka hona chahiye." });
      const birthDate = new Date(dob);
      if (!dob || Number.isNaN(birthDate.getTime()) || birthDate > new Date()) return res.status(400).json({ message: "Valid date of birth required hai." });
      if (!["Male", "Female", "Other"].includes(gender)) return res.status(400).json({ message: "Valid gender select karein." });
      if (!["gen", "obc", "sc", "st"].includes(cast)) return res.status(400).json({ message: "Valid category select karein." });
      if ((studentClass === "11th" || studentClass === "12th") && !stream) {
        return res
          .status(400)
          .json({ message: "For class 11th and 12th, stream is required." });
      }

      // Database me student update karein
      const updatedStudent = await Student.findByIdAndUpdate(
        id,
        {
          name,
          fatherName,
          motherName,
          dob,
          gender,
          cast,
          class: studentClass, 
          stream:
            studentClass === "11th" || studentClass === "12th" ? stream : "",
          address: address.trim(),
        
          phone,
          AadhaarNo: String(AadhaarNo || "").trim(),
          // 💡 BADLAV 2: Local storage ke liye '.path' ki jagah '.filename' likhein
          imageUrl: req.file ? req.file.filename : imageUrl, 
        },
        { returnDocument: "after" }, 
      );

      if (!updatedStudent) {
        return res
          .status(404)
          .json({ message: "Student nahi mila database me." });
      }

      res.status(200).json({
        message: "Student details updated successfully",
        data: updatedStudent,
      });
    } catch (err) {
      console.error("Update Error backend:", err.message);
      res.status(500).json({ error: err.message });
    }
  },
);

router.delete("/delete-student/:id", auth, async (req, res) => {
  try {
    const { id } = req.params;
    const userRole = req.user.role;
    if (userRole !== "teacher" && userRole !== "admin") {
      return res.status(403).json({
        success: false,
        message:
          "Permission Denied: Aapke paas student delete karne ka right nahi hai.",
      });
    }

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Student ID provide karna zaroori hai.",
      });
    }

    // 1. Database se student record completely remove karein
    const deletedStudent = await Student.findByIdAndDelete(id);

    if (!deletedStudent) {
      return res.status(404).json({
        success: false,
        message: "Database me is ID ka koi student nahi mila.",
      });
    }

    // 2. 💡 Sahi cleanup logic bina global condition ke
    // Marks collection ke andar jitne bhi records hain unse is student ka sub-document saaf karein
    try {
      await Marks.updateMany({}, { $pull: { students: { studentId: id } } });
    } catch (cleanupError) {
      console.error("Marks collection cleanup warning:", cleanupError);
      // Agar marks model loaded nahi hai toh process crash nahi hoga
    }

    return res.status(200).json({
      success: true,
      message: "Student record successfully delete ho gaya!",
    });
  } catch (error) {
    console.error("Student deletion backend error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error: Database operation fail ho gayi.",
    });
  }
});

module.exports = router;
