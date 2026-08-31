
const fs = require('fs');
const path = require("path"); 
const express = require("express");
const jwt = require("jsonwebtoken");
const bcrypt = require('bcryptjs');
// 👈 ये लाइन यहाँ गायब थी, इसे अब जोड़ दिया है!

// 2. डेटाबेस कनेक्शन (Database Config)
const Database = require("./database.js"); 

// 3. मल्टार और क्लाउडिनरी कॉन्फ़िगरेशन (Multer & Cloudinary)
const multer = require("multer");

// Ek common storage dono files ke liye
const commonStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Sahi absolute path banayein
    const uploadPath = process.env.UPLOADS_DIR || path.join(process.cwd(), "uploads"); // 👈 अब ये 'path' एरर नहीं देगा
    
    // Agar folder nahi bana hai, toh khud se bana dega
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    
    cb(null, uploadPath); 
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname);
  },
});
const upload = multer({ storage: commonStorage });

// Alag-alag middleware bana lein taaki route me use kar sakein
const uploadExcel = multer({ storage: commonStorage });
const uploadImage = multer({
  storage: commonStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (["image/jpeg", "image/png", "image/webp"].includes(file.mimetype)) return cb(null, true);
    cb(new multer.MulterError("LIMIT_UNEXPECTED_FILE", file.fieldname));
  },
}); 

// 4. आपके सभी मॉडल्स (All Models)
const User = require("../models/user.js");
const Student = require("../models/student.js");
const Dashboard = require("../models/dashboard.js");
const SchoolProfile = require("../models/schoolprofile.js");
const Marks = require("../models/mark.js");
const Attendance = require("../models/attendence");
const AllowedUser = require("../models/alloweduser.js");
const Fee = require("../models/fee.js");
const FeeStructure = require("../models/feeStructure.js");
const Teacher = require("../models/teacher.js");
const TeacherAttendance = require("../models/teacherAttendance.js");

// 5. आपका ऑथराइजेशन मिडलवेयर (Middleware)
const auth = require("../authorigetion/auth.js");
const xlsx = require("xlsx"); 

// इन सभी चीज़ों को एक साथ सिंगल ऑब्जेक्ट में बाहर भेजें (Export)
// 💡 इन सभी चीज़ों को एक साथ सिंगल ऑब्जेक्ट में बाहर भेजें (Export)
module.exports = {
  express,
  jwt,
  bcrypt,
  Database,
  uploadExcel,
  uploadImage,
  multer,
  User,
  Student,
  Dashboard,
  SchoolProfile,
  Marks,
  Attendance,
  AllowedUser,
  Fee,
  FeeStructure,
  Teacher,
  TeacherAttendance,
  xlsx,
  auth,
};
