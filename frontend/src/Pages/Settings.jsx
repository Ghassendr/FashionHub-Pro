import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Mail,
  User,
  Building2,
  Phone,
  Save,
  AlertCircle,
  CheckCircle,
  X,
} from "lucide-react";
import { authService } from "../services/authService";
import "./Settings.css"; // Link new CSS file

function Settings() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const token = authService.getToken();
  const userId = authService.getUserId();
  const userInfo = authService.getUserInfo();

  const [formData, setFormData] = useState({
    nom: "",
    prenom: "",
    email: "",
    mail: "",
    telephone: "",
    nomOrganization: "",
    lieu: "",
    nomContact: "",
    prenomContact: "",
    telephoneContact: "",
    description: "",
  });

  // Fetch user profile
  useEffect(() => {
    fetchUserProfile();
  }, []);

  const fetchUserProfile = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `http://localhost:8000/api/auth/user/${userId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setFormData(data.user);
      }
    } catch (err) {
      setError("Failed to load profile");
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      const response = await fetch(
        `http://localhost:8000/api/auth/user/${userId}/update`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(formData),
        }
      );

      if (!response.ok) {
        const data = await response.json();
        setError(data.error || "Failed to update profile");
        setLoading(false);
        return;
      }

      setSuccess("Profile updated successfully!");
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError("Connection error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="settings-container">
      <header className="settings-header">
        <button className="back-btn" onClick={() => navigate("/dashboard")}>
          <ArrowLeft size={16} />
          Back to Dashboard
        </button>
        <h1>Settings & Profile</h1>
      </header>

      <main className="settings-content">
        <div className="settings-card">
          {/* Messages */}
          {error && <div className="alert alert-error">{error}</div>}
          {success && <div className="alert alert-success">{success}</div>}

          {/* Profile Header */}
          <div className="profile-header">
            <div className="profile-avatar">
              <User size={48} />
            </div>
            <div className="profile-info">
              <h2>
                {formData.prenom || "Client"} {formData.nom || "Profile"}
              </h2>
              <p>{userInfo.email}</p>
            </div>
          </div>

          {/* Edit Form */}
          <form onSubmit={handleSubmit} className="settings-form">
            {/* Section: Personal Info */}
            <div className="form-section">
              <h3>Personal Information</h3>
              <div className="form-row">
                <div className="form-group">
                  <label>First Name</label>
                  <div className="input-wrapper">
                    <User size={18} />
                    <input
                      type="text"
                      name="prenom"
                      value={formData.prenom}
                      onChange={handleInputChange}
                      placeholder="Enter first name"
                    />
                  </div>
                </div>
                <div className="form-group">
                  <label>Last Name</label>
                  <div className="input-wrapper">
                    <User size={18} />
                    <input
                      type="text"
                      name="nom"
                      value={formData.nom}
                      onChange={handleInputChange}
                      placeholder="Enter last name"
                    />
                  </div>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Email</label>
                  <div className="input-wrapper">
                    <Mail size={18} />
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      placeholder="Email address"
                    />
                  </div>
                </div>
                <div className="form-group">
                  <label>Phone</label>
                  <div className="input-wrapper">
                    <Phone size={18} />
                    <input
                      type="tel"
                      name="telephone"
                      value={formData.telephone}
                      onChange={handleInputChange}
                      placeholder="Phone number"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Section: Organization */}
            <div className="form-section">
              <h3>Organization Details</h3>
              <div className="form-row">
                <div className="form-group">
                  <label>Organization Name</label>
                  <div className="input-wrapper">
                    <Building2 size={18} />
                    <input
                      type="text"
                      name="nomOrganization"
                      value={formData.nomOrganization}
                      onChange={handleInputChange}
                      placeholder="Enter organization name"
                    />
                  </div>
                </div>
                <div className="form-group">
                  <label>Location</label>
                  <div className="input-wrapper">
                    <Building2 size={18} />
                    <input
                      type="text"
                      name="lieu"
                      value={formData.lieu}
                      onChange={handleInputChange}
                      placeholder="City or location"
                    />
                  </div>
                </div>
              </div>

              <div className="form-group">
                <label>Description</label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  placeholder="Tell us about your organization..."
                  rows="4"
                ></textarea>
              </div>
            </div>

            {/* Section: Contact Person */}
            <div className="form-section">
              <h3>Contact Person</h3>
              <div className="form-row">
                <div className="form-group">
                  <label>Contact First Name</label>
                  <div className="input-wrapper">
                    <User size={18} />
                    <input
                      type="text"
                      name="prenomContact"
                      value={formData.prenomContact}
                      onChange={handleInputChange}
                      placeholder="Contact first name"
                    />
                  </div>
                </div>
                <div className="form-group">
                  <label>Contact Last Name</label>
                  <div className="input-wrapper">
                    <User size={18} />
                    <input
                      type="text"
                      name="nomContact"
                      value={formData.nomContact}
                      onChange={handleInputChange}
                      placeholder="Contact last name"
                    />
                  </div>
                </div>
              </div>

              <div className="form-group">
                <label>Contact Phone</label>
                <div className="input-wrapper">
                  <Phone size={18} />
                  <input
                    type="tel"
                    name="telephoneContact"
                    value={formData.telephoneContact}
                    onChange={handleInputChange}
                    placeholder="Contact phone number"
                  />
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <div className="form-actions">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => navigate("/dashboard")}
              >
                Cancel
              </button>
              <button type="submit" className="btn-primary" disabled={loading}>
                <Save size={16} />
                {loading ? "SAVING..." : "SAVE CHANGES"}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}

export default Settings;
