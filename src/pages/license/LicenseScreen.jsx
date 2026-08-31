import { useRef, useState } from "react";
import axios from "axios";
import {
  FiAlertTriangle,
  FiCheckCircle,
  FiClipboard,
  FiDownload,
  FiKey,
  FiUpload,
} from "react-icons/fi";
import "./LicenseScreen.css";
export default function LicenseScreen({ status, onActivated }) {
  const inputRef = useRef(null);
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState("");
  const [notice, setNotice] = useState(null);
  const copyMachine = async () => {
    await navigator.clipboard.writeText(status.machineId || "");
    setNotice({ type: "success", text: "Machine ID copy ho gaya." });
  };
  const activate = async () => {
    if (!file) return;
    setBusy("activate");
    setNotice(null);
    try {
      const form = new FormData();
      form.append("license", file);
      const { data } = await axios.post(
        "http://localhost:3000/license/activate",
        form,
        {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        },
      );
      setNotice({ type: "success", text: data.message });
      onActivated(data);
    } catch (error) {
      setNotice({
        type: "error",
        text: error.response?.data?.message || "License activate nahi hua.",
      });
    } finally {
      setBusy("");
    }
  };
  const backup = async () => {
    setBusy("backup");
    setNotice(null);
    try {
      const response = await axios.get("http://localhost:3000/admin/backup", {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        responseType: "blob",
      });
      const href = URL.createObjectURL(response.data);
      const link = document.createElement("a");
      link.href = href;
      link.download = `school-erp-backup-${new Date().toISOString().slice(0, 10)}.json`;
      link.click();
      URL.revokeObjectURL(href);
    } catch (error) {
      setNotice({
        type: "error",
        text:
          error.response?.data?.message ||
          "Backup download nahi hua. Admin login aur dono backends check karein.",
      });
    } finally {
      setBusy("");
    }
  };
  return (
    <main className="license-screen">
      <section className="license-box">
        <header>
          <div className="license-icon">
            <FiKey />
          </div>
          <span>VIDYA PRABANDH LICENSE</span>
          <h1>
            {status.expired ? "License Expired" : "License Activation Required"}
          </h1>
          <p>{status.message}</p>
        </header>
        {notice && (
          <div className={`license-notice ${notice.type}`}>
            {notice.type === "success" ? (
              <FiCheckCircle />
            ) : (
              <FiAlertTriangle />
            )}
            {notice.text}
          </div>
        )}
        <div className="machine-box">
          <span>This computer Machine ID</span>
          <code>{status.machineId}</code>
          <button onClick={copyMachine}>
            <FiClipboard />
            Copy Machine ID
          </button>
        </div>
        {status.license && (
          <div className="expired-meta">
            <span>
              School<strong>{status.license.schoolName}</strong>
            </span>
            <span>
              Plan<strong>{status.license.plan}</strong>
            </span>
            <span>
              Expired on<strong>{status.license.expiresAt}</strong>
            </span>
          </div>
        )}
        <div className="license-upload">
          <input
            ref={inputRef}
            type="file"
            accept=".lic,application/json"
            onChange={(event) => setFile(event.target.files?.[0] || null)}
          />
          <button
            className="license-file"
            onClick={() => inputRef.current?.click()}
          >
            <FiUpload />
            <span>
              <strong>{file?.name || "Select renewed license file"}</strong>
              <small>Signed .lic file from software provider</small>
            </span>
          </button>
          <button
            className="license-activate"
            onClick={activate}
            disabled={!file || busy === "activate"}
          >
            {busy === "activate" ? "Verifying license..." : "Activate license"}
          </button>
        </div>
        <div className="license-safety">
          <FiAlertTriangle />
          <p>
            Expiry par school data delete nahi hota. Renewal tak system write
            operations rokta hai aur emergency backup available rehta hai.
          </p>
        </div>
        <button
          className="license-backup"
          onClick={backup}
          disabled={busy === "backup"}
        >
          <FiDownload />
          {busy === "backup"
            ? "Preparing backup..."
            : "Download emergency backup"}
        </button>
      </section>
    </main>
  );
}
