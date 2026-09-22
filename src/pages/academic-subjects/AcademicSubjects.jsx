import { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { FiArrowLeft, FiBookOpen, FiCheck, FiPlus, FiTrash2 } from "react-icons/fi";
import "./AcademicSubjects.css";

const API_URL = "http://localhost:3000";
const CLASSES = ["Nursery", "KG1", "KG2", "1st", "2nd", "3rd", "4th", "5th", "6th", "7th", "8th", "9th", "10th", "11th", "12th"];
const defaultSubjects = ["Hindi", "English", "Mathematics", "Environmental Studies"];
const SUBJECT_OPTIONS = ["Hindi", "English", "Mathematics", "Environmental Studies", "Science", "Social Science", "General Knowledge", "Computer", "Drawing", "Art & Craft", "Physical Education", "Sanskrit", "Urdu", "Information Technology", "Physics", "Chemistry", "Biology", "Accountancy", "Business Studies", "Economics", "History", "Geography", "Political Science"];
const STREAMS = ["Science", "Arts", "Commerce", "Computer", "Vocational"];
const STREAM_SUBJECTS = {
  Science: ["Physics", "Chemistry", "Mathematics", "Biology", "English"],
  Arts: ["History", "Geography", "Political Science", "Economics", "English"],
  Commerce: ["Accountancy", "Business Studies", "Economics", "Mathematics", "English"],
  Computer: ["Computer", "Information Technology", "Mathematics", "English"],
  Vocational: ["Computer", "English", "Mathematics", "General Knowledge"],
};
const headers = () => ({ Authorization: `Bearer ${localStorage.getItem("token")}` });

export default function AcademicSubjects() {
  const navigate = useNavigate();
  const session = localStorage.getItem("activeSession") || "";
  const [className, setClassName] = useState("Nursery");
  const [stream, setStream] = useState("");
  const [subjects, setSubjects] = useState(defaultSubjects);
  const [savedClasses, setSavedClasses] = useState({});
  const [newSubject, setNewSubject] = useState("");
  const [customSubject, setCustomSubject] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const isSenior = ["11th", "12th"].includes(className);
  const classKey = `${className}${isSenior && stream ? `|${stream}` : ""}`;

  useEffect(() => {
    if (!session) {
      setLoading(false);
      setNotice("Pehle academic session select karein.");
      return undefined;
    }
    const controller = new AbortController();
    const load = async () => {
      setLoading(true);
      try {
        const { data } = await axios.get(`${API_URL}/academic/class-subjects`, {
          params: { academicSession: session },
          headers: headers(),
          signal: controller.signal,
        });
        setSavedClasses(data.classes || {});
        setSubjects(data.classes?.[classKey] || (stream ? STREAM_SUBJECTS[stream] : defaultSubjects));
        setNotice("");
      } catch (error) {
        if (error.code !== "ERR_CANCELED") setNotice(error.response?.data?.message || "Subjects load nahi hue.");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };
    load();
    return () => controller.abort();
  }, [classKey, session, stream]);

  const selectClass = (value) => {
    setClassName(value);
    if (!["11th", "12th"].includes(value)) setStream("");
  };

  const addSubject = () => {
    const value = newSubject === "Other" ? customSubject.trim() : newSubject;
    if (!value || subjects.some((subject) => subject.toLowerCase() === value.toLowerCase())) return;
    setSubjects((current) => [...current, value]);
    setNewSubject("");
    setCustomSubject("");
    setNotice("");
  };

  const save = async () => {
    if (!session) return setNotice("Pehle academic session select karein.");
    if (isSenior && !stream) return setNotice("11th/12th ke liye stream select karein.");
    if (!subjects.length) return setNotice("Kam se kam ek subject add karein.");
    setSaving(true);
    setNotice("");
    try {
      const { data } = await axios.post(`${API_URL}/academic/class-subjects`, {
        academicSession: session,
        className,
        stream: isSenior ? stream : "",
        subjects,
      }, { headers: headers() });
      setSavedClasses((current) => ({ ...current, [classKey]: data.subjects || subjects }));
      setNotice(data.message || "Subjects saved successfully.");
    } catch (error) {
      setNotice(error.response?.data?.message || "Subjects save nahi hue.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="academic-subject-page">
      <header className="academic-subject-hero">
        <button type="button" onClick={() => navigate("/dashboard")}><FiArrowLeft /> Dashboard</button>
        <div><span>ACADEMIC SETUP</span><h1>Class subjects</h1><p>Har class ke liye school ke subjects customize karein.</p></div>
        <strong>{session || "Session not selected"}</strong>
      </header>
      <section className="academic-subject-layout">
        <aside className="academic-subject-card class-picker">
          <div className="academic-heading"><FiBookOpen /><div><span>Step 1</span><h2>Select class</h2></div></div>
          <div className="class-options">{CLASSES.map((item) => <button type="button" className={item === className ? "active" : ""} key={item} onClick={() => selectClass(item)}>{item}</button>)}</div>
        </aside>
        <section className="academic-subject-card subject-editor">
          <div className="academic-heading"><FiBookOpen /><div><span>Step 2</span><h2>{className}{stream ? ` · ${stream}` : ""} subjects</h2></div></div>
          {isSenior && <label className="stream-picker"><span>Stream</span><select value={stream} onChange={(event) => setStream(event.target.value)}><option value="">Select stream</option>{STREAMS.map((item) => <option value={item} key={item}>{item}</option>)}</select></label>}
          <p className="academic-help">List se subject select karein. Agar subject na mile to last me Other choose karein.</p>
          {loading ? <p>Subjects load ho rahe hain...</p> : <>
            <div className="subject-add"><select value={newSubject} onChange={(event) => setNewSubject(event.target.value)}><option value="">Select a subject</option>{(STREAM_SUBJECTS[stream] || SUBJECT_OPTIONS).filter((subject) => !subjects.includes(subject)).map((subject) => <option value={subject} key={subject}>{subject}</option>)}<option value="Other">Other</option></select>{newSubject === "Other" && <input value={customSubject} onChange={(event) => setCustomSubject(event.target.value)} placeholder="Type custom subject" maxLength="80" />}<button type="button" onClick={addSubject}><FiPlus /> Add subject</button></div>
            <div className="subject-list">{subjects.map((subject) => <div className="subject-row" key={subject}><span>{subject}</span><button type="button" onClick={() => setSubjects((current) => current.filter((item) => item !== subject))} aria-label={`Remove ${subject}`}><FiTrash2 /></button></div>)}</div>
            <div className="academic-save-row">{notice && <span className={notice.includes("success") ? "success" : "error"}>{notice.includes("success") && <FiCheck />}{notice}</span>}<button type="button" className="academic-save" onClick={save} disabled={saving}>{saving ? "Saving..." : "Save subjects"}</button></div>
          </>}
        </section>
      </section>
      <section className="saved-subjects-card"><div className="academic-heading"><FiCheck /><div><span>Saved setup</span><h2>Class-wise subjects</h2></div></div>{Object.keys(savedClasses).length ? <div className="saved-subjects-grid">{Object.entries(savedClasses).map(([key, list]) => { const [savedClass, savedStream] = key.split("|"); return <article key={key}><strong>{savedClass}{savedStream ? ` · ${savedStream}` : ""}</strong><span>{list.join(" · ")}</span></article>; })}</div> : <p className="academic-help">Abhi kisi class ke subjects save nahi hue.</p>}</section>
    </main>
  );
}
