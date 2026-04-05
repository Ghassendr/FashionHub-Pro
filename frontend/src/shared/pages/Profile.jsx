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
    Layers,
    Plus,
    Video,
    Clock,
    DollarSign,
    Sparkles,
    UploadCloud,
    FileText,
    ExternalLink
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import FabricCard from '../components/FabricCard';
import DesignCard from '../../actors/couturehouse/components/DesignCard';

const Profile = () => {
    const navigate = useNavigate();
    const { token, user: authUser } = useAuth();
    const [profileData, setProfileData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [editing, setEditing] = useState(false);
    const [saving, setSaving] = useState(false);
    const [activeTab, setActiveTab] = useState('account'); // 'account' or 'atelier'
    const [formData, setFormData] = useState({ 
        name: '', 
        info: '',
        // Atelier specific (nested under 'profile')
        house_name: '',
        specialization: '',
        starting_price: '',
        avg_production_time: '',
        about_text: '',
        introduction_video_url: null
    });
    const [error, setError] = useState(null);
    const [videoFile, setVideoFile] = useState(null);
    const [videoPreview, setVideoPreview] = useState(null);

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                setLoading(true);
                setError(null);
                const res = await fetch('http://localhost:8000/api/auth/profile/', {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (!res.ok) throw new Error("Erreur de chargement du profil");
                const data = await res.json();
                setProfileData(data);
                
                const user = data.user;
                const atelier = user.profile || {};
                
                setFormData({
                    name: user.first_name || user.username,
                    info: user.info || '',
                    house_name: atelier.house_name || '',
                    specialization: atelier.specialization || '',
                    starting_price: atelier.starting_price || '',
                    avg_production_time: atelier.avg_production_time || '',
                    about_text: atelier.about_text || '',
                    introduction_video_url: atelier.introduction_video_url || null
                });
            } catch (err) {
                console.error(err);
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };
        if (token) fetchProfile();
    }, [token]);

    const handleVideoSelect = (file) => {
        if (!file) return;
        if (!file.type.startsWith('video/')) return;
        if (videoPreview) URL.revokeObjectURL(videoPreview);
        setVideoFile(file);
        setVideoPreview(URL.createObjectURL(file));
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            // Use FormData to support video upload
            const data = new FormData();
            data.append('first_name', formData.name);
            data.append('info', formData.info);
            
            // Nested profile data
            const profilePayload = {
                house_name: formData.house_name,
                specialization: formData.specialization,
                starting_price: formData.starting_price,
                avg_production_time: formData.avg_production_time,
                about_text: formData.about_text
            };
            
            // Due to limitations of FormData and Django nested serializers, 
            // we send the profile fields with a prefix or as a JSON string if the backend expects it.
            // My backend update expects 'profile' in request.data.
            // For simple FormData, we can append each field.
            data.append('profile', JSON.stringify(profilePayload));
            
            if (videoFile) {
                // If the backend handle_inquiries/manage_profile expects 'introduction_video' 
                // nested, we might need a custom approach.
                // However, our backend UserProfileSerializer.update uses data.get('profile').
                // Let's stick to a simpler approach: if it's a Couture House, we use the dedicated endpoint for files.
                if (authUser.role === 'couture_house') {
                    const atelierFormData = new FormData();
                    atelierFormData.append('house_name', formData.house_name);
                    atelierFormData.append('specialization', formData.specialization);
                    atelierFormData.append('starting_price', formData.starting_price);
                    atelierFormData.append('avg_production_time', formData.avg_production_time);
                    atelierFormData.append('about_text', formData.about_text);
                    if (videoFile) atelierFormData.append('introduction_video', videoFile);

                    await fetch('http://localhost:8000/api/couturehouse/profile/', {
                        method: 'POST',
                        headers: { 'Authorization': `Bearer ${token}` },
                        body: atelierFormData
                    });
                }
            }

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
                setVideoFile(null);
                if (videoPreview) URL.revokeObjectURL(videoPreview);
                setVideoPreview(null);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setSaving(false);
        }
    };

    if (error) {
        return (
            <div className="min-h-screen bg-noir flex flex-col items-center justify-center p-6 text-center">
                <div className="w-20 h-20 rounded-full bg-red-500/10 flex items-center justify-center mb-6 border border-red-500/20">
                    <X size={40} className="text-red-500" />
                </div>
                <h2 className="text-2xl font-display text-ivory mb-2">Oups ! Une erreur est survenue</h2>
                <p className="text-ivory/40 mb-8 max-w-md">{error}</p>
                <button 
                    onClick={() => window.location.reload()}
                    className="btn btn-primary px-8 py-3 text-[10px] tracking-luxury"
                >
                    Réessayer
                </button>
            </div>
        );
    }

    if (loading || !profileData) {
        return (
            <div className="min-h-screen bg-noir flex items-center justify-center">
                <Loader2 className="w-10 h-10 text-gold animate-spin" />
            </div>
        );
    }

    const { user, liked_fabrics = [], liked_designs = [] } = profileData;
    const isPro = user.role === 'couture_house' || user.role === 'fournisseur';

    return (
        <div className="min-h-screen bg-noir text-ivory pb-20">
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
                                <h1 className="font-display text-3xl md:text-5xl font-light text-ivory tracking-tight italic truncate max-w-full">
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
                                    <span>Membre depuis {user.date_joined ? new Date(user.date_joined).getFullYear() : '2026'}</span>
                                </div>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="flex flex-wrap items-center justify-center md:justify-end gap-3 mt-8 md:mt-0">
                            {user?.role === 'client' && (
                                <button 
                                    onClick={() => navigate('/client/create-design')}
                                    className="w-12 h-12 bg-gold text-noir rounded-full flex items-center justify-center hover:scale-110 transition-transform shadow-glow-gold/20 border border-noir group"
                                    title="Nouvelle Création"
                                >
                                    <Plus size={24} className="group-hover:rotate-90 transition-transform duration-500" />
                                </button>
                            )}

                            {user?.role === 'couture_house' && !editing && (
                                <button 
                                    onClick={() => navigate(`/client/ateliers/${user.id}`)}
                                    className="btn btn-secondary px-8 py-3 text-[10px] tracking-luxury flex items-center gap-2 border-gold/30 text-gold hover:bg-gold/10 whitespace-nowrap"
                                >
                                    <ExternalLink size={14} />
                                    Aperçu Public
                                </button>
                            )}
                            
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
                                        onClick={() => { 
                                            setEditing(false); 
                                            setVideoFile(null);
                                            if (videoPreview) URL.revokeObjectURL(videoPreview);
                                            setVideoPreview(null);
                                        }}
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

                {/* Tab Switcher for Pros */}
                {isPro && (
                    <div className="flex gap-12 mb-16 border-b border-white/5">
                        <button 
                            onClick={() => setActiveTab('account')}
                            className={`pb-4 text-[10px] tracking-luxury uppercase font-bold transition-all ${activeTab === 'account' ? 'text-gold border-b-2 border-gold font-black' : 'text-ivory/30 hover:text-ivory'}`}
                        >
                            Informations Personnelles
                        </button>
                        <button 
                            onClick={() => setActiveTab('atelier')}
                            className={`pb-4 text-[10px] tracking-luxury uppercase font-bold transition-all ${activeTab === 'atelier' ? 'text-gold border-b-2 border-gold font-black' : 'text-ivory/30 hover:text-ivory'}`}
                        >
                            {user.role === 'couture_house' ? 'Showroom & Atelier' : 'Gestion Inventory'}
                        </button>
                    </div>
                )}

                <div className="animate-fade-in">
                    {activeTab === 'account' ? (
                        <div className="grid grid-cols-1 lg:grid-cols-[1fr_2fr] gap-20 items-start">
                            
                            {/* Left: Bio / Info */}
                            <aside className="space-y-12">
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
                                            <span className="text-ivory/20 uppercase tracking-widest">Favoris Sauvegardés</span>
                                            <span className="text-gold/60">{(liked_designs?.length || 0) + (liked_fabrics?.length || 0)}</span>
                                        </div>
                                    </div>
                                </div>
                            </aside>

                            {/* Right: Liked Items / General Content */}
                            <main className="space-y-16">
                                {/* Liked Fabrics */}
                                <section>
                                    <div className="flex items-center justify-between mb-10 border-b border-gold/10 pb-6">
                                        <div className="flex items-center gap-4">
                                            <Sparkles size={18} className="text-gold/60" />
                                            <h2 className="font-display text-2xl text-ivory italic">Mes Coups de Cœur Textiles</h2>
                                        </div>
                                        <span className="text-[10px] tracking-luxury text-ivory/30 uppercase">{(liked_fabrics?.length || 0)} articles</span>
                                    </div>
                                    
                                    {(liked_fabrics?.length || 0) === 0 ? (
                                        <div className="py-20 text-center border border-dashed border-gold/10 bg-gold/[0.01]">
                                            <p className="text-[10px] tracking-luxury uppercase text-ivory/20 italic">Aucun tissu sauvegardé</p>
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                                            {liked_fabrics.map(fabric => (
                                                <FabricCard key={fabric.id} fabric={fabric} showLikes={false} />
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
                                        <span className="text-[10px] tracking-luxury text-ivory/30 uppercase">{(liked_designs?.length || 0)} articles</span>
                                    </div>

                                    {(liked_designs?.length || 0) === 0 ? (
                                        <div className="py-20 text-center border border-dashed border-gold/10 bg-gold/[0.01]">
                                            <p className="text-[10px] tracking-luxury uppercase text-ivory/20 italic">Aucun design sauvegardé</p>
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                                            {liked_designs.map(design => (
                                                <DesignCard key={design.id} design={design} isPublic={true} />
                                            ))}
                                        </div>
                                    )}
                                </section>
                            </main>
                        </div>
                    ) : (
                        /* Atelier Management Tab for Couture House */
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 animate-fade-in">
                            <div className="lg:col-span-2 space-y-12">
                                <section className="p-8 bg-white/[0.02] border border-white/5 rounded-3xl">
                                    <h3 className="text-[10px] tracking-luxury uppercase text-gold mb-8 flex items-center gap-2">
                                        <Sparkles size={14} /> Présentation de la Maison
                                    </h3>
                                    
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                                        <div className="space-y-3">
                                            <label className="text-[10px] uppercase tracking-widest text-ivory/30">Nom de l'Atelier</label>
                                            {editing ? (
                                                <input 
                                                    type="text" 
                                                    value={formData.house_name}
                                                    onChange={e => setFormData({...formData, house_name: e.target.value})}
                                                    className="w-full bg-noir border border-white/10 rounded-xl px-4 py-3 text-ivory focus:border-gold/50 transition-all"
                                                />
                                            ) : (
                                                <p className="text-xl font-display italic text-ivory">{formData.house_name || "Non défini"}</p>
                                            )}
                                        </div>
                                        <div className="space-y-3">
                                            <label className="text-[10px] uppercase tracking-widest text-ivory/30">Spécialisation</label>
                                            {editing ? (
                                                <input 
                                                    type="text" 
                                                    value={formData.specialization}
                                                    onChange={e => setFormData({...formData, specialization: e.target.value})}
                                                    className="w-full bg-noir border border-white/10 rounded-xl px-4 py-3 text-ivory focus:border-gold/50 transition-all"
                                                    placeholder="ex: Haute Couture, Mariage..."
                                                />
                                            ) : (
                                                <p className="text-sm uppercase tracking-widest text-gold">{formData.specialization || "Non défini"}</p>
                                            )}
                                        </div>
                                    </div>

                                    <div className="space-y-3">
                                        <label className="text-[10px] uppercase tracking-widest text-ivory/30 flex items-center gap-2">
                                            <FileText size={12} /> Histoire & Philosophie
                                        </label>
                                        {editing ? (
                                            <textarea 
                                                value={formData.about_text}
                                                onChange={e => setFormData({...formData, about_text: e.target.value})}
                                                className="w-full bg-noir border border-white/10 rounded-xl px-4 py-4 text-sm text-ivory/60 min-h-[150px] resize-none focus:border-gold/50"
                                                placeholder="L'histoire de votre atelier..."
                                            />
                                        ) : (
                                            <p className="text-sm text-ivory/50 leading-relaxed font-light italic">
                                                {formData.about_text || "Aucune description fournie."}
                                            </p>
                                        )}
                                    </div>
                                </section>

                                <section className="p-8 bg-white/[0.02] border border-white/5 rounded-3xl">
                                    <h3 className="text-[10px] tracking-luxury uppercase text-gold mb-8 flex items-center gap-2">
                                        <Video size={14} /> Vidéo d'Introduction
                                    </h3>
                                    
                                    <div className="space-y-4">
                                        {(videoPreview || formData.introduction_video_url) ? (
                                            <div className="relative aspect-video rounded-2xl overflow-hidden bg-black border border-gold/10 group">
                                                <video 
                                                    src={videoPreview || formData.introduction_video_url} 
                                                    className="w-full h-full object-cover"
                                                    controls
                                                />
                                                {editing && (
                                                    <div className="absolute inset-0 bg-noir/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
                                                        <button 
                                                            onClick={() => document.getElementById('video-upload').click()}
                                                            className="btn btn-primary px-6 py-2 text-[10px] tracking-widest"
                                                        >
                                                            <UploadCloud size={14} /> Remplacer
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        ) : editing ? (
                                            <div 
                                                onClick={() => document.getElementById('video-upload').click()}
                                                className="border-2 border-dashed border-white/10 rounded-3xl p-12 flex flex-col items-center justify-center gap-4 hover:border-gold/30 cursor-pointer transition-all bg-white/[0.01]"
                                            >
                                                <div className="w-16 h-16 rounded-full bg-gold/5 flex items-center justify-center text-gold/40">
                                                    <UploadCloud size={30} />
                                                </div>
                                                <p className="text-xs text-ivory/40 uppercase tracking-widest">Choisir une vidéo de présentation</p>
                                            </div>
                                        ) : (
                                            <p className="text-xs text-ivory/20 italic text-center py-12 border border-dashed border-white/5 rounded-2xl">
                                                Aucune vidéo pour le moment
                                            </p>
                                        )}
                                        <input 
                                            id="video-upload"
                                            type="file" 
                                            accept="video/*" 
                                            className="hidden" 
                                            onChange={e => handleVideoSelect(e.target.files[0])}
                                        />
                                    </div>
                                </section>
                            </div>

                            <aside className="space-y-8">
                                <div className="p-8 bg-gold/[0.02] border border-gold/10 rounded-3xl">
                                    <h3 className="text-[10px] tracking-luxury uppercase text-gold/60 mb-8 border-b border-gold/5 pb-4">Logistique Public</h3>
                                    <div className="space-y-8">
                                        <div className="space-y-3">
                                            <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-ivory/30">
                                                <DollarSign size={12} /> Prix de départ
                                            </div>
                                            {editing ? (
                                                <input 
                                                    type="number" 
                                                    value={formData.starting_price}
                                                    onChange={e => setFormData({...formData, starting_price: e.target.value})}
                                                    className="w-full bg-noir border border-white/10 rounded-xl px-4 py-3 text-ivory text-xl font-display italic"
                                                />
                                            ) : (
                                                <p className="text-2xl font-display italic text-gold">{formData.starting_price || 0} €</p>
                                            )}
                                        </div>
                                        <div className="space-y-3">
                                            <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-ivory/30">
                                                <Clock size={12} /> Temps Production
                                            </div>
                                            {editing ? (
                                                <input 
                                                    type="text" 
                                                    value={formData.avg_production_time}
                                                    onChange={e => setFormData({...formData, avg_production_time: e.target.value})}
                                                    className="w-full bg-noir border border-white/10 rounded-xl px-4 py-3 text-ivory text-xs uppercase tracking-widest"
                                                    placeholder="ex: 4-6 semaines"
                                                />
                                            ) : (
                                                <p className="text-xs uppercase tracking-[0.2em] text-ivory/70">{formData.avg_production_time || "Non précisé"}</p>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="p-8 bg-noir border border-white/5 rounded-3xl">
                                    <h3 className="text-[10px] tracking-luxury uppercase text-ivory/20 mb-4">Conseil Pro</h3>
                                    <p className="text-xs text-ivory/40 leading-relaxed italic border-l-2 border-gold/20 pl-4 py-2">
                                        Un profil complété avec une vidéo augmente vos chances de conversion de +40%. Présentez vos outils et votre atelier !
                                    </p>
                                </div>
                            </aside>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Profile;
