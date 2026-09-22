import { useCallback, useEffect, useState } from "react";
import axios from "axios";
import { FiCalendar, FiCheckCircle, FiClock, FiLogIn, FiLogOut, FiUsers } from "react-icons/fi";
import "./TeacherAttendance.css";

const API = "http://localhost:3000";
const auth = () => ({ Authorization: `Bearer ${localStorage.getItem("token")}` });
const today = () => new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
const currentTime = () => new Date().toLocaleTimeString("en-GB", { timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit", hourCycle: "h23" });

export default function TeacherAttendance() {
  const [date, setDate] = useState(today());
  const [rows, setRows] = useState([]);
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(false);
  const [punchingId, setPunchingId] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await axios.get(`${API}/teacher-attendance/register/${date}`, { headers: auth() });
      setRows(data.teachers.map((teacher) => ({ ...teacher, status: teacher.attendance?.status || "Present", checkIn: teacher.attendance?.checkIn || "", checkOut: teacher.attendance?.checkOut || "", note: teacher.attendance?.note || "", source: teacher.attendance?.source || "manual" })));
    } catch (error) {
      setNotice(error.response?.data?.message || "Attendance load nahi hui.");
    } finally {
      setLoading(false);
    }
  }, [date]);

  useEffect(() => { load(); }, [load]);

  const update = (id, key, value) => setRows((current) => current.map((row) => row._id === id ? { ...row, [key]: value } : row));
  const persistRow = async (row, successMessage) => {
    try {
      await axios.put(`${API}/teacher-attendance/register/${date}`, { records: [{ teacherId: row._id, status: row.status, checkIn: row.checkIn, checkOut: row.checkOut, note: row.note }] }, { headers: auth() });
      setNotice(successMessage);
      return true;
    } catch (error) {
      setNotice(error.response?.data?.message || "Attendance auto-save nahi hui.");
      return false;
    }
  };
  const saveManualField = async (id, key, value) => {
    const currentRow = rows.find((row) => row._id === id);
    if (!currentRow) return;
    if (key === "checkOut" && value && currentRow.checkIn && value < currentRow.checkIn) {
      setNotice("Check out time, Check in time ke baad hona chahiye.");
      return;
    }
    const savedRow = { ...currentRow, [key]: value };
    setRows((current) => current.map((row) => row._id === id ? savedRow : row));
    const saved = await persistRow(savedRow, "Manual attendance update saved.");
    if (!saved) setRows((current) => current.map((row) => row._id === id ? currentRow : row));
  };
  const punchTime = async (id) => {
    if (date !== today()) {
      setNotice("Auto Check in / Check out sirf aaj ki attendance ke liye use karein. Purani date ke liye time manually select karein.");
      return;
    }
    const currentRow = rows.find((row) => row._id === id);
    if (!currentRow || (currentRow.checkIn && currentRow.checkOut)) return;
    const key = currentRow.checkIn ? "checkOut" : "checkIn";
    const savedRow = { ...currentRow, [key]: currentTime(), status: ["Absent", "Leave", "Half Day"].includes(currentRow.status) ? "Present" : currentRow.status };
    setRows((current) => current.map((row) => row._id === id ? savedRow : row));
    setPunchingId(id);
    const saved = await persistRow(savedRow, `${key === "checkIn" ? "Check in" : "Check out"} time saved: ${savedRow[key]}`);
    if (!saved) setRows((current) => current.map((row) => row._id === id ? currentRow : row));
    setPunchingId("");
  };
  const present = rows.filter((row) => ["Present", "Late"].includes(row.status)).length;

  return <main className="teacher-att-page">
    <header><div><span>STAFF REGISTER</span><h1>Daily Staff Attendance</h1><p>Daily attendance, arrival time aur leave records manage karein.</p></div><label><FiCalendar /><input type="date" value={date} onChange={(event) => setDate(event.target.value)} /></label></header>
    {notice && <div className="att-notice" onClick={() => setNotice("")}>{notice}</div>}
    <section className="att-summary"><article><FiUsers /><div><span>Active staff</span><strong>{rows.length}</strong></div></article><article><FiCheckCircle /><div><span>Present / Late</span><strong>{present}</strong></div></article><article><FiClock /><div><span>Not present</span><strong>{rows.length - present}</strong></div></article></section>
    <section className="att-register"><div className="att-register-head"><div><h2>Daily Register</h2><p>{new Date(`${date}T00:00:00`).toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</p></div><small className="att-auto-save">Pehli click Check in, doosri click Check out. Har update auto-save hoti hai.</small></div>
      <div className="att-table-wrap"><table><thead><tr><th>Staff</th><th>Status</th><th>Check in</th><th>Check out</th><th>Attendance action</th><th>Source</th><th>Note</th></tr></thead><tbody>{rows.map((row) => <tr key={row._id}>
        <td><div className="att-person">{row.image ? <img src={`${API}/uploads/${row.image}`} alt="" /> : <b>{row.name.slice(0, 2).toUpperCase()}</b>}<span><strong>{row.name}</strong><small>{row.employeeId} · {row.designation}</small></span></div></td>
        <td><select className={`att-select ${row.status.toLowerCase().replace(" ", "-")}`} value={row.status} onChange={(event) => saveManualField(row._id, "status", event.target.value)}>{["Present", "Absent", "Late", "Leave", "Half Day"].map((status) => <option key={status}>{status}</option>)}</select></td>
        <td><input type="time" value={row.checkIn} onChange={(event) => saveManualField(row._id, "checkIn", event.target.value)} /></td>
        <td><input type="time" value={row.checkOut} onChange={(event) => saveManualField(row._id, "checkOut", event.target.value)} /></td>
        <td><button type="button" className={`att-punch ${row.checkIn && row.checkOut ? "completed" : ""}`} disabled={punchingId === row._id || (row.checkIn && row.checkOut)} onClick={() => punchTime(row._id)}>{punchingId === row._id ? "Saving..." : !row.checkIn ? <><FiLogIn />Check in</> : !row.checkOut ? <><FiLogOut />Check out</> : <><FiCheckCircle />Completed</>}</button></td>
        <td><span className={`att-source ${row.source.startsWith("qr-") ? "qr" : "manual"}`}>{row.source.startsWith("qr-") ? "QR Scan" : "Manual"}</span></td>
        <td><input placeholder="Optional note" value={row.note} onChange={(event) => update(row._id, "note", event.target.value)} onBlur={(event) => saveManualField(row._id, "note", event.target.value)} /></td>
      </tr>)}</tbody></table>{!loading && !rows.length && <div className="att-empty">Active staff profiles add karne ke baad attendance yahan dikhegi.</div>}</div>
    </section>
  </main>;
}
