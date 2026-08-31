import { getStudentId } from "../attendanceQr";

const aliases = {
  studentId: ["studentid", "id", "admissionno", "admissionnumber", "rollno", "rollnumber", "विद्यार्थीआईडी", "प्रवेशसंख्या"],
  name: ["name", "studentname", "student", "नाम", "छात्र", "विद्यार्थी"],
  className: ["class", "classname", "grade", "कक्षा", "क्लास", "श्रेणी"],
  fatherName: ["father", "fathername", "fname", "पिता"],
  dob: ["dob", "dateofbirth", "birthdate", "जन्मतिथि", "जन्मदिनांक", "जन्मदिन"],
  phone: ["phone", "mobile", "mobileno", "contact", "फोन", "मोबाइल", "संपर्क"],
  address: ["address", "studentaddress", "पता", "निवास"],
  photo: ["photo", "photourl", "image", "imageurl", "फोटो", "चित्र"],
};

const teacherAliases = {
  employeeId: ["employeeid", "empid", "id", "teacherid", "कर्मचारीआईडी", "शिक्षकआईडी"],
  name: ["name", "teachername", "teacher", "नाम", "शिक्षक", "कर्मचारी"],
  fatherName: ["fathername", "father", "fname", "पिता", "पिताकानाम"],
  dob: ["dob", "dateofbirth", "birthdate", "जन्मतिथि", "जन्मदिनांक", "जन्मदिन"],
  designation: ["designation", "designation", "post", "role", "पद", "पदवी"],
  phone: ["phone", "mobile", "mobileno", "contact", "mobileno", "फोन", "मोबाइल", "संपर्क"],
  address: ["address", "teacheraddress", "पता", "निवास"],
  photo: ["photo", "photourl", "image", "imageurl", "फोटो", "चित्र"],
};

const normaliseColumnName = (value) => String(value || "")
  .trim().toLowerCase().replace(/[\s_.\-()/:|,\u200B\u00A0]/g, "");

const findValue = (row, acceptedNames) => {
  const normalisedNames = acceptedNames.map(normaliseColumnName);
  const matchingColumn = Object.keys(row).find((column) => normalisedNames.includes(normaliseColumnName(column)));
  return matchingColumn ? String(row[matchingColumn] ?? "").trim() : "";
};

export const mapStudentRow = (row) => ({
  studentId: findValue(row, aliases.studentId), name: findValue(row, aliases.name),
  className: findValue(row, aliases.className), fatherName: findValue(row, aliases.fatherName),
  dob: findValue(row, aliases.dob),
  phone: findValue(row, aliases.phone), address: findValue(row, aliases.address),
  photo: findValue(row, aliases.photo),
});

export const mapTeacherRow = (row) => ({
  employeeId: findValue(row, teacherAliases.employeeId), name: findValue(row, teacherAliases.name),
  fatherName: findValue(row, teacherAliases.fatherName), dob: findValue(row, teacherAliases.dob),
  designation: findValue(row, teacherAliases.designation), phone: findValue(row, teacherAliases.phone),
  address: findValue(row, teacherAliases.address), photo: findValue(row, teacherAliases.photo),
});

export const ensureStudentIds = (students = []) => students.map((student, index) => ({
  ...student,
  studentId: getStudentId(student, index),
}));

export const ensureTeacherIds = (teachers = []) => teachers.map((teacher, index) => ({
  ...teacher,
  employeeId: teacher.employeeId || `EMP-${String(index + 1).padStart(4, '0')}`,
  studentId: teacher.employeeId || `EMP-${String(index + 1).padStart(4, '0')}`,
  entityType: "teacher",
}));
