import { useCallback, useEffect, useState } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import { FiDownload, FiEdit3, FiFileText, FiRefreshCw } from "react-icons/fi";
import { downloadTeacherIdCardWorkbook } from "../../utils/studentExcel";
import "../student-excel-export/StudentExcelExport.css";

export default function TeacherExcelExport() {
  const [teachers, setTeachers] = useState([]);
  const [status, setStatus] = useState("Active");
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState("");

  const loadTeachers = useCallback(async () => {
    setLoading(true); setNotice("");
    try {
      const { data } = await axios.get("http://localhost:3000/teachers", {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        params: status ? { status } : {},
      });
      const rows = data.teachers || [];
      setTeachers(rows);
      setNotice(`${rows.length} teacher records ready hain.`);
    } catch (error) {
      setTeachers([]);
      setNotice(error.response?.data?.message || "Teacher data load nahi hua.");
    } finally { setLoading(false); }
  }, [status]);

  useEffect(() => { loadTeachers(); }, [loadTeachers]);

  const download = async () => {
    if (!teachers.length) return setNotice("Download ke liye teacher data nahi hai.");
    const result = await downloadTeacherIdCardWorkbook(teachers, `id-card-teachers-${status ? status.toLowerCase() : "all"}.xlsx`);
    setNotice(result?.cancelled ? "Excel save cancel kiya gaya." : "Teacher Excel save ho gayi. ID Card Studio mein Load Teacher Excel se import karein.");
  };

  return <main className="student-excel-page">
    <header className="student-excel-header">
      <div><span>TEACHER DATA WORKFLOW</span><h1>Teacher Excel Export</h1><p>Teacher roster download karein, zaroori details edit karein aur ID Card Studio mein import karein.</p></div>
      <div className="student-excel-count"><strong>{teachers.length}</strong><span>Teachers</span></div>
    </header>
    <section className="student-excel-card">
      <div className="student-excel-steps"><div><FiDownload /><strong>1. Download</strong><span>Teacher profile data</span></div><div><FiEdit3 /><strong>2. Edit</strong><span>Excel mein ID-card details</span></div><div><FiFileText /><strong>3. Import</strong><span>ID Card Studio mein</span></div></div>
      <div className="student-excel-controls teacher-excel-controls">
        <label>Status<select value={status} onChange={(event) => setStatus(event.target.value)}><option value="Active">Active teachers</option><option value="Inactive">Inactive teachers</option><option value="">All teachers</option></select></label>
        <button type="button" className="excel-refresh" onClick={loadTeachers} disabled={loading}><FiRefreshCw />{loading ? "Loading..." : "Refresh data"}</button>
        <button type="button" className="excel-download" onClick={download} disabled={loading || !teachers.length}><FiDownload />Download editable Excel</button>
        <Link className="excel-studio-link" to="/id-card-studio">Open ID Card Studio</Link>
      </div>
      {notice && <p className="student-excel-notice">{notice}</p>}
      <div className="student-excel-info"><strong>Important:</strong> <code>Employee_ID</code> ko change na karein. Teacher ID card aur attendance record isi number se match honge. Name, designation, phone, address aur photo URL edit kar sakte hain.</div>
    </section>
  </main>;
}