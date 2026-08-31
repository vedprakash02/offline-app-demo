import React, { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import "./MonthlyRegister.css";
import { SCHOOL_CLASSES } from "../../academicConfig";

const monthLabel = (month) =>
  new Date(`${month}-01T00:00:00`).toLocaleDateString("en-IN", {
    month: "long",
    year: "numeric",
  });

export default function MonthlyRegister() {
  const [studentClass, setStudentClass] = useState("9th");
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [search, setSearch] = useState("");
  const [data, setData] = useState({ students: [], calendar: [], summary: {} });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [selectedHolidayDate, setSelectedHolidayDate] = useState("");
  const [updatingHoliday, setUpdatingHoliday] = useState(false);

  const loadReport = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(
        "http://localhost:3000/attendance-report",
        {
          headers: { Authorization: `Bearer ${token}` },
          params: { studentClass, month, academicSession: localStorage.getItem("activeSession") },
        },
      );
      setData(response.data);
    } catch (err) {
      setData({ students: [], calendar: [], summary: {} });
      setError(
        err.response?.data?.message ||
          "Report load nahi ho payi. Backend connection check karein.",
      );
    } finally {
      setLoading(false);
    }
  }, [studentClass, month]);

  const handleManualHolidaySubmit = async (isHolidayAction) => {
    if (!selectedHolidayDate) {
      alert("Kripya pehle ek date select karein!");
      return;
    }

    const actionText = isHolidayAction ? "Holiday" : "Working Day";
    const confirmAction = window.confirm(
      `Kya aap Class ${studentClass} ke liye ${selectedHolidayDate} ko ${actionText} banana chahte hain?`,
    );
    if (!confirmAction) return;

    setUpdatingHoliday(true);
    try {
      const token = localStorage.getItem("token");
      await axios.post(
        "http://localhost:3000/mark-holiday",
        { date: selectedHolidayDate, isHoliday: isHolidayAction, academicSession: localStorage.getItem("activeSession") },
        { headers: { Authorization: `Bearer ${token}` } },
      );

      alert(`Date ${selectedHolidayDate} ko successfully ${actionText} mark kar diya gaya hai.`);
      setSelectedHolidayDate("");
      await loadReport();
    } catch (err) {
      alert(err.response?.data?.message || "Holiday update karne mein dikkat aayi.");
    } finally {
      setUpdatingHoliday(false);
    }
  };

  useEffect(() => {
    loadReport();
  }, [loadReport]);

  const students = useMemo(
    () =>
      data.students.filter(
        (s) =>
          s.name.toLowerCase().includes(search.toLowerCase()) ||
          String(s.rollNo || "").includes(search),
      ),
    [data.students, search],
  );

  const mark = (student, day) => {
    if (day.isWeeklyHoliday)
      return (
        <span className="ar-mark ar-holiday" title="Holiday">
          H
        </span>
      );
    const value = student.dailyStatus?.[day.date];
    const kinds = {
      Present: ["P", "ar-present"],
      Absent: ["A", "ar-absent"],
      Late: ["L", "ar-late"],
    };
    const [letter, className] = kinds[value] || ["—", "ar-empty"];
    return (
      <span
        className={`ar-mark ${className}`}
        title={value || "Attendance not marked"}
      >
        {letter}
      </span>
    );
  };

  return (
    <div className="attendance-register">
      <header className="ar-header">
        <div>
          <h2>Monthly Attendance Sheet</h2>
          <small>
            {monthLabel(month)} · Class {studentClass}
          </small>
        </div>
        <button onClick={loadReport}>Refresh report</button>
      </header>

      {/* FILTER BOX: Jisme ab right side me bilkul sahi se Legends fix hain */}
      <div className="ar-filters">
        <label>
          Class
          <select
            value={studentClass}
            onChange={(e) => setStudentClass(e.target.value)}
          >
            {SCHOOL_CLASSES.map((item) => <option key={item}>{item}</option>)}
          </select>
        </label>
        <label>
          Month
          <input
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
          />
        </label>
        <label className="ar-search">
          Find student
          <input
            placeholder="Name or roll number"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>

        {/* AAPKA MANCHAHA BADLAAV: LEGENDS SECTION CODES KE SATH FILTER MEIN HAI */}
        <aside className="ar-status-legends">
          <span className="ar-legend-item"><b className="ar-present">P</b> Present</span>
          <span className="ar-legend-item"><b className="ar-absent">A</b> Absent</span>
          <span className="ar-legend-item"><b className="ar-late">L</b> Late</span>
          <span className="ar-legend-item"><b className="ar-holiday">H</b> Holiday</span>
          <span className="ar-legend-item"><b>—</b> Not marked</span>
        </aside>
      </div>

      {!!data.calendar.length && (
        <div className="ar-summary">
          <div>
            <span>Calendar days</span>
            <strong>{data.summary.totalCalendarDays}</strong>
          </div>
          <div>
            <span>Weekly holidays</span>
            <strong>{data.summary.weeklyHolidayDays}</strong>
          </div>
          <div>
            <span>School working days</span>
            <strong>{data.summary.schoolWorkingDays}</strong>
          </div>
          
          {/* Manual Holiday Setup Box */}
          <div className="ar-manual-holiday">
            <span className="ar-ctrl-title">Manual Holiday Setup</span>
            <div className="ar-ctrl-row">
              <input
                type="date"
                value={selectedHolidayDate}
                onChange={(e) => setSelectedHolidayDate(e.target.value)}
              />
              <button
                className="btn-mark-h"
                onClick={() => handleManualHolidaySubmit(true)}
                disabled={updatingHoliday}
              >
                Mark (Holiday)
              </button>
              <button
                className="btn-remove-h"
                onClick={() => handleManualHolidaySubmit(false)}
                disabled={updatingHoliday}
              >
                Remove
              </button>
            </div>
          </div>
        </div>
      )}

      {loading || updatingHoliday ? (
        <p className="ar-message">Processing data...</p>
      ) : error ? (
        <p className="ar-message ar-error">{error}</p>
      ) : students.length ? (
        <div className="ar-scroll">
          <table>
            <thead>
              <tr>
                <th className="ar-student" rowSpan="2">
                  Roll No. / Student name
                </th>
                <th colSpan={data.calendar.length}>
                  Days of {monthLabel(month)}
                </th>
                <th colSpan="4">Monthly total</th>
              </tr>
              <tr>
                {data.calendar.map((day) => (
                  <th
                    key={day.date}
                    className={day.isWeeklyHoliday ? "ar-day-holiday" : ""}
                  >
                    {day.day}
                  </th>
                ))}
                <th>P</th>
                <th>A</th>
                <th>Days</th>
                <th>%</th>
              </tr>
            </thead>
            <tbody>
              {students.map((student) => (
                <tr key={student._id}>
                  <td className="ar-student">
                    <em>{student.rollNo || "—"}</em>/{student.name}
                  </td>
                  {data.calendar.map((day) => (
                    <td
                      key={day.date}
                      className={day.isWeeklyHoliday ? "ar-cell-holiday" : ""}
                    >
                      {mark(student, day)}
                    </td>
                  ))}
                  <td className="ar-present">{student.presentCount}</td>
                  <td className="ar-absent">{student.absentCount}</td>
                  <td>{student.totalDays}</td>
                  <td>
                    <i
                      className={
                        Number(student.percentage) >= 75 ? "ar-good" : "ar-low"
                      }
                    >
                      {student.percentage}%
                    </i>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="ar-message">Is class mein koi student nahi mila.</p>
      )}
      <footer>
        School working days un dates ko count karta hai jin din is class ki
        attendance mark ki gayi hai. Sunday aur manual select kiye gaye
        festivals ko holiday (H) dikhaya gaya hai.
      </footer>
    </div>
  );
}
