import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft, Mail, User, Building2, Phone, 
  Save, AlertCircle, CheckCircle, X, MapPin, 
  ShieldCheck, Loader2, Menu, Layers, ShoppingCart, 
  Settings as SettingsIcon, LogOut, Info
} from "lucide-react";
import { authService } from "../../services/authService";
import "./Settings.css";

function Settings() {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(true);
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
    telephone: "",
    nomOrganization: "",
    lieu: "",
    description: "",
    nomContact: "",
    prenomContact: "",
    telephoneContact: "",
  });

  useEffect(() => {
    fetchUserProfile();
  }, []);

  const fetchUserProfile = async () => {
    try {
      setLoading(true);
      const response = await fetch(`http://localhost:8000/api/auth/user/${userId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setFormData(data.user);
      }
    } catch (err) {
      setError("Dossier introuvable.");
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
    setIsSaving(true);

    try {
      const response = await fetch(`http://localhost:8000/api/auth/user/${userId}/update`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        setSuccess("Profil Artisan mis à jour.");
        setTimeout(() => setSuccess(""), 4000);
      } else {
        const data = await response.json();
        setError(data.error || "Erreur de synchronisation.");
      }
    } catch (err) {
      setError("Serveur injoignable.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex h-screen bg-[#0A0A0A] font-inter text-white overflow-hidden">
      
      {/* Shared Atelier Sidebar */}
      <aside className={`w-64 flex-shrink-0 border-r border-white/5 bg-black/40 backdrop-blur-2xl flex flex-col transition-all duration-500 ease-in-out ${sidebarOpen ? "ml-0" : "-ml-64"}`}>
        <div className="p-8 border-b border-white/5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-[#C6A75E] to-[#8E793E] rounded-lg flex items-center justify-center text-black font-black shadow-[0_0_20px_rgba(198,167,94,0.3)]">FP</div>
              <span className="text-sm font-black tracking-[0.2em] text-[#C6A75E]">SUPPLIER</span>
            </div>
        </div>

        <nav className="flex-1 p-6 space-y-2">
            <div className="text-[10px] uppercase font-black text-white/30 tracking-widest mb-4 px-4">Inventaire & Flux</div>
            
            <div onClick={() => navigate("/fournisseur/dashboard")} className="flex items-center gap-4 p-4 text-white/50 hover:text-[#C6A75E] hover:bg-white/[0.03] transition-all rounded-xl cursor-pointer group">
                <Layers size={18} className="group-hover:scale-110 transition-transform" />
                <span className="text-sm font-medium">Catalogue Matières</span>
            </div>

            <div onClick={() => navigate("/fournisseur/orders")} className="flex items-center gap-4 p-4 text-white/50 hover:text-[#C6A75E] hover:bg-white/[0.03] transition-all rounded-xl cursor-pointer group">
                <ShoppingCart size={18} className="group-hover:scale-110 transition-transform" />
                <span className="text-sm font-medium">Commandes Clients</span>
            </div>

            <div className="pt-8 text-[10px] uppercase font-black text-white/30 tracking-widest mb-4 px-4">Paramètres</div>
            <div className="flex items-center gap-4 p-4 text-[#C6A75E] bg-[#C6A75E]/10 rounded-xl border border-[#C6A75E]/20 shadow-[0_0_15px_rgba(198,167,94,0.05)]">
                <SettingsIcon size={18} />
                <span className="text-sm font-bold">Atelier Settings</span>
            </div>
        </nav>

        <div className="p-6 border-t border-white/5">
            <button onClick={() => { authService.logout(); navigate("/login"); }} className="flex items-center gap-4 p-4 w-full text-white/30 hover:text-rose-400 hover:bg-rose-500/5 transition-all rounded-xl cursor-pointer group">
                <LogOut size={18} className="group-hover:translate-x-1 transition-transform" />
                <span className="text-sm font-bold">Déconnexion</span>
            </button>
        </div>
      </aside>

      {/* Settings View */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        <header className="h-20 border-b border-white/5 flex items-center justify-between px-10 bg-black/20 backdrop-blur-xl shrink-0">
          <div className="flex items-center gap-6">
            <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2 text-white/40 hover:text-white transition-colors bg-white/5 rounded-lg border border-white/5">
              <Menu size={20} />
            </button>
            <div className="h-6 w-[1px] bg-white/10" />
            <div className="text-[11px] font-black tracking-widest text-[#C6A75E] uppercase bg-[#C6A75E]/5 px-3 py-1.5 rounded-md border border-[#C6A75E]/10">
              Profile Configuration
            </div>
          </div>
          <div className="flex items-center gap-6">
            <button onClick={() => navigate("/fournisseur/dashboard")} className="text-[10px] font-black tracking-widest text-white/30 uppercase hover:text-white transition-colors flex items-center gap-2 mr-4">
              <ArrowLeft size={12}/> Retour
            </button>
            <div className="flex items-center gap-4">
              <div className="flex flex-col items-end">
                <span className="text-[10px] font-black text-white/30 tracking-widest uppercase">Authenticated Session</span>
                <span className="text-xs font-bold text-white/80">{userInfo?.name || "L'Artisan Textile"}</span>
              </div>
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#C6A75E]/20 to-transparent border border-[#C6A75E]/30 flex items-center justify-center font-black text-xs text-[#C6A75E] shadow-inner">
                  {userInfo?.name?.[0] || "AT"}
              </div>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto px-16 py-12 custom-scrollbar">
          
          {/* Hero Section */}
          <div className="mb-20">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-[1px] bg-[#C6A75E]" />
              <span className="text-[10px] uppercase font-black tracking-[0.4em] text-[#C6A75E]">Configuration Atelier</span>
            </div>
            <h1 className="text-6xl font-serif text-white italic tracking-tight leading-none mb-6">Profil Identity</h1>
            <p className="text-white/30 max-w-xl text-lg font-light leading-relaxed">
              Maintenez vos informations à jour pour garantir la traçabilité de vos textiles. Vos détails sont visibles par les Maisons de Couture partenaires.
            </p>
          </div>

          <div className="max-w-4xl space-y-12 pb-24">
            
            {/* Messages */}
            {error && (
              <div className="p-6 rounded-3xl border border-rose-500/20 bg-rose-500/5 text-rose-400 text-sm flex items-center gap-4 animate-in fade-in duration-500">
                <AlertCircle size={18} /> {error}
              </div>
            )}
            {success && (
              <div className="p-6 rounded-3xl border border-[#C6A75E]/20 bg-[#C6A75E]/5 text-[#C6A75E] text-sm flex items-center gap-4 animate-in fade-in duration-500">
                <CheckCircle size={18} /> {success}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-16">
              
              {/* Profile Card Overlay */}
              <div className="relative group">
                <div className="p-12 rounded-[50px] border border-white/5 bg-white/[0.01] backdrop-blur-sm relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-[#C6A75E]/5 blur-[100px] rounded-full" />
                  
                  <div className="flex flex-col md:flex-row items-center gap-10 relative z-10">
                    <div className="w-32 h-32 rounded-[40px] bg-white/5 border border-white/10 flex items-center justify-center text-[#C6A75E] shadow-2xl group-hover:scale-105 transition-transform duration-700">
                      <User size={64} strokeWidth={1} />
                    </div>
                    <div className="text-center md:text-left">
                      <h2 className="text-4xl font-serif text-white italic mb-2">{formData.prenom || "Artisan"} {formData.nom || ""}</h2>
                      <p className="text-white/20 text-sm font-black tracking-widest uppercase mb-4">{userInfo.email}</p>
                      <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#C6A75E]/10 text-[#C6A75E] border border-[#C6A75E]/20 rounded-full text-[9px] font-black tracking-[0.2em] uppercase">
                        <ShieldCheck size={12} /> Verified Supplier Profile
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Form Sections */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-20">
                
                {/* Personal Information */}
                <section className="space-y-10">
                  <div className="flex items-center gap-4 mb-8">
                    <div className="w-10 h-10 rounded-full border border-white/5 flex items-center justify-center text-[#C6A75E]">
                      <Info size={18} />
                    </div>
                    <h3 className="text-xl font-serif text-white tracking-wide">Détails Personnels</h3>
                  </div>

                  <div className="space-y-8">
                    {['prenom', 'nom', 'email', 'telephone'].map((field) => (
                      <div key={field} className="space-y-3 group">
                        <label className="text-[10px] uppercase font-black text-white/20 tracking-widest px-2">{field.replace('prenom', 'Prénom').replace('nom', 'Nom').replace('email', 'Courriel').replace('telephone', 'Contact Mobile')}</label>
                        <div className="relative border-b border-white/5 group-focus-within:border-[#C6A75E] transition-colors">
                          <input 
                            name={field} 
                            value={formData[field]} 
                            onChange={handleInputChange} 
                            className="bg-transparent w-full py-4 text-white text-lg font-light focus:outline-none"
                            placeholder="..."
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </section>

                {/* Professional Information */}
                <section className="space-y-10">
                  <div className="flex items-center gap-4 mb-8">
                    <div className="w-10 h-10 rounded-full border border-white/5 flex items-center justify-center text-[#C6A75E]">
                      <Building2 size={18} />
                    </div>
                    <h3 className="text-xl font-serif text-white tracking-wide">Identité Atelier</h3>
                  </div>

                  <div className="space-y-8">
                    {[
                      { id: 'nomOrganization', label: 'Raison Sociale', icon: Building2 },
                      { id: 'lieu', label: 'Localisation Principal', icon: MapPin },
                    ].map((item) => (
                      <div key={item.id} className="space-y-3 group">
                        <label className="text-[10px] uppercase font-black text-white/20 tracking-widest px-2">{item.label}</label>
                        <div className="relative border-b border-white/5 group-focus-within:border-[#C6A75E] transition-colors">
                          <input 
                            name={item.id} 
                            value={formData[item.id]} 
                            onChange={handleInputChange} 
                            className="bg-transparent w-full py-4 text-white text-lg font-light focus:outline-none"
                            placeholder="..."
                          />
                        </div>
                      </div>
                    ))}

                    <div className="space-y-3 group pt-4">
                        <label className="text-[10px] uppercase font-black text-white/20 tracking-widest px-2">Manifeste de l'Atelier</label>
                        <textarea 
                          name="description" 
                          value={formData.description} 
                          onChange={handleInputChange} 
                          className="w-full bg-white/[0.03] border border-white/5 rounded-3xl p-6 focus:outline-none focus:border-[#C6A75E]/30 transition-all text-sm font-light leading-relaxed min-h-[160px]"
                          placeholder="Décrivez votre expertise textile..."
                        />
                    </div>
                  </div>
                </section>

              </div>

              {/* Action Bar */}
              <div className="pt-12 border-t border-white/5 flex justify-end gap-6">
                <button type="button" onClick={() => navigate("/fournisseur/dashboard")} className="px-12 py-5 rounded-full border border-white/10 text-[10px] font-black tracking-widest uppercase text-white/30 hover:bg-white/5 transition-all">Cancel</button>
                <button type="submit" disabled={isSaving} className="px-16 py-5 rounded-full bg-white text-black text-[10px] font-black tracking-widest uppercase hover:bg-[#C6A75E] transition-all flex items-center gap-3">
                  {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} 
                  Sauvegarder l'Archive
                </button>
              </div>

            </form>
          </div>
        </div>
      </main>
      
      <style dangerouslySetInnerHTML={{ __html: `
        .custom-scrollbar::-webkit-scrollbar { width: 5px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(198,167,94,0.1); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(198,167,94,0.3); }
      `}} />
    </div>
  );
}

export default Settings;
