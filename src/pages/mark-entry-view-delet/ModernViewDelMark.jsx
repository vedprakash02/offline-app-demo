import React, { useState } from "react";
import axios from "axios";
import { FiAlertCircle, FiCheckCircle, FiEdit2, FiGrid, FiSave, FiSearch, FiTrash2, FiX } from "react-icons/fi";
import "./ModernViewDelMark.css";
import { EXAMS, SCHOOL_CLASSES, STREAMS } from "../../academicConfig";

const subjectOrder = ["Hindi", "English", "Maths", "Science", "Social Science", "Sanskrit", "Physics", "Chemistry", "Mathematics", "Biology", "Accountancy", "Business Studies", "Economics", "History", "Geography", "Political Science"];

export default function ModernViewDelMark() {
  const activeSession = localStorage.getItem("activeSession") || "";
  const [filters, setFilters] = useState({ academicYear: activeSession, class: "", stream: "", examType: "" });
  const [subjects, setSubjects] = useState([]);
  const [students, setStudents] = useState([]);
  const [subjectMeta, setSubjectMeta] = useState({});
  const [editingId, setEditingId] = useState(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(null);

  const changeFilter = ({ target: { name, value } }) => {
    setFilters((current) => ({ ...current, [name]: value, ...(name === "class" ? { stream: "" } : {}) }));
    setStudents([]); setSubjects([]); setSubjectMeta({}); setEditingId(null); setStatus(null);
  };

  const loadMatrix = async () => {
    if (!filters.class || !filters.examType || (["11th", "12th"].includes(filters.class) && !filters.stream)) return setStatus({ type: "error", text: "Saare required filters select karein." });
    setLoading(true); setStatus(null); setEditingId(null);
    try {
      const response = await axios.get("http://localhost:3000/view-marks-matrix", { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }, params: { class: filters.class, academicYear: filters.academicYear, examType: filters.examType, ...(filters.stream ? { stream: filters.stream } : {}) } });
      const ordered = [...(response.data.subjects || [])].sort((a,b) => (subjectOrder.indexOf(a) < 0 ? 999 : subjectOrder.indexOf(a)) - (subjectOrder.indexOf(b) < 0 ? 999 : subjectOrder.indexOf(b)));
      setSubjects(ordered); setSubjectMeta(response.data.subjectMeta || {}); setStudents(response.data.studentsMatrix || []);
      if (!(response.data.studentsMatrix || []).length) setStatus({ type: "error", text: "Is selection mein koi student record nahi mila." });
    } catch (error) { setStudents([]); setSubjects([]); setStatus({ type: "error", text: error.response?.data?.message || "Marks matrix load nahi hui." }); }
    finally { setLoading(false); }
  };

  const changeMark = (studentId, subject, field, rawValue) => {
    const max = field === "theoryMarks" ? 75 : 30;
    const value = rawValue === "" ? "" : Math.min(max, Math.max(0, Number(rawValue)));
    setStudents((current) => current.map((student) => student.studentId === studentId ? { ...student, marks: { ...student.marks, [subject]: { ...(student.marks?.[subject] || {}), [field]: value } } } : student));
  };

  const saveRow = async (student) => {
    setLoading(true); setStatus(null);
    try {
      const headers = { Authorization: `Bearer ${localStorage.getItem("token")}` };
      await Promise.all(subjects.map((subject) => {
        const mark = student.marks?.[subject] || {};
        return axios.post("http://localhost:3000/save-bulk-marks", { class: filters.class, stream: filters.stream, subjectName: subject, examType: filters.examType, academicYear: filters.academicYear, practicalEnabled: Boolean(subjectMeta[subject]?.practicalEnabled), students: [{ studentId: student.studentId, theoryMarks: Number(mark.theoryMarks || 0), practicalMarks: Number(mark.practicalMarks || 0) }] }, { headers });
      }));
      setEditingId(null); setStatus({ type: "success", text: `${student.name} ke marks update ho gaye.` });
      await loadMatrix();
    } catch (error) { setStatus({ type: "error", text: error.response?.data?.message || "Row update nahi ho payi." }); }
    finally { setLoading(false); }
  };

  const deleteRow = async (student) => {
    if (!window.confirm(`${student.name} ke ${filters.examType} exam ke sabhi subject marks delete karne hain?`)) return;
    setLoading(true); setStatus(null);
    try {
      const response = await axios.delete(`http://localhost:3000/delete-student-marks/${student.studentId}`, { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }, params: { class: filters.class, academicYear: filters.academicYear, examType: filters.examType } });
      setStatus({ type: "success", text: response.data.message || "Marks delete ho gaye." });
      await loadMatrix();
    } catch (error) { setStatus({ type: "error", text: error.response?.data?.message || "Marks delete nahi ho paye." }); }
    finally { setLoading(false); }
  };

  const visibleStudents = students.filter((student) => student.name?.toLowerCase().includes(search.trim().toLowerCase()) || String(student.admissionNo || "").toLowerCase().includes(search.trim().toLowerCase()));

  return <main className="vm-page">
    <header className="vm-header"><div className="vm-icon"><FiGrid /></div><div><span>EXAM CONTROL</span><h2>Marks Register</h2><p>View, correct or remove student marks from one matrix.</p></div><div className="vm-session"><span>Working session</span><strong>{filters.academicYear}</strong></div></header>
    {status && <div className={`vm-alert ${status.type}`}>{status.type === "success" ? <FiCheckCircle /> : <FiAlertCircle />}<span>{status.text}</span></div>}
    <section className="vm-toolbar">
      <label><span>Class</span><select name="class" value={filters.class} onChange={changeFilter}><option value="">Select class</option>{SCHOOL_CLASSES.map((item) => <option key={item}>{item}</option>)}</select></label>
      <label><span>Stream</span><select name="stream" value={filters.stream} onChange={changeFilter} disabled={!['11th','12th'].includes(filters.class)}><option value="">Select stream</option>{STREAMS.map((item) => <option key={item}>{item}</option>)}</select></label>
      <label><span>Exam</span><select name="examType" value={filters.examType} onChange={changeFilter}><option value="">Select exam</option>{EXAMS.map((item) => <option key={item}>{item}</option>)}</select></label>
      <label className="vm-search"><span>Find student</span><div><FiSearch /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Name or admission no." disabled={!students.length} /></div></label>
      <button type="button" onClick={loadMatrix} disabled={loading}><FiGrid />{loading ? "Loading..." : "Load marks"}</button>
    </section>
    <section className="vm-register">
      <div className="vm-register-bar"><div><strong>{filters.class ? `Class ${filters.class} · ${filters.examType || "Select exam"}` : "Class marks matrix"}</strong><span>{students.length} students · {subjects.length} subjects</span></div><div className="vm-legend"><span><i>T</i>Theory /75</span><span><i>P</i>Practical /30</span></div></div>
      <div className="vm-table-wrap">{visibleStudents.length ? <table><thead><tr><th rowSpan="2">Adm. No.</th><th rowSpan="2">Student</th>{subjects.map((subject) => <th key={subject} colSpan="2">{subject}</th>)}<th rowSpan="2" className="vm-action-head">Actions</th></tr><tr>{subjects.flatMap((subject) => [<th key={`${subject}-t`}>T</th>,<th key={`${subject}-p`}>P</th>])}</tr></thead><tbody>{visibleStudents.map((student) => { const editing = editingId === student.studentId; return <tr key={student.studentId}><td>{student.admissionNo || "—"}</td><td className="vm-name">{student.name}</td>{subjects.flatMap((subject) => { const marks = student.marks?.[subject] || {}; return [<td key={`${subject}-t`}>{editing ? <input type="number" min="0" max="75" value={marks.theoryMarks === "-" ? "" : marks.theoryMarks ?? ""} onChange={(event) => changeMark(student.studentId,subject,"theoryMarks",event.target.value)} /> : <strong>{marks.theoryMarks ?? "—"}</strong>}</td>,<td key={`${subject}-p`}>{editing ? <input type="number" min="0" max="30" value={marks.practicalMarks === "-" ? "" : marks.practicalMarks ?? ""} onChange={(event) => changeMark(student.studentId,subject,"practicalMarks",event.target.value)} /> : <span>{marks.practicalMarks ?? "—"}</span>}</td>];})}<td className="vm-actions">{editing ? <><button className="save" type="button" onClick={() => saveRow(student)} disabled={loading}><FiSave /> Save</button><button type="button" onClick={() => { setEditingId(null); loadMatrix(); }}><FiX /> Cancel</button></> : <><button type="button" onClick={() => setEditingId(student.studentId)}><FiEdit2 /> Edit</button><button className="delete" type="button" onClick={() => deleteRow(student)}><FiTrash2 /> Delete</button></>}</td></tr>;})}</tbody></table> : <div className="vm-empty"><FiGrid /><strong>{students.length ? "No matching student" : "Load a marks register"}</strong><span>Class, stream and exam select karke matrix load karein.</span></div>}</div>
    </section>
  </main>;
}
