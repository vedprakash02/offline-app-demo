import { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import { FiBookOpen, FiCheckCircle, FiClock, FiDollarSign, FiFileText, FiPlus, FiPrinter, FiSave, FiSearch, FiTrash2, FiUser, FiUsers } from "react-icons/fi";
import { SCHOOL_CLASSES, STREAMS } from "../../academicConfig";
import "./FeeManagement.css";

const API_URL = "http://localhost:3000";
const FEE_TYPE_SUGGESTIONS = ["Tuition Fee", "Admission Fee", "Exam Fee", "Transport Fee", "Hostel Fee", "Computer Fee", "Other"];
const PAYMENT_MODES = ["Cash", "UPI", "Card", "Bank Transfer", "Cheque", "Other"];
const emptyItem = () => ({ feeType: "", amount: "", frequency: "One-time", months: 1 });
const activeSession = localStorage.getItem("activeSession") || "";
const currentStart = new Date().getMonth() >= 3 ? new Date().getFullYear() : new Date().getFullYear() - 1;
const sessions = [...new Set([activeSession, ...Array.from({ length: 5 }, (_, index) => `${currentStart - 2 + index}-${currentStart - 1 + index}`)])].filter(Boolean).sort();
const currentMonth = new Date().toISOString().slice(0, 7);
const money = (value) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(Number(value || 0));
const date = (value) => value ? new Date(value).toLocaleDateString("en-IN") : "—";
const headers = () => ({ Authorization: `Bearer ${localStorage.getItem("token")}` });

function FeeManagement() {
  const [tab, setTab] = useState("setup");
  const [session, setSession] = useState(activeSession);
  const [studentClass, setStudentClass] = useState("");
  const [stream, setStream] = useState("");
  const [items, setItems] = useState([emptyItem()]);
  const [students, setStudents] = useState([]);
  const [studentId, setStudentId] = useState("");
  const [query, setQuery] = useState("");
  const [month, setMonth] = useState(currentMonth);
  const [ledger, setLedger] = useState(null);
  const [payment, setPayment] = useState({ feeId: "", amount: "", mode: "Cash", note: "" });
  const [receipt, setReceipt] = useState(null);
  const [school, setSchool] = useState(null);
  const [notice, setNotice] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showAnnualSummary, setShowAnnualSummary] = useState(false);
  const [isSetupSaved, setIsSetupSaved] = useState(false);
  const needsStream = ["11th", "12th"].includes(studentClass);

  const filteredStudents = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return students;
    return students.filter((student) => [student.name, student.admissionNo, student.rollNo].some((value) => String(value || "").toLowerCase().includes(term)));
  }, [query, students]);

  const selectedStudent = useMemo(() => students.find((student) => student._id === studentId), [studentId, students]);
  const selectedFee = useMemo(() => ledger?.fees?.find((fee) => fee._id === payment.feeId), [ledger, payment.feeId]);

  const loadStudents = useCallback(async () => {
    if (!session || !studentClass || (needsStream && !stream)) { setStudents([]); return; }
    try {
      const { data } = await axios.get(`${API_URL}/all-students`, { headers: headers(), params: { academicSession: session, studentClass } });
      const rows = stream ? data.filter((student) => (student.stream || "").toLowerCase() === stream.toLowerCase()) : data;
      setStudents(rows);
    } catch (error) {
      setNotice({ type: "error", text: error.response?.data?.message || "Students load nahi ho paye." });
    }
  }, [needsStream, session, stream, studentClass]);

  const loadLedger = useCallback(async (id = studentId) => {
    if (!id || !session) return;
    setLoading(true);
    try {
      const { data } = await axios.get(`${API_URL}/fees/student/${id}/summary`, { headers: headers(), params: { academicSession: session } });
      setLedger(data);
    } catch (error) {
      setNotice({ type: "error", text: error.response?.data?.message || "Student fee summary load nahi hui." });
    } finally { setLoading(false); }
  }, [session, studentId]);

  useEffect(() => { loadStudents(); }, [loadStudents]);
  useEffect(() => { if (studentId) loadLedger(studentId); else setLedger(null); }, [studentId, loadLedger]);
  useEffect(() => { axios.get(`${API_URL}/get-school-profile`, { headers: headers() }).then(({ data }) => setSchool(data)).catch(() => {}); }, []);

  const changeClass = (value) => { setStudentClass(value); setStream(""); setStudentId(""); setLedger(null); setItems([emptyItem()]); setShowAnnualSummary(false); setIsSetupSaved(false); };
  const showNotice = (type, text) => setNotice({ type, text });

  const loadStructure = async () => {
    if (!session || !studentClass || (needsStream && !stream)) return showNotice("error", "Session, class aur required stream select karein.");
    setLoading(true);
    try {
      const { data } = await axios.get(`${API_URL}/fee-structures`, { headers: headers(), params: { academicSession: session, studentClass, stream: needsStream ? stream : "" } });
      setItems(data.structure?.items?.length ? data.structure.items.map((item) => ({ ...item, feeType: item.feeType || item.name || "", months: item.frequency === "Monthly" ? Number(item.months || 12) : 1 })) : [emptyItem()]);
      setIsSetupSaved(Boolean(data.structure));
      showNotice("success", data.structure ? "Saved fee setup load ho gaya." : "Ab is class ke fee items add karein.");
    } catch (error) { showNotice("error", error.response?.data?.message || "Fee setup load nahi hua."); }
    finally { setLoading(false); }
  };

  const saveStructure = async () => {
    if (!session || !studentClass || (needsStream && !stream)) return showNotice("error", "Session, class aur required stream select karein.");
    try {
      const { data } = await axios.put(`${API_URL}/fee-structures`, { academicSession: session, studentClass, stream: needsStream ? stream : "", items }, { headers: headers() });
      setItems(data.structure.items);
      setIsSetupSaved(true);
      showNotice("success", data.message);
    } catch (error) { showNotice("error", error.response?.data?.message || "Fee setup save nahi hua."); }
  };

  const updateItem = (index, key, value) => { setIsSetupSaved(false); setItems((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, [key]: value, ...(key === "frequency" ? { months: value === "Monthly" ? Number(item.months || 12) : 1 } : {}) } : item)); };
  const removeItem = (index) => { setIsSetupSaved(false); setItems((current) => current.length === 1 ? current : current.filter((_, itemIndex) => itemIndex !== index)); };
  const resetSetupForm = () => {
    if (window.confirm("Screen par bhara fee setup clear karke naya shuru karein?")) { setItems([emptyItem()]); setIsSetupSaved(false); }
  };
  const deleteSavedSetup = async () => {
    if (!session || !studentClass || (needsStream && !stream)) return showNotice("error", "Session, class aur required stream select karein.");
    if (!window.confirm("Is class ka saved fee setup permanently delete karna hai? Generated student bills delete nahi honge.")) return;
    try {
      const { data } = await axios.delete(`${API_URL}/fee-structures`, { headers: headers(), params: { academicSession: session, studentClass, stream: needsStream ? stream : "" } });
      setItems([emptyItem()]); setIsSetupSaved(false); showNotice("success", data.message);
    } catch (error) { showNotice("error", error.response?.data?.message || "Saved setup delete nahi hua."); }
  };
  const deleteUnpaidDue = async (feeId) => {
    if (!window.confirm("Galti se generated is unpaid bill ko delete karein?")) return;
    try { const { data } = await axios.delete(`${API_URL}/fees/${feeId}`, { headers: headers() }); showNotice("success", data.message); await loadLedger(studentId); }
    catch (error) { showNotice("error", error.response?.data?.message || "Bill delete nahi hua."); }
  };

  const deletePayment = async (receiptNo) => {
    if (!window.confirm(`Receipt ${receiptNo} ki payment delete karni hai? Total Paid aur Balance dobara calculate honge.`)) return;
    setLoading(true);
    try {
      const { data } = await axios.delete(`${API_URL}/fees/student/${studentId}/payments/${encodeURIComponent(receiptNo)}`, { headers: headers(), params: { academicSession: session } });
      if (receipt?.payment?.receiptNo === receiptNo) setReceipt(null);
      showNotice("success", data.message);
      await loadLedger(studentId);
    } catch (error) { showNotice("error", error.response?.data?.message || "Payment delete nahi hui."); }
    finally { setLoading(false); }
  };
  const generateDues = async () => {
    if (!studentId) return showNotice("error", "Pehle student select karein.");
    setLoading(true);
    try {
      const { data } = await axios.post(`${API_URL}/fees/generate`, { studentId, academicSession: session, month }, { headers: headers() });
      showNotice("success", data.message);
      await loadLedger(studentId);
    } catch (error) { showNotice("error", error.response?.data?.message || "Fees prepare nahi hui."); }
    finally { setLoading(false); }
  };

  const collectPayment = async (event) => {
    event.preventDefault();
    const amount = Number(payment.amount);
    const balance = Number(ledger?.totals?.balance || 0);
    if (amount <= 0 || amount > balance) return showNotice("error", `Amount 1 se ${money(balance)} ke beech hona chahiye.`);
    setLoading(true);
    try {
      const { data } = await axios.post(`${API_URL}/fees/student/${studentId}/payment`, { academicSession: session, amount, mode: payment.mode, note: payment.note, startMonth: month }, { headers: headers() });
      setReceipt({ payment: data.receipt, fee: { feeName: "Overall fee payment", month: "" }, student: data.student });
      setPayment({ feeId: "", amount: "", mode: "Cash", note: "" });
      showNotice("success", data.message);
      await loadLedger(studentId);
    } catch (error) { showNotice("error", error.response?.data?.message || "Payment save nahi hua."); }
    finally { setLoading(false); }
  };

  const printSection = (target, pageSize) => {
    document.body.dataset.feePrint = target;
    const style = document.createElement("style");
    style.id = "fee-page-size";
    style.textContent = `@page { size: ${pageSize}; margin: 8mm; }`;
    document.head.appendChild(style);
    const cleanup = () => { delete document.body.dataset.feePrint; style.remove(); window.removeEventListener("afterprint", cleanup); };
    window.addEventListener("afterprint", cleanup);
    window.print();
  };

  return <main className="fee-page">
    <header className="fee-header"><div><span className="fee-eyebrow">ACCOUNTS & COLLECTION</span><h1>Fee Management</h1><p>Pehle class fee set karein, phir student ki fee collect karein.</p></div><div className="fee-session-chip"><small>ACADEMIC SESSION</small><strong>{session || "Not selected"}</strong></div></header>

    <nav className="fee-tabs">
      <button className={tab === "setup" ? "active" : ""} onClick={() => setTab("setup")}><b>1</b><span>Fee Setup<small>Class-wise rates</small></span></button>
      <button className={tab === "collect" ? "active" : ""} onClick={() => setTab("collect")}><b>2</b><span>Collect Fee<small>Dues & receipt</small></span></button>
      <button className={tab === "history" ? "active" : ""} onClick={() => setTab("history")}><b>3</b><span>Student History<small>Ledger & print</small></span></button>
    </nav>

    {notice && <div className={`fee-alert ${notice.type}`}><FiCheckCircle /><span>{notice.text}</span><button onClick={() => setNotice(null)}>×</button></div>}

    {tab === "setup" && <SetupPage session={session} setSession={setSession} studentClass={studentClass} changeClass={changeClass} stream={stream} setStream={setStream} needsStream={needsStream} items={items} updateItem={updateItem} removeItem={removeItem} addItem={() => { setIsSetupSaved(false); setItems((current) => [...current, emptyItem()]); }} loadStructure={loadStructure} saveStructure={saveStructure} resetSetupForm={resetSetupForm} deleteSavedSetup={deleteSavedSetup} loading={loading} studentCount={students.length} showAnnualSummary={showAnnualSummary} setShowAnnualSummary={setShowAnnualSummary} isSetupSaved={isSetupSaved} />}

    {tab !== "setup" && <>
      <StudentPicker session={session} setSession={setSession} studentClass={studentClass} changeClass={changeClass} stream={stream} setStream={setStream} needsStream={needsStream} students={filteredStudents} studentId={studentId} setStudentId={setStudentId} query={query} setQuery={setQuery} />
      {tab === "collect" && selectedStudent && <CollectionPage month={month} setMonth={setMonth} generateDues={generateDues} ledger={ledger} loading={loading} payment={payment} setPayment={setPayment} selectedFee={selectedFee} collectPayment={collectPayment} receipt={receipt} deleteUnpaidDue={deleteUnpaidDue} printReceipt={() => printSection("receipt", "A5 portrait")} deletePayment={deletePayment} />}
      {tab === "history" && selectedStudent && <HistoryPage ledger={ledger} loading={loading} printStatement={() => printSection("statement", "A4 portrait")} deletePayment={deletePayment} />}
    </>}

    {receipt && <Receipt receipt={receipt} school={school} session={session} />}
    {ledger && <Statement ledger={ledger} school={school} session={session} />}
  </main>;
}

function FilterFields({ session, setSession, studentClass, changeClass, stream, setStream, needsStream }) {
  return <div className="fee-filter-row"><label>Academic session<select value={session} onChange={(event) => setSession(event.target.value)}>{sessions.map((item) => <option key={item}>{item}</option>)}</select></label><label>Class<select value={studentClass} onChange={(event) => changeClass(event.target.value)}><option value="">Select class</option>{SCHOOL_CLASSES.map((item) => <option key={item}>{item}</option>)}</select></label>{needsStream && <label>Stream<select value={stream} onChange={(event) => setStream(event.target.value)}><option value="">Select stream</option>{STREAMS.map((item) => <option key={item}>{item}</option>)}</select></label>}</div>;
}

function SetupPage(props) {
  const annualPerStudent = props.items.reduce((sum, item) => sum + ((Number(item.amount) || 0) * (item.frequency === "Monthly" ? Number(item.months || 12) : 1)), 0);
  const annualClassTotal = annualPerStudent * props.studentCount;
  return <section className="fee-card"><div className="fee-card-heading"><div><span>STEP 1</span><h2>Class Fee Setup</h2><p>Sirf fee type, amount aur monthly/one-time set karein.</p></div><FiBookOpen /></div><FilterFields {...props} /><div className="fee-setup-actions"><button onClick={props.loadStructure} disabled={props.loading}><FiSearch /> Load saved setup</button><button onClick={props.resetSetupForm}><FiPlus /> Clear form</button><button className="fee-delete-setup" onClick={props.deleteSavedSetup}><FiTrash2 /> Reset saved setup</button></div><datalist id="fee-type-suggestions">{FEE_TYPE_SUGGESTIONS.map((type) => <option value={type} key={type} />)}</datalist><div className="fee-item-list"><div className="fee-item-head"><span>Fee type</span><span>Frequency</span><span>Amount</span><span>Months</span><span>Total amount</span><span /></div>{props.items.map((item, index) => { const rowMonths = item.frequency === "Monthly" ? Number(item.months || 12) : 1; const rowTotal = (Number(item.amount) || 0) * rowMonths; return <div className="fee-item-row" key={item._id || index}><input list="fee-type-suggestions" value={item.feeType} onChange={(event) => props.updateItem(index, "feeType", event.target.value)} placeholder="Select or type fee; choose Other for custom fee" /><select value={item.frequency} onChange={(event) => props.updateItem(index, "frequency", event.target.value)}><option>Monthly</option><option>One-time</option></select><input type="number" min="1" value={item.amount} onChange={(event) => props.updateItem(index, "amount", event.target.value)} placeholder="₹ Amount" /><input type="number" min="1" max="12" value={rowMonths} disabled={item.frequency !== "Monthly"} onChange={(event) => props.updateItem(index, "months", Math.min(12, Math.max(1, Number(event.target.value) || 1)))} aria-label="Number of months" /><strong className="fee-row-total">{money(rowTotal)}</strong><button className="fee-remove-item" onClick={() => props.removeItem(index)} title="Remove"><FiTrash2 /></button></div>; })}</div><div className="fee-grand-total"><span>Grand total per student</span><strong>{money(annualPerStudent)}</strong></div><div className="fee-bottom-actions"><button className="fee-secondary-btn" onClick={props.addItem}><FiPlus /> Add another type</button><div className="fee-save-actions"><button className="fee-sum-btn" onClick={() => props.setShowAnnualSummary((current) => !current)}><FiDollarSign /> 1-year fee sum</button><button className={`fee-primary-btn fee-save-status ${props.isSetupSaved ? "saved" : "unsaved"}`} onClick={props.saveStructure}><FiSave /> {props.isSetupSaved ? "Fee setup saved" : "Save class fee setup"}</button></div></div>{props.showAnnualSummary && <div className="fee-annual-summary"><div><span>Annual fee per student</span><strong>{money(annualPerStudent)}</strong><small>Monthly amount × selected months + one-time items</small></div><div><span>Students in selected class</span><strong>{props.studentCount}</strong><small>Current session records</small></div><div><span>Overall class annual fee</span><strong>{money(annualClassTotal)}</strong><small>{money(annualPerStudent)} × {props.studentCount} students</small></div></div>}</section>;
}

function StudentPicker(props) {
  return <section className="fee-card student-picker"><div className="fee-card-heading"><div><span>STEP 1</span><h2>Select Student</h2><p>Session aur class choose karke student खोजें.</p></div><FiUsers /></div><FilterFields {...props} /><label className="fee-student-search"><FiSearch /><input value={props.query} onChange={(event) => props.setQuery(event.target.value)} placeholder="Name, admission no. or roll no." /></label><div className="fee-student-grid">{props.students.map((student) => <button key={student._id} className={props.studentId === student._id ? "selected" : ""} onClick={() => props.setStudentId(student._id)}><i><FiUser /></i><span><strong>{student.name}</strong><small>Adm. {student.admissionNo || "—"} · Roll {student.rollNo || "—"}</small></span>{props.studentId === student._id && <FiCheckCircle />}</button>)}</div>{props.studentClass && !props.students.length && <div className="fee-empty">Is selection mein koi student nahi mila.</div>}</section>;
}

function SummaryCards({ totals = {} }) { return <div className="fee-summary-grid"><div><span>Total Bill</span><strong>{money(totals.demand)}</strong></div><div className="success"><span>Total Paid</span><strong>{money(totals.paid)}</strong></div><div className="danger"><span>Balance</span><strong>{money(totals.balance)}</strong></div></div>; }

function CollectionPage({ month, setMonth, generateDues, ledger, loading, payment, setPayment, selectedFee, collectPayment, receipt, deleteUnpaidDue, printReceipt, deletePayment }) {
  const pending = ledger?.fees?.filter((fee) => fee.balanceAmount > 0) || [];
  return <section className="fee-card"><div className="fee-card-heading"><div><span>STEP 2</span><h2>Prepare & Collect Fee</h2><p>Starting month choose karein; setup ke sabhi months ka total bill yahan dikhega.</p></div><FiFileText /></div><div className="fee-generate-row"><label>Starting month<input type="month" value={month} onChange={(event) => setMonth(event.target.value)} /></label><button className="fee-secondary-btn" onClick={generateDues} disabled={loading}><FiPlus /> Prepare full fee from class setup</button></div>{ledger && <SummaryCards totals={ledger.totals} />}{pending.length > 0 && <div className="fee-pending-list"><strong>Pending bills</strong>{pending.map((fee) => <div key={fee._id}><span>{fee.feeType}{fee.month ? ` · ${fee.month}` : ""}<small>Balance {money(fee.balanceAmount)}</small></span>{!fee.payments?.length && <button onClick={() => deleteUnpaidDue(fee._id)} title="Delete wrongly generated bill"><FiTrash2 /> Delete</button>}</div>)}</div>}<form className="fee-payment-form" onSubmit={collectPayment}><div className="fee-due-highlight"><span>Student ka total pending balance</span><strong>{money(ledger?.totals?.balance)}</strong></div><div className="fee-payment-grid"><label>Amount<input type="number" min="1" max={ledger?.totals?.balance || ""} value={payment.amount} onChange={(event) => setPayment((current) => ({ ...current, amount: event.target.value }))} /></label><label>Mode<select value={payment.mode} onChange={(event) => setPayment((current) => ({ ...current, mode: event.target.value }))}>{PAYMENT_MODES.map((mode) => <option key={mode}>{mode}</option>)}</select></label><label>Note<input value={payment.note} onChange={(event) => setPayment((current) => ({ ...current, note: event.target.value }))} placeholder="Optional note" /></label></div><button className="fee-primary-btn" type="submit" disabled={loading || !ledger?.totals?.balance}><FiCheckCircle /> Collect & save payment</button></form>{ledger?.payments?.length > 0 && <div className="fee-recent-payments"><strong>Recent collections</strong>{ledger.payments.map((item) => <div key={item.receiptNo}><span><b>{item.receiptNo}</b><small>{date(item.date)} · {item.mode}</small></span><strong>{money(item.amount)}</strong><button type="button" onClick={() => deletePayment(item.receiptNo)}><FiTrash2 /> Delete payment</button></div>)}</div>}{receipt && <div className="fee-receipt-ready"><FiCheckCircle /><span><strong>Receipt {receipt.payment.receiptNo} ready</strong><small>{money(receipt.payment.amount)} received</small></span><button onClick={printReceipt}><FiPrinter /> Print receipt</button></div>}</section>;
}

function HistoryPage({ ledger, loading, printStatement, deletePayment }) {
  if (loading) return <div className="fee-card fee-empty">Student ledger loading...</div>;
  if (!ledger) return null;
  return <section className="fee-card"><div className="fee-card-heading"><div><span>STUDENT LEDGER</span><h2>{ledger.student.name}</h2><p>Admission No. {ledger.student.admissionNo || "—"}</p></div><button className="fee-secondary-btn" onClick={printStatement}><FiPrinter /> Print statement</button></div><SummaryCards totals={ledger.totals} /><div className="fee-history-list">{ledger.payments.length ? ledger.payments.map((item) => <article key={item._id || item.receiptNo}><i><FiCheckCircle /></i><div><strong>{item.feeName}</strong><span>{item.receiptNo} · {item.mode}</span></div><time>{date(item.date)}</time><b>{money(item.amount)}</b><button className="fee-history-delete" onClick={() => deletePayment(item.receiptNo)} title="Delete wrong payment"><FiTrash2 /></button></article>) : <div className="fee-empty">Abhi koi payment history nahi hai.</div>}</div></section>;
}

function Receipt({ receipt, school, session }) { return <section className="fee-print-document fee-print-receipt"><header><h2>{school?.schoolName || "School Fee Receipt"}</h2><p>{school?.address || ""}</p></header><div className="print-title">FEE RECEIPT</div><div className="print-meta"><span>Receipt No.<strong>{receipt.payment.receiptNo}</strong></span><span>Date<strong>{date(receipt.payment.date)}</strong></span><span>Session<strong>{session}</strong></span></div><div className="print-student"><span>Student<strong>{receipt.student.name}</strong></span><span>Admission No.<strong>{receipt.student.admissionNo || "—"}</strong></span><span>Class<strong>{receipt.student.class}</strong></span></div><table><thead><tr><th>Particular</th><th>Month</th><th>Mode</th><th>Amount</th></tr></thead><tbody><tr><td>{receipt.fee.feeName || receipt.fee.feeType}</td><td>{receipt.fee.month || "—"}</td><td>{receipt.payment.mode}</td><td>{money(receipt.payment.amount)}</td></tr></tbody></table><div className="print-total"><span>Amount Received</span><strong>{money(receipt.payment.amount)}</strong></div><footer><span>Depositor Signature</span><span>Authorized Signature</span></footer></section>; }

function Statement({ ledger, school, session }) { return <section className="fee-print-document fee-print-statement"><header><h2>{school?.schoolName || "School"}</h2><p>STUDENT FEE STATEMENT · {session}</p></header><div className="print-student"><span>Student<strong>{ledger.student.name}</strong></span><span>Admission No.<strong>{ledger.student.admissionNo || "—"}</strong></span><span>Class<strong>{ledger.student.class}</strong></span></div><SummaryCards totals={ledger.totals} /><h3>Payment History</h3><table><thead><tr><th>Date</th><th>Receipt</th><th>Particular</th><th>Mode</th><th>Paid</th></tr></thead><tbody>{ledger.payments.map((item) => <tr key={item._id || item.receiptNo}><td>{date(item.date)}</td><td>{item.receiptNo}</td><td>{item.feeName}{item.month ? ` · ${item.month}` : ""}</td><td>{item.mode}</td><td>{money(item.amount)}</td></tr>)}</tbody></table><footer><span>Parent Signature</span><span>Accounts Office</span></footer></section>; }

export default FeeManagement;








