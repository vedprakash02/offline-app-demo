import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FiArrowRight, FiBookOpen, FiEye, FiEyeOff, FiLock, FiMail } from "react-icons/fi";
import "../auth.css";

export default function ModernLogin() {
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();
  const handleChange = ({ target: { name, value } }) => setFormData((current) => ({ ...current, [name]: value }));

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (loading) return;
    setLoading(true); setMessage(""); setIsError(false);
    try {
      const response = await fetch("http://localhost:3000/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(formData) });
      const data = await response.json();
      if (response.ok && data.success) {
        localStorage.setItem("username", data.username); localStorage.setItem("token", data.token); localStorage.setItem("role", data.role); localStorage.setItem("email", data.email || formData.email);
        setMessage("Welcome back! Redirecting...");
        setTimeout(() => {
          if (data.role === "teacher" || data.role === "admin") navigate("/session");
          else { setMessage(data.message || "This account does not have access."); setIsError(true); }
        }, 800);
      } else { setMessage(data.message || "Email or password is incorrect."); setIsError(true); }
    } catch (error) { console.error("Login Error:", error); setMessage("Server se connect nahi ho pa raha hai!"); setIsError(true); }
    finally { setLoading(false); }
  };

  return <main className="auth-page"><section className="auth-card">
    <aside className="auth-showcase"><div className="auth-brand"><span><FiBookOpen /></span> Vidya prabandh</div><div className="auth-showcase-copy"><span className="auth-kicker">School management, simplified</span><h2>Welcome back to your digital campus.</h2><p>Manage students, attendance, marks and reports—all from one secure workspace.</p></div><div className="auth-decoration" aria-hidden="true"><span /><span /><span /></div><p className="auth-trust">Secure • Reliable • Easy to use</p></aside>
    <div className="auth-form-panel"><div className="auth-mobile-brand"><FiBookOpen /> EduDesk</div><form className="auth-form" onSubmit={handleSubmit}>
      <header><span className="auth-eyebrow">WELCOME BACK</span><h1>Sign in to your account</h1><p>Enter your details to continue to your dashboard.</p></header>
      <label className="auth-field"><span>Email address</span><div className="auth-input"><FiMail /><input type="email" name="email" placeholder="name@school.com" autoComplete="email" value={formData.email} required onChange={handleChange} /></div></label>
      <label className="auth-field"><span>Password</span><div className="auth-input"><FiLock /><input type={showPassword ? "text" : "password"} name="password" placeholder="Enter your password" autoComplete="current-password" value={formData.password} required onChange={handleChange} /><button type="button" className="password-toggle" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? "Hide password" : "Show password"}>{showPassword ? <FiEyeOff /> : <FiEye />}</button></div></label>
      {message && <div className={`auth-message ${isError ? "error" : "success"}`} role="status">{message}</div>}
      <button className="auth-submit" type="submit" disabled={loading}><span>{loading ? "Signing in..." : "Sign in"}</span>{!loading && <FiArrowRight />}</button><p className="auth-switch">New to EduDesk? <Link to="/signup">Create an account</Link></p>
    </form></div>
  </section></main>;
}
