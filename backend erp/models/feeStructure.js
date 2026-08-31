const mongoose = require("mongoose");

const feeItemSchema = new mongoose.Schema({
  feeType: { type: String, required: true, trim: true },
  amount: { type: Number, required: true, min: 1 },
  frequency: { type: String, enum: ["Monthly", "One-time"], default: "One-time" },
  months: { type: Number, min: 1, max: 12, default: 1 },
}, { _id: true });

const feeStructureSchema = new mongoose.Schema({
  academicSession: { type: String, required: true },
  class: { type: String, required: true },
  stream: { type: String, default: "" },
  items: { type: [feeItemSchema], default: [] },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
}, { timestamps: true });

feeStructureSchema.index({ academicSession: 1, class: 1, stream: 1 }, { unique: true });
module.exports = mongoose.model("FeeStructure", feeStructureSchema);
