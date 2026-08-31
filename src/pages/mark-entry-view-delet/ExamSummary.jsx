import React, { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate, useSearchParams } from "react-router-dom";
import { FiAlertCircle, FiBarChart2, FiSearch, FiTrendingUp, FiUsers } from "react-icons/fi";
import { SCHOOL_CLASSES, STREAMS, SUMMARY_EXAMS } from "../../academicConfig";
import "./ExamSummary.css";
import "./ExamSummaryClickable.css";

const examScore = (student, subjectMeta = {}) => {
  const entries = Object.values(student?.marks || {});
  if (!entries.length) return { total: 0, maximum: 0, percent: null };
  const total = entries.reduce((sum, mark) => sum + Number(mark.theoryMarks || 0) + (mark.practicalEnabled ? Number(mark.practicalMarks || 0) : 0), 0);
  const maximum = Object.entries(student?.marks || {}).reduce((sum, [subject, mark]) => sum + Number(subjectMeta[subject]?.theoryMaxMarks || mark.theoryMaxMarks || 75) + Number(subjectMeta[subject]?.practicalMaxMarks || mark.practicalMaxMarks || 0), 0);
  return { total, maximum, percent: maximum ? Math.round(total / maximum * 100) : null };
};

export default function ExamSummary() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeSession, setActiveSession] = useState(localStorage.getItem("activeSession") || "");
  const [filters, setFilters] = useState({ class: "", stream: "" });
  const [rows, setRows] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const updateUrlParams = (params) => {
    const next = {
      ...Object.fromEntries(searchParams),
      ...params,
    };
    if (!next.class) delete next.class;
    if (!next.stream) delete next.stream;
    if (!next.session) delete next.session;
    setSearchParams(next, { replace: true });
  };

  const changeFilter = ({ target: { name, value } }) => {
    const nextFilters = {
      ...filters,
      [name]: value,
      ...(name === "class" ? { stream: "" } : {}),
    };
    setFilters(nextFilters);
    updateUrlParams({ class: nextFilters.class, stream: nextFilters.stream, session: activeSession });
    setRows([]);
    setError("");
  };

  const loadSummary = async (preFilters = filters, sessionValue = activeSession) => {
    if (!preFilters.class || (["11th","12th"].includes(preFilters.class) && !preFilters.stream)) return setError("Required filters select karein.");
    setLoading(true);
    setError("");
    updateUrlParams({ class: preFilters.class, stream: preFilters.stream, session: sessionValue });
    try {
      const headers = { Authorization: `Bearer ${localStorage.getItem("token")}` };
      const responses = await Promise.all(SUMMARY_EXAMS.map((examType) => axios.get("http://localhost:3000/view-marks-matrix", { headers, params: { class: preFilters.class, academicYear: sessionValue, examType, ...(preFilters.stream ? { stream: preFilters.stream } : {}) } })));
      const studentMap = new Map();
      responses.forEach((response, index) => {
        const exam = SUMMARY_EXAMS[index];
        (response.data.studentsMatrix || []).forEach((student) => {
          if (!studentMap.has(student.studentId)) studentMap.set(student.studentId, { studentId: student.studentId, admissionNo: student.admissionNo, rollNo: student.rollNo, name: student.name, exams: {} });
          studentMap.get(student.studentId).exams[exam] = examScore(student, response.data.subjectMeta || {});
        });
      });
      setRows([...studentMap.values()].sort((a,b) => (a.rollNo || 99999) - (b.rollNo || 99999) || a.name.localeCompare(b.name)));
    } catch (requestError) { setRows([]); setError(requestError.response?.data?.message || "Summary load nahi ho payi."); }
    finally { setLoading(false); }
  };

  const visibleRows = rows.filter((row) => row.name.toLowerCase().includes(search.toLowerCase()) || String(row.rollNo || "").includes(search));
  const completedScores = rows.flatMap((row) => SUMMARY_EXAMS.map((exam) => row.exams[exam]?.percent).filter((value) => value != null));
  const classAverage = completedScores.length ? Math.round(completedScores.reduce((sum,value) => sum + value,0) / completedScores.length) : 0;

  useEffect(() => {
    const queryClass = searchParams.get("class");
    if (!queryClass) return;

    const queryStream = searchParams.get("stream") || "";
    const querySession = searchParams.get("session") || localStorage.getItem("activeSession") || "";
    const parsedFilters = {
      class: queryClass,
      stream: ["11th","12th"].includes(queryClass) ? queryStream : "",
    };

    setFilters(parsedFilters);
    if (querySession && querySession !== activeSession) {
      setActiveSession(querySession);
    }
    loadSummary(parsedFilters, querySession);
  }, [searchParams]);

  const openStudent = (row) => {
    const query = new URLSearchParams({ class: filters.class, session: activeSession, ...(filters.stream ? { stream: filters.stream } : {}) });
    navigate(`/dashboard/exam-summary/student/${row.studentId}?${query.toString()}`);
  };

  return <main className="es-page">
    <header className="es-header"><div className="es-icon"><FiBarChart2 /></div><div><span>EXAM CONTROL</span><h2>Exam Summary</h2><p>Quarterly, Half-Yearly aur Annual performance comparison. Unit Test ka report alag page par hai.</p></div><div className="es-session"><span>Academic session</span><strong>{activeSession}</strong></div></header>
    {error && <div className="es-alert"><FiAlertCircle />{error}</div>}
    <section className="es-toolbar"><label><span>Class</span><select name="class" value={filters.class} onChange={changeFilter}><option value="">Select class</option>{SCHOOL_CLASSES.map((item) => <option key={item}>{item}</option>)}</select></label><label><span>Stream</span><select name="stream" value={filters.stream} onChange={changeFilter} disabled={!['11th','12th'].includes(filters.class)}><option value="">Select stream</option>{STREAMS.map((item) => <option key={item}>{item}</option>)}</select></label><label className="es-search"><span>Find student</span><div><FiSearch /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Name or roll no." disabled={!rows.length} /></div></label><button type="button" onClick={loadSummary} disabled={loading}><FiBarChart2 />{loading ? "Loading..." : "Generate summary"}</button></section>
    <section className="es-register"><div className="es-stats"><div><FiUsers /><span>Students<strong>{rows.length}</strong></span></div><div><FiTrendingUp /><span>Class average<strong>{classAverage}%</strong></span></div><small>Percentages har subject ke saved marking pattern par based hain.</small></div><div className="es-table-wrap">{visibleRows.length ? <table><thead><tr><th>Roll No.</th><th>Student</th>{SUMMARY_EXAMS.map((exam) => <th key={exam}>{exam}</th>)}<th>Average</th><th>Trend</th></tr></thead><tbody>{visibleRows.map((row) => { const scores = SUMMARY_EXAMS.map((exam) => row.exams[exam]?.percent ?? null); const available = scores.filter((score) => score != null); const average = available.length ? Math.round(available.reduce((sum,value) => sum + value,0) / available.length) : null; const first = available[0], last = available[available.length - 1]; return <tr key={row.studentId}><td>{row.rollNo || "â€”"}</td><td><button type="button" className="es-name" onClick={() => openStudent(row)}>{row.name}<small>{row.admissionNo}</small></button></td>{SUMMARY_EXAMS.map((exam) => { const score = row.exams[exam]; return <td key={exam}>{score?.percent != null ? <span className={score.percent >= 33 ? "pass" : "fail"}><strong>{score.percent}%</strong><small>{score.total}/{score.maximum}</small></span> : <i>Pending</i>}</td>;})}<td><strong>{average == null ? "â€”" : `${average}%`}</strong></td><td><b className={first != null && last > first ? "up" : first != null && last < first ? "down" : "same"}>{first == null || last === first ? "â€”" : last > first ? `â†‘ ${last-first}%` : `â†“ ${first-last}%`}</b></td></tr>;})}</tbody></table> : <div className="es-empty"><FiBarChart2 /><strong>Select class and generate summary</strong><span>Three exam results ek table mein compare honge.</span></div>}</div></section>
  </main>;
}

