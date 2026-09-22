import { useEffect,useState } from "react"; import { invoke,isTauri } from "@tauri-apps/api/core"; import "./ServerLicenseGate.css";
const publish=(status)=>{localStorage.setItem("vp-server-license",JSON.stringify(status));window.dispatchEvent(new CustomEvent("vp-license-status",{detail:status}));};
export default function ServerLicenseGate({ children }) {
	const [status, setStatus] = useState(null);
	const [key, setKey] = useState("");
	const [error, setError] = useState("");
	const [busy, setBusy] = useState(false);

	useEffect(() => {
		const apply = (nextStatus) => {
			setStatus(nextStatus);
			publish(nextStatus);
		};
		if (!isTauri()) {
			apply({ expired: false, daysLeft: 15 });
			return;
		}
		invoke("demo_status").then(apply).catch((checkError) => apply({ expired: true, reason: String(checkError) }));
	}, []);

	const activate = async (event) => {
		event.preventDefault();
		setBusy(true);
		setError("");
		try {
			const nextStatus = await invoke("activate_demo", { activationKey: key });
			if (nextStatus.expired) {
				setError(nextStatus.reason || "Key is not valid.");
				return;
			}
			setStatus(nextStatus);
			publish(nextStatus);
			setKey("");
		} catch (activationError) {
			setError(String(activationError));
		} finally {
			setBusy(false);
		}
	};

	if (!status) {
		return <main className="server-lic"><section>Checking licence...</section></main>;
	}

	if (!status.expired) {
		return children;
	}

	const isRenewal = !status.activationRequired;
	return (
		<main className="server-lic">
			<section>
				<b>V</b>
				<small>VIDYAPRABANDH · OFFLINE DESKTOP</small>
				<h1>{isRenewal ? "Renew your licence" : "Activate your demo"}</h1>
				<p>{status.reason || "Contact Vidyaprabandh support."}</p>
				<form onSubmit={activate}>
					<input aria-label={isRenewal ? "Renewal key" : "Activation key"} value={key} onChange={(event) => setKey(event.target.value)} placeholder="VP-IDC-XXXX-XXXX-XXXX-XXXX" />
					<button disabled={busy}>{busy ? "Verifying..." : isRenewal ? "Renew licence" : "Activate 15-day demo"}</button>
				</form>
				{error && <em>{error}</em>}
			</section>
		</main>
	);
}
