import React, { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import * as XLSX from "xlsx";
import { FiAlertCircle, FiCheckCircle, FiDownload, FiHash, FiRefreshCw, FiSearch, FiUsers } from "react-icons/fi";
import "./ModernRollNo.css";
import { SCHOOL_CLASSES } from "../../academicConfig";

const streamRank = { arts: 1, science: 2, commerce: 3 };

export default function ModernRollNo() {
  const [className, setClassName] = useState("");
  const [stream, setStream] = useState("");
  const [search, setSearch] = useState("");
  const [students, setStudents] = useState([]);
  const [fetching, setFetching] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [status, setStatus] = useState(null);
  const activeSession = localStorage.getItem("activeSession") || "";

  const loadStudents = useCallback(async () => {
    if (!className) { setStudents([]); return; }
    setFetching(true); setStatus(null);
    try {
      const response = await axios.get(`http://localhost:3000/fetch-students/${className}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        params: { academicYear: activeSession, ...(stream ? { stream } : {}) },
      });
      setStudents(response.data?.students || []);
    } catch (error) {
      setStudents([]); setStatus({ type: "error", text: error.response?.data?.message || "Students load nahi ho paye." });
    } finally { setFetching(false); }
  }, [activeSession, className, stream]);

  useEffect(() => { loadStudents(); }, [loadStudents]);

  const displayedStudents = useMemo(() => students
    .filter((student) => student.name?.toLowerCase().includes(search.trim().toLowerCase()) || String(student.rollNo || "").includes(search.trim()))
    .sort((a, b) => {
      if (["11th", "12th"].includes(className)) {
        const difference = (streamRank[a.stream?.toLowerCase()] || 99) - (streamRank[b.stream?.toLowerCase()] || 99);
        if (difference) return difference;
      }
      return a.name.localeCompare(b.name);
    }), [students, search, className]);

  const assignedCount = students.filter((student) => student.rollNo != null).length;

  const generateRollNumbers = async () => {
    if (!className) return setStatus({ type: "error", text: "Pehle class select karein." });
    if (!window.confirm(`Class ${className}, session ${activeSession} ke sabhi roll numbers regenerate karne hain?`)) return;
    setGenerating(true); setStatus(null);
    try {
      const response = await axios.put("http://localhost:3000/generate-roll-no", { className, academicSession: activeSession }, { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } });
      setStatus({ type: "success", text: response.data.message });
      await loadStudents();
    } catch (error) { setStatus({ type: "error", text: error.response?.data?.message || "Roll numbers generate nahi ho paye." }); }
    finally { setGenerating(false); }
  };

  const downloadExcel = () => {
    const data = displayedStudents.map((student, index) => ({ "S.No": index + 1, "Roll No": student.rollNo || "Not Assigned", "Admission No": student.admissionNo || "", "Student Name": student.name, "Father Name": student.fatherName || "", Class: student.class, Stream: student.stream || "" }));
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(data), "Roll Numbers");
    XLSX.writeFile(workbook, `Roll_Numbers_${activeSession}_Class_${className}.xlsx`);
  };

  return <main className="rn-page">
    <header className="rn-header"><div className="rn-icon"><FiHash /></div><div><span>EXAM CONTROL</span><h2>Roll Number Manager</h2><p>Generate and review class-wise roll numbers.</p></div><div className="rn-session"><span>Academic session</span><strong>{activeSession}</strong></div></header>

    {status && <div className={`rn-alert ${status.type}`}>{status.type === "success" ? <FiCheckCircle /> : <FiAlertCircle />}<span>{status.text}</span></div>}

    <section className="rn-toolbar">
      <label><span>Class</span><select value={className} onChange={(event) => { setClassName(event.target.value); setStream(""); setSearch(""); }}><option value="">Select class</option>{SCHOOL_CLASSES.map((item) => <option key={item}>{item}</option>)}</select></label>
      <label><span>Stream</span><select value={stream} onChange={(event) => setStream(event.target.value)} disabled={!['11th','12th'].includes(className)}><option value="">All streams</option><option value="Arts">Arts</option><option value="Science">Science</option><option value="Commerce">Commerce</option></select></label>
      <label className="rn-search"><span>Find student</span><div><FiSearch /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Name or roll no." disabled={!className} /></div></label>
      <button className="rn-generate" type="button" onClick={generateRollNumbers} disabled={!className || generating}><FiRefreshCw className={generating ? "spinning" : ""} />{generating ? "Generating..." : "Generate numbers"}</button>
    </section>

    <section className="rn-content">
      <div className="rn-summary"><div><FiUsers /><span>Students<strong>{students.length}</strong></span></div><div><FiCheckCircle /><span>Assigned<strong>{assignedCount}</strong></span></div><div><FiAlertCircle /><span>Pending<strong>{students.length - assignedCount}</strong></span></div><button type="button" onClick={downloadExcel} disabled={!displayedStudents.length}><FiDownload /> Export Excel</button></div>
      <div className="rn-table-wrap">{fetching ? <div className="rn-empty"><span className="rn-loader" />Loading students...</div> : displayedStudents.length ? <table><thead><tr><th>#</th><th>Roll No.</th><th>Admission No.</th><th>Student</th><th>Father</th><th>Class / Stream</th></tr></thead><tbody>{displayedStudents.map((student,index) => <tr key={student._id}><td>{index + 1}</td><td>{student.rollNo ? <strong className="rn-roll">{student.rollNo}</strong> : <span className="rn-pending">Pending</span>}</td><td>{student.admissionNo || "—"}</td><td className="rn-name">{student.name}</td><td>{student.fatherName || "—"}</td><td>{student.class}{student.stream ? ` · ${student.stream}` : ""}</td></tr>)}</tbody></table> : <div className="rn-empty"><FiUsers /><strong>{className ? "No students found" : "Select a class to begin"}</strong><span>{className ? "Filter change karke try karein." : "Student list automatically load ho jayegi."}</span></div>}</div>
    </section>
    <footer className="rn-note"><FiAlertCircle /> Generate action poori selected class ko Arts → Science → Commerce aur phir alphabetical order mein renumber karta hai.</footer>
  </main>;
}
