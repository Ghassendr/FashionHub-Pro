import React, { useState, useEffect } from 'react';
import { 
    User, 
    Mail, 
    Shield, 
    Heart, 
    Edit3, 
    Check, 
    X, 
    Camera,
    Loader2,
    Palette,
    Layers
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const Profile = () => {
    const { token, user: authUser } = useAuth();
    const [profileData, setProfileData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [editing, setEditing] = useState(false);
    const [formData, setFormData] = useState({ name: '', info: '' });
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const res = await fetch('http://localhost:8000/api/auth/profile/', {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (!res.ok) throw new Error("Erreur de chargement");
                const data = await res.json();
                setProfileData(data);
                setFormData({
                    name: data.user.first_name || data.user.username,
                    info: data.user.info || ''
                });
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        if (token) fetchProfile();
    }, [token]);

    const handleSave = async () => {
        setSaving(true);
        try {
            const res = await fetch('http://localhost:8000/api/auth/profile/', {
                method: 'PUT',
                headers: { 
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    first_name: formData.name,
                    info: formData.info
                })
            });
            if (res.ok) {
                const updated = await res.json();
                setProfileData(prev => ({ ...prev, user: updated }));
                setEditing(false);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-noir flex items-center justify-center">
                <Loader2 className="w-10 h-10 text-gold animate-spin" />
            </div>
        );
    }

    const { user, liked_fabrics, liked_designs } = profileData;

    return (
        <div className="min-h-screen bg-noir text-ivory pt-32 pb-20">
            <div className="wrapper max-w-[1200px]">
                
                {/* Profile Header Block */}
                <div className="relative mb-24 animate-fade-up">
                    <div className="flex flex-col md:flex-row items-center md:items-end gap-12">
                        {/* Avatar Section */}
                        <div className="relative group">
                            <div className="w-40 h-40 rounded-full border border-gold/20 p-1 bg-gold/[0.02] flex items-center justify-center overflow-hidden">
                                {user.photo ? (
                                    <img src={user.photo} alt="Profile" className="w-full h-full object-cover rounded-full" />
                                ) : (
                                    <User size={60} strokeWidth={0.5} className="text-gold/40" />
                                )}
                            </div>
                            <button className="absolute bottom-2 right-2 w-10 h-10 bg-gold rounded-full flex items-center justify-center text-noir hover:scale-110 transition-transform shadow-glow-gold/20 border border-noir">
                                <Camera size={16} />
                            </button>
                        </div>

                        {/* Info Section */}
                        <div className="flex-1 text-center md:text-left space-y-4">
                            <div className="flex items-center justify-center md:justify-start gap-4 mb-2">
                                <span className="text-[10px] tracking-luxury text-gold uppercase font-bold border border-gold/20 px-4 py-1 rounded-full bg-gold/5">
                                    {user.role} {user.account_status === 'active' ? '· Vérifié' : ''}
                                </span>
                            </div>
                            
                            {editing ? (
                                <input 
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    className="bg-transparent border-b border-gold text-4xl md:text-6xl font-display font-light text-ivory outline-none w-full md:w-auto"
                                    autoFocus
                                />
                            ) : (
                                <h1 className="font-display text-4xl md:text-6xl font-light text-ivory tracking-tight italic">
                                    {user.first_name || user.username}
                                </h1>
                            )}
                            
                            <div className="flex flex-col md:flex-row items-center gap-6 text-ivory/30 text-xs tracking-widest uppercase mt-4">
                                <div className="flex items-center gap-2">
                                    <Mail size={14} className="text-gold/60" />
                                    <span>{user.email}</span>
                                </div>
                                <div className="hidden md:block w-1.5 h-1.5 rounded-full bg-gold/20"></div>
                                <div className="flex items-center gap-2">
                                    <Shield size={14} className="text-gold/60" />
                                    <span>Membre depuis {new Date(user.date_joined).getFullYear()}</span>
                                </div>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-4">
                            {editing ? (
                                <>
                                    <button 
                                        onClick={handleSave}
                                        disabled={saving}
                                        className="btn btn-primary px-8 py-3 text-[10px] tracking-luxury flex items-center gap-2"
                                    >
                                        {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                                        Enregistrer
                                    </button>
                                    <button 
                                        onClick={() => { setEditing(false); setFormData({ name: user.first_name, info: user.info }); }}
                                        className="btn btn-secondary px-8 py-3 text-[10px] tracking-luxury flex items-center gap-2"
                                    >
                                        <X size={14} />
                                        Annuler
                                    </button>
                                </>
                            ) : (
                                <button 
                                    onClick={() => setEditing(true)}
                                    className="btn btn-secondary px-8 py-3 text-[10px] tracking-luxury flex items-center gap-2"
                                >
                                    <Edit3 size={14} />
                                    Modifier le Profil
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-[1fr_2fr] gap-20 items-start">
                    
                    {/* Left: Bio / Info */}
                    <aside className="space-y-12 animate-fade-in delay-200">
                        <div className="p-10 bg-gold/[0.02] border border-gold/5 relative group">
                            <div className="absolute top-0 left-0 w-8 h-[1px] bg-gold/50"></div>
                            <div className="absolute top-0 left-0 w-[1px] h-8 bg-gold/50"></div>
                            
                            <h3 className="text-label text-gold mb-8 uppercase tracking-[0.3em]">À Propos de moi</h3>
                            {editing ? (
                                <textarea 
                                    value={formData.info}
                                    onChange={(e) => setFormData({ ...formData, info: e.target.value })}
                                    className="bg-noir/40 border border-gold/20 w-full h-40 p-4 text-sm text-ivory/70 font-light resize-none focus:border-gold outline-none transition-colors"
                                    placeholder="Partagez quelques mots sur votre style..."
                                />
                            ) : (
                                <p className="text-sm text-ivory/40 leading-relaxed font-light italic">
                                    {user.info || "Aucune information de style renseignée. Cliquez sur modifier pour compléter votre profil."}
                                </p>
                            )}
                        </div>
                        
                        <div className="space-y-6">
                            <h3 className="text-[10px] tracking-luxury uppercase text-ivory/30 font-bold border-b border-gold/10 pb-4">Activité Récente</h3>
                            <div className="space-y-4">
                                <div className="flex items-center justify-between text-xs py-2 border-b border-white/5">
                                    <span className="text-ivory/20 uppercase tracking-widest">Dernière Connexion</span>
                                    <span className="text-ivory/60">Aujourd'hui</span>
                                </div>
                                <div className="flex items-center justify-between text-xs py-2 border-b border-white/5">
                                    <span className="text-ivory/20 uppercase tracking-widest">Designs Likés</span>
                                    <span className="text-gold/60">{liked_designs.length}</span>
                                </div>
                                <div className="flex items-center justify-between text-xs py-2 border-b border-white/5">
                                    <span className="text-ivory/20 uppercase tracking-widest">Commandes</span>
                                    <span className="text-gold/60">02</span>
                                </div>
                            </div>
                        </div>
                    </aside>

                    {/* Right: Liked Items */}
                    <main className="space-y-16 animate-fade-in delay-400">
                        
                        {/* Liked Fabrics */}
                        <section>
                            <div className="flex items-center justify-between mb-10 border-b border-gold/10 pb-6">
                                <div className="flex items-center gap-4">
                                    <Palette size={18} className="text-gold/60" />
                                    <h2 className="font-display text-2xl text-ivory italic">Mes Coups de Cœur Textiles</h2>
                                </div>
                                <span className="text-[10px] tracking-luxury text-ivory/30 uppercase">{liked_fabrics.length} articles</span>
                            </div>
                            
                            {liked_fabrics.length === 0 ? (
                                <div className="py-20 text-center border border-dashed border-gold/10 bg-gold/[0.01]">
                                    <p className="text-[10px] tracking-luxury uppercase text-ivory/20 italic">Aucun tissu sauvegardé</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    {liked_fabrics.map(fabric => (
                                        <div key={fabric.id} className="bg-[#0a0a09] border border-gold/5 p-6 group hover:border-gold/20 transition-all duration-700">
                                            <div className="flex items-center justify-between mb-4">
                                                <span className="text-[9px] uppercase tracking-luxury text-gold font-bold">Fabric Noir</span>
                                                <Heart size={14} className="text-red-500 fill-red-500" />
                                            </div>
                                            <h4 className="font-display text-lg text-ivory mb-2 capitalize">{fabric.materiel}</h4>
                                            <p className="text-[10px] text-ivory/30 uppercase tracking-[0.2em] line-clamp-2 leading-relaxed">
                                                {fabric.description}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </section>

                        {/* Liked Designs */}
                        <section>
                            <div className="flex items-center justify-between mb-10 border-b border-gold/10 pb-6">
                                <div className="flex items-center gap-4">
                                    <Layers size={18} className="text-gold/60" />
                                    <h2 className="font-display text-2xl text-ivory italic">Silhouettes Favoris</h2>
                                </div>
                                <span className="text-[10px] tracking-luxury text-ivory/30 uppercase">{liked_designs.length} articles</span>
                            </div>

                            {liked_designs.length === 0 ? (
                                <div className="py-20 text-center border border-dashed border-gold/10 bg-gold/[0.01]">
                                    <p className="text-[10px] tracking-luxury uppercase text-ivory/20 italic">Aucun design sauvegardé</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    {liked_designs.map(design => (
                                        <div key={design.id} className="bg-[#0a0a09] border border-gold/5 p-6 group hover:border-gold/20 transition-all duration-700">
                                            <div className="flex items-center justify-between mb-4">
                                                <span className="text-[9px] uppercase tracking-luxury text-gold font-bold">Concept {design.type || 'Haut'}</span>
                                                <Heart size={14} className="text-red-500 fill-red-500" />
                                            </div>
                                            <h4 className="font-display text-lg text-ivory mb-2 capitalize">{design.title || design.name || "Modèle Design"}</h4>
                                            <div className="flex items-center justify-between mt-6">
                                                <span className="text-serif text-gold font-medium italic">{design.prix || '---'}€</span>
                                                <button className="text-[8px] tracking-luxury uppercase font-bold text-ivory/40 group-hover:text-gold transition-colors">Commander</button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </section>
                    </main>
                </div>
            </div>
        </div>
    );
};

export default Profile;
