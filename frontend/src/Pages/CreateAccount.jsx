import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AlertCircle, CheckCircle, Loader, X } from "lucide-react";
import "../App.css";

function CreateAccount() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    // Login
    email: "",
    password: "",
    // Personal Info
    nom: "",
    prenom: "",
    mail: "",
    telephone: "",
    // Organization Info
    nomOrganization: "",
    lieu: "",
    typeProduct: "",
    specialites: "",
    numeroLicence: "",
    siteWeb: "",
    nombreEmployes: "",
    anneeCreation: "",
    description: "",
    // Address Info
    adresse: "",
    codePostal: "",
    ville: "",
    pays: "",
    // Contact Info
    nomContact: "",
    prenomContact: "",
    telephoneContact: "",
    // Certifications
    certificationsQualite: [],
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [certificationInput, setCertificationInput] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [formErrors, setFormErrors] = useState({});

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    setError("");
    // Clear specific field error when user starts typing
    if (formErrors[name]) {
      setFormErrors((prev) => ({
        ...prev,
        [name]: "",
      }));
    }
  };

  const handleAddCertification = () => {
    if (certificationInput.trim()) {
      setFormData((prev) => ({
        ...prev,
        certificationsQualite: [
          ...prev.certificationsQualite,
          certificationInput.trim(),
        ],
      }));
      setCertificationInput("");
    }
  };

  const handleRemoveCertification = (index) => {
    setFormData((prev) => ({
      ...prev,
      certificationsQualite: prev.certificationsQualite.filter(
        (_, i) => i !== index,
      ),
    }));
  };

  const validateStep = (step) => {
    const errors = {};

    if (step === 1) {
      // Step 1: Login Credentials
      if (!formData.email.trim()) {
        errors.email = "Email is required";
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
        errors.email = "Please enter a valid email";
      }
      if (!formData.password) {
        errors.password = "Password is required";
      } else if (formData.password.length < 8) {
        errors.password = "Password must be at least 8 characters";
      }
    } else if (step === 2) {
      // Step 2: Personal Info + Organization
      if (!formData.prenom.trim()) errors.prenom = "First name is required";
      if (!formData.nom.trim()) errors.nom = "Last name is required";
      if (!formData.telephone.trim())
        errors.telephone = "Phone number is required";
      if (!formData.nomOrganization.trim())
        errors.nomOrganization = "Organization name is required";
      if (!formData.lieu.trim()) errors.lieu = "Location is required";
    } else if (step === 3) {
      // Step 3: Address
      if (!formData.adresse.trim()) errors.adresse = "Address is required";
      if (!formData.codePostal.trim())
        errors.codePostal = "Postal code is required";
      if (!formData.ville.trim()) errors.ville = "City is required";
      if (!formData.pays.trim()) errors.pays = "Country is required";
    } else if (step === 4) {
      // Step 4: Contact Info
      if (!formData.nomContact.trim())
        errors.nomContact = "Contact last name is required";
      if (!formData.prenomContact.trim())
        errors.prenomContact = "Contact first name is required";
      if (!formData.telephoneContact.trim())
        errors.telephoneContact = "Contact phone is required";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleNextStep = () => {
    if (validateStep(currentStep)) {
      setFormErrors({});
      setError("");
      setCurrentStep(currentStep + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      setError("Please fill all required fields correctly");
    }
  };

  const handlePreviousStep = () => {
    setFormErrors({});
    setError("");
    setCurrentStep(currentStep - 1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess(false);

    if (!validateStep(4)) {
      setError("Please fill in all required fields correctly");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("http://localhost:8000/api/auth/signup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 409) {
          setError(
            "Email already exists. Please use a different email or login.",
          );
        } else if (response.status === 400) {
          setError(
            data.error ||
            "Invalid data provided. Please check your information.",
          );
        } else if (response.status === 500) {
          setError("Server error. Please try again later.");
        } else {
          setError(data.error || "Registration failed. Please try again.");
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
      console.error("Registration error:", err);
      setError(
        "Connection error. Please check your internet connection and try again.",
      );
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      {/* Left Side - Branding */}
      <div className="auth-branding auth-branding-compact">
        <div className="auth-logo">
          <div className="auth-logo-icon"></div>
          <div className="auth-logo-text">
            <h1>TISSU</h1>
            <span>Supplier Registration</span>
          </div>
        </div>
        <p className="auth-description">
          Join our exclusive network of premium fabric suppliers. Register your business and connect with leading fashion manufacturers worldwide.
        </p>
      </div>

      {/* Right Side - Form */}
      <div className="auth-form-container auth-form-container-full">
        <div className="auth-form-card auth-form-card-full">
          {/* Step Indicators */}
          <div className="step-indicators-top">
            {[1, 2, 3, 4].map((step) => (
              <div
                key={step}
                className={`step-dot ${currentStep >= step ? "active" : ""} ${currentStep === step ? "current" : ""
                  }`}
              />
            ))}
          </div>

          <h2>Supplier Registration</h2>
          <p className="auth-form-subtitle">
            Step {currentStep} of 4 - {
              currentStep === 1 ? "Account Credentials" :
                currentStep === 2 ? "Business Information" :
                  currentStep === 3 ? "Business Address" :
                    "Contact Details"
            }
          </p>

          {error && (
            <div className="auth-error">
              <AlertCircle size={18} />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="auth-success">
              <CheckCircle size={18} />
              <span>Registration successful! Redirecting to dashboard...</span>
            </div>
          )}

          <form className="auth-form">
            {/* ===== STEP 1: LOGIN CREDENTIALS ===== */}
            {currentStep === 1 && (
              <div className="auth-step-content">
                <h3 className="auth-section-title">Account Credentials</h3>

                <div className="auth-form-group">
                  <label htmlFor="email" className="auth-label">
                    EMAIL ADDRESS *
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    placeholder="supplier@company.com"
                    value={formData.email}
                    onChange={handleInputChange}
                    className={`auth-input ${formErrors.email ? "error" : ""}`}
                  />
                  {formErrors.email && (
                    <span className="field-error">{formErrors.email}</span>
                  )}
                </div>

                <div className="auth-form-group">
                  <label htmlFor="password" className="auth-label">
                    PASSWORD * (minimum 8 characters)
                  </label>
                  <div className="auth-input-wrapper">
                    <input
                      type={showPassword ? "text" : "password"}
                      id="password"
                      name="password"
                      placeholder="Create a secure password"
                      value={formData.password}
                      onChange={handleInputChange}
                      className={`auth-input ${formErrors.password ? "error" : ""}`}
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
                  {formErrors.password && (
                    <span className="field-error">{formErrors.password}</span>
                  )}
                </div>
              </div>
            )}

            {/* ===== STEP 2: PERSONAL & ORGANIZATION ===== */}
            {currentStep === 2 && (
              <div className="auth-step-content">
                <h3 className="auth-section-title">Personal Information</h3>

                <div className="auth-form-row">
                  <div className="auth-form-group">
                    <label htmlFor="prenom" className="auth-label">
                      FIRST NAME *
                    </label>
                    <input
                      type="text"
                      id="prenom"
                      name="prenom"
                      placeholder="John"
                      value={formData.prenom}
                      onChange={handleInputChange}
                      className={`auth-input ${formErrors.prenom ? "error" : ""}`}
                    />
                    {formErrors.prenom && (
                      <span className="field-error">{formErrors.prenom}</span>
                    )}
                  </div>
                  <div className="auth-form-group">
                    <label htmlFor="nom" className="auth-label">
                      LAST NAME *
                    </label>
                    <input
                      type="text"
                      id="nom"
                      name="nom"
                      placeholder="Smith"
                      value={formData.nom}
                      onChange={handleInputChange}
                      className={`auth-input ${formErrors.nom ? "error" : ""}`}
                    />
                    {formErrors.nom && (
                      <span className="field-error">{formErrors.nom}</span>
                    )}
                  </div>
                </div>

                <div className="auth-form-group">
                  <label htmlFor="telephone" className="auth-label">
                    PHONE NUMBER *
                  </label>
                  <input
                    type="tel"
                    id="telephone"
                    name="telephone"
                    placeholder="+1 (555) 000-0000"
                    value={formData.telephone}
                    onChange={handleInputChange}
                    className={`auth-input ${formErrors.telephone ? "error" : ""}`}
                  />
                  {formErrors.telephone && (
                    <span className="field-error">{formErrors.telephone}</span>
                  )}
                </div>

                <h3 className="auth-section-title" style={{ marginTop: "2rem" }}>
                  Business Information
                </h3>

                <div className="auth-form-group">
                  <label htmlFor="nomOrganization" className="auth-label">
                    BUSINESS NAME *
                  </label>
                  <input
                    type="text"
                    id="nomOrganization"
                    name="nomOrganization"
                    placeholder="Premium Fabrics Co."
                    value={formData.nomOrganization}
                    onChange={handleInputChange}
                    className={`auth-input ${formErrors.nomOrganization ? "error" : ""}`}
                  />
                  {formErrors.nomOrganization && (
                    <span className="field-error">
                      {formErrors.nomOrganization}
                    </span>
                  )}
                </div>

                <div className="auth-form-group">
                  <label htmlFor="lieu" className="auth-label">
                    BUSINESS LOCATION *
                  </label>
                  <input
                    type="text"
                    id="lieu"
                    name="lieu"
                    placeholder="New York, USA"
                    value={formData.lieu}
                    onChange={handleInputChange}
                    className={`auth-input ${formErrors.lieu ? "error" : ""}`}
                  />
                  {formErrors.lieu && (
                    <span className="field-error">{formErrors.lieu}</span>
                  )}
                </div>

                <div className="auth-form-row">
                  <div className="auth-form-group">
                    <label htmlFor="typeProduct" className="auth-label">
                      PRODUCT TYPE
                    </label>
                    <input
                      type="text"
                      id="typeProduct"
                      name="typeProduct"
                      placeholder="Cotton, Silk, Synthetic"
                      value={formData.typeProduct}
                      onChange={handleInputChange}
                      className="auth-input"
                    />
                  </div>
                  <div className="auth-form-group">
                    <label htmlFor="specialites" className="auth-label">
                      SPECIALTIES
                    </label>
                    <input
                      type="text"
                      id="specialites"
                      name="specialites"
                      placeholder="Premium, Organic, Custom"
                      value={formData.specialites}
                      onChange={handleInputChange}
                      className="auth-input"
                    />
                  </div>
                </div>

                <div className="auth-form-group">
                  <label htmlFor="description" className="auth-label">
                    BUSINESS DESCRIPTION
                  </label>
                  <textarea
                    id="description"
                    name="description"
                    placeholder="Describe your business and products..."
                    value={formData.description}
                    onChange={handleInputChange}
                    className="auth-input auth-textarea"
                    rows="3"
                    style={{ resize: 'vertical', minHeight: '80px' }}
                  />
                </div>
              </div>
            )}

            {/* ===== STEP 3: ADDRESS ===== */}
            {currentStep === 3 && (
              <div className="auth-step-content">
                <h3 className="auth-section-title">Business Address</h3>

                <div className="auth-form-group">
                  <label htmlFor="adresse" className="auth-label">
                    STREET ADDRESS *
                  </label>
                  <input
                    type="text"
                    id="adresse"
                    name="adresse"
                    placeholder="123 Fashion Avenue"
                    value={formData.adresse}
                    onChange={handleInputChange}
                    className={`auth-input ${formErrors.adresse ? "error" : ""}`}
                  />
                  {formErrors.adresse && (
                    <span className="field-error">{formErrors.adresse}</span>
                  )}
                </div>

                <div className="auth-form-row">
                  <div className="auth-form-group">
                    <label htmlFor="codePostal" className="auth-label">
                      POSTAL CODE *
                    </label>
                    <input
                      type="text"
                      id="codePostal"
                      name="codePostal"
                      placeholder="10001"
                      value={formData.codePostal}
                      onChange={handleInputChange}
                      className={`auth-input ${formErrors.codePostal ? "error" : ""}`}
                    />
                    {formErrors.codePostal && (
                      <span className="field-error">
                        {formErrors.codePostal}
                      </span>
                    )}
                  </div>
                  <div className="auth-form-group">
                    <label htmlFor="ville" className="auth-label">
                      CITY *
                    </label>
                    <input
                      type="text"
                      id="ville"
                      name="ville"
                      placeholder="New York"
                      value={formData.ville}
                      onChange={handleInputChange}
                      className={`auth-input ${formErrors.ville ? "error" : ""}`}
                    />
                    {formErrors.ville && (
                      <span className="field-error">{formErrors.ville}</span>
                    )}
                  </div>
                </div>

                <div className="auth-form-group">
                  <label htmlFor="pays" className="auth-label">
                    COUNTRY *
                  </label>
                  <input
                    type="text"
                    id="pays"
                    name="pays"
                    placeholder="United States"
                    value={formData.pays}
                    onChange={handleInputChange}
                    className={`auth-input ${formErrors.pays ? "error" : ""}`}
                  />
                  {formErrors.pays && (
                    <span className="field-error">{formErrors.pays}</span>
                  )}
                </div>
              </div>
            )}

            {/* ===== STEP 4: CONTACT INFO ===== */}
            {currentStep === 4 && (
              <div className="auth-step-content">
                <h3 className="auth-section-title">Primary Contact Person</h3>

                <div className="auth-form-row">
                  <div className="auth-form-group">
                    <label htmlFor="prenomContact" className="auth-label">
                      FIRST NAME *
                    </label>
                    <input
                      type="text"
                      id="prenomContact"
                      name="prenomContact"
                      placeholder="Jane"
                      value={formData.prenomContact}
                      onChange={handleInputChange}
                      className={`auth-input ${formErrors.prenomContact ? "error" : ""}`}
                    />
                    {formErrors.prenomContact && (
                      <span className="field-error">
                        {formErrors.prenomContact}
                      </span>
                    )}
                  </div>
                  <div className="auth-form-group">
                    <label htmlFor="nomContact" className="auth-label">
                      LAST NAME *
                    </label>
                    <input
                      type="text"
                      id="nomContact"
                      name="nomContact"
                      placeholder="Doe"
                      value={formData.nomContact}
                      onChange={handleInputChange}
                      className={`auth-input ${formErrors.nomContact ? "error" : ""}`}
                    />
                    {formErrors.nomContact && (
                      <span className="field-error">
                        {formErrors.nomContact}
                      </span>
                    )}
                  </div>
                </div>

                <div className="auth-form-group">
                  <label htmlFor="telephoneContact" className="auth-label">
                    CONTACT PHONE *
                  </label>
                  <input
                    type="tel"
                    id="telephoneContact"
                    name="telephoneContact"
                    placeholder="+1 (555) 000-0000"
                    value={formData.telephoneContact}
                    onChange={handleInputChange}
                    className={`auth-input ${formErrors.telephoneContact ? "error" : ""}`}
                  />
                  {formErrors.telephoneContact && (
                    <span className="field-error">
                      {formErrors.telephoneContact}
                    </span>
                  )}
                </div>

                <h3 className="auth-section-title" style={{ marginTop: "2rem" }}>
                  Additional Information (Optional)
                </h3>

                <div className="auth-form-row">
                  <div className="auth-form-group">
                    <label htmlFor="numeroLicence" className="auth-label">
                      BUSINESS LICENSE NUMBER
                    </label>
                    <input
                      type="text"
                      id="numeroLicence"
                      name="numeroLicence"
                      placeholder="License #"
                      value={formData.numeroLicence}
                      onChange={handleInputChange}
                      className="auth-input"
                    />
                  </div>
                  <div className="auth-form-group">
                    <label htmlFor="siteWeb" className="auth-label">
                      WEBSITE
                    </label>
                    <input
                      type="url"
                      id="siteWeb"
                      name="siteWeb"
                      placeholder="www.yourcompany.com"
                      value={formData.siteWeb}
                      onChange={handleInputChange}
                      className="auth-input"
                    />
                  </div>
                </div>

                <div className="auth-form-group">
                  <label className="auth-label">
                    QUALITY CERTIFICATIONS
                  </label>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <input
                      type="text"
                      value={certificationInput}
                      onChange={(e) => setCertificationInput(e.target.value)}
                      placeholder="ISO 9001, OEKO-TEX, etc."
                      className="auth-input"
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddCertification();
                        }
                      }}
                    />
                    <button
                      type="button"
                      onClick={handleAddCertification}
                      className="auth-button-secondary"
                      style={{
                        padding: '0.875rem 1.5rem',
                        whiteSpace: 'nowrap',
                        minWidth: 'fit-content'
                      }}
                    >
                      Add
                    </button>
                  </div>
                  {formData.certificationsQualite.length > 0 && (
                    <div style={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: '0.5rem',
                      marginTop: '0.75rem'
                    }}>
                      {formData.certificationsQualite.map((cert, index) => (
                        <div
                          key={index}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            padding: '0.5rem 0.75rem',
                            background: 'var(--surface)',
                            border: '1px solid var(--border)',
                            borderRadius: '6px',
                            fontSize: '0.875rem',
                          }}
                        >
                          <span>{cert}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveCertification(index)}
                            style={{
                              background: 'none',
                              border: 'none',
                              cursor: 'pointer',
                              color: 'var(--error)',
                              display: 'flex',
                              padding: '2px',
                            }}
                          >
                            <X size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ===== NAVIGATION BUTTONS ===== */}
            <div className="step-navigation">
              {currentStep > 1 && (
                <button
                  type="button"
                  onClick={handlePreviousStep}
                  className="auth-button auth-button-secondary"
                  disabled={loading}
                >
                  Previous
                </button>
              )}

              {currentStep < 4 ? (
                <button
                  type="button"
                  onClick={handleNextStep}
                  className="auth-button"
                  style={{ marginLeft: currentStep === 1 ? 'auto' : '0' }}
                >
                  Continue
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleSubmit}
                  className="auth-button"
                  disabled={loading || success}
                >
                  {loading ? (
                    <>
                      <Loader size={18} className="spin" />
                      Creating Account...
                    </>
                  ) : success ? (
                    <>
                      <CheckCircle size={18} />
                      Success!
                    </>
                  ) : (
                    "Complete Registration"
                  )}
                </button>
              )}
            </div>
          </form>

          <div className="auth-footer">
            Already registered?{" "}
            <Link to="/login" className="auth-link-bold">
              Sign in here
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CreateAccount;