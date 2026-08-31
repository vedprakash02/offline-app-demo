import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  FiArrowRight,
  FiBookOpen,
  FiEye,
  FiEyeOff,
  FiLock,
  FiMail,
  FiUser,
  FiUsers,
} from "react-icons/fi";
import "../auth.css";

export default function ModernSignUp() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false),
    [message, setMessage] = useState(""),
    [isError, setIsError] = useState(false),
    [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    role: "",
  });
  const handleChange = ({ target: { name, value } }) =>
    setFormData((current) => ({ ...current, [name]: value }));
  const handleSubmit = async (event) => {
    event.preventDefault();
    if (loading) return;
    setLoading(true);
    setMessage("");
    try {
      const response = await fetch("http://localhost:3000/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const data = await response.json();
      if (response.ok && data.success) {
        setIsError(false);
        setMessage("Account created! Taking you to login...");
        setFormData({ username: "", email: "", password: "", role: "" });
        setTimeout(() => {
          setLoading(false);
          navigate("/login");
        }, 2000);
      } else {
        setIsError(true);
        setMessage(data.message || "Account create nahi ho paya.");
        setLoading(false);
      }
    } catch (error) {
      console.error("Signup Error:", error);
      setIsError(true);
      setMessage("Server se connect nahi ho pa raha hai!");
      setLoading(false);
    }
  };

  return (
    <main className="auth-page">
      <section className="auth-card">
        <aside className="auth-showcase">
          <div className="auth-brand">
            <span>
              <FiBookOpen />
            </span>{" "}
           Vidya prabandh
          </div>
          <div className="auth-showcase-copy">
            <span className="auth-kicker">Get started today</span>
            <h2>Everything your school needs, in one place.</h2>
            <p>
              Create your secure workspace and make everyday school management
              effortless.
            </p>
          </div>
          <div className="auth-decoration" aria-hidden="true">
            <span />
            <span />
            <span />
          </div>
          <p className="auth-trust">
            Simple setup • Secure data • Better workflow
          </p>
        </aside>
        <div className="auth-form-panel">
          <div className="auth-mobile-brand">
            <FiBookOpen /> 
          </div>
          <form className="auth-form" onSubmit={handleSubmit}>
            <header>
              <span className="auth-eyebrow">CREATE YOUR ACCOUNT</span>
              <h1>Start managing smarter</h1>
              <p>Fill in your details—it only takes a minute.</p>
            </header>
            <div className="auth-field-grid">
              <label className="auth-field">
                <span>Full name</span>
                <div className="auth-input">
                  <FiUser />
                  <input
                    name="username"
                    placeholder="Your name"
                    autoComplete="name"
                    required
                    value={formData.username}
                    onChange={handleChange}
                  />
                </div>
              </label>
              <label className="auth-field">
                <span>Your role</span>
                <div className="auth-input">
                  <FiUsers />
                  <select
                    name="role"
                    required
                    value={formData.role}
                    onChange={handleChange}
                  >
                    <option value="" disabled>
                      Select role
                    </option>
                    <option value="teacher">Teacher</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
              </label>
            </div>
            <label className="auth-field">
              <span>Email address</span>
              <div className="auth-input">
                <FiMail />
                <input
                  type="email"
                  name="email"
                  placeholder="name@school.com"
                  autoComplete="email"
                  required
                  value={formData.email}
                  onChange={handleChange}
                />
              </div>
            </label>
            <label className="auth-field">
              <span>Password</span>
              <div className="auth-input">
                <FiLock />
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  placeholder="Create a strong password"
                  autoComplete="new-password"
                  minLength="6"
                  required
                  value={formData.password}
                  onChange={handleChange}
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPassword((value) => !value)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <FiEyeOff /> : <FiEye />}
                </button>
              </div>
            </label>
            {message && (
              <div
                className={`auth-message ${isError ? "error" : "success"}`}
                role="status"
              >
                {message}
              </div>
            )}
            <button className="auth-submit" type="submit" disabled={loading}>
              <span>{loading ? "Creating account..." : "Create account"}</span>
              {!loading && <FiArrowRight />}
            </button>
            <p className="auth-switch">
              Already have an account? <Link to="/login">Sign in</Link>
            </p>
          </form>
        </div>
      </section>
    </main>
  );
}
