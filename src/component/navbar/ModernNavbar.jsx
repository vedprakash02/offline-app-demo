import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { FiCalendar, FiChevronRight, FiClock, FiLogOut, FiMenu, FiMoon, FiShield, FiSun, FiX } from "react-icons/fi";
import "./ModernNavbar.css";

export default function ModernNavbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const [school, setSchool] = useState({ name: "School ERP", image: "" });
  const [imageError, setImageError] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [theme, setTheme] = useState(() => localStorage.getItem("app-theme") || "light");
  const [license, setLicense] = useState(() => {
    try { return JSON.parse(localStorage.getItem("vp-server-license")) || null; } catch { return null; }
  });

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;
    const controller = new AbortController();
    fetch("http://localhost:3000/get-school-profile", { signal: controller.signal, headers: { Authorization: `Bearer ${token}` } })
      .then(async (response) => response.ok ? response.json() : null)
      .then((data) => { const profile = data?.profile || data; if (profile) setSchool({ name: profile.schoolName || "School ERP", image: profile.schoolImage || "" }); })
      .catch((error) => { if (error.name !== "AbortError") console.error("School profile load failed:", error); });
    return () => controller.abort();
  }, []);

  useEffect(() => { document.documentElement.setAttribute("data-theme", theme); localStorage.setItem("app-theme", theme); }, [theme]);
  useEffect(() => setMenuOpen(false), [location.pathname]);
  useEffect(() => {
    const update = (event) => setLicense(event.detail);
    window.addEventListener("vp-license-status", update);
    return () => window.removeEventListener("vp-license-status", update);
  }, []);

  const logout = () => { localStorage.removeItem("token"); localStorage.removeItem("activeSession"); navigate("/login"); };
  const expiryLabel = license && !license.expired ? `DEMO · ${license.daysLeft ?? 0} DAY${license.daysLeft === 1 ? "" : "S"} LEFT` : "Licence checking";
  const expiryTitle = license && !license.expired ? "Online licence verified" : "Licence status";
  return <header className="modern-navbar"><Link className="navbar-brand" to="/dashboard" aria-label="Dashboard home"><div className="navbar-logo">{school.image && !imageError ? <img src={`http://localhost:3000/uploads/${school.image}`} alt="School logo" onError={() => setImageError(true)} /> : <img src="/vidya-prabandh.png" alt="Vidya Prabandh logo" />}</div><div className="navbar-brand-copy"><strong>{school.name}</strong><small>School Management System</small></div></Link><button className="navbar-menu-toggle" type="button" aria-label={menuOpen ? "Close navigation" : "Open navigation"} aria-expanded={menuOpen} onClick={() => setMenuOpen((open) => !open)}>{menuOpen ? <FiX /> : <FiMenu />}</button><nav className={`navbar-actions ${menuOpen ? "open" : ""}`} aria-label="Account actions"><div className="license-status" title={expiryTitle}><FiClock /><span><small>Demo license</small><strong>{expiryLabel}</strong></span></div><Link className="navbar-action session-action" to="/session"><span className="navbar-action-icon"><FiCalendar /></span><span><small>Academic session</small><strong>{localStorage.getItem("activeSession") || "Select session"}</strong></span><FiChevronRight className="action-arrow" /></Link><Link className="navbar-action admin-action" to="/allowed-users"><span className="navbar-action-icon"><FiShield /></span><span><small>Access control</small><strong>Admin Panel</strong></span><FiChevronRight className="action-arrow" /></Link><button className="navbar-icon-button theme-button" type="button" onClick={() => setTheme((current) => current === "light" ? "dark" : "light")} aria-label={`Switch to ${theme === "light" ? "dark" : "light"} mode`} title={`Switch to ${theme === "light" ? "dark" : "light"} mode`}>{theme === "light" ? <FiMoon /> : <FiSun />}<span>{theme === "light" ? "Dark mode" : "Light mode"}</span></button><button className="navbar-icon-button logout-button" type="button" onClick={logout}><FiLogOut /><span>Logout</span></button></nav></header>;
}
