import { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import { FiCalendar, FiCheckCircle, FiClock, FiUser } from "react-icons/fi";
import "./TeacherAttendance.css";

const API = "http://localhost:3000";
const auth = () => ({ Authorization: `Bearer ${localStorage.getItem("token")}` });
const monthNow = () => new Date().toISOString().slice(0, 7);
const time12 = (value) => {
  if (!value) return "-";
  const [hourText, minute = "00"] = value.split(":");
  const hour = Number(hourText);
  return `${hour % 12 || 12}:${minute} ${hour >= 12 ? "PM" : "AM"}`;
};

export default function TeacherAttendanceReport() {
  const [month, setMonth] = useState(monthNow());
  const [selectedTeacherId, setSelectedTeacherId] = useState("");
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await axios.get(`${API}/teacher-attendance`, { headers: auth(), params: { month } });
      setRecords(data.records || []);
    } catch (error) {
      setNotice(error.response?.data?.message || "Teacher attendance report load nahi hui.");
    } finally {
      setLoading(false);
    }
  }, [month]);
  useEffect(() => { load(); }, [load]);

  const teachers = useMemo(() => {
    const unique = new Map();
    records.forEach((record) => { if (record.teacherId?._id) unique.set(String(record.teacherId._id), record.teacherId); });
    return [...unique.values()].sort((first, second) => first.name.localeCompare(second.name));
  }, [records]);
  useEffect(() => {
    if (teachers.length && !teachers.some((teacher) => String(teacher._id) === selectedTeacherId)) setSelectedTeacherId(String(teachers[0]._id));
    if (!teachers.length) setSelectedTeacherId("");
  }, [teachers, selectedTeacherId]);

  const teacher = teachers.find((item) => String(item._id) === selectedTeacherId);
  const teacherRecords = useMemo(() => records.filter((record) => String(record.teacherId?._id) === selectedTeacherId).sort((first, second) => String(second.date).localeCompare(String(first.date))), [records, selectedTeacherId]);
  const summary = useMemo(() => teacherRecords.reduce((total, record) => ({
    present: total.present + (record.status === "Present" ? 1 : 0),
    late: total.late + (record.status === "Late" ? 1 : 0),
    absent: total.absent + (record.status === "Absent" ? 1 : 0),
    leave: total.leave + (["Leave", "Half Day"].includes(record.status) ? 1 : 0),
    marked: total.marked + 1,
  }), { present: 0, late: 0, absent: 0, leave: 0, marked: 0 }), [teacherRecords]);
  const rate = summary.marked ? (((summary.present + summary.late) / summary.marked) * 100).toFixed(1) : "0.0";

  return <main className="teacher-att-page teacher-report-page">
    <header><div><span>STAFF REPORT</span><h1>Monthly Attendance Reports</h1><p>Ek staff member select karke uski month-wise attendance aur daily timings dekhein.</p></div><div className="teacher-report-filters"><label><FiCalendar /><input type="month" value={month} onChange={(event) => setMonth(event.target.value)} /></label><label className="teacher-picker"><FiUser /><select value={selectedTeacherId} onChange={(event) => setSelectedTeacherId(event.target.value)} disabled={!teachers.length}><option value="">Select staff</option>{teachers.map((item) => <option key={item._id} value={item._id}>{item.name} ({item.employeeId})</option>)}</select></label></div></header>
    {notice && <div className="att-notice" onClick={() => setNotice("")}>{notice}</div>}
    {teacher && <section className="teacher-report-profile"><div className="att-person">{teacher.image ? <img src={`${API}/uploads/${teacher.image}`} alt={teacher.name} /> : <b>{teacher.name.slice(0, 2).toUpperCase()}</b>}<span><small>SELECTED STAFF</small><strong>{teacher.name}</strong><em>{teacher.employeeId} · {teacher.designation}</em></span></div><span className="teacher-report-month">Report month: {month}</span></section>}
    <section className="att-summary"><article><FiCheckCircle /><div><span>Present / Late</span><strong>{summary.present + summary.late}</strong></div></article><article><FiClock /><div><span>Absent / Leave</span><strong>{summary.absent + summary.leave}</strong></div></article><article><FiCalendar /><div><span>Attendance rate</span><strong>{rate}%</strong></div></article></section>
    <section className="att-register teacher-datewise-register"><div className="att-register-head"><div><h2>{teacher ? `${teacher.name}'s Daily Attendance` : "Daily Attendance"}</h2><p>{teacher ? `${summary.marked} marked day(s) in ${month}` : "Staff select karein"}</p></div></div><div className="att-table-wrap"><table><thead><tr><th>Date</th><th>Status</th><th>Check in</th><th>Check out</th><th>Source</th><th>Note</th></tr></thead><tbody>{teacherRecords.map((record) => <tr key={record._id}><td><strong>{new Date(`${record.date}T00:00:00`).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", year: "numeric" })}</strong></td><td><span className={`attendance-badge ${record.status.toLowerCase().replace(" ", "-")}`}>{record.status}</span></td><td>{time12(record.checkIn)}</td><td>{time12(record.checkOut)}</td><td>{String(record.source || "manual").startsWith("qr-") ? "QR Scan" : "Manual"}</td><td>{record.note || "-"}</td></tr>)}</tbody></table>{!loading && !teacherRecords.length && <div className="att-empty">Is staff member ke liye selected month me koi attendance entry nahi mili.</div>}</div></section>
  </main>;
}
