const mongoose = require('mongoose');

const AttendanceSchema = new mongoose.Schema({
  academicSession: { type: String, required: true },
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: function () { return this.status !== 'Holiday'; }
  },
  class: {
    type: String,
    required: function () { return this.status !== 'Holiday'; }
  },
  date: { type: String, required: true },  // Format: YYYY-MM-DD
  status: { type: String, enum: ['Present', 'Absent', 'Late', 'Holiday'], required: true },
  source: { type: String, enum: ['manual', 'qr-camera', 'qr-photo', 'qr-hardware', 'qr-mobile', 'legacy'], default: 'manual' },
  markedAt: { type: Date, default: Date.now },
  markedBy: {
    type: String,
    required: function () { return this.status !== 'Holiday'; }
  }
});

AttendanceSchema.index({ academicSession: 1, studentId: 1, date: 1 }, { unique: true, partialFilterExpression: { studentId: { $type: "objectId" } } });

module.exports = mongoose.model('Attendance', AttendanceSchema);
