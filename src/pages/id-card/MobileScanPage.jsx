import { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { attendanceApi } from "./attendanceApi";
import { decodeQrPhoto } from "./qrPhotoDecoder";
import { cacheStudents, getOfflineQueue, queueOfflineAttendance, removeSyncedEvents } from "./mobileOfflineStore";
import "./MobileScanPage.css";

export default function MobileScanPage() {
  const [message, setMessage] = useState("ID card ke QR ki photo lein ya Student ID darj karein.");
  const [status, setStatus] = useState("ready");
  const [code, setCode] = useState("");
  const [operator, setOperator] = useState(() => localStorage.getItem("attendance-operator") || "");
  const [scanning, setScanning] = useState(false);
  const [pendingCount, setPendingCount] = useState(() => getOfflineQueue().length);
  const [serverOnline, setServerOnline] = useState(false);
  const fileInput = useRef(null);
  const liveScanner = useRef(null);
  const recentScans = useRef(new Map());

  const mark = async (qrValue, source) => {
    if (!qrValue?.trim()) return null;
    setStatus("working");
    setMessage("Attendance server par bheji ja rahi hai...");
    try {
      const data = await attendanceApi.scan(qrValue, source, operator);
      setStatus("success");
      const scannedPerson = data.teacher || data.student;
      const scannedContext = data.teacher ? (data.teacher.designation || "Teacher") : (data.student?.className || "Class nahi mili");
      setMessage(`${data.message} (${scannedPerson?.name || "Record"} · ${scannedContext})`);
      navigator.vibrate?.([100, 60, 100]);
      return data;
    } catch (error) {
      if (!error.status) {
        try {
          const queued = queueOfflineAttendance({ qrValue, operatorName: operator });
          setPendingCount(queued.queue.length);
          setStatus(queued.duplicate ? "duplicate" : "offline");
          setMessage(queued.duplicate
            ? `${queued.student.name} ki attendance phone mein pehle se saved hai.`
            : `Offline saved: ${queued.student.name}. Connection milte hi sync karein.`);
          navigator.vibrate?.(queued.duplicate ? 300 : [100, 60, 100]);
          return { student: queued.student, offline: true };
        } catch (offlineError) {
          setStatus("error");
          setMessage(offlineError.message);
          return null;
        }
      }
      setStatus(error.status === 409 ? "duplicate" : "error");
      setMessage(error.message || "Attendance mark nahi hui.");
      navigator.vibrate?.(300);
      return null;
    }
  };

  const syncPending = async () => {
    const events = getOfflineQueue();
    try {
      const studentsData = await attendanceApi.getStudents();
      cacheStudents(studentsData.students || []);
      setServerOnline(true);
      if (!events.length) {
        setMessage(`${studentsData.students?.length || 0} students phone par ready hain. Koi pending attendance nahi hai.`);
        return;
      }
      setStatus("working");
      const data = await attendanceApi.syncOffline(events);
      const remaining = removeSyncedEvents(data.results || []);
      setPendingCount(remaining.length);
      setStatus(remaining.length ? "error" : "success");
      setMessage(remaining.length ? `${data.message} ${remaining.length} records check karne hain.` : data.message);
    } catch {
      setServerOnline(false);
      setStatus("offline");
      setMessage("Server nahi mila. Offline scanning jaari rakh sakte hain.");
    }
  };

  const startLiveScanner = async () => {
    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
      setStatus("error");
      setMessage("Continuous camera ke liye HTTPS chahiye. Abhi QR photo ya USB/Bluetooth scanner use karein.");
      return;
    }
    try {
      liveScanner.current = new Html5Qrcode("mobile-live-reader");
      await liveScanner.current.start(
        { facingMode: "environment" },
        { fps: 20, qrbox: { width: 240, height: 240 }, aspectRatio: 1 },
        (value) => {
          const now = Date.now();
          const lastSeen = recentScans.current.get(value) || 0;
          if (now - lastSeen < 5000) return;
          recentScans.current.set(value, now);
          for (const [codeValue, seenAt] of recentScans.current) {
            if (now - seenAt > 10000) recentScans.current.delete(codeValue);
          }
          mark(value, "camera");
        },
        () => {},
      );
      setScanning(true);
      setStatus("ready");
      setMessage("Scanner ready hai - student ya teacher ka QR camera ke saamne rakhein.");
    } catch (error) {
      liveScanner.current = null;
      setStatus("error");
      setMessage(error?.name === "NotAllowedError" ? "Camera permission Allow karein." : "Live scanner start nahi hua. HTTPS aur camera permission check karein.");
    }
  };

  const stopLiveScanner = async () => {
    try { if (liveScanner.current?.isScanning) await liveScanner.current.stop(); liveScanner.current?.clear(); } catch { /* already stopped */ }
    liveScanner.current = null;
    recentScans.current.clear();
    setScanning(false);
    setMessage("Scanner band hai.");
  };

  useEffect(() => () => {
    if (liveScanner.current?.isScanning) liveScanner.current.stop().catch(() => {});
  }, []);

  useEffect(() => { syncPending(); }, []);

  const scanPhoto = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    const reader = new Html5Qrcode("mobile-photo-reader");
    try {
      setStatus("working");
      setMessage("Photo mein QR dhunda ja raha hai...");
      const value = await decodeQrPhoto(file, reader);
      await mark(value, "photo");
    } catch (error) {
      console.error("Mobile QR photo scan failed", error);
      setStatus("error");
      setMessage("Photo mein QR nahi mila. QR ko paas se aur seedha capture karein.");
    } finally {
      try { reader.clear(); } catch { /* reader already clear hai */ }
    }
  };

  const saveOperator = (value) => {
    setOperator(value);
    localStorage.setItem("attendance-operator", value);
  };

  return <main className="mobile-scan-page">
    <section className="mobile-scan-card">
      <p className="mobile-kicker">SIRF ID</p>
      <h1>Mobile Attendance Scanner</h1>
      <p className="mobile-note">Mobile aur desktop ek hi Wi-Fi par hone chahiye. Play Store app ki zarurat nahi hai.</p>
      <div className="mobile-sync-bar">
        <span className={serverOnline ? "online" : "offline"}>{serverOnline ? "Server connected" : "Offline mode"}</span>
        <strong>{pendingCount} pending</strong>
        <button type="button" onClick={syncPending}>Students / attendance sync</button>
      </div>
      <p className="mobile-tip">Photo mein sirf QR aur uske aas-paas ka safed border rakhein. Desktop screen par QR chhota ho to ID Card Studio ke QR tab mein size 70-90 karein.</p>
      <label className="mobile-field">Teacher/operator
        <input value={operator} onChange={(event) => saveOperator(event.target.value)} placeholder="Teacher ka naam" />
      </label>
      <div className={`mobile-result ${status}`} role="status">{message}</div>
      <div id="mobile-live-reader" className={`mobile-live-reader ${scanning ? "active" : ""}`} />
      {!scanning
        ? <button className="mobile-primary" type="button" onClick={startLiveScanner}>Continuous scanner start karein</button>
        : <button className="mobile-stop" type="button" onClick={stopLiveScanner}>Scanner band karein</button>}
      <div className="mobile-divider"><span>ya photo scan</span></div>
      <div id="mobile-photo-reader" className="mobile-reader" />
      <label className={`mobile-photo-button ${status === "working" || scanning ? "disabled" : ""}`}>
        Camera se QR photo lein
        <input
          ref={fileInput}
          className="mobile-file-input"
          type="file"
          accept="image/*"
          capture="environment"
          disabled={status === "working" || scanning}
          onChange={scanPhoto}
        />
      </label>
      <form className="mobile-manual" onSubmit={(event) => { event.preventDefault(); const value = code; setCode(""); mark(value, "manual"); }}>
        <label className="mobile-field">Manual Student / Teacher ID
          <input value={code} onChange={(event) => setCode(event.target.value)} placeholder="Jaise STD-1001" autoComplete="off" />
        </label>
        <button type="submit" disabled={!code.trim() || status === "working"}>Mark attendance</button>
      </form>
    </section>
  </main>;
}
