import { useCallback, useEffect, useMemo, useState } from "react";
import { attendanceApi } from "./attendanceApi";
import "./AttendenceReport.css";

const currentMonth = () => new Date().toLocaleDateString("en-CA").slice(0, 7);
const monthLabel = (month) => new Date(`${month}-01T00:00:00`).toLocaleDateString("en-IN", { month: "long", year: "numeric" });

export default function AttendenceReport({ onBack }) {
  const [classes, setClasses] = useState([]);
  const [studentClass, setStudentClass] = useState("");
  const [month, setMonth] = useState(currentMonth);
  const [search, setSearch] = useState("");
  const [data, setData] = useState({ students: [], calendar: [], summary: {} });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedHolidayDate, setSelectedHolidayDate] = useState("");
  const [updatingHoliday, setUpdatingHoliday] = useState(false);

  useEffect(() => {
    attendanceApi.getStudents().then(({ students = [] }) => {
      const available = [...new Set(students.map((student) => student.className).filter(Boolean))]
        .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
      setClasses(available);
      setStudentClass((current) => current || available[0] || "");
    }).catch((err) => setError(`${err.message} Backend server check karein.`));
  }, []);

  const loadReport = useCallback(async () => {
    if (!studentClass || !month) return;
    setLoading(true); setError("");
    try {
      const response = await attendanceApi.getMonthlyReport(studentClass, month);
      if (!Array.isArray(response.calendar) || !response.summary) {
        throw new Error("Backend ka purana version chal raha hai. Backend restart karein.");
      }
      setData(response);
    }
    catch (err) { setData({ students: [], calendar: [], summary: {} }); setError(`${err.message} Backend server check karein.`); }
    finally { setLoading(false); }
  }, [studentClass, month]);

  useEffect(() => { loadReport(); }, [loadReport]);

  const updateHoliday = async (isHoliday) => {
    if (!selectedHolidayDate) return setError("Pehle ek date select karein.");
    if (!selectedHolidayDate.startsWith(`${month}-`)) return setError("Date selected month ke andar honi chahiye.");
    const action = isHoliday ? "Holiday" : "Working Day";
    if (!window.confirm(`Class ${studentClass} ke liye ${selectedHolidayDate} ko ${action} mark karein?`)) return;
    setUpdatingHoliday(true); setError("");
    try { await attendanceApi.setHoliday(selectedHolidayDate, studentClass, isHoliday); setSelectedHolidayDate(""); await loadReport(); }
    catch (err) { setError(err.message); }
    finally { setUpdatingHoliday(false); }
  };

  const students = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return data.students || [];
    return (data.students || []).filter((student) => student.name.toLowerCase().includes(query) || String(student.studentId).toLowerCase().includes(query));
  }, [data.students, search]);
  const calendar = Array.isArray(data.calendar) ? data.calendar : [];
  const summary = data.summary || {};

  const mark = (student, day) => {
    const value = student.dailyStatus?.[day.date];
    const kinds = { Present: ["P", "ar-present"], Absent: ["A", "ar-absent"], Late: ["L", "ar-late"], Holiday: ["H", "ar-holiday"] };
    const [letter, className] = kinds[value] || ["—", "ar-empty"];
    return <span className={`ar-mark ${className}`} title={value || "Attendance not marked"}>{letter}</span>;
  };

  return <main className="attendance-register">
    <header className="ar-header"><div><h2>Monthly Attendance Sheet</h2><small>{monthLabel(month)} · Class {studentClass || "—"}</small></div>
      <div className="ar-header-actions"><button type="button" onClick={onBack}>Back</button><button type="button" onClick={loadReport} disabled={!studentClass}>Refresh report</button></div></header>
    <div className="ar-filters">
      <label>Class<select value={studentClass} onChange={(event) => setStudentClass(event.target.value)}>{!classes.length && <option value="">No synced class</option>}{classes.map((name) => <option key={name}>{name}</option>)}</select></label>
      <label>Month<input type="month" value={month} onChange={(event) => { setMonth(event.target.value); setSelectedHolidayDate(""); }} /></label>
      <label className="ar-search">Find student<input placeholder="Name or student ID" value={search} onChange={(event) => setSearch(event.target.value)} /></label>
      <aside className="ar-status-legends"><span><b className="ar-present">P</b> Present</span><span><b className="ar-absent">A</b> Absent</span><span><b className="ar-late">L</b> Late</span><span><b className="ar-holiday">H</b> Holiday</span><span><b>—</b> Not marked</span></aside>
    </div>
    {!!calendar.length && <div className="ar-summary">
      <div><span>Calendar days</span><strong>{summary.totalCalendarDays}</strong></div><div><span>Holidays</span><strong>{summary.holidayDays}</strong></div><div><span>School working days</span><strong>{summary.schoolWorkingDays}</strong></div>
      <div className="ar-manual-holiday"><span>Manual holiday setup</span><div className="ar-ctrl-row"><input type="date" min={`${month}-01`} max={calendar.at(-1)?.date} value={selectedHolidayDate} onChange={(event) => setSelectedHolidayDate(event.target.value)} />
        <button type="button" className="btn-mark-h" onClick={() => updateHoliday(true)} disabled={updatingHoliday}>Mark Holiday</button><button type="button" className="btn-remove-h" onClick={() => updateHoliday(false)} disabled={updatingHoliday}>Mark Working</button></div></div>
    </div>}
    {loading || updatingHoliday ? <p className="ar-message">Processing data...</p> : error ? <p className="ar-message ar-error">{error}</p> : students.length && calendar.length ? <div className="ar-scroll"><table><thead>
      <tr><th className="ar-student" rowSpan="2">Student ID / Student name</th><th colSpan={calendar.length}>Days of {monthLabel(month)}</th><th colSpan="4">Monthly total</th></tr>
      <tr>{calendar.map((day) => <th key={day.date} className={day.isHoliday ? "ar-day-holiday" : ""} title={day.date}>{day.day}</th>)}<th>P</th><th>A</th><th>Days</th><th>%</th></tr></thead>
      <tbody>{students.map((student) => <tr key={student.studentId}><td className="ar-student"><em>{student.studentId}</em> / {student.name}</td>{calendar.map((day) => <td key={day.date} className={day.isHoliday ? "ar-cell-holiday" : ""}>{mark(student, day)}</td>)}
        <td className="ar-present">{student.presentCount}</td><td className="ar-absent">{student.absentCount}</td><td>{student.totalDays}</td><td><i className={Number(student.percentage) >= 75 ? "ar-good" : "ar-low"}>{student.percentage}%</i></td></tr>)}</tbody></table></div>
      : <p className="ar-message">Is class mein koi student nahi mila.</p>}
    <footer>Sunday aur manually selected festivals holiday (H) hain. Attendance wali dates aur manually selected working dates school working days mein count hoti hain.</footer>
  </main>;
}
