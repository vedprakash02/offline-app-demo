const mongoose = require("mongoose");

const salaryPaymentSchema = new mongoose.Schema({
  amount: { type: Number, required: true, min: 1 },
  grossAmount: { type: Number, min: 0, default: 0 },
  deductionAmount: { type: Number, min: 0, default: 0 },
  month: { type: String, required: true, match: /^\d{4}-\d{2}$/ },
  date: { type: Date, default: Date.now },
  mode: { type: String, enum: ["Cash", "UPI", "Bank Transfer", "Cheque", "Other"], default: "Bank Transfer" },
  receiptNo: { type: String, required: true },
  note: { type: String, trim: true, default: "" },
  paidBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
}, { _id: true });

const teacherSchema = new mongoose.Schema({
  employeeId: { type: String, required: true, unique: true, trim: true, uppercase: true },
  image: { type: String, default: "" },
  name: { type: String, required: true, trim: true },
  phone: { type: String, required: true, trim: true },
  email: { type: String, trim: true, lowercase: true, default: "" },
  gender: { type: String, enum: ["Male", "Female", "Other", ""], default: "" },
  dateOfBirth: Date,
  joiningDate: { type: Date, required: true },
  designation: { type: String, required: true, trim: true },
  qualification: { type: String, trim: true, default: "" },
  educationSubject: { type: String, trim: true, default: "" },
  subjects: [{ type: String, trim: true }],
  classes: [{ type: String, trim: true }],
  address: { type: String, trim: true, default: "" },
  bankName: { type: String, trim: true, default: "" },
  accountNo: { type: String, trim: true, default: "" },
  ifsc: { type: String, trim: true, uppercase: true, default: "" },
  monthlySalary: { type: Number, required: true, min: 0 },
  salaryStructure: {
    basicSalary: { type: Number, min: 0, default: 0 },
    hra: { type: Number, min: 0, default: 0 },
    da: { type: Number, min: 0, default: 0 },
    ta: { type: Number, min: 0, default: 0 },
    otherAllowance: { type: Number, min: 0, default: 0 },
    pf: { type: Number, min: 0, default: 0 },
    esi: { type: Number, min: 0, default: 0 },
    professionalTax: { type: Number, min: 0, default: 0 },
    tds: { type: Number, min: 0, default: 0 },
  },
  status: { type: String, enum: ["Active", "Inactive"], default: "Active" },
  leftAt: { type: Date, default: null },
  exitReason: { type: String, trim: true, default: "" },
  payments: [salaryPaymentSchema],
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
}, { timestamps: true });

module.exports = mongoose.model("Teacher", teacherSchema);

