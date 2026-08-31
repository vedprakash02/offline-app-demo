import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { FiAlertCircle, FiBookOpen, FiCheckCircle, FiSave, FiSearch, FiUsers } from "react-icons/fi";
import { SCHOOL_CLASSES, STREAMS, getSubjects } from "../../academicConfig";
import "./ModernMarkEntry.css";
import "./AdvancedMarkEntry.css";

const UNITS = ["Unit Test 1", "Unit Test 2", "Unit Test 3"];
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const auth = () => ({ Authorization: `Bearer ${localStorage.getItem("token")}` });

export default function UnitTestEntry() {
  const activeSession = localStorage.getItem("activeSession") || "";
  const [filters, setFilters] = useState({ academicYear: activeSession, class: "", stream: "", unit: "Unit Test 1", month: MONTHS[new Date().getMonth()], subjectName: "" });
  const [savedSubjects, setSavedSubjects] = useState([]), [students, setStudents] = useState([]), [maxMarks, setMaxMarks] = useState(20);
  const [status, setStatus] = useState(null), [loading, setLoading] = useState(false), [saving, setSaving] = useState(false), [search, setSearch] = useState("");
  const subjects = [...new Set([...getSubjects(filters.class, filters.stream), ...savedSubjects])];

  useEffect(() => {
    if (!filters.class) return setSavedSubjects([]);
    axios.get("http://localhost:3000/unit-test-subjects", { headers: auth(), params: { class: filters.class, academicYear: filters.academicYear, stream: filters.stream } }).then((res) => setSavedSubjects(res.data.subjects || [])).catch(() => setSavedSubjects([]));
  }, [filters.class, filters.stream, filters.academicYear]);

  const change = (event) => { const { name, value } = event.target; setFilters((old) => ({ ...old, [name]: value, ...(name === "class" ? { stream: "", subjectName: "" } : {}) })); setStudents([]); setStatus(null); };
  const load = async () => {
    if (!filters.class || !filters.subjectName || (["11th", "12th"].includes(filters.class) && !filters.stream)) return setStatus({ type: "error", text: "Class, stream (11th/12th) aur subject select karein." });
    setLoading(true); setStatus(null); setSearch("");
    try { const res = await axios.get("http://localhost:3000/unit-test-matrix", { headers: auth(), params: filters }); setStudents(res.data.students || []); setMaxMarks(res.data.maxMarks || 20); if (!res.data.students?.length) setStatus({ type: "error", text: "Is selection mein koi student nahi mila." }); }
    catch (error) { setStatus({ type: "error", text: error.response?.data?.message || "Unit test register load nahi hua." }); }
    finally { setLoading(false); }
  };
  const update = (studentId, raw) => { const marks = raw === "" ? "" : Math.max(0, Math.min(Number(raw), Number(maxMarks))); setStudents((old) => old.map((item) => item.studentId === studentId ? { ...item, marks } : item)); };
  const complete = students.filter((item) => item.marks !== "").length;
  const visible = useMemo(() => students.filter((item) => item.name.toLowerCase().includes(search.toLowerCase()) || String(item.rollNo || "").includes(search)), [students, search]);
  const save = async () => {
    if (complete !== students.length) return setStatus({ type: "error", text: `${students.length - complete} students ke marks incomplete hain.` });
    setSaving(true); setStatus(null);
    try { const res = await axios.post("http://localhost:3000/unit-test-marks", { ...filters, maxMarks: Number(maxMarks), students: students.map((item) => ({ studentId: item.studentId, marks: Number(item.marks) })) }, { headers: auth() }); setStatus({ type: "success", text: res.data.message }); }
    catch (error) { setStatus({ type: "error", text: error.response?.data?.message || "Unit test marks save nahi hue." }); }
    finally { setSaving(false); }
  };

  return <main className="me-page"><header className="me-header"><div className="me-icon"><FiBookOpen /></div><div><span>UNIT TEST CONTROL</span><h2>Unit Test Entry</h2><p>Monthly unit test ka record regular exams se alag save hoga.</p></div><div className="me-session"><span>Working session</span><strong>{activeSession}</strong></div></header>
    {status && <div className={`me-alert ${status.type}`}>{status.type === "success" ? <FiCheckCircle /> : <FiAlertCircle />}{status.text}</div>}
    <section className="me-toolbar"><label><span>Class</span><select name="class" value={filters.class} onChange={change}><option value="">Select class</option>{SCHOOL_CLASSES.map((item) => <option key={item}>{item}</option>)}</select></label><label><span>Stream</span><select name="stream" value={filters.stream} onChange={change} disabled={!['11th','12th'].includes(filters.class)}><option value="">Select stream</option>{STREAMS.map((item) => <option key={item}>{item}</option>)}</select></label><label><span>Unit test</span><select name="unit" value={filters.unit} onChange={change}>{UNITS.map((item) => <option key={item}>{item}</option>)}</select></label><label><span>Month</span><select name="month" value={filters.month} onChange={change}>{MONTHS.map((item) => <option key={item}>{item}</option>)}</select></label><label><span>Subject</span><select name="subjectName" value={filters.subjectName} onChange={change}><option value="">Select subject</option>{subjects.map((item) => <option key={item}>{item}</option>)}</select></label><button type="button" onClick={load} disabled={loading}><FiUsers />{loading ? "Loading..." : "Load register"}</button></section>
    <section className="ame-max-marks"><strong>Unit test maximum marks</strong><div><label>Marks <input type="number" value={maxMarks} onChange={(e) => setMaxMarks(Math.max(1, Math.min(100, Number(e.target.value) || 1)))} min="1" max="100" /></label></div></section>
    <section className="me-register"><div className="me-register-bar"><div><strong>{filters.subjectName || "Student register"}</strong><span>{filters.unit} · {filters.month} · {students.length} students</span></div><label><FiSearch /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Find student" /></label></div><div className="me-table-wrap">{students.length ? <table><thead><tr><th>#</th><th>Roll</th><th>Admission</th><th>Student</th><th>Marks /{maxMarks}</th></tr></thead><tbody>{visible.map((item, index) => <tr key={item.studentId}><td>{index + 1}</td><td>{item.rollNo || "—"}</td><td>{item.admissionNo || "—"}</td><td className="me-name">{item.name}</td><td><input type="number" min="0" max={maxMarks} value={item.marks} onChange={(e) => update(item.studentId, e.target.value)} /></td></tr>)}</tbody></table> : <div className="me-empty"><FiUsers /><strong>Select filters and load the unit-test register</strong></div>}</div>{students.length > 0 && <footer className="me-savebar"><div><span>Completion</span><div><i style={{ width: `${complete / students.length * 100}%` }} /></div><strong>{complete}/{students.length}</strong></div><button type="button" onClick={save} disabled={saving || complete !== students.length}><FiSave />{saving ? "Saving..." : "Save unit test"}</button></footer>}</section>
  </main>;
}
