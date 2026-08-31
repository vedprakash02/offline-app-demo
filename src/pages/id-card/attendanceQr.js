export const ATTENDANCE_QR_PREFIX = "SIRF-ID:";

export const normalizeStudentId = (value) => String(value || "")
  .trim()
  .toUpperCase()
  .replace(/[\sâ€“â€”_]+/g, "-");

export const getStudentId = (student = {}, index = 0) => {
  const supplied = student.studentId || student.admissionNo || student.rollNo;
  if (supplied) return normalizeStudentId(supplied);
  const identity = [student.name, student.className, student.dob, index + 1]
    .map((value) => String(value || "").trim().toLowerCase())
    .join("|");
  let hash = 0;
  for (let i = 0; i < identity.length; i += 1) hash = ((hash << 5) - hash + identity.charCodeAt(i)) | 0;
  return `STD-${Math.abs(hash).toString(36).toUpperCase()}`;
};

export const makeAttendanceQrValue = (student) => student.entityType === "teacher"
  ? `SIRF-TEACHER:${normalizeStudentId(student.employeeId || student.studentId)}`
  : `${ATTENDANCE_QR_PREFIX}${getStudentId(student)}`;

export const readStudentIdFromQr = (value) => {
  const text = String(value || "").trim();
  return text.toUpperCase().startsWith(ATTENDANCE_QR_PREFIX)
    ? normalizeStudentId(text.slice(ATTENDANCE_QR_PREFIX.length))
    : "";
};

