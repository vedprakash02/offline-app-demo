const mongoose = require("mongoose");

const classSubjectSchema = new mongoose.Schema({
  academicSession: { type: String, required: true, match: /^\d{4}-\d{4}$/ },
  className: { type: String, required: true, trim: true, maxlength: 30 },
  stream: { type: String, default: "", trim: true, maxlength: 40 },
  subjects: { type: [String], required: true, default: [] },
}, { timestamps: true });

classSubjectSchema.index({ academicSession: 1, className: 1, stream: 1 }, { unique: true });

module.exports = mongoose.model("ClassSubject", classSubjectSchema);
