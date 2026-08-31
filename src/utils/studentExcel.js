import XLSX from "xlsx-js-style";
import { saveExcelWorkbook } from "./excelSave";

export const ID_CARD_COLUMNS = [
  "Admission_No", "Name", "Father_Name", "DOB", "Gender",
  "Caste", "Class", "Stream", "Roll_No", "Phone", "Address",
  "Enrollment_No", "APAAR_ID", "PEN_No", "Aadhaar_No", "Admission_Date", "Photo_URL",
  "Academic_Session", "Mongo_ID",
];

const dateText = (value) => {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleDateString("en-GB");
};

export const studentToExcelRow = (student, academicSession = "") => ({
  Admission_No: student.admissionNo || "",
  Name: student.name || "",
  Father_Name: student.fatherName || "",
  DOB: dateText(student.dob),
  Gender: student.gender || "",
  Caste: student.cast || "",
  Class: student.class || "",
  Stream: student.stream || "",
  Roll_No: student.rollNo ?? "",
  Phone: student.phone || "",
  Address: student.address || "",
  Enrollment_No: student.EnrollmentNo || "",
  APAAR_ID: student.ApaarId || "",
  PEN_No: student.PenNo || "",
  Aadhaar_No: student.AadhaarNo || student.aadharNo || "",
  Admission_Date: dateText(student.admissionDate),
  Photo_URL: student.imageUrl || (student.profileImage ? `http://localhost:3000/uploads/${student.profileImage}` : ""),
  Academic_Session: academicSession || student.academicSession || "",
  Mongo_ID: student._id || "",
});

const styleWorksheet = (worksheet, rowCount) => {
  const headerStyle = {
    font: { bold: true, color: { rgb: "FFFFFF" }, sz: 11 },
    fill: { patternType: "solid", fgColor: { rgb: "4F46E5" } },
    alignment: { horizontal: "center", vertical: "center", wrapText: true },
    border: {
      top: { style: "thin", color: { rgb: "3730A3" } },
      bottom: { style: "thin", color: { rgb: "3730A3" } },
      left: { style: "thin", color: { rgb: "3730A3" } },
      right: { style: "thin", color: { rgb: "3730A3" } },
    },
  };
  ID_CARD_COLUMNS.forEach((_, index) => {
    const cell = worksheet[XLSX.utils.encode_cell({ r: 0, c: index })];
    if (cell) cell.s = headerStyle;
  });
  worksheet["!cols"] = ID_CARD_COLUMNS.map((name) => ({
    wch: Math.min(34, Math.max(13, name.length + 3)),
  }));
  worksheet["!cols"][1] = { wch: 24 };
  worksheet["!cols"][2] = { wch: 22 };
  worksheet["!cols"][11] = { wch: 32 };
  worksheet["!cols"][16] = { wch: 38 };
  worksheet["!rows"] = [{ hpt: 28 }];
  worksheet["!autofilter"] = { ref: `A1:${XLSX.utils.encode_col(ID_CARD_COLUMNS.length - 1)}${Math.max(1, rowCount + 1)}` };
  worksheet["!freeze"] = { xSplit: 0, ySplit: 1, topLeftCell: "A2", activePane: "bottomLeft", state: "frozen" };
};

export const downloadIdCardWorkbook = (students, academicSession, fileName = "id-card-students.xlsx") => {
  const rows = students.map((student) => studentToExcelRow(student, academicSession));
  const worksheet = XLSX.utils.json_to_sheet(rows, { header: ID_CARD_COLUMNS });
  styleWorksheet(worksheet, rows.length);

  const instructions = XLSX.utils.aoa_to_sheet([
    ["ID CARD EXCEL - IMPORTANT INSTRUCTIONS"],
    ["Admission_No ko blank ya change na karein; QR aur Mongo attendance isi se match hoti hai."],
    ["Name, Class, Father_Name, Phone, Address aur Photo_URL ko zarurat ke hisab se edit kar sakte hain."],
    ["File save karne ke baad ID Card Studio > Load Excel se isi workbook ko import karein."],
  ]);
  instructions["A1"].s = { font: { bold: true, color: { rgb: "FFFFFF" }, sz: 14 }, fill: { patternType: "solid", fgColor: { rgb: "059669" } } };
  instructions["!cols"] = [{ wch: 105 }];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Students");
  XLSX.utils.book_append_sheet(workbook, instructions, "Instructions");
  return saveExcelWorkbook(workbook, fileName, { cellStyles: true });
};

export const downloadStyledIdCardTemplate = (fileName) => downloadIdCardWorkbook([{
  admissionNo: "ADM-1001", name: "Aarav Kumar", fatherName: "Ramesh Kumar",
dob: "2010-08-15", gender: "Male", cast: "General",
  class: "10th", stream: "", rollNo: 1, phone: "9876543210", address: "Delhi",
  EnrollmentNo: "ENR-1001", ApaarId: "", PenNo: "", AadhaarNo: "123412341234", admissionDate: "2026-04-01",
  imageUrl: "https://example.com/student-photo.jpg",
}], "2026-2027", fileName);

export const TEACHER_ID_CARD_COLUMNS = [
  "Employee_ID", "Name", "Father_Name", "DOB", "Designation", "Mobile_No",
  "Address", "Photo_URL", "Mongo_ID",
];

export const teacherToExcelRow = (teacher) => ({
  Employee_ID: teacher.employeeId || "",
  Name: teacher.name || "",
  Father_Name: teacher.fatherName || "",
  DOB: dateText(teacher.dateOfBirth || teacher.dob),
  Designation: teacher.designation || "",
  Mobile_No: teacher.phone || "",
  Address: teacher.address || "",
  Photo_URL: teacher.image ? `http://localhost:3000/uploads/${teacher.image}` : "",
  Mongo_ID: teacher._id || "",
});

const styleTeacherWorksheet = (worksheet, rowCount) => {
  const headerStyle = {
    font: { bold: true, color: { rgb: "FFFFFF" }, sz: 11 },
    fill: { patternType: "solid", fgColor: { rgb: "059669" } },
    alignment: { horizontal: "center", vertical: "center", wrapText: true },
    border: {
      top: { style: "thin", color: { rgb: "065F46" } },
      bottom: { style: "thin", color: { rgb: "065F46" } },
      left: { style: "thin", color: { rgb: "065F46" } },
      right: { style: "thin", color: { rgb: "065F46" } },
    },
  };
  TEACHER_ID_CARD_COLUMNS.forEach((_, index) => {
    const cell = worksheet[XLSX.utils.encode_cell({ r: 0, c: index })];
    if (cell) cell.s = headerStyle;
  });
  worksheet["!cols"] = TEACHER_ID_CARD_COLUMNS.map((name) => ({
    wch: Math.min(34, Math.max(13, name.length + 3)),
  }));
  worksheet["!cols"][1] = { wch: 24 };
  worksheet["!cols"][2] = { wch: 22 };
  worksheet["!cols"][5] = { wch: 18 };
  worksheet["!cols"][6] = { wch: 32 };
  worksheet["!rows"] = [{ hpt: 28 }];
  worksheet["!autofilter"] = { ref: `A1:${XLSX.utils.encode_col(TEACHER_ID_CARD_COLUMNS.length - 1)}${Math.max(1, rowCount + 1)}` };
  worksheet["!freeze"] = { xSplit: 0, ySplit: 1, topLeftCell: "A2", activePane: "bottomLeft", state: "frozen" };
};

export const downloadTeacherIdCardWorkbook = (teachers, fileName = "teacher-id-cards.xlsx") => {
  const rows = teachers.map((teacher) => teacherToExcelRow(teacher));
  const worksheet = XLSX.utils.json_to_sheet(rows, { header: TEACHER_ID_CARD_COLUMNS });
  styleTeacherWorksheet(worksheet, rows.length);

  const instructions = XLSX.utils.aoa_to_sheet([
    ["TEACHER ID CARD EXCEL - IMPORTANT INSTRUCTIONS"],
    ["Employee_ID ko blank ya change na karein; Barcode aur attendance isi se match hoti hai."],
    ["Name, Father_Name, DOB, Designation, Mobile_No, Address aur Photo_URL ko zarurat ke hisab se edit kar sakte hain."],
    ["File save karne ke baad ID Card Studio > Load Teacher Excel se isi workbook ko import karein."],
  ]);
  instructions["A1"].s = { font: { bold: true, color: { rgb: "FFFFFF" }, sz: 14 }, fill: { patternType: "solid", fgColor: { rgb: "059669" } } };
  instructions["!cols"] = [{ wch: 105 }];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Teachers");
  XLSX.utils.book_append_sheet(workbook, instructions, "Instructions");
  return saveExcelWorkbook(workbook, fileName, { cellStyles: true });
};

export const downloadStyledTeacherIdCardTemplate = (fileName) => downloadTeacherIdCardWorkbook([{
  employeeId: "EMP-1001", name: "Rajesh Sharma", fatherName: "Ramesh Sharma",
  dob: "1985-03-15", designation: "Mathematics Teacher", phone: "9876543210",
  address: "Delhi", image: "https://example.com/teacher-photo.jpg",
}], fileName);

