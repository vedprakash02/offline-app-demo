import { useCallback, useEffect, useState } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import { FiAlertTriangle, FiCheckCircle, FiDatabase, FiDownload, FiRefreshCw, FiShield, FiUpload } from "react-icons/fi";
import "./Administration.css";

const api = axios.create({ baseURL: "http://localhost:3000" });
const authHeaders = () => ({ Authorization: `Bearer ${localStorage.getItem("token")}` });

export function BackupRestore() {
  const [busy, setBusy] = useState("");
  const [file, setFile] = useState(null);
  const [confirmation, setConfirmation] = useState("");
  const [notice, setNotice] = useState(null);
  const download = async () => {
    setBusy("backup"); setNotice(null);
    try {
      const response = await api.get("/admin/backup", { headers: authHeaders(), responseType: "blob" });
      const href = URL.createObjectURL(response.data); const link = document.createElement("a");
      link.href = href; link.download = `school-erp-backup-${new Date().toISOString().slice(0,10)}.json`; link.click(); URL.revokeObjectURL(href);
      setNotice({ type: "success", text: "MongoDB, SQLite aur uploads ka backup download ho gaya." });
    } catch (error) { setNotice({ type: "error", text: error.response?.data?.message || "Backup download nahi hua." }); }
    finally { setBusy(""); }
  };
  const restore = async () => {
    if (!file || confirmation !== "RESTORE SCHOOL DATA") return setNotice({ type: "error", text: "Backup file select karke exact confirmation phrase likhein." });
    setBusy("restore"); setNotice(null);
    try {
      const form = new FormData(); form.append("backup", file); form.append("confirmation", confirmation);
      const { data } = await api.post("/admin/restore", form, { headers: authHeaders() });
      setNotice({ type: "success", text: data.message }); setFile(null); setConfirmation("");
      if (data.reauthRequired) { localStorage.removeItem("token"); localStorage.removeItem("activeSession"); localStorage.removeItem("role"); window.setTimeout(() => window.location.assign("/login"), 1600); }
    } catch (error) { setNotice({ type: "error", text: error.response?.data?.message || "Restore nahi hua." }); }
    finally { setBusy(""); }
  };
  return <AdminPage title="Backup & Restore" subtitle="BSON-safe MongoDB, SQLite attendance aur uploaded files ka protected backup.">
    {notice && <Notice {...notice} />}
    <div className="admin-grid">
      <section className="admin-card"><FiDownload className="admin-card-icon"/><h2>Create full backup</h2><p>Backup file ko external drive ya secure folder me rakhein.</p><ul><li>All MongoDB collections</li><li>ID/QR SQLite data</li><li>Student photos and school files</li></ul><button onClick={download} disabled={!!busy}><FiDatabase />{busy === "backup" ? "Creating backup..." : "Download full backup"}</button></section>
      <section className="admin-card danger"><FiUpload className="admin-card-icon"/><h2>Restore backup</h2><p>Restore current data replace karega. System pehle BSON-safe automatic safety snapshot banayega; restore ke baad re-login hoga.</p><label><span>Backup JSON file</span><input type="file" accept=".json,application/json" onChange={(event) => setFile(event.target.files?.[0] || null)}/></label><label><span>Type: RESTORE SCHOOL DATA</span><input value={confirmation} onChange={(event) => setConfirmation(event.target.value)} placeholder="RESTORE SCHOOL DATA"/></label><button onClick={restore} disabled={!!busy || !file || confirmation !== "RESTORE SCHOOL DATA"}><FiAlertTriangle />{busy === "restore" ? "Restoring..." : "Restore selected backup"}</button></section>
    </div>
    <div className="admin-security"><FiShield/><span><strong>Admin-only protection</strong> SQLite restore machine-local security key aur local-only connection se protected hai.</span></div>
  </AdminPage>;
}

export function StudentValidation() {
  const [report, setReport] = useState(null); const [loading, setLoading] = useState(true); const [error, setError] = useState("");
  const session = localStorage.getItem("activeSession") || "";
  const load = useCallback(async () => { setLoading(true); setError(""); try { const { data } = await api.get("/admin/student-validation", { params: { academicSession: session }, headers: authHeaders() }); setReport(data); } catch (requestError) { setError(requestError.response?.data?.message || "Validation report load nahi hui."); } finally { setLoading(false); } }, [session]);
  useEffect(() => { load(); }, [load]);
  return <AdminPage title="Student Data Validation" subtitle={`${session || "All sessions"} ke incomplete, invalid aur duplicate records.`} action={<button className="admin-refresh" onClick={load} disabled={loading}><FiRefreshCw/> Refresh report</button>}>
    {error && <Notice type="error" text={error}/>} {loading ? <div className="admin-loading">Student records check ho rahe hain...</div> : report && <>
      <div className="validation-stats"><div><span>Total students</span><strong>{report.totalStudents}</strong></div><div><span>Affected students</span><strong>{report.affectedStudents}</strong></div><div><span>Total issues</span><strong>{report.issueCount}</strong></div><div className={report.issueCount ? "warning" : "clean"}><span>Status</span><strong>{report.issueCount ? "Needs attention" : "All clean"}</strong></div></div>
      <section className="validation-section"><h2>Incomplete or invalid records</h2>{report.issues.length ? <div className="validation-table"><table><thead><tr><th>Student</th><th>Class</th><th>Missing</th><th>Invalid</th><th>Action</th></tr></thead><tbody>{report.issues.map((item) => <tr key={item._id}><td><strong>{item.name}</strong><small>{item.admissionNo || "No admission no."}</small></td><td>{item.class || "—"}</td><td>{item.missing.join(", ") || "—"}</td><td>{item.invalid.join(", ") || "—"}</td><td><Link to={`/dashboard/edit-student/${item._id}`}>Fix record</Link></td></tr>)}</tbody></table></div> : <Empty text="Koi incomplete student record nahi mila."/>}</section>
      <section className="validation-section"><h2>Duplicate identifiers</h2>{report.duplicates.length ? <div className="duplicate-list">{report.duplicates.map((item, index) => <article key={`${item.field}-${item.value}-${index}`}><FiAlertTriangle/><div><strong>{item.field}: {item.value}</strong><span>{item.names.join(" · ")}</span></div></article>)}</div> : <Empty text="Admission, Enrollment, APAAR ya PEN duplicate nahi mila."/>}</section>
    </>}
  </AdminPage>;
}

const AdminPage = ({ title, subtitle, action, children }) => <main className="admin-page"><header className="admin-hero"><div><span>SYSTEM ADMINISTRATION</span><h1>{title}</h1><p>{subtitle}</p></div>{action}</header>{children}</main>;
const Notice = ({ type, text }) => <div className={`admin-notice ${type}`}>{type === "success" ? <FiCheckCircle/> : <FiAlertTriangle/>}<span>{text}</span></div>;
const Empty = ({ text }) => <div className="admin-empty"><FiCheckCircle/><span>{text}</span></div>;