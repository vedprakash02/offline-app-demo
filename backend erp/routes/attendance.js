const mongoose = require("mongoose");
const { express, Student, Attendance, auth, Teacher, TeacherAttendance } = require("../config/dependenci.js");

const router = express.Router();
const { isValidAcademicSession, sessionStudentQuery, studentForSession } = require("../utils/academicSession.js");

// Dashboard ke liye MongoDB-based daily attendance summary.
router.get("/attendance-summary", auth, async (req, res) => {
  try {
    const { date, academicSession } = req.query;
    if (!date || !isValidAcademicSession(academicSession)) {
      return res.status(400).json({ message: "Date aur valid academicSession bhejna zaroori hai." });
    }

    const students = (await Student.find(sessionStudentQuery(academicSession)).lean())
      .map((student) => studentForSession(student, academicSession));
    const activeStudentIds = students.map((student) => student._id);
    const records = await Attendance.find({
      academicSession,
      date,
      studentId: { $in: activeStudentIds },
      status: { $ne: "Holiday" },
    }).select("studentId status -_id").lean();

    const present = records.filter((record) => ["Present", "Late"].includes(record.status)).length;
    const absentMarked = records.filter((record) => record.status === "Absent").length;
    const markedStudentIds = new Set(records.map((record) => record.studentId?.toString()));
    const unmarked = Math.max(0, students.length - markedStudentIds.size);

    return res.status(200).json({
      date,
      totalStudents: students.length,
      present,
      absent: absentMarked + unmarked,
      marked: records.length,
      unmarked,
    });
  } catch (error) {
    console.error("Attendance summary load error:", error);
    return res.status(500).json({ message: "Attendance summary load nahi ho payi." });
  }
});
// 1. GET ATTENDANCE REPORT ROUTE (Ab Holiday poore school ke liye check hogi)
router.get("/attendance-report", auth, async (req, res) => {
  try {
    const { studentClass, month, academicSession } = req.query;

    if (!studentClass || !month || !isValidAcademicSession(academicSession)) {
      return res
        .status(400)
        .json({ message: "Class, Month aur valid Academic Session bhejna zaroori hai" });
    }

    // 1. Select ki gayi class ke saare bache dhoondhein
    const students = (await Student.find(sessionStudentQuery(academicSession)).lean())
      .map((student) => studentForSession(student, academicSession))
      .filter((student) => student.class === studentClass)
      .sort((a, b) => (a.rollNo || 99999) - (b.rollNo || 99999));

    // 2. Is mahine ki saari school holidays nikalein (Ab kisi class ka bhed-bhaav nahi hai)
    const holidayRecords = await Attendance.find({
      academicSession,
      date: { $regex: `^${month}` },
      status: "Holiday"
    });
    const customHolidaysInMonth = holidayRecords.map((rec) => rec.date);

    if (students.length === 0) {
      const [year, monthNumber] = month.split("-").map(Number);
      const daysInMonth = new Date(year, monthNumber, 0).getDate();
      const calendar = Array.from({ length: daysInMonth }, (_, index) => {
        const day = index + 1;
        const date = `${month}-${String(day).padStart(2, "0")}`;
        const isSunday = new Date(year, monthNumber - 1, day).getDay() === 0;
        const isManualHoliday = customHolidaysInMonth.includes(date);
        return { day, date, isWeeklyHoliday: isSunday || isManualHoliday };
      });
      return res.status(200).json({ students: [], calendar, summary: { totalCalendarDays: daysInMonth, weeklyHolidayDays: calendar.filter(d => d.isWeeklyHoliday).length, schoolWorkingDays: 0 } });
    }

    const studentIds = students.map((s) => s._id);

    // 3. Is mahine ke sirf bacho ke attendance records nikalein
    const monthlyRecords = await Attendance.find({
      academicSession,
      studentId: { $in: studentIds },
      date: { $regex: `^${month}` },
      status: { $ne: "Holiday" }
    });

    // 4. Aaj tak ka poora OVERALL data nikalein
    const allRecords = await Attendance.find({
      academicSession,
      studentId: { $in: studentIds },
      status: { $ne: "Holiday" }
    });

    const [year, monthNumber] = month.split("-").map(Number);
    const daysInMonth = new Date(year, monthNumber, 0).getDate();
    
    // Calendar structure builder (Ab isme kisi bhi class ka holiday render hoga)
    const calendar = Array.from({ length: daysInMonth }, (_, index) => {
      const day = index + 1;
      const date = `${month}-${String(day).padStart(2, "0")}`;
      const isSunday = new Date(year, monthNumber - 1, day).getDay() === 0;
      const isManualHoliday = customHolidaysInMonth.includes(date);
      
      return { 
        day, 
        date, 
        isWeeklyHoliday: isSunday || isManualHoliday 
      };
    });

    const monthlyRecordsByStudent = new Map();
    monthlyRecords.forEach((record) => {
      if (record.studentId) {
        const id = record.studentId.toString();
        if (!monthlyRecordsByStudent.has(id)) monthlyRecordsByStudent.set(id, new Map());
        monthlyRecordsByStudent.get(id).set(record.date, record.status);
      }
    });

    const workingAttendanceDates = new Set(monthlyRecords.map((record) => record.date));

    // 5. Register-style monthly calculator
    const report = students.map((student) => {
      const studentIdStr = student._id.toString();

      // --- MONTHLY CALCULATIONS ---
      const studentMonthlyHistory = monthlyRecords.filter((rec) => rec.studentId && rec.studentId.toString() === studentIdStr);
      const totalMonthDays = studentMonthlyHistory.length;
      const monthPresentCount = studentMonthlyHistory.filter((rec) => rec.status === "Present").length;
      const monthAbsentCount = studentMonthlyHistory.filter((rec) => rec.status === "Absent").length;
      const monthLateCount = studentMonthlyHistory.filter((rec) => rec.status === "Late").length;
      const attendedCount = monthPresentCount + monthLateCount;
      const monthPercentage = totalMonthDays > 0 ? ((attendedCount / totalMonthDays) * 100).toFixed(1) : "0.0";

      // --- OVERALL CALCULATIONS ---
      const studentOverallHistory = allRecords.filter((rec) => rec.studentId && rec.studentId.toString() === studentIdStr);
      const totalOverallDays = studentOverallHistory.length;
      const overallPresentCount = studentOverallHistory.filter((rec) => rec.status === "Present").length;
      const overallPercentage = totalOverallDays > 0 ? ((overallPresentCount / totalOverallDays) * 100).toFixed(1) : "0.0";

      return {
        _id: student._id,
        rollNo: student.rollNo,
        name: student.name,
        totalDays: totalMonthDays,
        presentCount: monthPresentCount,
        absentCount: monthAbsentCount,
        lateCount: monthLateCount,
        percentage: monthPercentage,
        dailyStatus: Object.fromEntries(monthlyRecordsByStudent.get(studentIdStr) || []),
        overallPresent: overallPresentCount,
        totalOverallDays: totalOverallDays,
        overallPercentage: overallPercentage,
      };
    });

    return res.status(200).json({
      students: report,
      calendar,
      summary: {
        totalCalendarDays: daysInMonth,
        weeklyHolidayDays: calendar.filter((day) => day.isWeeklyHoliday).length,
        schoolWorkingDays: workingAttendanceDates.size,
      },
    });
  } catch (error) {
    console.error("Report generate karne me galti:", error);
    return res.status(500).json({ error: error.message });
  }
});

// 2. GET DAILY ATTENDANCE FOR TEACHER PANEL (MongoDB-based manual attendance)
router.get("/attendance", auth, async (req, res) => {
  try {
    const { date, studentClass, academicSession } = req.query;

    if (!date || !studentClass || !isValidAcademicSession(academicSession)) {
      return res.status(400).json({ message: "Date, class aur valid academicSession bhejna zaroori hai." });
    }

    const attendanceRecords = await Attendance.find({
      academicSession,
      date,
      class: studentClass,
    })
      .select("studentId status -_id")
      .lean();

    return res.status(200).json({
      students: attendanceRecords.map((record) => ({
        studentId: record.studentId?.toString?.() || record.studentId,
        status: record.status,
      })),
      date,
    });
  } catch (error) {
    console.error("Daily attendance load error:", error);
    return res.status(500).json({ message: "Attendance load nahi ho payi." });
  }
});

// 3. STUDENT ATTENDANCE SAVE ROUTE (Aapka normal attendance route)
router.post("/student-attendance", auth, async (req, res) => {
  try {
    const userRole = req.user.role;
    if (userRole !== "teacher" && userRole !== "admin") {
      return res.status(403).json({
        message: "Permission Denied: Aap naya admission nahi kar sakte.",
      });
    }
    const { attendanceData, academicSession } = req.body;

    if (!attendanceData || !Array.isArray(attendanceData) || !isValidAcademicSession(academicSession)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid data format" });
    }

    if (attendanceData.length > 500) return res.status(400).json({ success: false, message: "Ek request mein adhiktam 500 attendance records bhejein." });
    const validStatuses = new Set(["Present", "Absent", "Late"]);
    const datePattern = /^\d{4}-\d{2}-\d{2}$/;
    if (attendanceData.some((record) => !mongoose.Types.ObjectId.isValid(record.studentId) || !datePattern.test(String(record.date || "")) || !validStatuses.has(record.status))) {
      return res.status(400).json({ success: false, message: "Har attendance record mein valid student, date aur status required hai." });
    }
    const studentIds = [...new Set(attendanceData.map((record) => String(record.studentId)))];
    const roster = await Student.find(sessionStudentQuery(academicSession, { _id: { $in: studentIds } })).select("_id class academicSession academicHistory").lean();
    if (roster.length !== studentIds.length) return res.status(400).json({ success: false, message: "Kuch students selected academic session mein nahi hain." });
    const classByStudentId = new Map(roster.map((student) => [String(student._id), studentForSession(student, academicSession).class]));

    const bulkOps = attendanceData.map((record) => ({
      updateOne: {
        filter: { academicSession, studentId: record.studentId, date: record.date },
        update: {
          $set: {
            class: classByStudentId.get(String(record.studentId)),
            academicSession,
            status: record.status,
            markedBy: req.user.id,
            source: "manual",
            markedAt: new Date(),
          },
        },
        upsert: true,
      },
    }));

    await Attendance.bulkWrite(bulkOps);

    res
      .status(200)
      .json({ success: true, message: "Attendance updated successfully!" });
  } catch (error) {
    console.error("Attendance save/update error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 3. MARK HOLIDAY ROUTE (Ab bina class ke poore school ke liye save karega)
router.post('/mark-holiday', auth, async (req, res) => {
  const { date, isHoliday, academicSession } = req.body;

  try {
    if (req.user.role !== "teacher" && req.user.role !== "admin") {
      return res.status(403).json({ message: "Holiday update karne ki permission nahi hai." });
    }
    if (!date || !isValidAcademicSession(academicSession)) {
      return res.status(400).json({ message: "Date batana zaroori hai." });
    }
    
    if (isHoliday) {
      // Pura school level entry save hoga jisme koi specific class dependency nahi hogi
      await Attendance.findOneAndUpdate(
        { academicSession, date, status: "Holiday" },
        { $set: { academicSession, date, status: "Holiday" } },
        { upsert: true, new: true }
      );
      console.log(`Setting School Holiday on ${date}`);
    } else {
      // Agar Holiday remove karenge toh pure school level se hatega
      await Attendance.deleteOne({ academicSession, date, status: "Holiday" });
      console.log(`Removing School Holiday from ${date}`);
    }

    return res.status(200).json({ 
      message: "Holiday status poore school ke liye database me update ho gaya hai!" 
    });

  } catch (error) {
    console.error("Holiday API Error:", error);
    return res.status(500).json({ message: "Server error: Holiday save nahi ho payi." });
  }
});


// SQLite QR events ko authenticated MongoDB attendance register mein merge karein.
router.post("/attendance/qr-sync", auth, async (req, res) => {
  try {
    if (!["teacher", "admin"].includes(req.user.role)) {
      return res.status(403).json({ message: "QR attendance sync ki permission nahi hai." });
    }
    const events = Array.isArray(req.body.events) ? req.body.events : [];
    const fallbackSession = String(req.body.academicSession || "").trim();
    if (!events.length || events.length > 500) {
      return res.status(400).json({ message: "1 se 500 QR events bhejein." });
    }

    const escapeRegex = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const results = [];
    for (const event of events) {
      if (event.entityType === "teacher") {
        const employeeId=String(event.employeeId||"").trim().toUpperCase(); const teacher=await Teacher.findOne({employeeId,status:"Active"}).lean();
        if(!teacher){results.push({id:Number(event.id),entityType:"teacher",status:"not_found",message:`Teacher ${employeeId} active roster mein nahi mila.`});continue;}
        const existing=await TeacherAttendance.findOne({teacherId:teacher._id,date:event.date}); const scannedAt=new Date(event.scannedAt); if(existing?.source==="manual"&&existing.updatedAt>=scannedAt){results.push({id:Number(event.id),entityType:"teacher",status:"manual_override",message:"Newer manual attendance preserved."});continue;}
        const formatTime=(value)=>value?new Intl.DateTimeFormat("en-GB",{timeZone:"Asia/Kolkata",hour:"2-digit",minute:"2-digit",hour12:false}).format(new Date(value)):""; const sourceMap={camera:"qr-camera",photo:"qr-photo",hardware:"qr-hardware","mobile-offline":"qr-mobile",manual:"qr-hardware"};
        await TeacherAttendance.findOneAndUpdate({teacherId:teacher._id,date:event.date},{$set:{status:"Present",checkIn:formatTime(event.checkInAt),checkOut:formatTime(event.checkOutAt),source:sourceMap[event.source]||"qr-hardware",note:"QR attendance",markedBy:req.user.id}},{upsert:true,new:true,runValidators:true});
        results.push({id:Number(event.id),entityType:"teacher",status:"synced",teacherId:teacher._id,employeeId});continue;
      }
      const id = Number(event.id);
      const admissionNo = String(event.admissionNo || "").trim();
      const academicSession = String(event.academicSession || fallbackSession).trim();
      const date = String(event.date || "").trim();
      if (!Number.isInteger(id) || !admissionNo || !/^\d{4}-\d{2}-\d{2}$/.test(date) || !isValidAcademicSession(academicSession)) {
        results.push({ id, status: "error", message: "Invalid admission number, date ya session." });
        continue;
      }

      let student = null;
      if (/^[a-f\d]{24}$/i.test(admissionNo)) {
        student = await Student.findOne(sessionStudentQuery(academicSession, { _id: admissionNo })).lean();
      }
      if (!student) {
        student = await Student.findOne(sessionStudentQuery(academicSession, {
          admissionNo: { $regex: `^${escapeRegex(admissionNo)}$`, $options: "i" },
        })).lean();
      }
      if (!student) {
        results.push({ id, status: "not_found", message: `Admission No ${admissionNo} MongoDB roster mein nahi mila.` });
        continue;
      }

      const sessionStudent = studentForSession(student, academicSession);
      const scannedAt = new Date(event.scannedAt);
      const validScannedAt = !Number.isNaN(scannedAt.getTime());
      const existing = await Attendance.findOne({ academicSession, studentId: student._id, date });
      if (existing?.source === "manual" && (!validScannedAt || existing.markedAt >= scannedAt)) {
        results.push({ id, status: "manual_override", message: "QR scan ke baad ki teacher correction rakhi gayi." });
        continue;
      }

      const sourceMap = {
        camera: "qr-camera", photo: "qr-photo", hardware: "qr-hardware",
        "mobile-offline": "qr-mobile", "whole-class": "qr-camera", manual: "qr-hardware",
      };
      await Attendance.findOneAndUpdate(
        { academicSession, studentId: student._id, date },
        { $set: {
          class: sessionStudent.class,
          academicSession,
          status: "Present",
          source: sourceMap[event.source] || "legacy",
          markedAt: validScannedAt ? scannedAt : new Date(),
          markedBy: String(event.operatorName || req.user.username || req.user.name || "QR Scanner").trim() || "QR Scanner",
        } },
        { upsert: true, new: true, runValidators: true },
      );
      results.push({ id, status: "synced", mongoStudentId: student._id, admissionNo: student.admissionNo });
    }

    return res.status(200).json({
      results,
      synced: results.filter((item) => ["synced", "manual_override"].includes(item.status)).length,
      failed: results.filter((item) => !["synced", "manual_override"].includes(item.status)).length,
    });
  } catch (error) {
    console.error("QR attendance Mongo sync error:", error);
    return res.status(500).json({ message: "QR attendance MongoDB mein sync nahi hui." });
  }
});
module.exports = router;


