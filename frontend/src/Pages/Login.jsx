import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AlertCircle, CheckCircle, Loader } from "lucide-react";
import "../App.css";

function Login() {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess(false);

    // Validation
    if (!formData.email.trim()) {
      setError("Email is required");
      return;
    }
    if (!formData.password) {
      setError("Password is required");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      setError("Please enter a valid email address");
      return;
    }
    if (formData.password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("http://localhost:8000/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 401) {
          setError("Invalid email or password. Please try again.");
        } else if (response.status === 404) {
          setError("Account not found. Please create an account first.");
        } else if (response.status === 500) {
          setError("Server error. Please try again later.");
        } else {
          setError(data.error || "Login failed. Please try again.");
        }
        setLoading(false);
        return;
      }

      // Store token and user info
      if (!data.token || !data.user) {
        setError("Invalid response from server. Please try again.");
        setLoading(false);
        return;
      }

      localStorage.setItem("token", data.token);
      localStorage.setItem("user_id", data.user.id);
      localStorage.setItem("user_email", data.user.email);
      localStorage.setItem(
        "user_name",
        `${data.user.prenom || ""} ${data.user.nom || ""}`.trim(),
      );

      setSuccess(true);
      setTimeout(() => {
        setLoading(false);
        navigate("/fournisseur/dashboard");
      }, 1500);
    } catch (err) {
      console.error("Login error:", err);
      setError(
        "Connection error. Please check your internet connection and try again.",
      );
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      {/* Left Side - Branding */}
      <div className="auth-branding">
        <div className="auth-logo">
          <div className="auth-logo-icon"></div>
          <div className="auth-logo-text">
            <h1>TISSU</h1>
            <span>Premium Fabric Suppliers</span>
          </div>
        </div>
        <p className="auth-description">
          Join the leading platform connecting premium fabric suppliers with fashion manufacturers worldwide. Access exclusive materials, manage your inventory, and grow your textile business.
        </p>
        <div className="auth-features">
          <div className="feature-item">
            <div className="feature-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 2L2 7l10 5 10-5-10-5z" />
                <path d="M2 17l10 5 10-5" />
                <path d="M2 12l10 5 10-5" />
              </svg>
            </div>
            <p>Verified Supplier Network</p>
          </div>
          <div className="feature-item">
            <div className="feature-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <path d="M9 11l3 3L22 4" />
              </svg>
            </div>
            <p>Quality Certified Materials</p>
          </div>
          <div className="feature-item">
            <div className="feature-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
            </div>
            <p>24/7 Business Support</p>
          </div>
        </div>
      </div>

      {/* Right Side - Form */}
      <div className="auth-form-container">
        <div className="auth-form-card">
          <h2>Supplier Portal</h2>
          <p className="auth-form-subtitle">Sign in to manage your fabric inventory</p>

          {error && (
            <div className="auth-error">
              <AlertCircle size={18} />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="auth-success">
              <CheckCircle size={18} />
              <span>Login successful! Redirecting to dashboard...</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="auth-form">
            {/* Email Field */}
            <div className="auth-form-group">
              <label htmlFor="email" className="auth-label">
                EMAIL ADDRESS
              </label>
              <input
                type="email"
                id="email"
                name="email"
                placeholder="supplier@example.com"
                value={formData.email}
                onChange={handleInputChange}
                className="auth-input"
              />
            </div>

            {/* Password Field */}
            <div className="auth-form-group">
              <label htmlFor="password" className="auth-label">
                PASSWORD
              </label>
              <div className="auth-input-wrapper">
                <input
                  type={showPassword ? "text" : "password"}
                  id="password"
                  name="password"
                  placeholder="Enter your password"
                  value={formData.password}
                  onChange={handleInputChange}
                  className="auth-input"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="auth-password-toggle"
                  style={{ right: '12px' }}
                >
                  {showPassword ? "HIDE" : "SHOW"}
                </button>
              </div>
            </div>

            {/* Remember Me & Forgot Password */}
            <div className="auth-options">
              <label className="auth-checkbox">
                <input type="checkbox" />
                <span>Remember me</span>
              </label>
              <Link to="/forgot-password" className="auth-link">
                Forgot password?
              </Link>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              className="auth-button"
              disabled={loading || success}
            >
              {loading ? (
                <>
                  <Loader size={18} className="spin" />
                  Signing in...
                </>
              ) : success ? (
                <>
                  <CheckCircle size={18} />
                  Success!
                </>
              ) : (
                "Sign In"
              )}
            </button>
          </form>

          {/* Sign Up Link */}
          <div className="auth-footer">
            New supplier?{" "}
            <Link to="/create-account" className="auth-link-bold">
              Register your business
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Login;