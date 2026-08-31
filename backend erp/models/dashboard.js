// models/Dashboard.js (Sankhya track karne ke liye)
const mongoose = require('mongoose');
const DashboardSchema = new mongoose.Schema({
  totalStudents: { type: Number, default: 0 }
});
module.exports = mongoose.model('Dashboard', DashboardSchema);