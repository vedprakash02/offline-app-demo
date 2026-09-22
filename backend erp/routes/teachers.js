const mongoose = require("mongoose");
const { express, auth, uploadImage } = require("../config/dependenci.js");
const Teacher = require("../models/teacher.js");
const Counter = require("../models/counter.js");
const router = express.Router();
const allowed = (user) => ["admin", "principal", "accountant"].includes(user?.role) || user?.permissions?.includes("teachers.manage");
const guard = (req, res, next) => allowed(req.user) ? next() : res.status(403).json({ message: "Teacher aur salary records ki permission nahi hai." });
const receiptNo = () => `SAL-${new Date().toISOString().slice(2, 10).replace(/-/g, "")}-${Math.floor(1000 + Math.random() * 9000)}`;
const nextEmployeeId = async () => { for (let attempt = 0; attempt < 100; attempt += 1) { const counter = await Counter.findOneAndUpdate({ key: "teacherEmployeeId" }, { $inc: { value: 1 } }, { new: true, upsert: true, setDefaultsOnInsert: false }); const employeeId = `TCH-${String(counter.value).padStart(4, "0")}`; if (!(await Teacher.exists({ employeeId }))) return employeeId; } throw new Error("Employee ID generate nahi ho payi."); };

router.get("/teachers", auth, guard, async (req, res) => {
  try {
    const search = req.query.search?.trim();
    const filter = search ? { $or: ["name", "employeeId", "phone", "designation"].map((key) => ({ [key]: { $regex: search, $options: "i" } })) } : {};
    if (req.query.status) filter.status = req.query.status;
    const teachers = await Teacher.find(filter).sort({ status: 1, name: 1 }).lean();
    res.json({ teachers, summary: { total: teachers.length, active: teachers.filter((t) => t.status === "Active").length, monthlyPayroll: teachers.filter((t) => t.status === "Active").reduce((s, t) => s + Number(t.monthlySalary || 0), 0), paid: teachers.reduce((s, t) => s + t.payments.reduce((p, x) => p + Number(x.amount || 0), 0), 0) } });
  } catch (error) { res.status(500).json({ message: error.message }); }
});
router.get("/teachers-qr-roster", auth, async (req, res) => { try { if (!["admin", "principal", "accountant", "teacher"].includes(req.user.role)) return res.status(403).json({ message: "QR roster permission nahi hai." }); const teachers = await Teacher.find({ status: "Active" }).select("employeeId name designation image -_id").sort({ name: 1 }).lean(); res.json({ teachers }); } catch (error) { res.status(500).json({ message: error.message }); } });
router.get("/teachers/:id", auth, guard, async (req, res) => { try { const teacher = await Teacher.findById(req.params.id).lean(); if (!teacher) return res.status(404).json({ message: "Teacher nahi mila." }); res.json({ teacher }); } catch (error) { res.status(400).json({ message: error.message }); } });
router.post("/teachers", auth, guard, uploadImage.single("image"), async (req, res) => {
  try { const employeeId = await nextEmployeeId(); const teacher = await Teacher.create({ ...req.body, employeeId, image: req.file?.filename || "", subjects: JSON.parse(req.body.subjects || "[]"), classes: JSON.parse(req.body.classes || "[]"), createdBy: req.user.id }); res.status(201).json({ message: "Teacher profile save ho gaya.", teacher }); }
  catch (error) { res.status(400).json({ message: error.code === 11000 ? "Employee ID pehle se maujood hai." : error.message }); }
});
router.put("/teachers/:id", auth, guard, uploadImage.single("image"), async (req, res) => {
  try { const { payments, createdBy, ...updates } = req.body; updates.subjects = JSON.parse(req.body.subjects || "[]"); updates.classes = JSON.parse(req.body.classes || "[]"); if (req.file) updates.image = req.file.filename; const teacher = await Teacher.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true }); if (!teacher) return res.status(404).json({ message: "Teacher nahi mila." }); res.json({ message: "Teacher profile update ho gaya.", teacher }); }
  catch (error) { res.status(400).json({ message: error.code === 11000 ? "Employee ID pehle se maujood hai." : error.message }); }
});
router.put("/teachers/:id/salary-structure", auth, guard, async (req, res) => {
  try {
    const fields = ["basicSalary", "hra", "da", "ta", "otherAllowance", "pf", "esi", "professionalTax", "tds"];
    const structure = Object.fromEntries(fields.map((field) => [field, Number(req.body[field] || 0)]));
    if (Object.values(structure).some((value) => !Number.isFinite(value) || value < 0)) return res.status(400).json({ message: "Salary structure me valid positive amount required hai." });
    const grossAmount = structure.basicSalary + structure.hra + structure.da + structure.ta + structure.otherAllowance;
    const deductionAmount = structure.pf + structure.esi + structure.professionalTax + structure.tds;
    const teacher = await Teacher.findByIdAndUpdate(req.params.id, { salaryStructure: structure, monthlySalary: Math.max(0, grossAmount - deductionAmount) }, { new: true, runValidators: true });
    if (!teacher) return res.status(404).json({ message: "Teacher nahi mila." });
    res.json({ message: "Salary structure save ho gaya.", teacher });
  } catch (error) { res.status(400).json({ message: error.message }); }
});
router.delete("/teachers/:id", auth, guard, async (req, res) => {
  try {
    const teacher = await Teacher.findByIdAndUpdate(req.params.id, { $set: { status: "Inactive", leftAt: req.body.leftAt || new Date(), exitReason: String(req.body.exitReason || "School left").trim() } }, { new: true, runValidators: true });
    if (!teacher) return res.status(404).json({ message: "Teacher nahi mila." });
    res.json({ message: "Teacher inactive mark ho gaya. Profile, attendance aur payment history safe hai.", teacher });
  } catch (error) { res.status(400).json({ message: error.message }); }
});
router.patch("/teachers/:id/reactivate", auth, guard, async (req, res) => {
  try { const teacher = await Teacher.findByIdAndUpdate(req.params.id, { $set: { status: "Active", leftAt: null, exitReason: "" } }, { new: true }); if (!teacher) return res.status(404).json({ message: "Teacher nahi mila." }); res.json({ message: "Teacher dobara active ho gaya.", teacher }); }
  catch (error) { res.status(400).json({ message: error.message }); }
});

router.post("/teachers/:id/payments", auth, guard, async (req, res) => {
  try {
    const amount = Number(req.body.amount); if (!amount || amount < 1 || !/^\d{4}-\d{2}$/.test(req.body.month || "")) return res.status(400).json({ message: "Valid amount aur salary month required hai." });
    const teacher = await Teacher.findById(req.params.id); if (!teacher) return res.status(404).json({ message: "Teacher nahi mila." });
    if (teacher.payments.some((p) => p.month === req.body.month)) return res.status(400).json({ message: "Is month ki salary payment pehle hi darj hai." });
    const structure = teacher.salaryStructure || {}; const grossAmount = Number(structure.basicSalary || 0) + Number(structure.hra || 0) + Number(structure.da || 0) + Number(structure.ta || 0) + Number(structure.otherAllowance || 0) || Number(teacher.monthlySalary || 0); const deductionAmount = Number(structure.pf || 0) + Number(structure.esi || 0) + Number(structure.professionalTax || 0) + Number(structure.tds || 0);
    teacher.payments.push({ amount, grossAmount, deductionAmount, month: req.body.month, mode: req.body.mode, date: req.body.date || new Date(), note: req.body.note, receiptNo: receiptNo(), paidBy: req.user.id }); await teacher.save();
    res.status(201).json({ message: "Salary payment successfully save ho gayi.", teacher, payment: teacher.payments.at(-1) });
  } catch (error) { res.status(400).json({ message: error.message }); }
});
router.delete("/teachers/:teacherId/payments/:paymentId", auth, guard, async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.paymentId)) return res.status(400).json({ message: "Invalid payment." }); const teacher = await Teacher.findById(req.params.teacherId); if (!teacher) return res.status(404).json({ message: "Teacher nahi mila." }); teacher.payments.pull(req.params.paymentId); await teacher.save(); res.json({ message: "Salary payment delete ho gayi." });
});
module.exports = router;

