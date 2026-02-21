import React from "react";
import { Link } from "react-router-dom";
import {
  Package,
  Zap,
  Lock,
  LogIn,
  UserPlus,
  TrendingUp,
  Layers,
} from "lucide-react";
import "./Homepage.css";

function Homepage() {
  return (
    <div className="homepage">
      {/* Navigation Bar */}
      <nav className="navbar">
        <div className="navbar-content">
          <div className="navbar-brand">
            <div className="brand-icon">🧵</div>
            <span className="brand-name">TISSU</span>
          </div>
          <div className="navbar-links">
            <Link to="/login" className="nav-link login-link">
              <LogIn size={18} /> Sign In
            </Link>
            <Link to="/create-account" className="nav-link signup-btn">
              <UserPlus size={18} /> Join Now
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="hero">
        <div className="hero-content">
          <div className="hero-text">
            <h1 className="hero-title">
              Professional Fabric Inventory Manager
            </h1>
            <p className="hero-subtitle">
              Upload fabric images, automatically extract dominant colors, and
              manage your inventory with AI-powered color detection.
            </p>
            <div className="hero-buttons">
              <Link to="/create-account" className="btn btn-primary">
                Get Started Free
              </Link>
              <Link to="/login" className="btn btn-secondary">
                Sign In
              </Link>
            </div>
            <p className="hero-note">
              ✓ No credit card required • ✓ Start free
            </p>
          </div>
          <div className="hero-visual">
            <div className="visual-card">
              <div className="visual-icon">📸</div>
              <p>Upload Image</p>
            </div>
            <div className="visual-arrow">→</div>
            <div className="visual-card">
              <div className="visual-icon">🎨</div>
              <p>Extract Color</p>
            </div>
            <div className="visual-arrow">→</div>
            <div className="visual-card">
              <div className="visual-icon">📊</div>
              <p>Manage Stock</p>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="features">
        <div className="features-header">
          <h2>Why Choose TISSU?</h2>
          <p>Everything you need to manage fabric inventory efficiently</p>
        </div>

        <div className="features-grid">
          <div className="feature-item">
            <div className="feature-icon">📸</div>
            <h3>Smart Image Upload</h3>
            <p>
              Upload fabric images with drag-and-drop. Supports PNG, JPG, GIF,
              WebP up to 5MB.
            </p>
          </div>

          <div className="feature-item">
            <div className="feature-icon">🎨</div>
            <h3>AI Color Detection</h3>
            <p>
              Automatically extract the dominant color from fabric images using
              advanced ML algorithms.
            </p>
          </div>

          <div className="feature-item">
            <div className="feature-icon">📊</div>
            <h3>Inventory Tracking</h3>
            <p>
              Track quantity, material type, price per meter, and detailed
              descriptions for each fabric.
            </p>
          </div>

          <div className="feature-item">
            <div className="feature-icon">🔍</div>
            <h3>Easy Search</h3>
            <p>
              Find fabrics quickly by color, material, price, or quantity.
              Filter and sort your inventory.
            </p>
          </div>

          <div className="feature-item">
            <div className="feature-icon">💾</div>
            <h3>Cloud Storage</h3>
            <p>
              All your fabric data securely stored in the cloud. Access from
              anywhere, anytime.
            </p>
          </div>

          <div className="feature-item">
            <div className="feature-icon">🔐</div>
            <h3>Secure & Private</h3>
            <p>
              Enterprise-grade security with encrypted data. Your inventory is
              only visible to you.
            </p>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="how-it-works">
        <div className="works-header">
          <h2>How It Works</h2>
          <p>Get started in just 4 simple steps</p>
        </div>

        <div className="steps-container">
          <div className="step">
            <div className="step-circle">1</div>
            <h4>Create Account</h4>
            <p>Sign up with your email and create your account in seconds</p>
          </div>

          <div className="step-divider">|</div>

          <div className="step">
            <div className="step-circle">2</div>
            <h4>Upload Image</h4>
            <p>Select a fabric image and upload it to your dashboard</p>
          </div>

          <div className="step-divider">|</div>

          <div className="step">
            <div className="step-circle">3</div>
            <h4>Extract Color</h4>
            <p>AI automatically detects the dominant color from the image</p>
          </div>

          <div className="step-divider">|</div>

          <div className="step">
            <div className="step-circle">4</div>
            <h4>Manage Inventory</h4>
            <p>Add fabric details and manage your complete inventory</p>
          </div>
        </div>
      </section>

      {/* Screenshot Section */}
      <section className="screenshot-section">
        <h2>Dashboard Preview</h2>
        <div className="screenshot-container">
          <div className="screenshot-mockup">
            <div className="mockup-header">📊 Fabric Inventory Dashboard</div>
            <div className="mockup-content">
              <div className="mockup-table">
                <div className="mockup-row header">
                  <span>Image</span>
                  <span>Color</span>
                  <span>Material</span>
                  <span>Quantity</span>
                  <span>Price</span>
                </div>
                <div className="mockup-row">
                  <span className="mockup-img">📸</span>
                  <span className="mockup-color">🔴 RGB(220,20,60)</span>
                  <span>Cotton</span>
                  <span>15m</span>
                  <span>$25/m</span>
                </div>
                <div className="mockup-row">
                  <span className="mockup-img">📸</span>
                  <span className="mockup-color">🔵 RGB(0,0,255)</span>
                  <span>Silk</span>
                  <span>8m</span>
                  <span>$45/m</span>
                </div>
                <div className="mockup-row">
                  <span className="mockup-img">📸</span>
                  <span className="mockup-color">⚫ RGB(50,50,50)</span>
                  <span>Wool</span>
                  <span>20m</span>
                  <span>$35/m</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="stats">
        <div className="stat-box">
          <div className="stat-value">500+</div>
          <div className="stat-label">Active Users</div>
        </div>
        <div className="stat-box">
          <div className="stat-value">50K+</div>
          <div className="stat-label">Fabrics Managed</div>
        </div>
        <div className="stat-box">
          <div className="stat-value">99.9%</div>
          <div className="stat-label">Uptime</div>
        </div>
        <div className="stat-box">
          <div className="stat-value">24/7</div>
          <div className="stat-label">Support</div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="cta-section">
        <h2>Ready to Manage Your Fabrics Better?</h2>
        <p>
          Start your free account today and experience smart fabric inventory
          management
        </p>
        <Link to="/create-account" className="btn btn-lg btn-primary">
          Create Your Account Now
        </Link>
      </section>

      {/* Footer */}
      <footer className="footer">
        <div className="footer-content">
          <div className="footer-brand">
            <div className="footer-icon">🧵</div>
            <span>TISSU</span>
          </div>
          <div className="footer-text">
            <p>Professional Fabric Inventory Management</p>
            <p>© 2026 TISSU. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default Homepage;
