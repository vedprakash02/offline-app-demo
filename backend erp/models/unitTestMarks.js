const mongoose = require("mongoose");
const schema = new mongoose.Schema({
  class: { type: String, required: true }, stream: { type: String, default: "" }, academicYear: { type: String, required: true },
  unit: { type: String, enum: ["Unit Test 1", "Unit Test 2", "Unit Test 3"], required: true }, month: { type: String, required: true }, subjectName: { type: String, required: true }, maxMarks: { type: Number, default: 20 },
  students: [{ studentId: { type: mongoose.Schema.Types.ObjectId, ref: "Student", required: true }, marks: { type: Number, default: 0 } }]
}, { timestamps: true });
schema.index({ class: 1, stream: 1, academicYear: 1, unit: 1, month: 1, subjectName: 1 }, { unique: true });
module.exports = mongoose.model("UnitTestMarks", schema);