const mongoose = require("mongoose");

const teacherAttendanceSchema = new mongoose.Schema({
  teacherId: { type: mongoose.Schema.Types.ObjectId, ref: "Teacher", required: true },
  date: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ },
  status: { type: String, enum: ["Present", "Absent", "Late", "Leave", "Half Day"], required: true },
  checkIn: { type: String, default: "" },
  checkOut: { type: String, default: "" },
  note: { type: String, trim: true, default: "" },
  source: { type: String, enum: ["manual", "qr-camera", "qr-photo", "qr-hardware", "qr-mobile"], default: "manual" },
  markedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
}, { timestamps: true });

teacherAttendanceSchema.index({ teacherId: 1, date: 1 }, { unique: true });
module.exports = mongoose.model("TeacherAttendance", teacherAttendanceSchema);
