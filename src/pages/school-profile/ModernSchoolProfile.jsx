import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FiArrowLeft, FiCheck, FiEdit3, FiHome, FiImage, FiMapPin, FiPhone, FiSave, FiShield, FiUpload } from "react-icons/fi";
import "./ModernSchoolProfile.css";

const initialProfile = { schoolName: "", schoolCode: "", sansthacode: "", phone: "", address: "", block: "", dist: "" };

export default function ModernSchoolProfile() {
  const navigate = useNavigate();
  const [profileData, setProfileData] = useState(initialProfile);
  const [schoolImage, setSchoolImage] = useState(null);
  const [imagePreview, setImagePreview] = useState("");
  const [schoolSignature, setSchoolSignature] = useState(null);
  const [signaturePreview, setSignaturePreview] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState({ type: "", text: "" });

  useEffect(() => {
    const loadProfile = async () => {
      const token = localStorage.getItem("token");
      if (!token) return navigate("/login");
      try {
        const response = await fetch("http://localhost:3000/get-school-profile", { headers: { Authorization: `Bearer ${token}` } });
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || "Profile load nahi ho payi.");
        setProfileData({ schoolName: data.schoolName || "", schoolCode: data.schoolCode || "", sansthacode: data.sansthacode || "", phone: data.phone || "", address: data.address || "", block: data.block || "", dist: data.dist || "" });
        if (data.schoolImage) setImagePreview(`http://localhost:3000/uploads/${data.schoolImage}`);
        if (data.schoolSignature) setSignaturePreview(`http://localhost:3000/uploads/${data.schoolSignature}`);
      } catch (error) { setStatus({ type: "error", text: error.message }); }
      finally { setLoading(false); }
    };
    loadProfile();
  }, [navigate]);

  const setField = ({ target: { name, value } }) => setProfileData((current) => ({ ...current, [name]: value }));
  const setDigits = (field, maxLength) => ({ target: { value } }) => {
    if (/^\d*$/.test(value) && value.length <= maxLength) setProfileData((current) => ({ ...current, [field]: value }));
  };
  const selectFile = (event, setFile, setPreview) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) return setStatus({ type: "error", text: "Image size 5 MB se kam honi chahiye." });
    setFile(file); setPreview(URL.createObjectURL(file)); setStatus({ type: "", text: "" });
  };

  const saveProfile = async (event) => {
    event.preventDefault(); setSaving(true); setStatus({ type: "", text: "" });
    const formData = new FormData();
    Object.entries(profileData).forEach(([key, value]) => formData.append(key, value.trim()));
    if (schoolImage) formData.append("schoolImage", schoolImage);
    if (schoolSignature) formData.append("schoolSignature", schoolSignature);
    try {
      const response = await fetch("http://localhost:3000/save-school-profile", { method: "POST", headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }, body: formData });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Profile save nahi ho payi.");
      setStatus({ type: "success", text: data.message || "School profile successfully saved." });
      setTimeout(() => navigate("/dashboard"), 900);
    } catch (error) { setStatus({ type: "error", text: error.message || "Server se connect nahi ho paye." }); }
    finally { setSaving(false); }
  };

  if (loading) return <main className="school-profile-page"><div className="school-profile-loader"><span /><p>School profile loading...</p></div></main>;

  return <main className="school-profile-page">
    <header className="school-profile-topbar"><button type="button" onClick={() => navigate("/dashboard")}><FiArrowLeft /> Dashboard</button><div><span>SETTINGS</span><h1>School Profile</h1><p>Manage your school identity and official information.</p></div><div className="school-profile-session"><FiShield /><span>Active session<strong>{localStorage.getItem("activeSession") || "Not selected"}</strong></span></div></header>

    <form className="school-profile-layout" onSubmit={saveProfile}>
      <section className="school-profile-card school-details-card">
        <div className="school-card-heading"><span><FiHome /></span><div><h2>School information</h2><p>Official details used across reports and documents.</p></div></div>
        <div className="school-fields">
          <label className="school-field school-field-wide"><span>School name</span><div><FiHome /><input name="schoolName" value={profileData.schoolName} onChange={setField} placeholder="Govt. Higher Secondary School" autoComplete="organization" required /></div></label>
          <label className="school-field"><span>UDISE code <small>11 digits</small></span><div><FiShield /><input inputMode="numeric" value={profileData.schoolCode} onChange={setDigits("schoolCode", 11)} placeholder="Enter UDISE code" minLength="11" required /></div></label>
          <label className="school-field"><span>Sanstha code <small>6 digits</small></span><div><FiShield /><input inputMode="numeric" value={profileData.sansthacode} onChange={setDigits("sansthacode", 6)} placeholder="Enter Sanstha code" minLength="6" required /></div></label>
          <label className="school-field"><span>Phone number</span><div><FiPhone /><input inputMode="tel" value={profileData.phone} onChange={setDigits("phone", 10)} placeholder="10 digit number" minLength="10" required /></div></label>
          <label className="school-field"><span>Block</span><div><FiMapPin /><input name="block" value={profileData.block} onChange={setField} placeholder="School block" required /></div></label>
          <label className="school-field"><span>District</span><div><FiMapPin /><input name="dist" value={profileData.dist} onChange={setField} placeholder="School district" required /></div></label>
          <label className="school-field school-field-wide"><span>Complete address</span><div><FiMapPin /><textarea name="address" value={profileData.address} onChange={setField} placeholder="Enter complete postal address" rows="3" required /></div></label>
        </div>
      </section>

      <aside className="school-profile-side">
        <section className="school-profile-card"><div className="school-card-heading"><span><FiImage /></span><div><h2>School logo</h2><p>Shown in the navbar and documents.</p></div></div><label className="school-upload"><input type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => selectFile(event, setSchoolImage, setImagePreview)} /><div className="school-upload-preview">{imagePreview ? <img src={imagePreview} alt="School logo preview" /> : <FiImage />}</div><div><strong>{imagePreview ? "Change school logo" : "Upload school logo"}</strong><span><FiUpload /> PNG, JPG or WEBP · Max 5 MB</span></div></label></section>
        <section className="school-profile-card"><div className="school-card-heading"><span><FiEdit3 /></span><div><h2>Authorized signature</h2><p>Used on official print documents.</p></div></div><label className="school-upload signature-upload"><input type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => selectFile(event, setSchoolSignature, setSignaturePreview)} /><div className="school-upload-preview">{signaturePreview ? <img src={signaturePreview} alt="Authorized signature preview" /> : <FiEdit3 />}</div><div><strong>{signaturePreview ? "Change signature" : "Upload signature"}</strong><span><FiUpload /> Transparent PNG recommended</span></div></label></section>
        <div className="school-save-panel">{status.text && <div className={`school-status ${status.type}`}>{status.type === "success" && <FiCheck />}{status.text}</div>}<button className="school-save-button" type="submit" disabled={saving}><FiSave />{saving ? "Saving profile..." : "Save school profile"}</button><button className="school-cancel-button" type="button" onClick={() => navigate("/dashboard")}>Cancel</button></div>
      </aside>
    </form>
  </main>;
}
