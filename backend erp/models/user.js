const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const userschema = new Schema({
  username: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/, "कृपया सही ईमेल दर्ज करें"],
  },
  password: {
    type: String,
    required: true,
  },

  active: { type: Boolean, default: true },
  permissions: [{ type: String, trim: true }],

  role: {
    type: String,
    enum: ["admin", "principal", "teacher", "accountant", "operator", "student"],
    default: "student",
     required: [true, "Role select karna compulsory hai."]
  },
});

module.exports = mongoose.model("User", userschema);
