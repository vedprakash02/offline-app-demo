const express = require("express");
const router = express.Router();

router.use("/", require("./login_signup_route.js"));
router.use("/", require("./license.js"));
router.use("/", require("./admission.js"));
router.use("/", require("./dashboard.js"));
router.use("/", require("./school-profile.js"));
router.use("/", require("./id-card.js"));
router.use("/", require("./marks.js"));
router.use("/", require("./unit-tests.js"));
router.use("/", require("./attendance.js"));
router.use("/", require("./rollno.js"));
router.use("/", require("./enrollment.js"));
router.use("/", require("./master-data.js"));
router.use("/", require("./promotion.js"));
router.use("/", require("./fees.js"));
router.use("/", require("./academic.js"));
router.use("/", require("./teachers.js"));
router.use("/", require("./teacher-attendance.js"));
router.use("/", require("./administration.js"));

module.exports = router;





