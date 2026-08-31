import { useMemo, useState } from "react";
import axios from "axios";
import { FiAlertCircle, FiAward, FiCheckCircle, FiFileText, FiPrinter, FiSearch, FiUser } from "react-icons/fi";
import { SCHOOL_CLASSES, STREAMS } from "../../academicConfig";
import "./ModernTc.css";

const sessions = () => {
  const active = localStorage.getItem("activeSession") || "";
  const currentStart = new Date().getMonth() >= 3 ? new Date().getFullYear() : new Date().getFullYear() - 1;
  return [...new Set([active, ...Array.from({ length: 5 }, (_, index) => `${currentStart - 2 + index}-${currentStart - 1 + index}`)])].filter(Boolean).sort((first, second) => Number(first.split("-")[0]) - Number(second.split("-")[0]));
};

const formatDate = (value) => {
  if (!value) return "दर्ज नहीं";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "दर्ज नहीं" : date.toLocaleDateString("en-GB");
};

export default function ModernTc() {
  const [type, setType] = useState("TC");
  const [filters, setFilters] = useState({ academicSession: localStorage.getItem("activeSession") || "", studentClass: "", stream: "" });
  const [students, setStudents] = useState([]);
  const [student, setStudent] = useState(null);
  const [school, setSchool] = useState(null);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState(null);
  const [details, setDetails] = useState({ certificateNo: "", issueDate: new Date().toISOString().slice(0, 10), reasonForLeaving: "अभिभावक का स्थानांतरण", conduct: "उत्तम", character: "प्रशंसनीय" });

  const needsStream = ["11th", "12th"].includes(filters.studentClass);
  const filteredStudents = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return students;
    return students.filter((item) => [item.name, item.admissionNo, item.rollNo, item.fatherName].some((value) => String(value || "").toLowerCase().includes(term)));
  }, [query, students]);

  const changeFilter = ({ target: { name, value } }) => {
    setFilters((current) => ({ ...current, [name]: value, ...(name === "studentClass" && !["11th", "12th"].includes(value) ? { stream: "" } : {}) }));
    setStudents([]); setStudent(null); setQuery(""); setNotice(null);
  };

  const loadStudents = async (event) => {
    event.preventDefault();
    if (!filters.academicSession || !filters.studentClass || (needsStream && !filters.stream)) { setNotice({ type: "error", text: "Session, class aur required stream select karein." }); return; }
    setLoading(true); setNotice(null); setStudent(null);
    const headers = { Authorization: `Bearer ${localStorage.getItem("token")}` };
    try {
      const [studentResponse, schoolResponse] = await Promise.all([
        axios.get("http://localhost:3000/all-students", { headers, params: { academicSession: filters.academicSession, studentClass: filters.studentClass, search: "" } }),
        axios.get("http://localhost:3000/get-school-profile", { headers }),
      ]);
      const roster = (studentResponse.data || []).filter((item) => !needsStream || !filters.stream || String(item.stream || "").toLowerCase() === filters.stream.toLowerCase());
      setStudents(roster); setSchool(schoolResponse.data || null);
      setNotice({ type: roster.length ? "success" : "error", text: roster.length ? `${roster.length} students loaded. Certificate ke liye student select karein.` : "Selected class mein student nahi mila." });
    } catch (error) { setStudents([]); setNotice({ type: "error", text: error.response?.data?.message || "Student list load nahi hui." }); }
    finally { setLoading(false); }
  };

  const selectStudent = (item) => { setStudent(item); setDetails((current) => ({ ...current, certificateNo: current.certificateNo || String(item.admissionNo || "") })); };
  const updateDetails = ({ target: { name, value } }) => setDetails((current) => ({ ...current, [name]: value }));

  return <main className="certificate-page"><header className="certificate-hero no-print"><div className="certificate-hero-icon"><FiAward /></div><div><span>OFFICIAL DOCUMENTS</span><h1>TC & Character Certificate</h1><p>Student select karein, issue details update karein aur print-ready certificate banayein.</p></div><div className="certificate-session"><small>ACTIVE SESSION</small><strong>{filters.academicSession || "Not selected"}</strong></div></header><section className="certificate-workspace no-print"><div className="certificate-type-switch"><button className={type === "TC" ? "active" : ""} onClick={() => setType("TC")}><FiFileText /><span><strong>Transfer Certificate</strong><small>स्थानांतरण प्रमाण पत्र</small></span></button><button className={type === "CC" ? "active" : ""} onClick={() => setType("CC")}><FiAward /><span><strong>Character Certificate</strong><small>चरित्र प्रमाण पत्र</small></span></button></div><form className="certificate-filter" onSubmit={loadStudents}><div className="section-heading"><div><span>STEP 1</span><h2>Find student</h2></div><FiSearch /></div><div className="certificate-filter-grid"><Field label="Academic session"><select name="academicSession" value={filters.academicSession} onChange={changeFilter}><option value="">Select session</option>{sessions().map((item) => <option key={item}>{item}</option>)}</select></Field><Field label="Class"><select name="studentClass" value={filters.studentClass} onChange={changeFilter}><option value="">Select class</option>{SCHOOL_CLASSES.map((item) => <option key={item}>{item}</option>)}</select></Field>{needsStream && <Field label="Stream"><select name="stream" value={filters.stream} onChange={changeFilter}><option value="">Select stream</option>{STREAMS.map((item) => <option key={item}>{item}</option>)}</select></Field>}</div><button className="certificate-load" disabled={loading}>{loading ? "Loading students..." : <><FiSearch /> Load students</>}</button></form>{notice && <div className={`certificate-notice ${notice.type}`}>{notice.type === "success" ? <FiCheckCircle /> : <FiAlertCircle />}<span>{notice.text}</span></div>}{students.length > 0 && <section className="certificate-students"><div className="section-heading"><div><span>STEP 2</span><h2>Select student</h2></div><label><FiSearch /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search name, roll or admission no." /></label></div><div className="certificate-student-list">{filteredStudents.map((item) => <button type="button" className={student?._id === item._id ? "selected" : ""} key={item._id} onClick={() => selectStudent(item)}><i><FiUser /></i><span><strong>{item.name}</strong><small>{item.fatherName || "Father name unavailable"}</small></span><em>Roll {item.rollNo || "—"}</em>{student?._id === item._id && <FiCheckCircle />}</button>)}</div></section>}{student && <section className="certificate-details"><div className="section-heading"><div><span>STEP 3</span><h2>Issue details</h2></div><FiFileText /></div><div className="certificate-detail-grid"><Field label="Certificate number"><input name="certificateNo" value={details.certificateNo} onChange={updateDetails} placeholder="Enter serial number" /></Field><Field label="Issue date"><input type="date" name="issueDate" value={details.issueDate} onChange={updateDetails} /></Field>{type === "TC" ? <Field label="Reason for leaving"><input name="reasonForLeaving" value={details.reasonForLeaving} onChange={updateDetails} /></Field> : <><Field label="General conduct"><input name="conduct" value={details.conduct} onChange={updateDetails} /></Field><Field label="Character"><input name="character" value={details.character} onChange={updateDetails} /></Field></>}</div><button className="certificate-print-button" onClick={() => window.print()} type="button"><FiPrinter /> Print certificate</button></section>}</section>{student && <section className="certificate-preview"><div className="certificate-preview-label no-print"><span>LIVE PREVIEW</span><strong>{type === "TC" ? "Transfer Certificate" : "Character Certificate"}</strong></div><article className="certificate-paper"><header className="cert-header"><h2>{school?.schoolName || "विद्यालय का नाम"}</h2><p>{[school?.address, school?.block && `Block: ${school.block}`, school?.dist && `District: ${school.dist}`].filter(Boolean).join(" · ") || "विद्यालय का पूरा पता"}</p><div>{school?.udiseCode && <span>UDISE: {school.udiseCode}</span>}{school?.phone && <span>Phone: {school.phone}</span>}</div></header><div className="certificate-title"><span>{type === "TC" ? "स्थानांतरण प्रमाण पत्र" : "चरित्र प्रमाण पत्र"}</span><small>{type === "TC" ? "TRANSFER CERTIFICATE" : "CHARACTER CERTIFICATE"}</small></div><div className="certificate-meta"><span>क्रमांक: <strong>{details.certificateNo || "________"}</strong></span><span>प्रवेश क्रमांक: <strong>{student.admissionNo || "________"}</strong></span><span>दिनांक: <strong>{formatDate(details.issueDate)}</strong></span></div>{type === "TC" ? <p className="certificate-body">प्रमाणित किया जाता है कि <Blank>{student.name}</Blank> पुत्र/पुत्री श्री <Blank>{student.fatherName || "दर्ज नहीं"}</Blank> एवं श्रीमती <Blank>{student.motherName || "दर्ज नहीं"}</Blank> इस विद्यालय के नियमित विद्यार्थी रहे हैं। इनकी जन्म तिथि विद्यालय अभिलेख के अनुसार <Blank>{formatDate(student.dob)}</Blank> है। इन्होंने शैक्षणिक सत्र <Blank>{filters.academicSession}</Blank> में कक्षा <Blank>{filters.studentClass}{student.stream ? ` (${student.stream})` : ""}</Blank> में अध्ययन किया। विद्यालय छोड़ने का कारण <Blank>{details.reasonForLeaving}</Blank> है। हम इनके उज्ज्वल भविष्य की कामना करते हैं।</p> : <p className="certificate-body">प्रमाणित किया जाता है कि <Blank>{student.name}</Blank> पुत्र/पुत्री श्री <Blank>{student.fatherName || "दर्ज नहीं"}</Blank> इस विद्यालय के नियमित विद्यार्थी रहे हैं। इन्होंने शैक्षणिक सत्र <Blank>{filters.academicSession}</Blank> में कक्षा <Blank>{filters.studentClass}{student.stream ? ` (${student.stream})` : ""}</Blank> में अध्ययन किया। विद्यालय में इनका सामान्य व्यवहार <Blank>{details.conduct}</Blank> तथा चरित्र <Blank>{details.character}</Blank> रहा है। हम इनके उज्ज्वल भविष्य की कामना करते हैं।</p>}<footer className="certificate-signatures"><div><span></span><strong>कक्षा शिक्षक</strong></div><div><span></span><strong>कार्यालय प्रभारी</strong></div><div><span></span><strong>प्राचार्य</strong></div></footer></article></section>}</main>;
}

const Field = ({ label, children }) => <label className="certificate-field"><span>{label}</span>{children}</label>;
const Blank = ({ children }) => <strong className="certificate-blank">{children}</strong>;

