const mongoose = require("mongoose");

const paymentSchema = new mongoose.Schema(
  {
    amount: { type: Number, required: true, min: [0, "Amount 0 se kam nahi ho sakta"] },
    date: { type: Date, default: Date.now },
    mode: {
      type: String,
      enum: ["Cash", "UPI", "Card", "Bank Transfer", "Cheque", "Other"],
      default: "Cash",
    },
    receiptNo: { type: String, required: true }, // Duplicate receipts à¤°à¥‹à¤•à¤¨à¥‡ à¤•à¥‡ à¤²à¤¿à¤
    note: { type: String, default: "" },
    collectedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: false },
  },
  { _id: true },
);

const feeSchema = new mongoose.Schema(
  {
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: "Student", required: true },
    academicSession: { type: String, required: true },
    class: { type: String, required: true },
    stream: { type: String, default: "" },
    feeStructureItemId: { type: mongoose.Schema.Types.ObjectId, default: null },
    feeName: { type: String, trim: true, default: "" },
    frequency: { type: String, enum: ["Monthly", "One-time"], default: "One-time" },
    feeType: { type: String, required: true, trim: true },
    month: { type: String, default: "" },
    totalAmount: { type: Number, required: true, min: [0, "Total amount negative nahi ho sakta"] },
    discount: { type: Number, default: 0, min: [0, "Discount negative nahi ho sakta"] },
    fine: { type: Number, default: 0, min: [0, "Fine negative nahi ho sakta"] },
    dueDate: { type: Date },
    payments: [paymentSchema],
    status: {
      type: String,
      enum: ["Paid", "Partial", "Due", "Overdue"],
      default: "Due",
    },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: false },
  },
  { timestamps: true },
);

// à¤°à¥€à¤¯à¤²-à¤Ÿà¤¾à¤‡à¤® à¤•à¥ˆà¤²à¤•à¥à¤²à¥‡à¤¶à¤¨ à¤•à¥‡ à¤²à¤¿à¤ à¤µà¤°à¥à¤šà¥à¤…à¤² à¤ªà¥à¤°à¥‰à¤ªà¤°à¥à¤Ÿà¥€à¤œ (à¤µà¤°à¥à¤šà¥à¤…à¤² à¤¸à¥‡ à¤à¤°à¤° à¤¨à¤¹à¥€à¤‚ à¤†à¤à¤—à¤¾)
feeSchema.virtual("payableAmount").get(function () {
  return Math.max(0, Number(this.totalAmount || 0) - Number(this.discount || 0) + Number(this.fine || 0));
});

feeSchema.virtual("paidAmount").get(function () {
  return (this.payments || []).reduce((sum, p) => sum + Number(p.amount || 0), 0);
});

feeSchema.virtual("balanceAmount").get(function () {
  return Math.max(0, this.payableAmount - this.paidAmount);
});

// UX Masterstroke: à¤°à¥€à¤¯à¤²-à¤Ÿà¤¾à¤‡à¤® à¤¸à¥à¤Ÿà¥‡à¤Ÿà¤¸ à¤œà¥‹ à¤¡à¥à¤¯à¥‚ à¤¡à¥‡à¤Ÿ à¤¨à¤¿à¤•à¤²à¤¤à¥‡ à¤¹à¥€ à¤‘à¤Ÿà¥‹à¤®à¥ˆà¤Ÿà¤¿à¤• 'Overdue' à¤¦à¤¿à¤–à¤¾à¤à¤—à¤¾
feeSchema.virtual("currentStatus").get(function () {
  const balance = this.balanceAmount;
  if (balance <= 0) return "Paid";
  if (this.paidAmount > 0) return "Partial";
  if (this.dueDate && new Date(this.dueDate) < new Date()) return "Overdue";
  return "Due";
});

feeSchema.set("toJSON", { virtuals: true });
feeSchema.set("toObject", { virtuals: true });

// âœ… à¤à¤°à¤° à¤•à¤¾ à¤ªà¤°à¤®à¤¾à¤¨à¥‡à¤‚à¤Ÿ à¤‡à¤²à¤¾à¤œ: 'next' à¤¹à¤Ÿà¤¾à¤•à¤° 'async' à¤²à¤—à¤¾à¤¯à¤¾ à¤”à¤° à¤¸à¥€à¤§à¥‡ à¤¸à¥à¤Ÿà¥‡à¤Ÿà¤¸ à¤¸à¤¿à¤‚à¤• à¤•à¤¿à¤¯à¤¾
feeSchema.pre("save", async function () {
  this.status = this.currentStatus;
});

// à¤«à¤¼à¤¾à¤¸à¥à¤Ÿ à¤¸à¤°à¥à¤š à¤‡à¤‚à¤¡à¥‡à¤•à¥à¤¸à¤¿à¤‚à¤—
feeSchema.index({ studentId: 1, academicSession: 1, feeType: 1, month: 1 });
feeSchema.index({ academicSession: 1, class: 1, status: 1 });
feeSchema.index({ studentId: 1, academicSession: 1, feeStructureItemId: 1 }, { unique: true, partialFilterExpression: { feeStructureItemId: { $type: "objectId" } } });
feeSchema.index({ studentId: 1, academicSession: 1, feeType: 1, month: 1 }, { unique: true, partialFilterExpression: { feeType: "Monthly" } });
// feeSchema.index({ "payments.receiptNo": 1 });

module.exports = mongoose.model("Fee", feeSchema);

