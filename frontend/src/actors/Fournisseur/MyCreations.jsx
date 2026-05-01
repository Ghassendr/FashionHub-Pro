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
  CreditCard,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { authService } from "../../services/authService";
import { createDebugButton } from "../utils/debugBackend";
import "./Dashboard.css";

function Dashboard() {
  const navigate = useNavigate();
  // sidebar state removed
  const [fabrics, setFabrics] = useState([]);
  const [jewelry, setJewelry] = useState([]);
  const [activeTab, setActiveTab] = useState("fabrics"); // "fabrics" or "jewelry"
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [formError, setFormError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [stats, setStats] = useState({
    totalFabrics: 0,
    totalJewelry: 0,
    totalQuantity: 0,
    avgPrice: 0,
    topMaterial: "",
  });
  const [hasCard, setHasCard] = useState(false);

  const [formData, setFormData] = useState({
    imageFile: null,
    quantite: "",
    materiel: "",
    prix: "",
    description: "",
    // Jewelry specific
    name: "",
    type: "",
    fabric: "",
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
        fetchJewelry();
        fetchCardStatus();

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
    const totalQuantity = fabrics.reduce((sum, f) => sum + (f.quantite || 0), 0);
    const avgPrice = fabrics.length > 0 
      ? fabrics.reduce((sum, f) => sum + (f.prix || 0), 0) / fabrics.length 
      : 0;

    // Find most common material
    const materials = {};
    fabrics.forEach((f) => {
      if (f.materiel) materials[f.materiel] = (materials[f.materiel] || 0) + 1;
    });
    const topMaterial = Object.keys(materials).length > 0
      ? Object.keys(materials).reduce((a, b) => materials[a] > materials[b] ? a : b)
      : "N/A";

    setStats({
      totalFabrics: fabrics.length,
      totalJewelry: jewelry.length,
      totalQuantity: totalQuantity.toFixed(2),
      avgPrice: avgPrice.toFixed(2),
      topMaterial,
    });
  }, [fabrics, jewelry]);

  const fetchFabrics = async () => {
    try {
      setLoading(true);
      setError("");
      const response = await fetch("http://localhost:8000/api/fournisseur/fabrics", {
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
      console.error("Fetch fabrics error:", err);
      setError("Cannot reach backend. Make sure it is running.");
    } finally {
      setLoading(false);
    }
  };

  const fetchJewelry = async () => {
    try {
      setLoading(true);
      const response = await fetch("http://localhost:8000/api/fournisseur/jewelry", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setJewelry(data.jewelry || []);
      }
    } catch (err) {
      console.error("Failed to fetch jewelry:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchCardStatus = async () => {
    try {
      const response = await fetch("http://localhost:8000/api/auth/card/", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setHasCard(data.has_card);
      }
    } catch (err) {
      console.error("Failed to fetch card status:", err);
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
      name: "",
      type: "",
      fabric: "",
    });
    setImagePreview("");
    setShowForm(true);
  };

  const handleEditClick = (fabric) => {
    setEditingId(fabric.id || fabric._id);
    setFormData({
      imageFile: null,
      quantite: item.quantite,
      materiel: item.materiel,
      prix: item.prix,
      description: item.description,
      name: item.name || "",
      type: item.type || "",
      fabric: item.fabric || "",
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
      setFormError(`${activeTab === "fabrics" ? "Fabric" : "Jewelry"} image is required`);
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
      const endpoint = activeTab === "fabrics" ? "fabrics" : "jewelry";
      const url = editingId
        ? `http://localhost:8000/api/fournisseur/${endpoint}/${editingId}`
        : `http://localhost:8000/api/fournisseur/${endpoint}`;

      // Use FormData for file upload
      const submitData = new FormData();
      if (formData.imageFile) {
        submitData.append("image", formData.imageFile);
      }
      submitData.append("quantite", formData.quantite);
      submitData.append("materiel", formData.materiel);
      submitData.append("prix", formData.prix);
      submitData.append("description", formData.description);
      
      if (activeTab === "jewelry") {
        submitData.append("name", formData.name);
        submitData.append("type", formData.type);
      }

      const response = await fetch(url, {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: submitData,
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Failed to save item");
        return;
      }

      setSuccess(
        editingId
          ? `${activeTab === "fabrics" ? "Fabric" : "Jewelry"} updated successfully!`
          : `${activeTab === "fabrics" ? "Fabric" : "Jewelry"} added successfully!`,
      );
      setShowForm(false);
      activeTab === "fabrics" ? fetchFabrics() : fetchJewelry();

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
        `Are you sure you want to delete this ${activeTab === "fabrics" ? "fabric" : "jewelry"}? This action cannot be undone.`,
      )
    )
      return;

    try {
      setError("");
      const endpoint = activeTab === "fabrics" ? "fabrics" : "jewelry";
      const response = await fetch(`http://localhost:8000/api/fournisseur/${endpoint}/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        setSuccess(`${activeTab === "fabrics" ? "Fabric" : "Jewelry"} deleted successfully!`);
        activeTab === "fabrics" ? fetchFabrics() : fetchJewelry();
        setTimeout(() => setSuccess(""), 4000);
      } else if (response.status === 401) {
        setError("Session expired. Please login again.");
        authService.logout();
        navigate("/login");
      } else {
        const errorData = await response.json().catch(() => ({}));
        setError(errorData.error || `Failed to delete ${activeTab}`);
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
    <div className="animate-fade-in p-6 lg:p-12 max-w-[1600px] mx-auto">
      {/* Messages */}
      {error && (
        <div className="alert alert-error mb-6">
          <AlertCircle size={20} />
          <span>{error}</span>
          <button className="alert-close" onClick={() => setError("")}>
            <X size={16} />
          </button>
        </div>
      )}
      {success && (
        <div className="alert alert-success mb-6">
          <CheckCircle size={20} />
          <span>{success}</span>
          <button className="alert-close" onClick={() => setSuccess("")}>
            <X size={16} />
          </button>
        </div>
      )}

      {/* Header Section */}
      <div className="mb-12 border-b border-gold/10 pb-8">
        <div className="flex items-center gap-4 mb-4">
          <span className="text-[10px] tracking-[0.3em] uppercase text-gold font-bold bg-gold/10 px-4 py-1.5 rounded-full border border-gold/20 flex items-center gap-2">
            <Gauge size={12} /> Supplier Workspace
          </span>
        </div>
        <h1 className="text-4xl md:text-5xl font-display text-ivory italic flex items-center gap-4">
          Atelier Dashboard
        </h1>
      </div>

      {/* Statistics Section */}
      <div className="stats-grid mb-12">
        <div className="stat-card">
          <div className="stat-icon stat-icon-purple">
            <Package size={24} />
          </div>
          <div className="stat-content">
            <div className="stat-label">Total Assets</div>
            <div className="stat-value">{stats.totalFabrics + stats.totalJewelry}</div>
            <div className="text-[10px] text-ivory/40">
              {stats.totalFabrics} Fabrics · {stats.totalJewelry} Jewelry
            </div>
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

      {/* Tabs */}
      <div className="flex gap-4 mb-8 border-b border-gold/10 pb-4">
        <button
          className={`px-6 py-2 rounded-xl transition-all ${activeTab === "fabrics" ? "bg-gold text-noir font-bold" : "text-ivory/40 hover:text-ivory"}`}
          onClick={() => setActiveTab("fabrics")}
        >
          Fabrics
        </button>
        <button
          className={`px-6 py-2 rounded-xl transition-all ${activeTab === "jewelry" ? "bg-gold text-noir font-bold" : "text-ivory/40 hover:text-ivory"}`}
          onClick={() => setActiveTab("jewelry")}
        >
          Jewelry
        </button>
      </div>

      {/* Content Header */}
      <div className="content-header mb-8">
        <h2 className="text-2xl font-display text-ivory/80">
          {activeTab === "fabrics" ? "Fabric Assets" : "Jewelry Collection"}
        </h2>
        <button className="btn-primary" onClick={handleAddClick}>
          <Plus size={18} />
          Add {activeTab === "fabrics" ? "Fabric" : "Jewelry"}
        </button>
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="modal-overlay">
          <div className="modal-card">
            <div className="modal-header">
              <h3>{editingId ? `Edit ${activeTab === "fabrics" ? "Fabric" : "Jewelry"}` : `Add New ${activeTab === "fabrics" ? "Fabric" : "Jewelry"}`}</h3>
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
                <label>{activeTab === "fabrics" ? "Fabric" : "Jewelry"} Image *</label>
                <div className="image-upload-wrapper">
                  <input
                    type="file"
                    name="imageFile"
                    onChange={handleInputChange}
                    accept="image/*"
                    id="imageInput"
                    style={{ display: "none" }}
                  />
                  <label htmlFor="imageInput" className="image-upload-label">
                    <div className="image-upload-content">
                      {imagePreview ? (
                        <img src={imagePreview} alt="Preview" className="image-preview" />
                      ) : (
                        <>
                          <div className="upload-icon">📸</div>
                          <p className="upload-text">Upload {activeTab === "fabrics" ? "fabric" : "jewelry"} image</p>
                        </>
                      )}
                    </div>
                  </label>
                </div>
              </div>

              {activeTab === "jewelry" && (
                <>
                  <div className="form-group">
                    <label>Jewelry Name *</label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Type (Ring, Necklace, etc.)</label>
                    <input
                      type="text"
                      name="type"
                      value={formData.type}
                      onChange={handleInputChange}
                    />
                  </div>
                  <div className="form-group">
                    <label>Fabric Used (Optional)</label>
                    <select
                      name="fabric"
                      value={formData.fabric || ""}
                      onChange={handleInputChange}
                      className="form-select"
                    >
                      <option value="">None</option>
                      {fabrics.map((f) => (
                        <option key={f.id || f._id} value={f.id || f._id}>
                          {f.materiel} ({f.quantite}m available)
                        </option>
                      ))}
                    </select>
                  </div>
                </>
              )}

              <div className="form-group">
                <label>Quantity {activeTab === "fabrics" ? "(meters)" : "(units)"} *</label>
                <input
                  type="number"
                  name="quantite"
                  value={formData.quantite}
                  onChange={handleInputChange}
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
                />
              </div>

              <div className="form-group">
                <label>Price {activeTab === "fabrics" ? "(per meter)" : "(per unit)"}</label>
                <input
                  type="number"
                  name="prix"
                  value={formData.prix}
                  onChange={handleInputChange}
                  step="0.01"
                />
              </div>

              <div className="form-group">
                <label>Description</label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  rows="3"
                ></textarea>
              </div>

              <div className="form-buttons">
                <button type="button" className="btn-secondary" onClick={() => setShowForm(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={isSubmitting}>
                  {isSubmitting ? "Saving..." : (editingId ? "Update" : "Add") + ` ${activeTab === "fabrics" ? "Fabric" : "Jewelry"}`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="table-container">
        {loading ? (
          <p className="loading">Loading...</p>
        ) : (activeTab === "fabrics" ? fabrics : jewelry).length === 0 ? (
          <div className="empty-state py-20 text-center border border-dashed border-gold/10">
            <Package size={48} className="mx-auto mb-4 opacity-20" />
            <p className="text-ivory/40 italic">No {activeTab} yet. Add your first masterpiece!</p>
          </div>
        ) : (
          <table className="fabrics-table w-full">
            <thead>
              <tr>
                <th>Image</th>
                {activeTab === "jewelry" && <th>Name</th>}
                {activeTab === "fabrics" && <th>Color</th>}
                <th>Qty</th>
                <th>Material</th>
                <th>Price</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {(activeTab === "fabrics" ? fabrics : jewelry).map((item) => (
                <tr key={item.id || item._id}>
                  <td>
                    <img
                      src={`http://localhost:8000/api/fournisseur/${activeTab === "fabrics" ? "images" : "jewelry/images"}/${item.id || item._id}`}
                      alt="Thumbnail"
                      className="fabric-thumbnail"
                      onError={(e) => { e.target.src = 'https://via.placeholder.com/80x100?text=No+Image'; }}
                    />
                  </td>
                  {activeTab === "jewelry" && (
                    <td>
                      {item.name}
                      {item.fabric && (
                        <div className="text-[10px] text-gold mt-1">
                          Uses: {fabrics.find(f => (f.id || f._id) === item.fabric)?.materiel || "Selected Fabric"}
                        </div>
                      )}
                    </td>
                  )}
                  {activeTab === "fabrics" && (
                    <td>
                      {item.color && Array.isArray(item.color) && item.color.length === 3 ? (
                        <div className="flex items-center gap-2">
                          <div
                            className="w-5 h-5 rounded-full border border-white/10"
                            style={{ backgroundColor: `rgb(${item.color[0]}, ${item.color[1]}, ${item.color[2]})` }}
                          />
                        </div>
                      ) : "-"}
                    </td>
                  )}
                  <td className="font-serif italic">{item.quantite}</td>
                  <td>{item.materiel}</td>
                  <td className="text-gold">${parseFloat(item.prix || 0).toFixed(2)}</td>
                  <td>
                    <div className="flex gap-2">
                      <button className="btn-icon" onClick={() => handleEditClick(item)}><Edit2 size={16} /></button>
                      <button className="btn-icon text-red-400" onClick={() => handleDelete(item.id || item._id)}><Trash2 size={16} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

export default Dashboard;
