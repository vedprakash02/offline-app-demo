import React, { useRef, useState } from "react";
import axios from "axios";
import * as XLSX from "xlsx-js-style";
import { FiBarChart2, FiDownload, FiSearch, FiUploadCloud, FiUsers } from "react-icons/fi";
import { EXAMS, SCHOOL_CLASSES, STREAMS } from "../../academicConfig";
import { saveExcelWorkbook } from "../../utils/excelSave";
import "./ModernMarkEntry.css";

const UNITS = ["Unit Test 1", "Unit Test 2", "Unit Test 3"];
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const headers = () => ({ Authorization: `Bearer ${localStorage.getItem("token")}` });

export default function ExamRecords() {
  const [filters, setFilters] = useState({ academicYear: localStorage.getItem("activeSession") || "", class: "", stream: "", examType: "Quarterly", unit: "Unit Test 1", month: MONTHS[new Date().getMonth()] });
  const [data, setData] = useState({ subjects: [], rows: [], subjectMeta: {} }), [message, setMessage] = useState(""), [loading, setLoading] = useState(false), [uploading, setUploading] = useState(false);
  const uploadRef = useRef(null);
  const change = (e) => setFilters((old) => ({ ...old, [e.target.name]: e.target.value, ...(e.target.name === "class" ? { stream: "" } : {}) }));
  const load = async () => {
    if (!filters.class || (["11th", "12th"].includes(filters.class) && !filters.stream)) return setMessage("Class aur 11th/12th ke liye stream select karein.");
    setLoading(true); setMessage("");
    try {
      if (filters.examType === "Unit Test") {
        const res = await axios.get("http://localhost:3000/unit-test-summary", { headers: headers(), params: { class: filters.class, stream: filters.stream, academicYear: filters.academicYear, unit: filters.unit, month: filters.month } });
        setData({ subjects: res.data.subjects || [], rows: res.data.rows || [], subjectMeta: {} });
      } else {
        const res = await axios.get("http://localhost:3000/view-marks-matrix", { headers: headers(), params: { class: filters.class, stream: filters.stream, academicYear: filters.academicYear, examType: filters.examType } });
        const rows = (res.data.studentsMatrix || []).map((row) => ({ ...row, marks: Object.fromEntries((res.data.subjects || []).map((subject) => { const mark = row.marks?.[subject]; return [subject, mark ? Number(mark.theoryMarks || 0) + Number(mark.practicalEnabled ? mark.practicalMarks || 0 : 0) : ""]; })) }));
        setData({ subjects: res.data.subjects || [], rows, subjectMeta: res.data.subjectMeta || {} });
      }
    } catch (error) { setData({ subjects: [], rows: [], subjectMeta: {} }); setMessage(error.response?.data?.message || "Exam report load nahi hua."); }
    finally { setLoading(false); }
  };
  const exportExcel = async () => {
    if (!data.rows.length) return setMessage("Pehle report load karein.");
    const sheet = XLSX.utils.json_to_sheet(data.rows.map((row, index) => ({ "S.No.": index + 1, "Student ID": String(row.studentId), Roll: row.rollNo || "", Admission: row.admissionNo || "", Student: row.name, ...Object.fromEntries(data.subjects.map((subject) => [subject, row.marks?.[subject] ?? ""])) })));
    const book = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(book, sheet, "Exam Records");
    const type = filters.examType === "Unit Test" ? `${filters.unit}-${filters.month}` : filters.examType;
    const result = await saveExcelWorkbook(book, `${filters.class}-${type}-records.xlsx`);
    if (result?.cancelled) setMessage("Excel save cancel kiya gaya."); else setMessage("Excel file save ho gayi. Isi file ko edit karke upload bhi kar sakte hain.");
  };
  const importExcel = async (event) => {
    const file = event.target.files?.[0]; if (!file) return;
    if (!data.rows.length) { setMessage("Pehle same class ka report load karein."); event.target.value = ""; return; }
    setUploading(true); setMessage("");
    try {
      const workbook = XLSX.read(await file.arrayBuffer(), { type: "array" });
      const [head, ...lines] = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], { header: 1, defval: "" });
      const index = Object.fromEntries(head.map((value, i) => [String(value).trim(), i]));
      if (index["Student ID"] === undefined) throw new Error("Excel mein 'Student ID' column hona zaroori hai. Export wali file use karein.");
      const incoming = new Map(lines.filter((line) => line[index["Student ID"]]).map((line) => [String(line[index["Student ID"]]), line]));
      const subjects = data.subjects.filter((subject) => index[subject] !== undefined);
      if (!subjects.length) throw new Error("Excel mein subject columns nahi mile.");
      for (const subject of subjects) {
        const students = data.rows.map((row) => { const line = incoming.get(String(row.studentId)); const raw = line ? line[index[subject]] : row.marks?.[subject]; const value = raw === "" || raw === undefined ? 0 : Number(raw); if (!Number.isFinite(value) || value < 0) throw new Error(`${subject} ke marks valid nahi hain.`); return { studentId: row.studentId, marks: value, theoryMarks: value, practicalMarks: 0 }; });
        if (filters.examType === "Unit Test") await axios.post("http://localhost:3000/unit-test-marks", { class: filters.class, stream: filters.stream, academicYear: filters.academicYear, unit: filters.unit, month: filters.month, subjectName: subject, maxMarks: 20, students: students.map(({ studentId, marks }) => ({ studentId, marks })) }, { headers: headers() });
        else { const meta = data.subjectMeta[subject] || {}; await axios.post("http://localhost:3000/save-bulk-marks", { class: filters.class, stream: filters.stream, academicYear: filters.academicYear, examType: filters.examType, subjectName: subject, theoryMaxMarks: Number(meta.theoryMaxMarks || 75), practicalMaxMarks: 0, practicalEnabled: false, students }, { headers: headers() }); }
      }
      setMessage("Excel marks upload ho gaye."); await load();
    } catch (error) { setMessage(error.response?.data?.message || error.message || "Excel upload nahi hua."); }
    finally { setUploading(false); event.target.value = ""; }
  };
  return <main className="me-page"><header className="me-header"><div className="me-icon"><FiBarChart2 /></div><div><span>EXAM RECORDS</span><h2>Subject-wise Exam Report</h2><p>Har student ka subject-wise marks record, Excel export aur upload.</p></div></header>{message && <div className="me-alert error">{message}</div>}
  <section className="me-toolbar"><label><span>Class</span><select name="class" value={filters.class} onChange={change}><option value="">Select class</option>{SCHOOL_CLASSES.map((item) => <option key={item}>{item}</option>)}</select></label><label><span>Stream</span><select name="stream" value={filters.stream} onChange={change} disabled={!['11th','12th'].includes(filters.class)}><option value="">Select stream</option>{STREAMS.map((item) => <option key={item}>{item}</option>)}</select></label><label><span>Exam</span><select name="examType" value={filters.examType} onChange={change}>{EXAMS.map((item) => <option key={item}>{item}</option>)}<option>Unit Test</option></select></label>{filters.examType === "Unit Test" && <><label><span>Unit</span><select name="unit" value={filters.unit} onChange={change}>{UNITS.map((item) => <option key={item}>{item}</option>)}</select></label><label><span>Month</span><select name="month" value={filters.month} onChange={change}>{MONTHS.map((item) => <option key={item}>{item}</option>)}</select></label></>}<button type="button" onClick={load} disabled={loading}><FiSearch />{loading ? "Loading..." : "View records"}</button></section>
  <section className="me-register"><div className="me-register-bar"><div><strong>{filters.examType === "Unit Test" ? `${filters.unit} · ${filters.month}` : filters.examType}</strong><span>{data.rows.length} students · {data.subjects.length} subjects</span></div><div className="me-excel-actions"><input ref={uploadRef} type="file" accept=".xlsx,.xls" hidden onChange={importExcel} /><button className="me-excel-export" type="button" onClick={exportExcel}><FiDownload /><span>Export Excel</span></button><button className="me-excel-upload" type="button" onClick={() => uploadRef.current?.click()} disabled={uploading}><FiUploadCloud /><span>{uploading ? "Uploading..." : "Upload Excel"}</span></button></div></div><div className="me-table-wrap">{data.rows.length ? <table><thead><tr><th>#</th><th>Roll</th><th>Student</th>{data.subjects.map((subject) => <th key={subject}>{subject}</th>)}<th>Total</th></tr></thead><tbody>{data.rows.map((row, i) => { const total = data.subjects.reduce((sum, subject) => sum + Number(row.marks?.[subject] || 0), 0); return <tr key={row.studentId}><td>{i + 1}</td><td>{row.rollNo || "—"}</td><td className="me-name">{row.name}</td>{data.subjects.map((subject) => <td key={subject}>{row.marks?.[subject] === "" ? "—" : row.marks?.[subject] ?? "—"}</td>)}<td><strong>{total}</strong></td></tr>; })}</tbody></table> : <div className="me-empty"><FiUsers /><strong>Filters choose karke subject-wise records dekhein</strong></div>}</div></section></main>;
}
