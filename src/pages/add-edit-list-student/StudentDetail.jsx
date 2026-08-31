import { useEffect, useState } from "react";
import axios from "axios";
import { Link, useNavigate, useParams } from "react-router-dom";
import { FiArrowLeft, FiBookOpen, FiCalendar, FiCreditCard, FiEdit3, FiHome, FiPhone, FiShield, FiTrash2, FiUser } from "react-icons/fi";
import "./StudentDetail.css";

const authHeaders = () => ({ Authorization: `Bearer ${localStorage.getItem("token")}` });
const displayDate = (value) => value
  ? new Date(value).toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" })
  : "Not available";
const money = (value) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(Number(value || 0));
const aadhaarText = (value) => String(value || "").replace(/\D/g, "").replace(/(\d{4})(?=\d)/g, "$1 ") || "Not available";

export default function StudentDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const session = localStorage.getItem("activeSession") || "";
  const [student, setStudent] = useState(null);
  const [feeLedger, setFeeLedger] = useState(null);
  const [loading, setLoading] = useState(true);
  const [feeLoading, setFeeLoading] = useState(true);
  const [error, setError] = useState("");
  const [feeError, setFeeError] = useState("");

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true);
      setFeeLoading(true);
      try {
        const { data } = await axios.get(`http://localhost:3000/edit-student/${id}`, { headers: authHeaders() });
        if (!active) return;
        setStudent(data);
        setLoading(false);
        if (!/^\d{4}-\d{4}$/.test(session)) {
          setFeeError("Fee details ke liye valid academic session select karein.");
          setFeeLoading(false);
          return;
        }
        try {
          const feeResponse = await axios.get(`http://localhost:3000/fees/student/${id}/summary`, {
            headers: authHeaders(), params: { academicSession: session },
          });
          if (active) setFeeLedger(feeResponse.data);
        } catch (feeRequestError) {
          if (active) setFeeError(feeRequestError.response?.data?.message || "Fee details load nahi hui.");
        } finally {
          if (active) setFeeLoading(false);
        }
      } catch (requestError) {
        if (active) {
          setError(requestError.response?.data?.message || "Student profile load nahi ho payi.");
          setLoading(false);
          setFeeLoading(false);
        }
      }
    };
    load();
    return () => { active = false; };
  }, [id, session]);

  const remove = async () => {
    if (!window.confirm(`Kya aap ${student.name} ka record permanently delete karna chahte hain?`)) return;
    try {
      await axios.delete(`http://localhost:3000/delete-student/${id}`, { headers: authHeaders() });
      navigate("/dashboard/studentlist", { replace: true });
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Student delete nahi ho paya.");
    }
  };

  if (loading) return <div className="profile-state">Student profile load ho rahi hai...</div>;
  if (error || !student) return <div className="profile-state error"><p>{error || "Student nahi mila."}</p><Link to="/dashboard/studentlist"><FiArrowLeft /> Back to students</Link></div>;

  const photoUrl = student.imageUrl
    ? (/^https?:/i.test(student.imageUrl) ? student.imageUrl : `http://localhost:3000/uploads/${student.imageUrl}`)
    : "";
  const totals = feeLedger?.totals || { demand: 0, paid: 0, balance: 0 };

  return <main className="student-profile">
    <Link className="profile-back" to="/dashboard/studentlist"><FiArrowLeft /> All students</Link>
    <header className="profile-hero">
      <div className="profile-photo">{photoUrl ? <img src={photoUrl} alt={student.name} /> : <FiUser />}</div>
      <div className="profile-identity"><span>STUDENT PROFILE</span><h1>{student.name}</h1><p>{student.admissionNo} | Class {student.class}{student.stream ? ` (${student.stream})` : ""}</p></div>
      <div className="profile-actions"><Link to={`/dashboard/edit-student/${student._id}`}><FiEdit3 /> Edit</Link><button onClick={remove}><FiTrash2 /> Delete</button></div>
    </header>

    <div className="profile-grid">
      <Section icon={<FiUser />} title="Personal details">
        <Detail label="Student name" value={student.name} /><Detail label="Father's name" value={student.fatherName} />
        <Detail label="Mother's name" value={student.motherName} /><Detail label="Date of birth" value={displayDate(student.dob)} />
        <Detail label="Gender" value={student.gender} /><Detail label="Category" value={student.cast?.toUpperCase()} />
      </Section>

      <Section icon={<FiBookOpen />} title="Academic details">
        <Detail label="Academic session" value={student.academicSession} /><Detail label="Class" value={student.class} />
        <Detail label="Stream" value={student.stream || "Not applicable"} /><Detail label="Roll number" value={student.rollNo ?? "Not assigned"} />
        <Detail label="Admission number" value={student.admissionNo} /><Detail label="Admission date" value={displayDate(student.admissionDate)} />
      </Section>

      <Section icon={<FiShield />} title="Government & education IDs" wide>
        <Detail label="Enrollment number" value={student.EnrollmentNo} />
        <Detail label="APAAR ID" value={student.ApaarId} />
        <Detail label="PEN number" value={student.PenNo} />
        <Detail label="Aadhaar number" value={aadhaarText(student.AadhaarNo || student.aadharNo)} />
      </Section>

      <Section icon={<FiHome />} title="Contact details" wide>
        <Detail icon={<FiPhone />} label="Phone number" value={student.phone} />
        <Detail icon={<FiHome />} label="Permanent address" value={student.address} wide />
      </Section>

      <section className="profile-section wide fee-profile-section">
        <div className="profile-section-title"><FiCreditCard /><h2>Fee details - {session}</h2><Link to="/dashboard/fees">Open Fee Management</Link></div>
        {feeLoading ? <div className="fee-profile-state">Fee ledger load ho raha hai...</div> : feeError ? <div className="fee-profile-state error">{feeError}</div> : <>
          <div className="fee-profile-summary">
            <div><span>Total demand</span><strong>{money(totals.demand)}</strong></div>
            <div className="paid"><span>Total paid</span><strong>{money(totals.paid)}</strong></div>
            <div className={totals.balance > 0 ? "due" : "paid"}><span>Pending balance</span><strong>{money(totals.balance)}</strong></div>
          </div>
          <div className="fee-profile-table-wrap">
            {feeLedger?.fees?.length ? <table><thead><tr><th>Fee</th><th>Period</th><th>Payable</th><th>Paid</th><th>Balance</th><th>Status</th></tr></thead><tbody>{feeLedger.fees.map((fee) => <tr key={fee._id}><td><strong>{fee.feeName || fee.feeType}</strong></td><td>{fee.month || fee.frequency || "-"}</td><td>{money(fee.payableAmount)}</td><td>{money(fee.paidAmount)}</td><td>{money(fee.balanceAmount)}</td><td><span className={`fee-profile-status ${String(fee.status || "due").toLowerCase()}`}>{fee.status}</span></td></tr>)}</tbody></table> : <div className="fee-profile-state">Is session mein koi fee demand generate nahi hui.</div>}
          </div>
        </>}
      </section>

      {student.academicHistory?.length > 0 && <section className="profile-section wide"><div className="profile-section-title"><FiCalendar /><h2>Academic history</h2></div><div className="history-list">{student.academicHistory.map((item, index) => <div key={item._id || index}><strong>{item.academicSession}</strong><span>Class {item.class}{item.stream ? ` | ${item.stream}` : ""}</span><small>Roll no. {item.rollNo ?? "-"}</small></div>)}</div></section>}
    </div>
  </main>;
}

const Section = ({ icon, title, wide, children }) => <section className={`profile-section ${wide ? "wide" : ""}`}><div className="profile-section-title">{icon}<h2>{title}</h2></div><div className="detail-grid">{children}</div></section>;
const Detail = ({ label, value, wide, icon }) => <div className={`detail-item ${wide ? "wide" : ""}`}>{icon}<div><span>{label}</span><strong>{value || "Not available"}</strong></div></div>;
