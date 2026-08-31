import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FiArrowRight, FiBookOpen, FiCalendar, FiCheckCircle, FiShield } from "react-icons/fi";
import "./ModernSession.css";

export default function ModernSession() {
  const sessions = useMemo(() => {
    const now = new Date();
    const baseYear = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
    return Array.from({ length: 5 }, (_, index) => {
      const start = baseYear - 1 + index;
      return `${start}-${start + 1}`;
    });
  }, []);
  const savedSession = localStorage.getItem("activeSession");
  const [selectedSession, setSelectedSession] = useState(savedSession && sessions.includes(savedSession) ? savedSession : sessions[1]);
  const navigate = useNavigate();
  const submit = (event) => { event.preventDefault(); localStorage.setItem("activeSession", selectedSession); navigate("/dashboard"); };

  return <main className="session-page"><section className="session-shell">
    <aside className="session-intro"><div className="session-brand"><FiBookOpen /> Vidya prabandh</div><div className="session-intro-copy"><span className="session-kicker">Academic workspace</span><h1>Choose the session you want to work in.</h1><p>New admissions will be saved under this academic session. You can switch it later from the sidebar.</p></div><div className="session-safety"><FiShield /><span><strong>Safe selection</strong>Existing student records are not changed when you switch sessions.</span></div></aside>
    <div className="session-panel"><div className="session-icon"><FiCalendar /></div><span className="session-eyebrow">SELECT WORKING SESSION</span><h2>Academic year</h2><p className="session-subtitle">Select carefully before adding new students.</p>
      {savedSession && <div className="current-session"><FiCheckCircle /><span>Currently active<strong>{savedSession}</strong></span></div>}
      <form onSubmit={submit} className="session-form"><label htmlFor="academic-session">Academic session</label><div className="session-select-wrap"><FiCalendar /><select id="academic-session" value={selectedSession} onChange={(event) => setSelectedSession(event.target.value)}>{sessions.map((session) => <option key={session} value={session}>{session}{session === savedSession ? " — Active" : ""}</option>)}</select></div><button type="submit" className="session-button"><span>{selectedSession === savedSession ? "Continue to dashboard" : "Use this session"}</span><FiArrowRight /></button></form>
      <p className="session-note">This selection is stored locally on this device.</p>
    </div>
  </section></main>;
}
