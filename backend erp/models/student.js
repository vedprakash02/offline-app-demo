const mongoose = require("mongoose");
const StudentSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: false,
  },
  name: { type: String, required: true, trim: true },
  fatherName: { type: String, required: true, trim: true },
  motherName: { type: String, required: true, trim: true },
  dob: { type: Date, required: true },
  gender: { type: String, required: true },
  cast: { type: String, required: true },
  class: { type: String, required: true }, // Yeh hamesha LATEST (Current) class rahegi
  address: { type: String, required: true },
  phone: { type: String, required: true },
  stream: { type: String, default: "" }, // Yeh LATEST stream rahegi
  profileImage: { type: String },
  admissionDate: { type: Date, default: Date.now },
  admissionNo: { type: String, required: true, unique: true, index: true },
  imageUrl: { type: String },
  rollNo: { type: Number, default: null }, // Yeh LATEST roll number rahega
  EnrollmentNo: { type: String },
  ApaarId: { type: String, default: "" },
  PenNo: { type: String, default: "" },
  AadhaarNo: { type: String, default: "", trim: true },
  academicSession: { type: String, required: true }, // Yeh LATEST session rahega

  /* 💾 HISTORICAL DATA KE LIYE YEH ARRAY ADD KIYA HAI */
  academicHistory: [
    {
      class: { type: String, required: true },
      stream: { type: String, default: "" },
      academicSession: { type: String, required: true },
      rollNo: { type: Number, default: null },
      promotedAt: { type: Date, default: Date.now },
    },
  ],
});

module.exports = mongoose.model("Student", StudentSchema);
