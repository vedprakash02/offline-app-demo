const mongoose = require("mongoose");

const SchoolProfileSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true, // Ek user sirf ek hi school profile bana sakta hai
    },
    schoolName: { type: String, required: true },
    schoolCode: { type: String },
    sansthacode: { type: String },
    address: { type: String, required: true },
    block: {type: String},
    dist: {type: String},
    phone: { type: String, required: true },
    
    // Image ka filename save karne ke liye field
    schoolImage: { 
      type: String, 
      default: "" // Agar koi image upload nahi karega toh khali string rahegi
    },

    // 💡 NAYA BADLAV: Signature ka filename save karne ke liye field add ki
    schoolSignature: {
      type: String,
      default: "" // Agar koi signature upload nahi karega toh khali string rahegi
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("SchoolProfile", SchoolProfileSchema);
