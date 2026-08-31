import React, { useMemo, useState } from "react";
import axios from "axios";
import "./StudentPromotion.css";

const classes = ["9th", "10th", "11th", "12th"];
const streams = ["Science", "Commerce", "Arts"];
const now = new Date();
const sessionBase = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
const sessions = Array.from({ length: 5 }, (_, index) => `${sessionBase - 2 + index}-${sessionBase - 1 + index}`);
const exams = ["Annual", "Half-Yearly", "Quarterly", "Unit Test 1"];

const nextClassMap = {
  "9th": "10th",
  "10th": "11th",
  "11th": "12th",
  "12th": "",
};

// 💡 AUTOMATIC NEXT ACADEMIC SESSION NIKALNE KA LOGIC
const getNextSession = (currentSession) => {
  if (!currentSession) return "";
  const parts = currentSession.split("-");
  if (parts.length !== 2) return "";
  const startYear = parseInt(parts[0], 10) + 1;
  const endYear = parseInt(parts[1], 10) + 1;
  return `${startYear}-${endYear}`;
};

const formatScoreDetails = (score) => {
  if (score == null) return { total: null };
  if (typeof score === "object") {
    const theory = score.theory ?? score.theoryMarks ?? 0;
    const practical = score.practical ?? score.practicalMarks ?? 0;
    return { total: score.total ?? theory + practical };
  }
  return { total: Number(score) };
};

const calculateResult = (student, subjects, subjectMeta) => {
  if (!subjects.length) {
    return {
      result: "No Marks",
      total: 0,
      percentage: 0,
      canPromote: false,
    };
  }

  let total = 0;
  let failedSubject = false;
  let maximum = 0;

  subjects.forEach((subject) => {
    const { total: subjectTotal } = formatScoreDetails(student.marks?.[subject]);
    if (subjectTotal == null || subjectTotal < 33) {
      failedSubject = true;
    }
    total += Number(subjectTotal || 0);
    maximum += Number(subjectMeta[subject]?.theoryMaxMarks || 75) + Number(subjectMeta[subject]?.practicalMaxMarks || 0);
  });

  const percentage = maximum ? Math.round((total / maximum) * 100) : 0;
  const canPromote = !failedSubject && percentage >= 33;

  return {
    result: canPromote ? "Passed" : "Failed",
    total,
    percentage,
    canPromote,
  };
};

function StudentPromotion() {
  const [filters, setFilters] = useState({
    class: "",
    stream: "",
    academicYear: localStorage.getItem("activeSession") || "2025-2026",
    examType: "Annual",
  });
  const [students, setStudents] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [marksMatrix, setMarksMatrix] = useState([]);
  const [subjectMeta, setSubjectMeta] = useState({});
  const [targetStreams, setTargetStreams] = useState({});
  const [loading, setLoading] = useState(false);
  const [promotingId, setPromotingId] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const selectedNextClass = nextClassMap[filters.class] || "";
  
  // ⚡ Live target session calculate ho raha hai pichli choice ke hisab se
  const targetAcademicSession = getNextSession(filters.academicYear);

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({
      ...prev,
      [name]: value,
      ...(name === "class" ? { stream: "" } : {}),
    }));
    setStudents([]);
    setSubjects([]);
    setMarksMatrix([]);
    setSubjectMeta({});
    setMessage("");
    setError("");
  };

  const fetchPromotionList = async () => {
    if (!filters.class) {
      setError("Kripya class select karein.");
      return;
    }
    if ((filters.class === "11th" || filters.class === "12th") && !filters.stream) {
      setError("Kripya 11th/12th ke liye stream select karein.");
      return;
    }

    const token = localStorage.getItem("token");
    if (!token) {
      setError("Session expire ho gaya hai. Kripya login karein.");
      return;
    }

    setLoading(true);
    setMessage("");
    setError("");

    try {
      const config = { headers: { Authorization: `Bearer ${token}` } };
      const [studentsRes, marksRes] = await Promise.all([
        axios.get("http://localhost:3000/all-students", {
          ...config,
          params: { studentClass: filters.class, search: "", academicSession: filters.academicYear },
        }),
        axios.get("http://localhost:3000/view-marks-matrix", {
          ...config,
          params: {
            class: filters.class,
            academicYear: filters.academicYear,
            examType: filters.examType,
            stream: filters.stream,
          },
        }),
      ]);

      const filteredStudents = (studentsRes.data || []).filter((student) => {
        if (filters.class !== student.class) return false;
        if ((filters.class === "11th" || filters.class === "12th") && filters.stream) {
          return student.stream?.toLowerCase() === filters.stream.toLowerCase();
        }
        return true;
      });

      setStudents(filteredStudents);
      setSubjects(marksRes.data?.subjects || []);
      setMarksMatrix(marksRes.data?.studentsMatrix || []);
      setSubjectMeta(marksRes.data?.subjectMeta || {});
    } catch (err) {
      console.error("Promotion list load error:", err);
      setStudents([]);
      setSubjects([]);
      setMarksMatrix([]);
      setError(err.response?.data?.message || "Student promotion list load nahi ho payi.");
    } finally {
      setLoading(false);
    }
  };

  const studentRows = useMemo(() => {
    const marksByStudentId = {};
    marksMatrix.forEach((student) => {
      marksByStudentId[student.studentId] = student;
    });

    return students.map((student) => {
      const marksStudent = marksByStudentId[student._id] || {};
      const resultSummary = calculateResult(marksStudent, subjects, subjectMeta);

      return {
        ...student,
        marksStudent,
        resultSummary,
      };
    });
  }, [students, marksMatrix, subjects, subjectMeta]);

  // 🛠️ NAYE BACKEND EXCLUSIVE ROUTE KE MUTABIK UPDATED LOGIC
  const promoteStudent = async (student) => {
    const nextClass = nextClassMap[student.class];
    const selectedStream = targetStreams[student._id] || student.stream || "";

    if (!nextClass) {
      setError("12th ke baad next class set nahi hai.");
      return;
    }
    if ((nextClass === "11th" || nextClass === "12th") && !selectedStream) {
      setError("Promotion ke liye target stream select karein.");
      return;
    }
    if (!targetAcademicSession) {
      setError("Naya academic session target taiyar nahi ho paya.");
      return;
    }

    const confirmPromote = window.confirm(
      `${student.name} ko ${student.class} se ${nextClass} me (${targetAcademicSession}) session me promote karna hai?`
    );
    if (!confirmPromote) return;

    setPromotingId(student._id);
    setMessage("");
    setError("");

    const token = localStorage.getItem("token");

    try {
      // Clean JSON data bheja ja raha hai bina image file jhanjhat ke
      const payload = {
        nextClass: nextClass,
        nextStream: nextClass === "11th" || nextClass === "12th" ? selectedStream : "",
        nextAcademicSession: targetAcademicSession,
        currentClass: student.class,
        currentAcademicSession: filters.academicYear,
        examType: filters.examType,
      };

      const res = await axios.put(`http://localhost:3000/promote-student/${student._id}`, payload, {
        headers: { 
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
      });

      setMessage(res.data?.message || `${student.name} successfully promote ho gaya.`);
      // List se hata rahe hain kyunki ab woh naye session aur class me ja chuka hai
      setStudents((prev) => prev.filter((item) => item._id !== student._id));
    } catch (err) {
      console.error("Student promote error:", err);
      setError(err.response?.data?.message || "Student promote nahi ho paya.");
    } finally {
      setPromotingId("");
    }
  };


   return (
    <div className="student-promo-container">
      <div className="student-promo-header">
        <div>
          <h2>Student Promotion</h2>
          <p>Class-wise result check karke passed students ko next class me bhejein.</p>
        </div>
      </div>

      {message && <div className="student-promo-alert success">{message}</div>}
      {error && <div className="student-promo-alert danger">{error}</div>}

      <div className="student-promo-filter-panel">
        <div className="student-promo-input-group">
          <label>Class</label>
          <select name="class" value={filters.class} onChange={handleFilterChange}>
            <option value="">Select Class</option>
            {classes.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </div>

        {(filters.class === "11th" || filters.class === "12th") && (
          <div className="student-promo-input-group">
            <label>Stream</label>
            <select name="stream" value={filters.stream} onChange={handleFilterChange}>
              <option value="">Select Stream</option>
              {streams.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="student-promo-input-group">
          <label>Session</label>
          <select name="academicYear" value={filters.academicYear} onChange={handleFilterChange}>
            {sessions.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </div>

        <div className="student-promo-input-group">
          <label>Exam</label>
          <select name="examType" value={filters.examType} onChange={handleFilterChange}>
            {exams.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </div>

        <button type="button" className="student-promo-load-btn" onClick={fetchPromotionList} disabled={loading}>
          {loading ? "Loading..." : "Load Students"}
        </button>
      </div>

      <div className="student-promo-summary">
        <span>Total: {studentRows.length}</span>
        <span>Passed: {studentRows.filter((student) => student.resultSummary.canPromote).length}</span>
        <span>Next Class: {selectedNextClass || "Not Available"}</span>
        {/* Naye target session ka name upar counter bar me dikhane ke liye */}
        <span className="student-promo-target-session">
          Target Session: {targetAcademicSession || "N/A"}
        </span>
      </div>

      <div className="student-promo-table-wrap">
        <table className="student-promo-table">
          <thead>
            <tr>
              <th>S.No</th>
              <th>Roll No</th>
              <th>Admission No</th>
              <th>Student Name</th>
              <th>Father Name</th>
              <th>Current Class</th>
              <th>Marks</th>
              <th>Percentage</th>
              <th>Result</th>
              <th>Promote To</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {studentRows.length > 0 ? (
              studentRows.map((student, index) => {
                const { resultSummary } = student;
                const nextClass = nextClassMap[student.class];
                const rowNeedsStream = nextClass === "11th" || nextClass === "12th";

                return (
                  <tr key={student._id}>
                    <td>{index + 1}</td>
                    <td>{student.rollNo || "N/A"}</td>
                    <td>{student.admissionNo || "N/A"}</td>
                    <td className="student-promo-name">{student.name}</td>
                    <td>{student.fatherName || "N/A"}</td>
                    <td>
                      {student.class} {student.stream ? `(${student.stream})` : ""}
                    </td>
                    <td>
                      {resultSummary.total}/{subjects.length * 100 || 0}
                    </td>
                    <td>{resultSummary.percentage}%</td>
                    <td>
                      <span className={`student-promo-badge ${resultSummary.canPromote ? "pass" : "fail"}`}>
                        {resultSummary.result}
                      </span>
                    </td>
                    <td>
                      {nextClass ? (
                        <div className="student-promo-target">
                          <span>{nextClass}</span>
                          {rowNeedsStream && (
                            <select
                              value={targetStreams[student._id] || student.stream || ""}
                              onChange={(e) =>
                                setTargetStreams((prev) => ({
                                  ...prev,
                                  [student._id]: e.target.value,
                                }))
                              }
                            >
                              <option value="">Stream</option>
                              {streams.map((item) => (
                                <option key={item} value={item}>
                                  {item}
                                </option>
                              ))}
                            </select>
                          )}
                        </div>
                      ) : (
                        "Completed"
                      )}
                    </td>
                    <td>
                      <button
                        type="button"
                        className="student-promo-action-btn"
                        disabled={!resultSummary.canPromote || !nextClass || promotingId === student._id}
                        onClick={() => promoteStudent(student)}
                      >
                        {promotingId === student._id ? "Promoting..." : "Promote"}
                      </button>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan="11" className="student-promo-empty">
                  Class filter select karke students load karein.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default StudentPromotion;
