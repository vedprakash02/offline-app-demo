import { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import { FiDollarSign, FiEdit3, FiPlus, FiX } from "react-icons/fi";
import "./TeacherManagement.css";

const API = "http://localhost:3000";
const auth = () => ({ Authorization: `Bearer ${localStorage.getItem("token")}` });
const money = (value) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(Number(value || 0));
const emptyStructure = { basicSalary: "", hra: "", da: "", ta: "", otherAllowance: "", pf: "", esi: "", professionalTax: "", tds: "" };
const allowances = [["basicSalary", "Basic salary"], ["hra", "HRA"], ["da", "DA"], ["ta", "TA"], ["otherAllowance", "Other allowance"]];
const deductions = [["pf", "PF"], ["esi", "ESI"], ["professionalTax", "Professional tax"], ["tds", "TDS"]];

export default function SalaryPayroll() {
  const [teachers, setTeachers] = useState([]);
  const [summary, setSummary] = useState({});
  const [selected, setSelected] = useState(null);
  const [mode, setMode] = useState("");
  const [notice, setNotice] = useState("");
  const [structure, setStructure] = useState(emptyStructure);
  const [payment, setPayment] = useState({ month: new Date().toISOString().slice(0, 7), amount: "", mode: "Bank Transfer", note: "" });

  const load = useCallback(async () => {
    try {
      const { data } = await axios.get(`${API}/teachers`, { headers: auth(), params: { status: "Active" } });
      setTeachers(data.teachers || []);
      setSummary(data.summary || {});
    } catch (error) {
      setNotice(error.response?.data?.message || "Payroll data load nahi hua.");
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  const gross = useMemo(() => allowances.reduce((sum, [key]) => sum + Number(structure[key] || 0), 0), [structure]);
  const deductionTotal = useMemo(() => deductions.reduce((sum, [key]) => sum + Number(structure[key] || 0), 0), [structure]);
  const openStructure = (teacher) => {
    const saved = teacher.salaryStructure || {};
    const hasSavedStructure = allowances.some(([key]) => Number(saved[key] || 0) > 0);
    setSelected(teacher);
    setStructure({ ...emptyStructure, ...saved, basicSalary: hasSavedStructure ? String(saved.basicSalary || "") : String(teacher.monthlySalary || "") });
    setMode("structure");
  };
  const openPayment = (teacher) => {
    setSelected(teacher);
    setPayment({ month: new Date().toISOString().slice(0, 7), amount: String(teacher.monthlySalary || ""), mode: "Bank Transfer", note: "" });
    setMode("payment");
  };
  const close = () => { setSelected(null); setMode(""); };
  const saveStructure = async (event) => {
    event.preventDefault();
    try {
      const { data } = await axios.put(`${API}/teachers/${selected._id}/salary-structure`, structure, { headers: auth() });
      setNotice(data.message);
      close();
      load();
    } catch (error) {
      setNotice(error.response?.data?.message || "Salary structure save nahi hua.");
    }
  };
  const savePayment = async (event) => {
    event.preventDefault();
    try {
      const { data } = await axios.post(`${API}/teachers/${selected._id}/payments`, payment, { headers: auth() });
      setNotice(data.message);
      close();
      load();
    } catch (error) {
      setNotice(error.response?.data?.message || "Payment save nahi hui.");
    }
  };

  return <main className="teacher-page salary-page">
    <header><div><span className="eyebrow">PAYROLL CENTER</span><h1>Salary & Payroll</h1><p>Pay structure, deductions aur month-wise salary payments manage karein.</p></div></header>
    {notice && <div className="notice" onClick={() => setNotice("")}>{notice}<FiX /></div>}
    <section className="stats"><article><FiDollarSign /><div><span>Active staff</span><strong>{summary.active || 0}</strong></div></article><article><FiDollarSign /><div><span>Monthly payroll</span><strong>{money(summary.monthlyPayroll)}</strong></div></article><article><FiDollarSign /><div><span>Total paid</span><strong>{money(summary.paid)}</strong></div></article></section>
    <section className="panel"><div className="toolbar"><strong>Staff payroll register</strong><span>{teachers.length} records</span></div><div className="teacher-grid">{teachers.map((teacher) => <article className="teacher-card" key={teacher._id}><div className="avatar">{teacher.image ? <img src={`${API}/uploads/${teacher.image}`} alt={teacher.name} /> : teacher.name.slice(0, 2).toUpperCase()}</div><div className="teacher-info"><h3>{teacher.name}</h3><p>{teacher.employeeId} · {teacher.designation}</p><div className="salary"><span>Net payable / month</span><strong>{money(teacher.monthlySalary)}</strong></div><small>Gross {money(allowances.reduce((sum, [key]) => sum + Number(teacher.salaryStructure?.[key] || 0), 0) || teacher.monthlySalary)} · Deductions {money(deductions.reduce((sum, [key]) => sum + Number(teacher.salaryStructure?.[key] || 0), 0))}</small><div className="actions"><button onClick={() => openStructure(teacher)}><FiEdit3 /> Pay structure</button><button onClick={() => openPayment(teacher)}><FiPlus /> Pay salary</button></div></div></article>)}</div></section>
    {mode === "structure" && <div className="modal"><form className="dialog pay-dialog profile-form" onSubmit={saveStructure}><div className="dialog-head"><div><span className="eyebrow">SALARY STRUCTURE</span><h2>{selected.name}</h2><p>Allowances aur deductions configure karein.</p></div><button className="icon" type="button" onClick={close}><FiX /></button></div><div className="form-grid">{allowances.map(([key, label]) => <label key={key}><span>{label}</span><input type="number" min="0" value={structure[key]} onChange={(event) => setStructure({ ...structure, [key]: event.target.value })} /></label>)}{deductions.map(([key, label]) => <label key={key}><span>{label}</span><input type="number" min="0" value={structure[key]} onChange={(event) => setStructure({ ...structure, [key]: event.target.value })} /></label>)}<div className="wide payroll-totals"><span>Gross: <strong>{money(gross)}</strong></span><span>Deductions: <strong>{money(deductionTotal)}</strong></span><span>Net payable: <strong>{money(Math.max(0, gross - deductionTotal))}</strong></span></div></div><div className="form-actions"><button type="button" onClick={close}>Cancel</button><button className="primary">Save Structure</button></div></form></div>}
    {mode === "payment" && <div className="modal"><form className="dialog pay-dialog" onSubmit={savePayment}><div className="dialog-head"><div><span className="eyebrow">SALARY PAYMENT</span><h2>{selected.name}</h2><p>{selected.employeeId} · {money(selected.monthlySalary)} payable</p></div><button className="icon" type="button" onClick={close}><FiX /></button></div><div className="pay-form"><label>Salary month<input type="month" required value={payment.month} onChange={(event) => setPayment({ ...payment, month: event.target.value })} /></label><label>Amount<input type="number" min="1" required value={payment.amount} onChange={(event) => setPayment({ ...payment, amount: event.target.value })} /></label><label>Mode<select value={payment.mode} onChange={(event) => setPayment({ ...payment, mode: event.target.value })}>{["Bank Transfer", "Cash", "UPI", "Cheque", "Other"].map((item) => <option key={item}>{item}</option>)}</select></label><label>Note<input value={payment.note} onChange={(event) => setPayment({ ...payment, note: event.target.value })} /></label></div><div className="form-actions"><button type="button" onClick={close}>Cancel</button><button className="primary">Record Payment</button></div></form></div>}
  </main>;
}