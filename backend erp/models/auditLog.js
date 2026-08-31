const mongoose = require("mongoose");
const AuditLogSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  username: { type: String, default: "" }, role: { type: String, default: "" },
  action: { type: String, required: true }, method: { type: String, required: true }, path: { type: String, required: true },
  statusCode: { type: Number, required: true }, ip: { type: String, default: "" }, details: { type: mongoose.Schema.Types.Mixed, default: {} },
}, { timestamps: true });
AuditLogSchema.index({ createdAt: -1 }); AuditLogSchema.index({ userId: 1, createdAt: -1 });
module.exports = mongoose.model("AuditLog", AuditLogSchema);