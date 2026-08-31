const mongoose = require("mongoose");

const MarksSchema = new mongoose.Schema({
  class: {
    type: String,
    required: true,
  }, // e.g., "10th", "12th"
  subjectName: {
    type: String,
    required: true,
  }, // e.g., "Mathematics"
  examType: {
    type: String,
    required: true,
  }, // e.g., "Quarterly", "Half-Yearly"
  academicYear: {
    type: String,
    required: true,
  }, // e.g., "2026-2027"
  practicalEnabled: { type: Boolean, default: false },
  theoryMaxMarks: { type: Number, default: 75, min: 1 },
  practicalMaxMarks: { type: Number, default: 30, min: 0 },
  passingMarks: { type: Number, default: 33, min: 0 },

  // Is array me us class ke saare students ke marks save honge
  students: [
    {
      studentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Student", // Aapke Student model se link
        required: true,
      },
      theoryMarks: {
        type: Number,
        required: true,
        default: 0,
      },
      practicalMarks: {
        type: Number,
        required: true,
        default: 0,
      },
    },
  ],
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Ek class, subject, exam aur saal ka ek hi master record hona chahiye
MarksSchema.index(
  { class: 1, subjectName: 1, examType: 1, academicYear: 1 },
  { unique: true },
);

module.exports = mongoose.model("Marks", MarksSchema);
