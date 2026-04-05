import React, { useState, useEffect } from "react";
import {
  Menu, Home, Package, Settings, LogOut, User,
  Plus, Trash2, Edit2, X, TrendingUp, BarChart3,
  AlertCircle, CheckCircle, Layers, DollarSign,
  Gauge, Search, ArrowRight, ShieldCheck, Zap,
  Eye, Palette, Hexagon, Sparkles, ShoppingCart,
  Loader2, CheckCircle2, MapPin
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

        fetchFabrics();
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

    // Adaptive Polling: 5 seconds
    const interval = setInterval(() => {
      fetchFabrics(true);
    }, 5000);

    return () => clearInterval(interval);
  }, [token, navigate]);

  // Calculate statistics
  useEffect(() => {
    if (fabrics.length > 0) {
      const totalQuantity = fabrics.reduce((sum, f) => sum + (parseFloat(f.quantite) || 0), 0);
      const avgPrice = fabrics.reduce((sum, f) => sum + (parseFloat(f.prix) || 0), 0) / fabrics.length;

      const materials = {};
      fabrics.forEach((f) => {
        if (f.materiel) {
          materials[f.materiel] = (materials[f.materiel] || 0) + 1;
        }
      });
      const topMaterial =
        Object.keys(materials).length > 0
          ? Object.keys(materials).reduce((a, b) => materials[a] > materials[b] ? a : b)
          : "N/A";

      setStats({
        totalFabrics: fabrics.length,
        totalQuantity: totalQuantity.toFixed(2),
        avgPrice: avgPrice.toFixed(2),
        topMaterial,
      });
    }
  }, [fabrics]);

  const fetchFabrics = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      setError("");
      // Standardize the API prefix to follow common actor patterns
      const response = await fetch("http://localhost:8000/api/fournisseur/fabrics", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setFabrics(data.fabrics || []);
      } else {
        const errorData = await response.json().catch(() => ({}));
        setError(errorData.error || "Failed to load fabrics");
      }
    } catch (err) {
      setError("Cannot reach backend server.");
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const handleAddClick = () => {
    setEditingId(null);
    setFormData({ imageFile: null, quantite: "", materiel: "", prix: "", description: "" });
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
    setImagePreview(`http://localhost:8000/api/fournisseur/images/${fabric._id}`);
    setShowForm(true);
  };

  const handleInputChange = (e) => {
    const { name, value, type, files } = e.target;
    if (type === "file") {
      if (files && files[0]) {
        setFormData({ ...formData, imageFile: files[0] });
        const reader = new FileReader();
        reader.onloadend = () => setImagePreview(reader.result);
        reader.readAsDataURL(files[0]);
      }
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.imageFile && !editingId) {
      setFormError("Fabric image is required");
      return;
    }

    try {
      setIsSubmitting(true);
      const url = editingId
        ? `http://localhost:8000/api/fournisseur/fabrics/${editingId}`
        : "http://localhost:8000/api/fournisseur/fabrics";

      const submitData = new FormData();
      if (formData.imageFile) submitData.append("image", formData.imageFile);
      submitData.append("quantite", formData.quantite);
      submitData.append("materiel", formData.materiel);
      submitData.append("prix", formData.prix);
      submitData.append("description", formData.description);

      const response = await fetch(url, {
        method: editingId ? "PUT" : "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: submitData,
      });

      if (response.ok) {
        setSuccess(editingId ? "Fabric updated!" : "Fabric added!");
        setShowForm(false);
        fetchFabrics();
        setTimeout(() => setSuccess(""), 4000);
      } else {
        const data = await response.json();
        setError(data.error || "Save operation failed.");
      }
    } catch (err) {
      setError("Connection error.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this material from inventory?")) return;
    try {
      const response = await fetch(`http://localhost:8000/api/fournisseur/fabrics/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        setSuccess("Fabric removed.");
        fetchFabrics();
        setTimeout(() => setSuccess(""), 4000);
      }
    } catch (err) {
      setError("Delete failed.");
    }
  };

  return (
    <div className="flex bg-[#0A0A0A] min-h-screen overflow-hidden font-sans text-white">
      {/* Atelier Sidebar */}
      <aside className={`w-64 flex-shrink-0 border-r border-white/5 bg-black/40 backdrop-blur-2xl flex flex-col transition-all duration-500 ease-in-out ${sidebarOpen ? "ml-0" : "-ml-64"}`}>
        <div className="p-8 border-b border-white/5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-[#C6A75E] to-[#8E793E] rounded-lg flex items-center justify-center text-black font-black shadow-[0_0_20px_rgba(198,167,94,0.3)]">FP</div>
              <span className="text-sm font-black tracking-[0.2em] text-[#C6A75E]">SUPPLIER</span>
            </div>
        </div>

        <nav className="flex-1 p-6 space-y-2">
            <div className="text-[10px] uppercase font-black text-white/30 tracking-widest mb-4 px-4">Inventaire & Flux</div>
            
            <div className="flex items-center gap-4 p-4 text-[#C6A75E] bg-[#C6A75E]/10 rounded-xl border border-[#C6A75E]/20 shadow-[0_0_15px_rgba(198,167,94,0.05)]">
                <Layers size={18} />
                <span className="text-sm font-bold">Catalogue Matières</span>
            </div>

            <div onClick={() => navigate("/fournisseur/orders")} className="flex items-center gap-4 p-4 text-white/50 hover:text-[#C6A75E] hover:bg-white/[0.03] transition-all rounded-xl cursor-pointer group">
                <ShoppingCart size={18} className="group-hover:scale-110 transition-transform" />
                <span className="text-sm font-medium">Commandes Clients</span>
            </div>

            <div className="pt-8 text-[10px] uppercase font-black text-white/30 tracking-widest mb-4 px-4">Paramètres</div>
            <div onClick={() => navigate("/fournisseur/settings")} className="flex items-center gap-4 p-4 text-white/50 hover:text-[#C6A75E] hover:bg-white/[0.03] transition-all rounded-xl cursor-pointer group">
                <Settings size={18} className="group-hover:scale-110 transition-transform" />
                <span className="text-sm font-medium">Atelier Settings</span>
            </div>
        </nav>

        <div className="p-6 border-t border-white/5">
            <button onClick={() => { authService.logout(); navigate("/login"); }} className="flex items-center gap-4 p-4 w-full text-white/30 hover:text-rose-400 hover:bg-rose-500/5 transition-all rounded-xl cursor-pointer group">
                <LogOut size={18} className="group-hover:translate-x-1 transition-transform" />
                <span className="text-sm font-bold">Déconnexion</span>
            </button>
        </div>
      </aside>

      {/* Main Registry View */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Minimalist Glass Header */}
        <header className="h-20 border-b border-white/5 flex items-center justify-between px-10 bg-black/20 backdrop-blur-xl shrink-0">
          <div className="flex items-center gap-6">
            <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2 text-white/40 hover:text-white transition-colors bg-white/5 rounded-lg border border-white/5">
              <Menu size={20} />
            </button>
            <div className="h-6 w-[1px] bg-white/10" />
            <div className="text-[11px] font-black tracking-widest text-[#C6A75E] uppercase bg-[#C6A75E]/5 px-3 py-1.5 rounded-md border border-[#C6A75E]/10">
              Inventory Control
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex flex-col items-end">
              <span className="text-[10px] font-black text-white/30 tracking-widest uppercase">Authenticated Session</span>
              <span className="text-xs font-bold text-white/80">{userInfo?.name || "L'Artisan Textile"}</span>
            </div>
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#C6A75E]/20 to-transparent border border-[#C6A75E]/30 flex items-center justify-center font-black text-xs text-[#C6A75E] shadow-inner">
                {userInfo?.name?.[0] || "AT"}
            </div>
          </div>
        </header>

        {/* Catalog Content */}
        <div className="flex-1 overflow-y-auto px-16 py-12 custom-scrollbar">
          
          {/* Hero Section */}
          <div className="mb-20">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-[1px] bg-[#C6A75E]" />
              <span className="text-[10px] uppercase font-black tracking-[0.4em] text-[#C6A75E]">Matières & Textures</span>
            </div>
            <h1 className="text-6xl font-serif text-white italic tracking-tight leading-none mb-6">Registre des Tissus</h1>
            <p className="text-white/30 max-w-xl text-lg font-light leading-relaxed">
              Gestion centralisée de l'inventaire textile. Chaque pièce est certifiée par l'origine et contrôlée pour la qualité Haute Couture.
            </p>
          </div>

          {/* Stats Bar */}
          <div className="grid grid-cols-4 gap-10 mb-20">
            {[
              { label: "Total Matières", val: stats.totalFabrics, icon: Package },
              { label: "Stock Global", val: `${stats.totalQuantity}m`, icon: Gauge },
              { label: "Cote Moyenne", val: `${stats.avgPrice}€`, icon: DollarSign },
              { label: "Matériau Phare", val: stats.topMaterial, icon: Sparkles }
            ].map((s, i) => (
              <div key={i} className="group relative">
                <div className="p-8 rounded-[30px] border border-white/5 bg-white/[0.01] backdrop-blur-sm transition-all duration-500 hover:border-[#C6A75E]/30">
                  <div className="flex justify-between items-start mb-6">
                    <div className="w-10 h-10 border border-[#C6A75E]/20 rounded-xl flex items-center justify-center text-[#C6A75E] group-hover:bg-[#C6A75E]/10 transition-colors">
                      <s.icon size={18} />
                    </div>
                    <div className="text-[10px] font-black text-white/20 uppercase tracking-widest">{s.label}</div>
                  </div>
                  <div className="text-3xl font-serif text-white tracking-wide">{s.val}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Catalog Controls */}
          <div className="flex items-center justify-between mb-10 pb-8 border-b border-white/5">
            <div className="flex items-center gap-8">
              <h2 className="text-2xl font-serif text-white tracking-wide">Inventaire Courant</h2>
              <div className="relative group">
                <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-[#C6A75E] transition-colors" />
                <input className="bg-white/5 border border-white/5 rounded-full pl-12 pr-6 py-3 text-xs w-64 focus:outline-none focus:border-[#C6A75E]/30 transition-all font-light" placeholder="Chercher une matière..." />
              </div>
            </div>
            <button onClick={handleAddClick} className="bg-white text-black px-8 py-4 rounded-full font-black text-[10px] tracking-[0.2em] uppercase hover:bg-[#C6A75E] transition-all flex items-center gap-3">
              <Plus size={16} /> Ajouter au Registre
            </button>
          </div>

          {/* Catalog Grid/Table */}
          {loading ? (
            <div className="py-24 text-center flex flex-col items-center">
              <Loader2 className="animate-spin text-[#C6A75E] mb-6" size={42} />
              <p className="text-[10px] uppercase font-black tracking-widest text-[#C6A75E]/40">Synchro Catalogue...</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6">
              {fabrics.map((f) => (
                <div key={f._id} className="group relative">
                  {/* Luxury Row Item */}
                  <div className="bg-white/[0.01] border border-white/5 p-8 rounded-[40px] hover:border-[#C6A75E]/20 transition-all duration-700 flex items-center justify-between gap-10">
                    
                    <div className="flex items-center gap-10">
                      <div className="w-24 h-32 rounded-3xl overflow-hidden border border-white/10 shadow-2xl relative">
                        <img 
                          src={`http://localhost:8000/api/fournisseur/images/${f._id}`} 
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000" 
                          alt="Fabric"
                        />
                        <div className="absolute inset-0 bg-black/5 group-hover:bg-transparent transition-colors" />
                      </div>

                      <div className="space-y-3">
                        <div className="flex items-center gap-4">
                            <h3 className="text-3xl font-serif text-white tracking-wide">{f.materiel}</h3>
                            <span className="bg-[#C6A75E]/10 text-[#C6A75E] px-3 py-1 rounded text-[9px] font-black tracking-widest uppercase border border-[#C6A75E]/20">Premium Grade</span>
                        </div>
                        <div className="flex items-center gap-6 text-[10px] uppercase tracking-widest font-black text-white/30">
                            <span className="flex items-center gap-2 text-white/50"><TrendingUp size={12}/> {f.likes || 0} Affinités</span>
                            <span className="flex items-center gap-2"><MapPin size={12}/> Lyon, FR</span>
                        </div>
                        <p className="text-sm text-white/30 font-light max-w-sm line-clamp-1 italic">"{f.description || "Aucune description archivée..."}"</p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-16 ml-auto">
                        <div className="text-center">
                            <div className="text-[10px] uppercase tracking-widest text-white/20 font-black mb-2">Disponibilité</div>
                            <div className="text-2xl font-serif text-white italic">{f.quantite}m</div>
                        </div>
                        <div className="text-right">
                            <div className="text-[10px] uppercase tracking-widest text-white/20 font-black mb-2">Tarification</div>
                            <div className="text-2xl font-serif text-[#C6A75E] font-bold">{f.prix}€<span className="text-xs text-white/20 ml-1 font-light italic">/m</span></div>
                        </div>
                        <div className="flex items-center gap-4">
                            <button onClick={() => handleEditClick(f)} className="w-14 h-14 rounded-full border border-white/10 bg-white/5 flex items-center justify-center text-white/40 hover:text-white hover:border-[#C6A75E]/30 transition-all">
                                <Edit2 size={18} />
                            </button>
                            <button onClick={() => handleDelete(f._id)} className="w-14 h-14 rounded-full border border-white/10 bg-white/5 flex items-center justify-center text-rose-500/30 hover:bg-rose-500/10 hover:border-rose-500/30 transition-all">
                                <Trash2 size={18} />
                            </button>
                        </div>
                    </div>

                  </div>
                </div>
              ))}
            </div>
          )}

        </div>
      </main>

      {/* Form Overlay - Luxury Modal */}
      {showForm && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-12 bg-black/90 backdrop-blur-3xl">
            <div className="w-full max-w-2xl bg-[#0D0D0D] border border-white/10 rounded-[60px] overflow-hidden shadow-[0_0_100px_rgba(0,0,0,1)] relative animate-in fade-in zoom-in duration-500">
                
                <header className="px-12 py-10 border-b border-white/5 flex justify-between items-center">
                    <div>
                        <span className="text-[9px] uppercase tracking-widest font-black text-[#C6A75E]">Inventory Registry</span>
                        <h2 className="text-3xl font-serif text-white italic mt-1">{editingId ? "Édition Archive" : "Nouvelle Entrée"}</h2>
                    </div>
                    <button onClick={() => setShowForm(false)} className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center text-white/20 hover:text-rose-500 transition-colors">
                        <X size={20} />
                    </button>
                </header>

                <form onSubmit={handleSubmit} className="p-12 space-y-10 max-h-[70vh] overflow-y-auto custom-scrollbar">
                    
                    {/* Image Box */}
                    <div className="group relative h-48 rounded-[40px] border border-dashed border-white/10 overflow-hidden bg-white/[0.02]">
                        <input type="file" onChange={handleInputChange} className="absolute inset-0 opacity-0 z-10 cursor-pointer" />
                        {imagePreview ? (
                            <img src={imagePreview} className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity" />
                        ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center gap-4 text-white/20">
                                <Palette size={42} />
                                <span className="text-[10px] font-black tracking-widest uppercase">Téléverser Texture Fabric</span>
                            </div>
                        )}
                    </div>

                    <div className="grid grid-cols-2 gap-10">
                        <div className="space-y-3">
                            <label className="text-[10px] uppercase font-black text-white/30 tracking-widest px-1">Matière / Matériau</label>
                            <input name="materiel" value={formData.materiel} onChange={handleInputChange} className="w-full bg-transparent border-b border-white/10 py-4 focus:outline-none focus:border-[#C6A75E] transition-colors text-xl font-serif italic text-white" placeholder="ex: Soie Lyonnaise" />
                        </div>
                        <div className="space-y-3">
                            <label className="text-[10px] uppercase font-black text-white/30 tracking-widest px-1">Quantité (m)</label>
                            <input name="quantite" type="number" value={formData.quantite} onChange={handleInputChange} className="w-full bg-transparent border-b border-white/10 py-4 focus:outline-none focus:border-[#C6A75E] transition-colors text-xl font-serif text-white" placeholder="0.00" />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-10">
                        <div className="space-y-3">
                            <label className="text-[10px] uppercase font-black text-white/30 tracking-widest px-1">Prix Unitaire (€/m)</label>
                            <input name="prix" type="number" value={formData.prix} onChange={handleInputChange} className="w-full bg-transparent border-b border-white/10 py-4 focus:outline-none focus:border-[#C6A75E] transition-colors text-xl font-serif text-white" placeholder="0.00" />
                        </div>
                    </div>

                    <div className="space-y-3">
                        <label className="text-[10px] uppercase font-black text-white/30 tracking-widest px-1">Notes de l'Artisan</label>
                        <textarea name="description" value={formData.description} onChange={handleInputChange} className="w-full bg-white/[0.03] border border-white/5 rounded-3xl p-6 focus:outline-none focus:border-[#C6A75E]/30 transition-all text-sm font-light leading-relaxed min-h-[120px]" placeholder="Détails sur le tissage, la provenance..." />
                    </div>

                    <div className="flex gap-6 mt-12">
                        <button type="button" onClick={() => setShowForm(false)} className="flex-1 py-5 rounded-full border border-white/10 text-[10px] font-black tracking-widest uppercase hover:bg-white/5 transition-all text-white/40">Annuler</button>
                        <button type="submit" disabled={isSubmitting} className="flex-2 flex items-center justify-center gap-3 bg-white text-black py-5 px-16 rounded-full text-[10px] font-black tracking-widest uppercase hover:bg-[#C6A75E] transition-all">
                           {isSubmitting ? <Loader2 className="animate-spin" size={16}/> : <CheckCircle2 size={16}/>}
                           Soumettre au Registre
                        </button>
                    </div>
                </form>

            </div>
        </div>
      )}
    </div>
  );
}

export default Dashboard;
