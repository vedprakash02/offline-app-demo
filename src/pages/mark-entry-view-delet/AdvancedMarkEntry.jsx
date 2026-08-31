import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { FiAlertCircle, FiBookOpen, FiCheckCircle, FiPlus, FiSave, FiSearch, FiUsers } from "react-icons/fi";
import { EXAMS, EXAM_MAX_MARKS, SCHOOL_CLASSES, STREAMS, getSubjects } from "../../academicConfig";
import "./ModernMarkEntry.css";
import "./AdvancedMarkEntry.css";

export default function AdvancedMarkEntry() {
  const activeSession = localStorage.getItem("activeSession") || "";
  const [filters, setFilters] = useState({ academicYear: activeSession, class: "", stream: "", examType: "", subjectName: "" });
  const [students, setStudents] = useState([]), [savedSubjects, setSavedSubjects] = useState([]);
  const [search, setSearch] = useState(""), [customSubject, setCustomSubject] = useState("");
  const [showAdder, setShowAdder] = useState(false), [includePractical, setIncludePractical] = useState(false);
  const [examMaxMarks, setExamMaxMarks] = useState(() => {
    const saved = localStorage.getItem("examMaxMarks");
    return saved ? JSON.parse(saved) : { ...EXAM_MAX_MARKS };
  });
  const [loading, setLoading] = useState(false), [saving, setSaving] = useState(false), [status, setStatus] = useState(null);
  const subjects = [...new Set([...getSubjects(filters.class, filters.stream), ...savedSubjects])];

  useEffect(() => {
    if (!filters.class) return setSavedSubjects([]);
    axios.get("http://localhost:3000/exam-subjects", { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }, params: { class: filters.class, academicYear: filters.academicYear, stream: filters.stream } }).then((response) => setSavedSubjects(response.data.subjects || [])).catch(() => setSavedSubjects([]));
  }, [filters.class, filters.stream, filters.academicYear]);

  const changeFilter = ({ target: { name, value } }) => {
    setFilters((current) => ({ ...current, [name]: value, ...(name === "class" ? { stream: "", subjectName: "" } : {}), ...(name === "stream" ? { subjectName: "" } : {}) }));
    if (name === "examType" && value !== "Annual") setIncludePractical(false);
    setStudents([]); setStatus(null);
  };
  const updateExamMaxMarks = (examType, field, value) => {
    const updated = { ...examMaxMarks, [examType]: { ...examMaxMarks[examType], [field]: Number(value) || 0 } };
    setExamMaxMarks(updated);
    localStorage.setItem("examMaxMarks", JSON.stringify(updated));
  };
  const addSubject = () => {
    const clean = customSubject.trim();
    if (!clean) return;
    if (!/^[\p{L}\p{N} .&()/-]+$/u.test(clean)) return setStatus({ type: "error", text: "Subject name valid nahi hai." });
    setSavedSubjects((current) => [...new Set([...current, clean])]); setFilters((current) => ({ ...current, subjectName: clean })); setCustomSubject(""); setShowAdder(false); setStudents([]);
  };
  const loadStudents = async () => {
    if (!filters.class || !filters.examType || !filters.subjectName || (["11th","12th"].includes(filters.class) && !filters.stream)) return setStatus({ type: "error", text: "Saare required filters select karein." });
    setLoading(true); setStatus(null); setSearch("");
    try {
      const headers = { Authorization: `Bearer ${localStorage.getItem("token")}` };
      const [studentResponse, marksResponse] = await Promise.all([
        axios.get(`http://localhost:3000/fetch-students/${filters.class}`, { headers, params: { academicYear: filters.academicYear, ...(filters.stream ? { stream: filters.stream } : {}) } }),
        axios.get("http://localhost:3000/view-marks-matrix", { headers, params: { class: filters.class, academicYear: filters.academicYear, examType: filters.examType, subjectName: filters.subjectName, ...(filters.stream ? { stream: filters.stream } : {}) } }),
      ]);
      const saved = new Map((marksResponse.data.savedStudentsMarks || []).map((item) => [item.studentId.toString(), item]));
      const list = (studentResponse.data.students || []).map((student) => { const mark = saved.get(student._id.toString()); return { studentId: student._id, admissionNo: student.admissionNo, rollNo: student.rollNo, name: student.name, theoryMarks: mark?.theoryMarks ?? "", practicalMarks: includePractical ? mark?.practicalMarks ?? "" : 0 }; });
      setStudents(list); if (!list.length) setStatus({ type: "error", text: "Is selection mein koi student nahi mila." });
    } catch (error) { setStatus({ type: "error", text: error.response?.data?.message || "Register load nahi hua." }); }
    finally { setLoading(false); }
  };
  const update = (id, field, raw) => { 
    const config = examMaxMarks[filters.examType] || examMaxMarks["Unit Test 1"];
    const max = field === "theoryMarks" ? config.theory : config.practical; 
    const value = raw === "" ? "" : Math.min(max, Math.max(0, Number(raw))); 
    setStudents((current) => current.map((item) => item.studentId === id ? { ...item, [field]: value } : item)); 
  };
  const completed = students.filter((item) => item.theoryMarks !== "" && (!includePractical || item.practicalMarks !== "")).length;
  const visible = useMemo(() => students.filter((item) => item.name.toLowerCase().includes(search.toLowerCase()) || String(item.rollNo || "").includes(search)), [students, search]);
  const save = async () => {
    if (completed !== students.length) return setStatus({ type: "error", text: `${students.length - completed} students ke marks incomplete hain.` });
    setSaving(true); setStatus(null);
    try { 
      const config = examMaxMarks[filters.examType] || examMaxMarks["Unit Test 1"];
      const response = await axios.post("http://localhost:3000/save-bulk-marks", { 
        ...filters, 
        practicalEnabled: includePractical, 
        theoryMaxMarks: config.theory,
        practicalMaxMarks: includePractical ? config.practical : 0,
        students: students.map((item) => ({ studentId: item.studentId, theoryMarks: Number(item.theoryMarks), practicalMarks: includePractical ? Number(item.practicalMarks) : 0 })) 
      }, { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } }); 
      setStatus({ type: "success", text: response.data.message }); 
    }
    catch (error) { setStatus({ type: "error", text: error.response?.data?.message || "Marks save nahi hue." }); }
    finally { setSaving(false); }
  };

  return <main className="me-page"><header className="me-header"><div className="me-icon"><FiBookOpen /></div><div><span>EXAM CONTROL</span><h2>Marks Entry</h2><p>Subject aur marking pattern select karke register update karein.</p></div><div className="me-session"><span>Working session</span><strong>{activeSession}</strong></div></header>
    {status && <div className={`me-alert ${status.type}`}>{status.type === "success" ? <FiCheckCircle /> : <FiAlertCircle />}{status.text}</div>}
    <section className="me-toolbar"><label><span>Class</span><select name="class" value={filters.class} onChange={changeFilter}><option value="">Select class</option>{SCHOOL_CLASSES.map((item) => <option key={item}>{item}</option>)}</select></label><label><span>Stream</span><select name="stream" value={filters.stream} onChange={changeFilter} disabled={!['11th','12th'].includes(filters.class)}><option value="">Select stream</option>{STREAMS.map((item) => <option key={item}>{item}</option>)}</select></label><label><span>Exam</span><select name="examType" value={filters.examType} onChange={changeFilter}><option value="">Select exam</option>{EXAMS.map((item) => <option key={item}>{item}</option>)}</select></label><label><span>Subject</span><select name="subjectName" value={filters.subjectName} onChange={changeFilter}><option value="">Select subject</option>{subjects.map((item) => <option key={item}>{item}</option>)}</select></label><button type="button" onClick={loadStudents} disabled={loading}><FiUsers />{loading ? "Loading..." : "Load register"}</button></section>
    {filters.examType && <section className="ame-max-marks"><strong>Max marks for {filters.examType}:</strong><div><label>Theory <input type="number" value={examMaxMarks[filters.examType]?.theory || 0} onChange={(e) => updateExamMaxMarks(filters.examType, "theory", e.target.value)} min="0" max="200" /></label>{filters.examType === "Annual" && <label>Practical <input type="number" value={examMaxMarks[filters.examType]?.practical || 0} onChange={(e) => updateExamMaxMarks(filters.examType, "practical", e.target.value)} min="0" max="100" /></label>}</div></section>}
    <section className="ame-options"><button type="button" onClick={() => setShowAdder((value) => !value)}><FiPlus /> Add subject</button>{filters.examType === "Annual" && <label><input type="checkbox" checked={includePractical} onChange={(event) => { setIncludePractical(event.target.checked); setStudents([]); }} /> Include practical</label>}<span>{filters.examType && filters.examType !== "Annual" ? "Practical sirf Annual exam mein available hai." : includePractical ? `Theory /${examMaxMarks[filters.examType]?.theory || 75} + Practical /${examMaxMarks[filters.examType]?.practical || 30}` : `Theory /${examMaxMarks[filters.examType]?.theory || 75}`}</span>{showAdder && <div><input value={customSubject} onChange={(event) => setCustomSubject(event.target.value)} placeholder="New subject name" maxLength="60" /><button type="button" onClick={addSubject}>Add</button></div>}</section>
    <section className="me-register"><div className="me-register-bar"><div><strong>{filters.subjectName || "Student register"}</strong><span>{students.length} students · {completed} completed</span></div><label><FiSearch /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Find student" /></label></div><div className="me-table-wrap">{students.length ? <table><thead><tr><th>#</th><th>Roll</th><th>Admission</th><th>Student</th><th>Theory /{examMaxMarks[filters.examType]?.theory || 75}</th>{includePractical && <th>Practical /{examMaxMarks[filters.examType]?.practical || 30}</th>}<th>Total /{includePractical ? (examMaxMarks[filters.examType]?.theory || 75) + (examMaxMarks[filters.examType]?.practical || 30) : (examMaxMarks[filters.examType]?.theory || 75)}</th></tr></thead><tbody>{visible.map((item,index) => <tr key={item.studentId}><td>{index+1}</td><td>{item.rollNo || "—"}</td><td>{item.admissionNo || "—"}</td><td className="me-name">{item.name}</td><td><input type="number" min="0" max={examMaxMarks[filters.examType]?.theory || 75} value={item.theoryMarks} onChange={(event) => update(item.studentId,"theoryMarks",event.target.value)} /></td>{includePractical && <td><input type="number" min="0" max={examMaxMarks[filters.examType]?.practical || 30} value={item.practicalMarks} onChange={(event) => update(item.studentId,"practicalMarks",event.target.value)} /></td>}<td><strong className="me-total">{item.theoryMarks === "" ? "—" : Number(item.theoryMarks)+(includePractical?Number(item.practicalMarks||0):0)}</strong></td></tr>)}</tbody></table> : <div className="me-empty"><FiUsers /><strong>Select filters and load register</strong></div>}</div>{students.length>0&&<footer className="me-savebar"><div><span>Completion</span><div><i style={{width:`${completed/students.length*100}%`}} /></div><strong>{completed}/{students.length}</strong></div><button type="button" onClick={save} disabled={saving||completed!==students.length}><FiSave />{saving?"Saving...":"Save marks"}</button></footer>}</section>
  </main>;
}
