const SESSION_PATTERN = /^\d{4}-\d{4}$/;
const isValidAcademicSession = (value) => {
  if (!SESSION_PATTERN.test(value || "")) return false;
  const [start, end] = value.split("-").map(Number);
  return end === start + 1;
};
const sessionStudentQuery = (academicSession, extra = {}) => ({ ...extra, $or: [{ academicSession }, { academicHistory: { $elemMatch: { academicSession } } }] });
const studentForSession = (student, academicSession) => {
  const item = typeof student.toObject === "function" ? student.toObject() : { ...student };
  if (item.academicSession === academicSession) return item;
  const history = item.academicHistory?.find((entry) => entry.academicSession === academicSession);
  return history ? { ...item, class: history.class, stream: history.stream || "", rollNo: history.rollNo ?? null, academicSession } : item;
};
module.exports = { isValidAcademicSession, sessionStudentQuery, studentForSession };
