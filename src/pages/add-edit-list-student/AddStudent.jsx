import { useEffect, useRef, useState } from "react";
import axios from "axios";
import { FiArrowRight, FiCamera, FiCheckCircle, FiInfo, FiUploadCloud, FiUser, FiX } from "react-icons/fi";
import Loding from "../Loding";
import "./AddStudent.css";

const EMPTY = { name: "", fatherName: "", motherName: "", dob: "", gender: "", cast: "", class: "", stream: "", address: "", phone: "", AadhaarNo: "" };
const CLASSES = ["Nursery", "KG1", "KG2", "1st", "2nd", "3rd", "4th", "5th", "6th", "7th", "8th", "9th", "10th", "11th", "12th"];

export default function AddStudent() {
  const [form, setForm] = useState(EMPTY);
  const [photo, setPhoto] = useState(null);
  const [preview, setPreview] = useState("");
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState(null);
  const fileInput = useRef(null);
  const session = localStorage.getItem("activeSession") || "Not selected";

  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);
  const change = ({ target: { name, value } }) => {
    setNotice(null);
    setForm((old) => ({ ...old, [name]: value, ...(name === "class" && !["11th", "12th"].includes(value) ? { stream: "" } : {}) }));
  };
  const clearPhoto = () => { setPhoto(null); setPreview(""); if (fileInput.current) fileInput.current.value = ""; };
  const selectPhoto = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/") || file.size > 5 * 1024 * 1024) {
      event.target.value = "";
      return setNotice({ type: "error", text: "Choose a JPG, PNG or WebP image under 5 MB." });
    }
    setPhoto(file); setPreview(URL.createObjectURL(file)); setNotice(null);
  };
  const submit = async (event) => {
    event.preventDefault();
    const activeSession = localStorage.getItem("activeSession");
    if (!activeSession) return setNotice({ type: "error", text: "Select an academic session before admission." });
    if (!photo) return setNotice({ type: "error", text: "A student photo is required." });
    if (!/^\d{10}$/.test(form.phone)) return setNotice({ type: "error", text: "Enter a valid 10-digit phone number." });
    setLoading(true); setNotice(null);
    try {
      const body = new FormData();
      Object.entries(form).forEach(([key, value]) => body.append(key, value.trim()));
      body.append("academicSession", activeSession); body.append("profileimage", photo);
      const { data } = await axios.post("http://localhost:3000/admission", body, { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } });
      setNotice({ type: "success", text: `${data.student.name} admitted successfully Â· ${data.student.admissionNo}` });
      setForm(EMPTY); clearPhoto();
    } catch (error) { setNotice({ type: "error", text: error.response?.data?.message || "Admission could not be saved. Please try again." }); }
    finally { setLoading(false); }
  };

  return <main className="student-admission"><Loding loading={loading} />
    <header className="sa-hero"><div><span>STUDENT MANAGEMENT</span><h1>New student admission</h1><p>Create a complete profile for the current academic session.</p></div><div className="sa-session"><small>ACTIVE SESSION</small><strong>{session}</strong></div></header>
    {notice && <div className={`sa-notice ${notice.type}`} role="alert"><span className="sa-notice-text">{notice.type === "success" ? <FiCheckCircle /> : <FiInfo />}{notice.text}</span><button className="sa-notice-close" type="button" onClick={() => setNotice(null)} aria-label="Close message"><FiX /></button></div>}
    <form className="sa-layout" onSubmit={submit}><section className="sa-card"><Heading icon={<FiUser />} title="Student details" text="Fields marked with * are required" /><div className="sa-grid">
      <Field label="Student name" name="name" value={form.name} onChange={change} placeholder="e.g. Aarav Sharma" /><Field label="Date of birth" name="dob" type="date" max={new Date().toISOString().slice(0, 10)} value={form.dob} onChange={change} />
      <Field label="Father's name" name="fatherName" value={form.fatherName} onChange={change} placeholder="Enter father's full name" /><Field label="Mother's name" name="motherName" value={form.motherName} onChange={change} placeholder="Enter mother's full name" />
      <Choice label="Gender" name="gender" value={form.gender} onChange={change} items={["Male", "Female", "Other"]} /><Choice label="Category" name="cast" value={form.cast} onChange={change} items={["gen", "obc", "sc", "st"]} />
      <Choice label="Class / grade" name="class" value={form.class} onChange={change} items={CLASSES} />{["11th", "12th"].includes(form.class) && <Choice label="Stream" name="stream" value={form.stream} onChange={change} items={["Science", "Arts", "Commerce"]} />}
      <Field label="Phone number" name="phone" value={form.phone} onChange={(e) => /^\d{0,10}$/.test(e.target.value) && change(e)} pattern="[0-9]{10}" inputMode="numeric" placeholder="10-digit mobile number" /><label className="sa-field"><span>Aadhaar number (optional)</span><input name="AadhaarNo" value={form.AadhaarNo} onChange={(e) => /^\d{0,12}$/.test(e.target.value) && change(e)} pattern="[0-9]{12}" inputMode="numeric" placeholder="12-digit Aadhaar number" /></label><Field label="Permanent address" name="address" value={form.address} onChange={change} placeholder="House, street, city and state" wide />
    </div></section><aside className="sa-side"><section className="sa-card"><Heading icon={<FiCamera />} title="Student photo" text="Clear, front-facing photo" /><button type="button" className={`sa-photo ${preview ? "ready" : ""}`} onClick={() => fileInput.current?.click()}>{preview ? <img src={preview} alt="Student preview" /> : <><FiUploadCloud /><strong>Upload a photo</strong><small>JPG, PNG or WebP Â· max 5 MB</small></>}</button><input ref={fileInput} hidden type="file" accept="image/jpeg,image/png,image/webp" onChange={selectPhoto} />{photo && <div className="sa-file"><FiCheckCircle /><span>{photo.name}</span><button type="button" onClick={clearPhoto}>Remove</button></div>}</section><div className="sa-tip"><FiInfo /><p><strong>Before you submit</strong><br />Check spelling and date of birth. Admission number is generated automatically.</p></div><button className="sa-submit" disabled={loading}>{loading ? "Saving admission..." : <>Complete admission <FiArrowRight /></>}</button></aside></form>
  </main>;
}
const Heading = ({ icon, title, text }) => <div className="sa-heading"><i>{icon}</i><div><h2>{title}</h2><p>{text}</p></div></div>;
const Field = ({ label, wide, ...props }) => <label className={`sa-field ${wide ? "wide" : ""}`}><span>{label} *</span><input required {...props} /></label>;
const Choice = ({ label, items, ...props }) => <label className="sa-field"><span>{label} *</span><select required {...props}><option value="">Select {label.toLowerCase()}</option>{items.map((item) => <option key={item} value={item}>{item === "gen" ? "General" : item.toUpperCase()}</option>)}</select></label>;

