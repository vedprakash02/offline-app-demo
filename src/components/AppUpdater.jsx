import { useEffect, useState } from "react";
import { check } from "@tauri-apps/plugin-updater";
import { relaunch } from "@tauri-apps/plugin-process";
import "./AppUpdater.css";

export default function AppUpdater() {
  const [update, setUpdate] = useState(null);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!window.__TAURI_INTERNALS__) return undefined;
    let cancelled = false;
    const findUpdate = async () => {
      try {
        const available = await check();
        if (available && !cancelled) setUpdate(available);
      } catch (error) {
        console.warn("Update check failed:", error);
      }
    };
    findUpdate();
    return () => { cancelled = true; };
  }, []);

  if (!update) return null;

  const install = async () => {
    setBusy(true);
    setStatus("Update download ho raha hai...");
    try {
      let downloaded = 0;
      let contentLength = 0;
      await update.downloadAndInstall((event) => {
        if (event.event === "Started") {
          contentLength = event.data.contentLength || 0;
        } else if (event.event === "Progress") {
          downloaded += event.data.chunkLength || 0;
          setProgress(contentLength ? Math.round((downloaded / contentLength) * 100) : 0);
        } else if (event.event === "Finished") {
          setProgress(100);
          setStatus("Update install ho raha hai...");
        }
      });
      await relaunch();
    } catch (error) {
      console.error("Update install failed:", error);
      const errMsg = error?.message || (typeof error === "string" ? error : JSON.stringify(error));
      setStatus(`Update fail: ${errMsg}`);
      setBusy(false);
    }
  };

  return (
    <div className="app-update-backdrop" role="dialog" aria-modal="true" aria-labelledby="app-update-title">
      <section className="app-update-dialog">
        <span className="app-update-kicker">Vidya Prabandh update</span>
        <h2 id="app-update-title">Naya update available hai</h2>
        <p>Version {update.version} install karein. App update ke baad automatically restart hogi.</p>
        {busy && <div className="app-update-progress"><span style={{ width: `${progress}%` }} /></div>}
        {status && <small className="app-update-status" style={{ display: 'block', wordBreak: 'break-word', color: status.startsWith('Update fail') ? '#dc2626' : 'inherit' }}>{status}</small>}
        <div className="app-update-actions">
          {!busy && <button type="button" className="app-update-later" onClick={() => setUpdate(null)}>Baad mein</button>}
          <button type="button" className="app-update-install" onClick={install} disabled={busy}>{busy ? `${progress || ""}% Downloading...` : "Update now"}</button>
        </div>
      </section>
    </div>
  );
}