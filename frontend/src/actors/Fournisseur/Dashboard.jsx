import React, { useState, useEffect } from "react";
import {
  Menu,
  Home,
  Package,
  Settings,
  LogOut,
  User,
  Plus,
  Trash2,
  Edit2,
  X,
  TrendingUp,
  BarChart3,
  AlertCircle,
  CheckCircle,
  Layers,
  DollarSign,
  Gauge,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { authService } from "../../services/authService";
import { createDebugButton } from "../utils/debugBackend";
import "./Dashboard.css";

function Dashboard() {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [fabrics, setFabrics] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [formError, setFormError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [stats, setStats] = useState({
    totalFabrics: 0,
    totalQuantity: 0,
    avgPrice: 0,
    topMaterial: "",
  });

  const [formData, setFormData] = useState({
    imageFile: null,
    quantite: "",
    materiel: "",
    prix: "",
    description: "",
  });
  const [imagePreview, setImagePreview] = useState("");

  const userInfo = authService.getUserInfo();
  const token = authService.getToken();


  // Fetch fabrics and verify token
  useEffect(() => {
    const initDashboard = async () => {
      if (!token) {
        navigate("/login");
        return;
      }

      try {
        const isValid = await authService.verifyToken(token);
        if (!isValid) {
          authService.logout();
          navigate("/login");
          return;
        }

        // Token is valid, fetch data
        fetchFabrics();

        // Add debug button for troubleshooting
        if (!document.getElementById("debug-backend-btn")) {
          createDebugButton();
        }
      } catch (err) {
        console.error("Token verification failed:", err);
        authService.logout();
        navigate("/login");
      }
    };

    initDashboard();
  }, [token, navigate]);

  // Calculate statistics
  useEffect(() => {
    if (fabrics.length > 0) {
      const totalQuantity = fabrics.reduce(
        (sum, f) => sum + (f.quantite || 0),
        0,
      );
      const avgPrice =
        fabrics.reduce((sum, f) => sum + (f.prix || 0), 0) / fabrics.length;

      // Find most common material
      const materials = {};
      fabrics.forEach((f) => {
        if (f.materiel) {
          materials[f.materiel] = (materials[f.materiel] || 0) + 1;
        }
      });
      const topMaterial =
        Object.keys(materials).length > 0
          ? Object.keys(materials).reduce((a, b) =>
            materials[a] > materials[b] ? a : b,
          )
          : "N/A";

      setStats({
        totalFabrics: fabrics.length,
        totalQuantity: totalQuantity.toFixed(2),
        avgPrice: avgPrice.toFixed(2),
        topMaterial,
      });
    }
  }, [fabrics]);

  const fetchFabrics = async () => {
    try {
      setLoading(true);
      setError("");
      const response = await fetch("http://localhost:8000/api/fabrics", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
      });

      if (response.ok) {
        const data = await response.json();
        const fabricsList = data.fabrics || [];
        setFabrics(fabricsList);
      } else if (response.status === 401) {
        setError("Session expired. Please login again.");
        authService.logout();
        navigate("/login");
      } else {
        const errorData = await response.json().catch(() => ({}));
        setError(errorData.error || "Failed to load fabrics");
      }
    } catch (err) {
      console.error("=== FETCH FABRICS ERROR ===");
      console.error("Error:", err.message || err);
      console.error("Token:", token ? "Present" : "Missing");
      console.error("Backend URL: http://localhost:8000/api/fabrics");
      console.error("Frontend: http://localhost:5173");
      console.log("\nDebugging Steps:");
      console.log("1. Check if backend is running on port 8000");
      console.log("2. Refresh browser (F5)");
      console.log("3. Check Network tab for OPTIONS requests and CORS errors");
      setError(
        "Cannot reach backend on http://localhost:8000. Make sure backend is running.",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleAddClick = () => {
    setEditingId(null);
    setFormData({
      imageFile: null,
      quantite: "",
      materiel: "",
      prix: "",
      description: "",
    });
    setImagePreview("");
    setShowForm(true);
  };

  const handleEditClick = (fabric) => {
    setEditingId(fabric._id);
    setFormData({
      imageFile: null,
      quantite: fabric.quantite,
      materiel: fabric.materiel,
      prix: fabric.prix,
      description: fabric.description,
    });
    // Show existing image if available
    setImagePreview(fabric.image || "");
    setShowForm(true);
  };

  const handleInputChange = (e) => {
    const { name, value, type, files } = e.target;
    if (type === "file") {
      // Handle image upload
      if (files && files[0]) {
        setFormData({ ...formData, imageFile: files[0] });
        // Create preview URL
        const reader = new FileReader();
        reader.onloadend = () => {
          setImagePreview(reader.result);
        };
        reader.readAsDataURL(files[0]);
      }
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  const validateForm = () => {
    if (!formData.imageFile && !editingId) {
      setFormError("Fabric image is required");
      return false;
    }
    if (!formData.quantite || parseFloat(formData.quantite) <= 0) {
      setFormError("Quantity must be greater than 0");
      return false;
    }
    if (formData.prix && parseFloat(formData.prix) < 0) {
      setFormError("Price cannot be negative");
      return false;
    }
    setFormError("");
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!validateForm()) return;

    try {
      setIsSubmitting(true);
      const method = editingId ? "PUT" : "POST";
      const url = editingId
        ? `http://localhost:8000/api/fabrics/${editingId}`
        : "http://localhost:8000/api/fabrics";

      // Use FormData for file upload
      const submitData = new FormData();
      if (formData.imageFile) {
        submitData.append("image", formData.imageFile);
      }
      submitData.append("quantite", formData.quantite);
      submitData.append("materiel", formData.materiel);
      submitData.append("prix", formData.prix);
      submitData.append("description", formData.description);

      const response = await fetch(url, {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: submitData,
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Failed to save fabric");
        return;
      }

      setSuccess(
        editingId
          ? "Fabric updated successfully!"
          : "Fabric added successfully!",
      );
      setShowForm(false);
      fetchFabrics();

      setTimeout(() => setSuccess(""), 4000);
    } catch (err) {
      console.error("Submit error:", err);
      setError("Connection error. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (
      !window.confirm(
        "Are you sure you want to delete this fabric? This action cannot be undone.",
      )
    )
      return;

    try {
      setError("");
      const response = await fetch(`http://localhost:8000/api/fabrics/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        setSuccess("Fabric deleted successfully!");
        fetchFabrics();
        setTimeout(() => setSuccess(""), 4000);
      } else if (response.status === 401) {
        setError("Session expired. Please login again.");
        authService.logout();
        navigate("/login");
      } else {
        const errorData = await response.json().catch(() => ({}));
        setError(errorData.error || "Failed to delete fabric");
      }
    } catch (err) {
      console.error("Delete error:", err);
      setError("Connection error. Please try again.");
    }
  };

  const handleLogout = () => {
    authService.logout();
    navigate("/login");
  };

  // Color distribution for chart
  const colorDistribution = {};
  fabrics.forEach((f) => {
    if (Array.isArray(f.color) && f.color.length === 3) {
      const colorKey = `rgb(${f.color[0]},${f.color[1]},${f.color[2]})`;
      colorDistribution[colorKey] = (colorDistribution[colorKey] || 0) + 1;
    }
  });
  const colorData = Object.entries(colorDistribution).map(([color, count]) => ({
    color,
    count,
  }));

  // Material distribution
  const materialDistribution = {};
  fabrics.forEach((f) => {
    if (f.materiel) {
      materialDistribution[f.materiel] =
        (materialDistribution[f.materiel] || 0) + 1;
    }
  });
  const materialData = Object.entries(materialDistribution).map(
    ([material, count]) => ({ material, count }),
  );

  return (
    <div className="dashboard">
      {/* Sidebar */}
      <aside className={`sidebar ${sidebarOpen ? "open" : "closed"}`}>
        <div className="sidebar-header">
          <div className="sidebar-logo">
            <Layers size={24} />
            <span>TISSU</span>
          </div>
          <button
            className="sidebar-toggle-btn"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            <Menu size={20} />
          </button>
        </div>

        <nav className="sidebar-nav">
          <div className="nav-item active">
            <Home size={20} />
            {sidebarOpen && <span>Dashboard</span>}
          </div>
          <div className="nav-item" onClick={() => navigate("/settings")}>
            <Settings size={20} />
            {sidebarOpen && <span>Settings</span>}
          </div>
        </nav>

        <div className="sidebar-footer">
          <div className="nav-item logout" onClick={handleLogout}>
            <LogOut size={20} />
            {sidebarOpen && <span>Logout</span>}
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="dashboard-main">
        {/* Top Bar */}
        <header className="top-bar">
          <div className="top-bar-left">
            <h1>
              <Package size={28} />
              Fabric Inventory
            </h1>
          </div>
          <div className="top-bar-right">
            <div className="user-info">
              <User size={20} />
              <span>{userInfo.name || userInfo.email}</span>
            </div>
            <div className="profile-menu" onClick={() => navigate("/settings")}>
              <div className="profile-icon">
                <User size={20} />
              </div>
            </div>
          </div>
        </header>

        {/* Content Area */}
        <main className="dashboard-content">
          {/* Messages */}
          {error && (
            <div className="alert alert-error">
              <AlertCircle size={20} />
              <span>{error}</span>
              <button className="alert-close" onClick={() => setError("")}>
                <X size={16} />
              </button>
            </div>
          )}
          {success && (
            <div className="alert alert-success">
              <CheckCircle size={20} />
              <span>{success}</span>
              <button className="alert-close" onClick={() => setSuccess("")}>
                <X size={16} />
              </button>
            </div>
          )}

          {/* Statistics Section */}
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-icon stat-icon-purple">
                <Package size={24} />
              </div>
              <div className="stat-content">
                <div className="stat-label">Total Fabrics</div>
                <div className="stat-value">{stats.totalFabrics}</div>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon stat-icon-blue">
                <Gauge size={24} />
              </div>
              <div className="stat-content">
                <div className="stat-label">Total Quantity</div>
                <div className="stat-value">{stats.totalQuantity} m</div>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon stat-icon-green">
                <DollarSign size={24} />
              </div>
              <div className="stat-content">
                <div className="stat-label">Avg Price</div>
                <div className="stat-value">${stats.avgPrice}</div>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon stat-icon-orange">
                <Layers size={24} />
              </div>
              <div className="stat-content">
                <div className="stat-label">Top Material</div>
                <div className="stat-value">{stats.topMaterial}</div>
              </div>
            </div>
          </div>

          {/* Charts Section */}
          {colorData.length > 0 && (
            <div className="charts-section">
              <div className="chart-card">
                <h3>
                  <BarChart3 size={18} /> Color Distribution
                </h3>
                <div className="chart-bars">
                  {colorData.map((item) => (
                    <div key={item.color} className="chart-bar-item">
                      <div className="bar-label">{item.color}</div>
                      <div className="bar-wrapper">
                        <div
                          className="bar"
                          style={{
                            width: `${(item.count / Math.max(...colorData.map((d) => d.count), 1)) * 100}%`,
                            backgroundColor: item.color,
                          }}
                        ></div>
                      </div>
                      <div className="bar-value">{item.count}</div>
                    </div>
                  ))}
                </div>
              </div>

              {materialData.length > 0 && (
                <div className="chart-card">
                  <h3>
                    <TrendingUp size={18} /> Material Distribution
                  </h3>
                  <div className="chart-bars">
                    {materialData.map((item) => (
                      <div key={item.material} className="chart-bar-item">
                        <div className="bar-label">{item.material}</div>
                        <div className="bar-wrapper">
                          <div
                            className="bar material-bar"
                            style={{
                              width: `${(item.count / Math.max(...materialData.map((d) => d.count), 1)) * 100}%`,
                            }}
                          ></div>
                        </div>
                        <div className="bar-value">{item.count}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Header with Add Button */}
          <div className="content-header">
            <h2>Fabrics Inventory</h2>
            <button className="btn-primary" onClick={handleAddClick}>
              <Plus size={18} />
              Add Fabric
            </button>
          </div>

          {/* Form Modal */}
          {showForm && (
            <div className="modal-overlay">
              <div className="modal-card">
                <div className="modal-header">
                  <h3>{editingId ? "Edit Fabric" : "Add New Fabric"}</h3>
                  <button
                    className="modal-close"
                    onClick={() => setShowForm(false)}
                  >
                    <X size={24} />
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="fabric-form">
                  {formError && (
                    <div className="form-error-banner">
                      <AlertCircle size={18} />
                      <span>{formError}</span>
                    </div>
                  )}

                  {/* Image Upload Section */}
                  <div className="form-group">
                    <label>
                      Fabric Image * (Upload a clear image of the fabric)
                    </label>
                    <div className="image-upload-wrapper">
                      <input
                        type="file"
                        name="imageFile"
                        onChange={handleInputChange}
                        accept="image/*"
                        id="imageInput"
                        style={{ display: "none" }}
                      />
                      <label
                        htmlFor="imageInput"
                        className="image-upload-label"
                      >
                        <div className="image-upload-content">
                          {imagePreview ? (
                            <>
                              <img
                                src={imagePreview}
                                alt="Fabric preview"
                                className="image-preview"
                              />
                              <p className="image-hint">
                                Click to change image
                              </p>
                            </>
                          ) : (
                            <>
                              <div className="upload-icon">📸</div>
                              <p className="upload-text">
                                Click to upload fabric image
                              </p>
                              <p className="upload-hint">
                                Colors will be automatically extracted from the
                                image
                              </p>
                            </>
                          )}
                        </div>
                      </label>
                    </div>
                  </div>

                  <div className="form-group">
                    <label>Quantity (meters) *</label>
                    <input
                      type="number"
                      name="quantite"
                      value={formData.quantite}
                      onChange={handleInputChange}
                      placeholder="Enter quantity"
                      min="0"
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>Material</label>
                    <input
                      type="text"
                      name="materiel"
                      value={formData.materiel}
                      onChange={handleInputChange}
                      placeholder="e.g., Cotton, Silk, Polyester"
                    />
                  </div>

                  <div className="form-group">
                    <label>Price (per meter)</label>
                    <input
                      type="number"
                      name="prix"
                      value={formData.prix}
                      onChange={handleInputChange}
                      placeholder="Enter price"
                      min="0"
                      step="0.01"
                    />
                  </div>

                  <div className="form-group">
                    <label>Description</label>
                    <textarea
                      name="description"
                      value={formData.description}
                      onChange={handleInputChange}
                      placeholder="Add notes about this fabric"
                      rows="3"
                    ></textarea>
                  </div>

                  <div className="form-buttons">
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={() => setShowForm(false)}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="btn-primary"
                      disabled={isSubmitting}
                    >
                      {isSubmitting
                        ? "Saving..."
                        : (editingId ? "Update" : "Add") + " Fabric"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Fabrics Table */}
          <div className="table-container">
            {loading ? (
              <p className="loading">Loading fabrics...</p>
            ) : fabrics.length === 0 ? (
              <div className="empty-state">
                <Package size={48} />
                <p>No fabrics yet. Add your first fabric!</p>
              </div>
            ) : (
              <table className="fabrics-table">
                <thead>
                  <tr>
                    <th>Fabric Image</th>
                    <th>Color</th>
                    <th>Quantity (m)</th>
                    <th>Material</th>
                    <th>Price/m</th>
                    <th>Description</th>
                    <th>Likes</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {fabrics.map((fabric) => (
                    <tr key={fabric._id}>
                      <td className="image-cell">
                        <img
                          src={`http://localhost:8000/api/images/${fabric.id || fabric._id}`}
                          alt="Fabric"
                          className="fabric-thumbnail"
                          title="Fabric image"
                          onError={(e) => { e.target.src = 'https://via.placeholder.com/80x100?text=No+Image'; }}
                        />
                      </td>
                      <td className="colors-cell">
                        {fabric.color ? (
                          <div className="color-display">
                            {Array.isArray(fabric.color) &&
                              fabric.color.length === 3 ? (
                              <>
                                <div
                                  className="color-swatch"
                                  style={{
                                    backgroundColor: `rgb(${fabric.color[0]}, ${fabric.color[1]}, ${fabric.color[2]})`,
                                  }}
                                  title={`RGB(${fabric.color[0]}, ${fabric.color[1]}, ${fabric.color[2]})`}
                                />
                                <span className="color-code">
                                  RGB({fabric.color[0]}, {fabric.color[1]},{" "}
                                  {fabric.color[2]})
                                </span>
                              </>
                            ) : (
                              <span className="text-muted">No color</span>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted">Extracting...</span>
                        )}
                      </td>
                      <td className="quantity-cell">{fabric.quantite}</td>
                      <td>{fabric.materiel || "-"}</td>
                      <td className="price-cell">
                        ${parseFloat(fabric.prix || 0).toFixed(2)}
                      </td>
                      <td className="description-cell">
                        {fabric.description || "-"}
                      </td>
                      <td className="likes-cell">
                        <div className="flex items-center gap-1 text-gold">
                            <TrendingUp size={14} />
                            {fabric.likes || 0}
                        </div>
                      </td>
                      <td className="actions-cell">
                        <button
                          className="btn-icon edit"
                          onClick={() => handleEditClick(fabric)}
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          className="btn-icon delete"
                          onClick={() => handleDelete(fabric._id)}
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

export default Dashboard;
