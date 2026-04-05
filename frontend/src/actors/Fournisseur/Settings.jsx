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
    <div className="animate-fade-in p-6 lg:p-12 max-w-[1600px] mx-auto min-h-screen text-white">
      {/* Context Header */}
      <div className="mb-20 border-b border-gold/10 pb-12">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-[1px] bg-[#C6A75E]" />
          <span className="text-[10px] uppercase font-black tracking-[0.4em] text-[#C6A75E]">Configuration Atelier</span>
        </div>
        <h1 className="text-6xl font-serif text-white italic tracking-tight leading-none mb-6">Profile Identity</h1>
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
  );
}

export default Settings;
