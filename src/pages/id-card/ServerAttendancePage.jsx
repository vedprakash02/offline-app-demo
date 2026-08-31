import { useCallback, useEffect, useRef, useState } from "react";
import * as XLSX from "xlsx";
import { Html5Qrcode } from "html5-qrcode";
import { QRCodeSVG } from "qrcode.react";
import { attendanceApi, syncQrAttendanceToMongo } from "./attendanceApi";
import "./AttendancePage.css";
import "./ServerAttendancePage.css";

const today = () => new Date().toLocaleDateString("en-CA");

export default function ServerAttendancePage({ onBack }) {
  const [records, setRecords] = useState([]);
  const [absent, setAbsent] = useState([]);
  const [message, setMessage] = useState("Camera ya hardware scanner se ID card scan karein.");
  const [scanning, setScanning] = useState(false);
  const [online, setOnline] = useState(false);
  const [code, setCode] = useState("");
  const [operator, setOperator] = useState(() => localStorage.getItem("attendance-operator") || "");
  const [scannerUrls, setScannerUrls] = useState([]);
  const [listView, setListView] = useState("present");
  const [erpSync, setErpSync] = useState({ pending: 0, syncing: false, message: "" });
  const scanner = useRef(null);
  const photoInput = useRef(null);
  const hardwareInput = useRef(null);
  const lastScan = useRef({ value: "", time: 0 });
  const syncInFlight = useRef(false);
  const lastAutoSync = useRef(0);

  const syncWithErp = useCallback(async (showMessage = false) => {
    if (syncInFlight.current) return;
    if (!showMessage && Date.now() - lastAutoSync.current < 30000) return;
    if (!showMessage) lastAutoSync.current = Date.now();
    syncInFlight.current = true;
    setErpSync((current) => ({ ...current, syncing: true }));
    try {
      const result = await syncQrAttendanceToMongo();
      const message = result.failed
        ? `${result.synced || 0} synced, ${result.failed} records match nahi hui.`
        : `${result.synced || 0} QR attendance MongoDB mein synced.`;
      setErpSync({ pending: result.pending || result.failed || 0, syncing: false, message: showMessage || result.failed ? message : "" });
    } catch (error) {
      setErpSync((current) => ({ ...current, syncing: false, message: showMessage ? error.message : current.message }));
    } finally {
      syncInFlight.current = false;
    }
  }, []);

  const refresh = useCallback(async (showError = false) => {
    try {
      const data = await attendanceApi.getRecords(today());
      setRecords(data.records);
      setAbsent(data.absent || []);
      setOnline(true);
      syncWithErp(false);
    } catch (error) {
      setOnline(false);
      if (showError) setMessage(`${error.message} Backend server check karein.`);
    }
  }, [syncWithErp]);

  useEffect(() => {
    const initialLoad = window.setTimeout(() => refresh(true), 0);
    const timer = window.setInterval(() => refresh(false), 4000);
    return () => { window.clearTimeout(initialLoad); window.clearInterval(timer); };
  }, [refresh]);
  useEffect(() => { localStorage.setItem("attendance-operator", operator); }, [operator]);
  useEffect(() => {
    attendanceApi.getConnection().then((data) => setScannerUrls(data.scannerUrls || [])).catch(() => {});
    const token = localStorage.getItem("token");
    if (token) fetch("http://localhost:3000/teachers-qr-roster", { headers: { Authorization: `Bearer ${token}` } })
      .then((response) => response.ok ? response.json() : Promise.reject())
      .then((data) => attendanceApi.syncTeachers(data.teachers || []))
      .catch(() => setMessage("Teacher QR roster sync nahi hua; student scanning available hai."));
  }, []);
  useEffect(() => () => { if (scanner.current?.isScanning) scanner.current.stop().catch(() => {}); }, []);

  const mark = useCallback(async (qrValue, source) => {
    try {
      const data = await attendanceApi.scan(qrValue, source, operator);
      setRecords(data.records);
      setAbsent(data.absent || []);
      setMessage(data.message);
      setOnline(true);
      syncWithErp(true);
      navigator.vibrate?.(100);
    } catch (error) {
      setMessage(error.message);
      if (![404, 409].includes(error.status)) setOnline(false);
    }
  }, [operator, syncWithErp]);

  const startCamera = async () => {
    if (!navigator.mediaDevices?.getUserMedia) return setMessage("Live camera ke liye HTTPS chahiye; QR photo ya hardware scanner use karein.");
    try {
      scanner.current = new Html5Qrcode("attendance-qr-reader");
      await scanner.current.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 200, height: 200 }, aspectRatio: 1 },
        (value) => {
          const time = Date.now();
          if (lastScan.current.value !== value || time - lastScan.current.time > 3000) {
            lastScan.current = { value, time };
            mark(value, "camera");
          }
        }, () => {},
      );
      setScanning(true);
      setMessage("Camera ready ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Â¦Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â ID card ka QR saamne rakhein.");
    } catch (error) {
      setMessage(error?.name === "NotAllowedError" ? "Camera permission allow karein." : "Camera start nahi hua. HTTPS check karein.");
      scanner.current = null;
    }
  };

  const stopCamera = async () => {
    try { if (scanner.current?.isScanning) await scanner.current.stop(); scanner.current?.clear(); } catch { /* already stopped */ }
    scanner.current = null;
    setScanning(false);
    setMessage("Camera band hai. Hardware scanner use kar sakte hain.");
  };

  const scanPhoto = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    try {
      const reader = new Html5Qrcode("attendance-qr-reader");
      const value = await reader.scanFile(file, false);
      reader.clear();
      await mark(value, "photo");
    } catch { setMessage("Photo mein QR nahi mila. Paas se seedhi photo lein."); }
  };

  const hardwareScan = async (event) => {
    event.preventDefault();
    if (!code.trim()) return;
    const value = code;
    setCode("");
    await mark(value, "hardware");
    hardwareInput.current?.focus();
  };

  const exportExcel = () => {
    const presentRows = records.map((r) => ({ Date: r.date, Time: r.time, Student_ID: r.studentId, Name: r.name, Class: r.className, Status: "Present", Method: r.source, Operator: r.operatorName }));
    const absentRows = absent.map((r) => ({ Date: today(), Time: "", Student_ID: r.studentId, Name: r.name, Class: r.className, Status: "Absent", Method: "", Operator: "" }));
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet([...presentRows, ...absentRows]), "All Students");
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(presentRows), "Present");
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(absentRows), "Absent");
    XLSX.writeFile(workbook, `attendance-${today()}.xlsx`);
  };

  return <main className="attendance-page">
    <header className="attendance-header">
      <div><h2>Digital QR Attendance</h2><p>{records.length} present &middot; {absent.length} absent &middot; {records.length + absent.length} total &middot; <span className={online ? "server-ok" : "server-off"}>{online ? "SQLite online" : "SQLite offline"}</span> &middot; <span className={erpSync.pending ? "erp-sync-pending" : "erp-sync-ok"}>{erpSync.syncing ? "Mongo syncing..." : erpSync.pending ? `${erpSync.pending} Mongo sync pending` : "Mongo synced"}</span></p>{erpSync.message && <small className="erp-sync-message">{erpSync.message}</small>}</div>
      <div className="attendance-actions"><button type="button" onClick={() => syncWithErp(true)} disabled={erpSync.syncing}>{erpSync.syncing ? "Syncing..." : "Sync to ERP"}</button><button type="button" onClick={onBack}>Back</button><button type="button" onClick={exportExcel} disabled={!records.length && !absent.length}>Export Excel</button></div>
    </header>
    <div className="operator-row"><label>Teacher/operator <input value={operator} onChange={(e) => setOperator(e.target.value)} placeholder="Teacher ka naam" /></label></div>
    <section className="mobile-connect">
      <div>
        <strong>Mobile scanner</strong>
        {scannerUrls.length ? <><p>Mobile ko isi Wi-Fi se jodkar QR scan karein.</p><a href={scannerUrls[0]} target="_blank" rel="noreferrer">{scannerUrls[0]}</a></> : <p>Network address nahi mila. Wi-Fi connection aur backend check karein.</p>}
      </div>
      {scannerUrls[0] && <QRCodeSVG value={scannerUrls[0]} size={86} level="M" marginSize={1} />}
    </section>
    <div className="attendance-layout">
      <section className="scanner-card">
        <p className="scanner-message" role="status">{message}</p>
        <div className={`camera-frame ${scanning ? "active" : ""}`}><div id="attendance-qr-reader" /></div>
        <div className="scanner-controls">
          {!scanning ? <button type="button" onClick={startCamera}>Start mobile camera</button> : <button type="button" onClick={stopCamera}>Stop camera</button>}
          <input ref={photoInput} className="qr-photo-input" type="file" accept="image/*" capture="environment" onChange={scanPhoto} />
          <button type="button" onClick={() => photoInput.current?.click()}>Scan QR photo</button>
          <form onSubmit={hardwareScan}><input ref={hardwareInput} autoFocus value={code} onChange={(e) => setCode(e.target.value)} placeholder="USB/Bluetooth scanner yahan scan kare" autoComplete="off" /><button type="submit" disabled={!code.trim()}>Mark</button></form>
          
        </div>
      </section>
      <section className="attendance-report">
        <div className="list-tabs">
          <button type="button" className={listView === "present" ? "active present" : ""} onClick={() => setListView("present")}>Present <b>{records.length}</b></button>
          <button type="button" className={listView === "absent" ? "active absent" : ""} onClick={() => setListView("absent")}>Absent <b>{absent.length}</b></button>
          <span>Total: <b>{records.length + absent.length}</b></span>
        </div>
        {listView === "present" && (!records.length ? <p className="empty-attendance">Abhi koi attendance nahi lagi.</p> : <div className="attendance-table-wrap"><table><thead><tr><th>Time</th><th>Name</th><th>Father</th><th>Class</th><th>Method</th><th>Status</th></tr></thead><tbody>{records.map((r) => <tr key={r.id}><td>{r.time}</td><td><b>{r.name}</b></td><td>{r.fatherName || "-"}</td><td>{r.className || "-"}</td><td>{r.source}</td><td><span>Present</span></td></tr>)}</tbody></table></div>)}
        {listView === "absent" && (!absent.length ? <p className="empty-attendance">Koi absent student nahi hai.</p> : <div className="attendance-table-wrap"><table><thead><tr><th>Name</th><th>Father</th><th>Class</th><th>Status</th></tr></thead><tbody>{absent.map((r) => <tr key={r.studentId}><td><b>{r.name}</b></td><td>{r.fatherName || "-"}</td><td>{r.className || "-"}</td><td><span className="absent-status">Absent</span></td></tr>)}</tbody></table></div>)}
      </section>
      <section className="attendance-list legacy-list"><h3>Today's central attendance</h3>
        {!records.length ? <p className="empty-attendance">Abhi koi attendance nahi lagi.</p> : <div className="attendance-table-wrap"><table><thead><tr><th>Time</th><th>ID</th><th>Name</th><th>Class</th><th>Method</th><th>Status</th></tr></thead><tbody>{records.map((r) => <tr key={r.id}><td>{r.time}</td><td>{r.studentId}</td><td>{r.name}</td><td>{r.className || "ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Â¦Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â"}</td><td>{r.source}</td><td><span>{r.status}</span></td></tr>)}</tbody></table></div>}
      </section>
      <section className="attendance-list legacy-list"><h3>Absent students ({absent.length})</h3>
        {!absent.length ? <p className="empty-attendance">Koi absent student nahi hai.</p> : <div className="attendance-table-wrap"><table><thead><tr><th>ID</th><th>Name</th><th>Class</th><th>Status</th></tr></thead><tbody>{absent.map((r) => <tr key={r.studentId}><td>{r.studentId}</td><td>{r.name}</td><td>{r.className || "ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Â¦Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â"}</td><td><span>Absent</span></td></tr>)}</tbody></table></div>}
      </section>
    </div>
  </main>;
}





