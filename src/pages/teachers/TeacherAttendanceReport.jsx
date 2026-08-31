import { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import { FiCalendar, FiCheckCircle, FiClock, FiUsers } from "react-icons/fi";
import "./TeacherAttendance.css";

const API = "http://localhost:3000";
const auth = () => ({ Authorization: `Bearer ${localStorage.getItem("token")}` });
const monthNow = () => new Date().toISOString().slice(0, 7);

export default function TeacherAttendanceReport() {
  const [month, setMonth] = useState(monthNow());
  const [selectedDate, setSelectedDate] = useState("");
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try { const { data } = await axios.get(`${API}/teacher-attendance`, { headers: auth(), params: { month } }); setRecords(data.records || []); }
    catch (error) { setNotice(error.response?.data?.message || "Teacher attendance report load nahi hui."); }
    finally { setLoading(false); }
  }, [month]);
  useEffect(() => { load(); }, [load]);

  const rows = useMemo(() => {
    const grouped = new Map();
    records.forEach((record) => {
      const teacher = record.teacherId; if (!teacher?._id) return;
      const row = grouped.get(String(teacher._id)) || { teacher, present: 0, absent: 0, late: 0, leave: 0, halfDay: 0, total: 0, qr: 0 };
      row.total += 1;
      if (record.status === "Present") row.present += 1;
      if (record.status === "Absent") row.absent += 1;
      if (record.status === "Late") row.late += 1;
      if (record.status === "Leave") row.leave += 1;
      if (record.status === "Half Day") row.halfDay += 1;
      if (String(record.source || "").startsWith("qr-")) row.qr += 1;
      grouped.set(String(teacher._id), row);
    });
    return [...grouped.values()].sort((a, b) => a.teacher.name.localeCompare(b.teacher.name));
  }, [records]);

  const dateWiseRecords = useMemo(() => records.filter((record) => !selectedDate || record.date === selectedDate).sort((a, b) => String(b.date).localeCompare(String(a.date)) || String(a.teacherId?.name || "").localeCompare(String(b.teacherId?.name || ""))), [records, selectedDate]);
  const totals = useMemo(() => rows.reduce((sum, row) => ({ teachers: sum.teachers + 1, present: sum.present + row.present + row.late, marked: sum.marked + row.total }), { teachers: 0, present: 0, marked: 0 }), [rows]);
  const percentage = totals.marked ? ((totals.present / totals.marked) * 100).toFixed(1) : "0.0";

  return <main className="teacher-att-page teacher-report-page">
    <header><div><span>STAFF REPORT</span><h1>Teacher Attendance Report</h1><p>Monthly present, absent, leave aur QR attendance summary.</p></div><div className="teacher-report-filters"><label><FiCalendar /><input type="month" value={month} onChange={(event) => { setMonth(event.target.value); setSelectedDate(""); }} /></label><label><FiCalendar /><input type="date" value={selectedDate} min={`${month}-01`} max={`${month}-31`} onChange={(event) => setSelectedDate(event.target.value)} /></label></div></header>
    {notice && <div className="att-notice" onClick={() => setNotice("")}>{notice}</div>}
    <section className="att-summary"><article><FiUsers /><div><span>Teachers marked</span><strong>{totals.teachers}</strong></div></article><article><FiCheckCircle /><div><span>Attendance rate</span><strong>{percentage}%</strong></div></article><article><FiClock /><div><span>Total marked days</span><strong>{totals.marked}</strong></div></article></section>
    <section className="att-register"><div className="att-register-head"><div><h2>Monthly Register</h2><p>{month || "Select month"}</p></div></div><div className="att-table-wrap"><table className="teacher-report-table"><thead><tr><th>Teacher</th><th>Present</th><th>Late</th><th>Absent</th><th>Leave</th><th>Half Day</th><th>QR scans</th><th>Attendance</th></tr></thead><tbody>{rows.map((row) => <tr key={row.teacher._id}><td><div className="att-person">{row.teacher.image ? <img src={`${API}/uploads/${row.teacher.image}`} alt="" /> : <b>{row.teacher.name.slice(0, 2).toUpperCase()}</b>}<span><strong>{row.teacher.name}</strong><small>{row.teacher.employeeId} · {row.teacher.designation}</small></span></div></td><td>{row.present}</td><td>{row.late}</td><td>{row.absent}</td><td>{row.leave}</td><td>{row.halfDay}</td><td>{row.qr}</td><td><strong>{row.total ? (((row.present + row.late) / row.total) * 100).toFixed(1) : "0.0"}%</strong></td></tr>)}</tbody></table>{!loading && !rows.length && <div className="att-empty">Is month ke liye teacher attendance record nahi mila.</div>}</div></section>
    <section className="att-register teacher-datewise-register"><div className="att-register-head"><div><h2>Date-wise Attendance</h2><p>{selectedDate ? new Date(`${selectedDate}T00:00:00`).toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" }) : "Month ke saare marked dates"}</p></div></div><div className="att-table-wrap"><table><thead><tr><th>Date</th><th>Teacher</th><th>Status</th><th>Check in</th><th>Check out</th><th>Source</th><th>Note</th></tr></thead><tbody>{dateWiseRecords.map((record) => <tr key={record._id}><td>{new Date(`${record.date}T00:00:00`).toLocaleDateString("en-IN")}</td><td><div className="att-person">{record.teacherId?.image ? <img src={`${API}/uploads/${record.teacherId.image}`} alt="" /> : <b>{record.teacherId?.name?.slice(0, 2).toUpperCase() || "?"}</b>}<span><strong>{record.teacherId?.name || "Teacher removed"}</strong><small>{record.teacherId?.employeeId || ""} · {record.teacherId?.designation || ""}</small></span></div></td><td><strong>{record.status}</strong></td><td>{record.checkIn || "—"}</td><td>{record.checkOut || "—"}</td><td>{String(record.source || "manual").startsWith("qr-") ? "QR Scan" : "Manual"}</td><td>{record.note || "—"}</td></tr>)}</tbody></table>{!loading && !dateWiseRecords.length && <div className="att-empty">Is selected period ke liye koi attendance entry nahi mili.</div>}</div></section>
  </main>;
}
