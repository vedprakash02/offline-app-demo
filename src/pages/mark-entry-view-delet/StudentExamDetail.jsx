import React, { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { FiArrowLeft, FiBookOpen, FiTrendingUp, FiUser } from "react-icons/fi";
import { SUMMARY_EXAMS } from "../../academicConfig";
import "./StudentExamDetail.css";

export default function StudentExamDetail() {
  const { studentId } = useParams();
  const [query] = useSearchParams();
  const navigate = useNavigate();
  const studentClass = query.get("class") || "";
  const session = query.get("session") || localStorage.getItem("activeSession") || "";
  const stream = query.get("stream") || "";
  const [student, setStudent] = useState(null);
  const [examData, setExamData] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const load = async () => {
      if (!studentClass || !session) { setError("Class ya session information missing hai."); setLoading(false); return; }
      try {
        const headers = { Authorization: `Bearer ${localStorage.getItem("token")}` };
        const responses = await Promise.all(SUMMARY_EXAMS.map((examType) => axios.get("http://localhost:3000/view-marks-matrix", { headers, params: { class: studentClass, academicYear: session, examType, ...(stream ? { stream } : {}) } })));
        const details = {}; let identity = null;
        responses.forEach((response, index) => {
          const exam = SUMMARY_EXAMS[index];
          const found = (response.data.studentsMatrix || []).find((item) => item.studentId === studentId);
          if (found) identity = identity || found;
          const rows = (response.data.subjects || []).map((subject) => {
            const mark = found?.marks?.[subject];
            const theory = mark ? Number(mark.theoryMarks || 0) : null;
            const practical = mark?.practicalEnabled ? Number(mark.practicalMarks || 0) : null;
            return { subject, theory, practical, maximum: Number(mark?.theoryMaxMarks || 75) + Number(mark?.practicalMaxMarks || 0), total: mark ? theory + (practical || 0) : null };
          });
          const entered = rows.filter((row) => row.total != null);
          const total = entered.reduce((sum, row) => sum + row.total, 0);
          const maximum = entered.reduce((sum, row) => sum + row.maximum, 0);
          details[exam] = { rows, total, maximum, percent: maximum ? Math.round(total / maximum * 100) : null };
        });
        if (!identity) throw new Error("Student is class/session mein nahi mila.");
        setStudent(identity); setExamData(details);
      } catch (requestError) { setError(requestError.response?.data?.message || requestError.message || "Student exam detail load nahi hui."); }
      finally { setLoading(false); }
    };
    load();
  }, [studentId, studentClass, session, stream]);

  const percents = SUMMARY_EXAMS.map((exam) => examData[exam]?.percent).filter((value) => value != null);
  const average = percents.length ? Math.round(percents.reduce((sum,value) => sum + value,0) / percents.length) : 0;

  const handleBack = () => {
    const query = new URLSearchParams({ class: studentClass, session, ...(stream ? { stream } : {}) });
    if (studentClass && session) {
      navigate(`/dashboard/exam-summary?${query.toString()}`);
    } else {
      navigate("/dashboard/exam-summary");
    }
  };

  return <main className="sed-page"><header className="sed-header"><button type="button" onClick={handleBack}><FiArrowLeft /> Summary</button><div className="sed-avatar"><FiUser /></div><div><span>STUDENT PERFORMANCE</span><h2>{student?.name || "Exam details"}</h2><p>{studentClass}{stream ? ` · ${stream}` : ""} · {session} · Roll {student?.rollNo || "—"}</p></div><div className="sed-average"><FiTrendingUp /><span>Average<strong>{average}%</strong></span></div></header>
    {loading ? <div className="sed-message">Loading subject-wise marks...</div> : error ? <div className="sed-message error">{error}</div> : <section className="sed-exams">{SUMMARY_EXAMS.map((exam) => { const data = examData[exam]; return <article className="sed-card" key={exam}><header><div><FiBookOpen /><span><strong>{exam}</strong><small>{data?.rows.filter((row) => row.total != null).length || 0} subjects entered</small></span></div><b className={(data?.percent || 0) >= 33 ? "pass" : "fail"}>{data?.percent == null ? "Pending" : `${data.percent}%`}</b></header><div className="sed-table"><table><thead><tr><th>Subject</th><th>Theory</th><th>Practical</th><th>Total</th></tr></thead><tbody>{data?.rows.length ? data.rows.map((row) => <tr key={row.subject}><td>{row.subject}</td><td>{row.theory ?? "—"}</td><td>{row.practical ?? "—"}</td><td><strong>{row.total ?? "—"}</strong></td></tr>) : <tr><td colSpan="4">No marks entered</td></tr>}</tbody></table></div><footer><span>Exam total</span><strong>{data?.maximum ? `${data.total} / ${data.maximum}` : "Pending"}</strong></footer></article>;})}</section>}
  </main>;
}
