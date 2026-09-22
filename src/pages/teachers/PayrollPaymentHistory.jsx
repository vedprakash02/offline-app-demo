import { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import { FiCheckCircle, FiFileText, FiPrinter, FiSearch } from "react-icons/fi";
import "./TeacherManagement.css";

const API = "http://localhost:3000";
const auth = () => ({ Authorization: `Bearer ${localStorage.getItem("token")}` });
const money = (value) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(Number(value || 0));

export default function PayrollPaymentHistory() {
  const [teachers, setTeachers] = useState([]);
  const [month, setMonth] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState("");
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await axios.get(`${API}/teachers`, { headers: auth() });
      setTeachers(data.teachers || []);
    } catch (error) {
      setNotice(error.response?.data?.message || "Payment history load nahi hui.");
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  const payments = useMemo(() => teachers.flatMap((teacher) => (teacher.payments || []).map((payment) => ({ ...payment, teacher }))).filter((item) => (!month || item.month === month) && `${item.teacher.name} ${item.teacher.employeeId} ${item.receiptNo}`.toLowerCase().includes(search.toLowerCase())).sort((a, b) => `${b.month}${b.date}`.localeCompare(`${a.month}${a.date}`)), [teachers, month, search]);
  const paidIds = new Set(payments.map((item) => item.teacher._id));

  return <main className="teacher-page payroll-history">
    <header><div><span className="eyebrow">PAYROLL AUDIT</span><h1>Payment History & Receipts</h1><p>Paid salary records, receipt number aur staff-wise payment status dekhein.</p></div></header>
    {notice && <div className="notice" onClick={() => setNotice("")}>{notice}</div>}
    <section className="stats"><article><FiCheckCircle /><div><span>Payments shown</span><strong>{payments.length}</strong></div></article><article><FiFileText /><div><span>Staff paid</span><strong>{paidIds.size}</strong></div></article></section>
    <section className="panel"><div className="toolbar"><div className="search"><FiSearch /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Staff name, employee ID, receipt..." /></div><div className="toolbar-meta"><span className="result-count">{payments.length} {payments.length === 1 ? "payment" : "payments"}</span><label className="payroll-month">Salary month <input type="month" value={month} onChange={(event) => setMonth(event.target.value)} /></label></div></div><div className="att-table-wrap"><table className="payroll-table"><thead><tr><th>Receipt</th><th>Staff</th><th>Salary month</th><th>Gross</th><th>Deductions</th><th>Net paid</th><th>Mode / Date</th><th /></tr></thead><tbody>{payments.map((item) => <tr key={item._id}><td><strong className="receipt-number">{item.receiptNo}</strong></td><td><strong>{item.teacher.name}</strong><small className="table-subtext">{item.teacher.employeeId} · {item.teacher.designation}</small></td><td><span className="month-badge">{item.month}</span></td><td>{money(item.grossAmount || item.amount)}</td><td>{money(item.deductionAmount)}</td><td><strong className="net-paid">{money(item.amount)}</strong></td><td><span className="mode-badge">{item.mode}</span><small className="table-subtext">{new Date(item.date).toLocaleDateString("en-IN")}</small></td><td><button className="receipt-print" onClick={() => window.print()}><FiPrinter /> Print</button></td></tr>)}</tbody></table>{!loading && !payments.length && <div className="empty">Is filter ke liye abhi koi salary payment record nahi hai.</div>}</div></section>
  </main>;
}