import { useMemo, useState } from "react";
import axios from "axios";
import { FiAlertCircle, FiArrowLeft, FiCheckCircle, FiFileText, FiPrinter, FiSearch, FiUser, FiUsers } from "react-icons/fi";
import { SCHOOL_CLASSES, STREAMS } from "../../academicConfig";
import ReportCardView from "./ReportView";
import "./ModernMarksheetTheme.css";

const sessionOptions = () => {
  const active = localStorage.getItem("activeSession") || "";
  const currentStart = new Date().getMonth() >= 3 ? new Date().getFullYear() : new Date().getFullYear() - 1;
  return [...new Set([active, ...Array.from({ length: 5 }, (_, index) => `${currentStart - 2 + index}-${currentStart - 1 + index}`)])]
    .filter(Boolean)
    .sort((first, second) => Number(first.split("-")[0]) - Number(second.split("-")[0]));
};

export default function ModernMarksheet() {
  const [filters, setFilters] = useState({ academicYear: localStorage.getItem("activeSession") || "", class: "", stream: "", examType: "Annual" });
  const [students, setStudents] = useState([]);
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState(null);

  const needsStream = ["11th", "12th"].includes(filters.class);
  const canSearch = filters.academicYear && filters.class && filters.examType && (!needsStream || filters.stream);
  const visibleStudents = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return students;
    return students.filter((student) => [student.name, student.fatherName, student.rollNo, student.admissionNo].some((value) => String(value || "").toLowerCase().includes(term)));
  }, [query, students]);

  const updateFilter = ({ target: { name, value } }) => {
    setFilters((current) => ({ ...current, [name]: value, ...(name === "class" && !["11th", "12th"].includes(value) ? { stream: "" } : {}) }));
    setStudents([]); setSelectedStudentId(""); setQuery(""); setNotice(null);
  };

  const loadStudents = async (event) => {
    event.preventDefault();
    if (!canSearch) { setNotice({ type: "error", text: "Please complete all required filters." }); return; }
    setLoading(true); setNotice(null); setSelectedStudentId("");
    try {
      const { data } = await axios.get("http://localhost:3000/view-marks-matrix", {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        params: { class: filters.class, academicYear: filters.academicYear, examType: filters.examType, ...(filters.stream ? { stream: filters.stream } : {}) },
      });
      if (!data.success) throw new Error(data.message || "Student records could not be loaded.");
      const rows = data.studentsMatrix || [];
      setStudents(rows);
      setNotice({ type: rows.length ? "success" : "error", text: rows.length ? `${rows.length} students are ready for report preview.` : "No student records found for these filters." });
    } catch (error) {
      setStudents([]);
      setNotice({ type: "error", text: error.response?.data?.message || error.message || "Unable to connect to the marks server." });
    } finally { setLoading(false); }
  };

  if (selectedStudentId) return <main className="marksheet-page report-mode"><div className="report-workspace-toolbar no-print"><button type="button" onClick={() => setSelectedStudentId("")}><FiArrowLeft /> Student list</button><div><span>REPORT PREVIEW</span><strong>{students.find((student) => String(student.studentId) === String(selectedStudentId))?.name}</strong></div><button type="button" className="toolbar-print" onClick={() => window.print()}><FiPrinter /> Print report</button></div><ReportCardView studentId={selectedStudentId} filters={filters} /></main>;

  return <main className="marksheet-page"><header className="marksheet-hero"><div className="hero-icon"><FiFileText /></div><div><span>EXAM & REPORTS</span><h1>Student Marksheet</h1><p>Choose an exam, find a student and open a print-ready report card.</p></div><div className="session-chip"><small>ACTIVE SESSION</small><strong>{filters.academicYear || "Not selected"}</strong></div></header><section className="marksheet-steps"><div className="active"><b>1</b><span>Choose filters</span></div><i></i><div className={students.length ? "active" : ""}><b>2</b><span>Select student</span></div><i></i><div><b>3</b><span>Preview & print</span></div></section><form className="marksheet-filter-card" onSubmit={loadStudents}><div className="filter-heading"><div><h2>Report criteria</h2><p>Required fields are marked with an asterisk.</p></div><FiSearch /></div><div className="marksheet-filter-grid"><Field label="Academic session" required><select name="academicYear" value={filters.academicYear} onChange={updateFilter}><option value="">Select session</option>{sessionOptions().map((session) => <option key={session}>{session}</option>)}</select></Field><Field label="Class" required><select name="class" value={filters.class} onChange={updateFilter}><option value="">Select class</option>{SCHOOL_CLASSES.map((item) => <option key={item}>{item}</option>)}</select></Field>{needsStream && <Field label="Stream" required><select name="stream" value={filters.stream} onChange={updateFilter}><option value="">Select stream</option>{STREAMS.map((item) => <option key={item} value={item.toLowerCase()}>{item}</option>)}</select></Field>}<Field label="Examination" required><select name="examType" value={filters.examType} onChange={updateFilter}><option value="Annual">Annual</option></select></Field></div><button className="load-students-btn" type="submit" disabled={loading || !canSearch}>{loading ? <><span className="button-spinner" /> Loading records...</> : <><FiUsers /> Find students</>}</button></form>{notice && <div className={`marksheet-notice ${notice.type}`}>{notice.type === "success" ? <FiCheckCircle /> : <FiAlertCircle />}<span>{notice.text}</span></div>}{students.length > 0 && <section className="student-results"><div className="results-toolbar"><div><span>STUDENT RECORDS</span><h2>{visibleStudents.length} of {students.length} students</h2></div><label><FiSearch /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search name, roll or admission no." /></label></div><div className="student-result-list">{visibleStudents.map((student, index) => <article key={student.studentId}><div className="student-avatar"><FiUser /></div><div className="student-primary"><strong>{student.name}</strong><span>{student.fatherName || "Father name not available"}</span></div><div className="student-meta"><span>Roll no.<strong>{student.rollNo || "—"}</strong></span><span>Admission no.<strong>{student.admissionNo || "—"}</strong></span></div><button type="button" onClick={() => setSelectedStudentId(student.studentId)}>Open report <FiFileText /></button><small>{String(index + 1).padStart(2, "0")}</small></article>)}</div>{!visibleStudents.length && <div className="student-empty"><FiSearch /><strong>No matching student</strong><span>Try a different name, roll number or admission number.</span></div>}</section>}</main>;
}

const Field = ({ label, required, children }) => <label className="marksheet-field"><span>{label}{required && <em>*</em>}</span>{children}</label>;
