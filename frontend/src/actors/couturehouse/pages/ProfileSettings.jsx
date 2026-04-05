import React, { useState, useEffect, useRef } from 'react';
import { 
    Save, Loader2, Video, FileText, Info, 
    AtSign, Clock, DollarSign, CheckCircle2,
    UploadCloud, X, Play
} from 'lucide-react';
import { useAuth } from '../../../shared/context/AuthContext';
import './ProfileSettings.css';

const ProfileSettings = () => {
    const { token } = useAuth();
    const [profile, setProfile] = useState({
        house_name: '',
        specialization: '',
        starting_price: '',
        avg_production_time: '',
        about_text: '',
        introduction_video_url: null
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState(null);
    const [videoFile, setVideoFile] = useState(null);       // File object
    const [videoPreview, setVideoPreview] = useState(null); // Object URL for preview
    const [dragOver, setDragOver] = useState(false);
    const fileInputRef = useRef(null);

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const res = await fetch('http://localhost:8000/api/couturehouse/profile/', {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (res.ok) {
                    const data = await res.json();
                    setProfile(data);
                }
            } catch (error) {
                console.error("Error fetching profile:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchProfile();
    }, [token]);

    // Clean up preview object URL on unmount
    useEffect(() => {
        return () => { if (videoPreview) URL.revokeObjectURL(videoPreview); };
    }, [videoPreview]);

    const handleVideoSelect = (file) => {
        if (!file) return;
        if (!file.type.startsWith('video/')) {
            setMessage({ type: 'error', text: 'Veuillez sélectionner un fichier vidéo valide.' });
            return;
        }
        if (file.size > 200 * 1024 * 1024) { // 200MB limit
            setMessage({ type: 'error', text: 'La vidéo ne doit pas dépasser 200 Mo.' });
            return;
        }
        if (videoPreview) URL.revokeObjectURL(videoPreview);
        setVideoFile(file);
        setVideoPreview(URL.createObjectURL(file));
        setMessage(null);
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setDragOver(false);
        const file = e.dataTransfer.files[0];
        handleVideoSelect(file);
    };

    const removeVideo = () => {
        if (videoPreview) URL.revokeObjectURL(videoPreview);
        setVideoFile(null);
        setVideoPreview(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setSaving(true);
        setMessage(null);
        try {
            // Always send as FormData so we can include both text and file
            const formData = new FormData();
            formData.append('house_name', profile.house_name || '');
            formData.append('specialization', profile.specialization || '');
            formData.append('starting_price', profile.starting_price || '');
            formData.append('avg_production_time', profile.avg_production_time || '');
            formData.append('about_text', profile.about_text || '');
            if (videoFile) {
                formData.append('introduction_video', videoFile);
            }

            const res = await fetch('http://localhost:8000/api/couturehouse/profile/', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
                body: formData
            });

            if (res.ok) {
                const updated = await res.json();
                setProfile(updated);
                // Clear the local file after successful upload
                if (videoFile) {
                    if (videoPreview) URL.revokeObjectURL(videoPreview);
                    setVideoFile(null);
                    setVideoPreview(null);
                }
                setMessage({ type: 'success', text: 'Profil mis à jour avec succès !' });
            } else {
                const err = await res.json();
                setMessage({ type: 'error', text: `Erreur: ${JSON.stringify(err)}` });
            }
        } catch (error) {
            setMessage({ type: 'error', text: 'Erreur réseau.' });
        } finally {
            setSaving(false);
        }
    };

    if (loading) return (
        <div className="flex items-center justify-center min-h-[400px]">
            <Loader2 className="animate-spin text-gold" size={32} />
        </div>
    );

    // Determine what video source to show
    const currentVideoSrc = videoPreview || profile.introduction_video_url;

    return (
        <div className="profile-settings-page p-6 max-w-4xl mx-auto">
            <header className="mb-8">
                <h1 className="font-display text-3xl text-ivory mb-2">Configuration du Profil Public</h1>
                <p className="text-ivory/40 text-sm">Ces informations seront visibles par tous les clients potentiels dans la galerie de découverte.</p>
            </header>

            {message && (
                <div className={`mb-6 p-4 rounded-lg flex items-center gap-3 ${
                    message.type === 'success' ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400' : 'bg-red-500/10 border border-red-500/20 text-red-400'
                }`}>
                    {message.type === 'success' ? <CheckCircle2 size={18} /> : <Info size={18} />}
                    <span className="text-sm">{message.text}</span>
                </div>
            )}

            <form onSubmit={handleSave} className="space-y-8">
                {/* Identity */}
                <section className="bg-white/[0.02] border border-white/5 rounded-2xl p-6">
                    <h2 className="text-gold text-[10px] tracking-luxury uppercase mb-6 flex items-center gap-2">
                        <AtSign size={14} /> Identité de la Maison
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-[10px] uppercase tracking-widest text-ivory/40">Nom de la Maison</label>
                            <input 
                                type="text" 
                                value={profile.house_name} 
                                onChange={e => setProfile({...profile, house_name: e.target.value})}
                                className="bg-noir border border-white/10 rounded-lg px-4 py-3 text-ivory w-full focus:border-gold/50 transition-colors"
                                placeholder="ex: Atelier Mansour"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] uppercase tracking-widest text-ivory/40">Spécialisation</label>
                            <input 
                                type="text" 
                                value={profile.specialization} 
                                onChange={e => setProfile({...profile, specialization: e.target.value})}
                                className="bg-noir border border-white/10 rounded-lg px-4 py-3 text-ivory w-full focus:border-gold/50 transition-colors"
                                placeholder="ex: Robes de Mariée, Costumes sur mesure"
                            />
                        </div>
                    </div>
                </section>

                {/* Logistics & Pricing */}
                <section className="bg-white/[0.02] border border-white/5 rounded-2xl p-6">
                    <h2 className="text-gold text-[10px] tracking-luxury uppercase mb-6 flex items-center gap-2">
                        <DollarSign size={14} /> Logistique & Tarifs
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-[10px] uppercase tracking-widest text-ivory/40">Prix de départ (DT)</label>
                            <div className="relative">
                                <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 text-gold/30" size={16} />
                                <input 
                                    type="number" 
                                    value={profile.starting_price} 
                                    onChange={e => setProfile({...profile, starting_price: e.target.value})}
                                    className="bg-noir border border-white/10 rounded-lg pl-10 pr-4 py-3 text-ivory w-full focus:border-gold/50 transition-colors"
                                    placeholder="0.00"
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] uppercase tracking-widest text-ivory/40">Temps de production moyen</label>
                            <div className="relative">
                                <Clock className="absolute left-4 top-1/2 -translate-y-1/2 text-gold/30" size={16} />
                                <input 
                                    type="text" 
                                    value={profile.avg_production_time} 
                                    onChange={e => setProfile({...profile, avg_production_time: e.target.value})}
                                    className="bg-noir border border-white/10 rounded-lg pl-10 pr-4 py-3 text-ivory w-full focus:border-gold/50 transition-colors"
                                    placeholder="ex: 2-4 semaines"
                                />
                            </div>
                        </div>
                    </div>
                </section>

                {/* Video & Story */}
                <section className="bg-white/[0.02] border border-white/5 rounded-2xl p-6">
                    <h2 className="text-gold text-[10px] tracking-luxury uppercase mb-6 flex items-center gap-2">
                        <Video size={14} /> Vidéo d'Introduction & Histoire
                    </h2>
                    <div className="space-y-6">

                        {/* Video Upload Area */}
                        <div className="space-y-3">
                            <label className="text-[10px] uppercase tracking-widest text-ivory/40">Vidéo d'Introduction</label>

                            {/* Preview */}
                            {currentVideoSrc ? (
                                <div className="relative rounded-xl overflow-hidden bg-black border border-gold/20 group">
                                    <video
                                        src={currentVideoSrc}
                                        controls
                                        className="w-full max-h-64 object-contain"
                                    />
                                    <div className="absolute top-3 right-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        {/* Replace button */}
                                        <button
                                            type="button"
                                            onClick={() => fileInputRef.current?.click()}
                                            className="bg-gold/90 hover:bg-gold text-noir text-[10px] uppercase tracking-widest px-3 py-1.5 rounded-full flex items-center gap-1 transition-colors"
                                        >
                                            <UploadCloud size={12} /> Remplacer
                                        </button>
                                        {/* Remove new upload (only if we have a local preview) */}
                                        {videoPreview && (
                                            <button
                                                type="button"
                                                onClick={removeVideo}
                                                className="bg-red-600/80 hover:bg-red-600 text-white text-[10px] px-3 py-1.5 rounded-full flex items-center gap-1 transition-colors"
                                            >
                                                <X size={12} /> Annuler
                                            </button>
                                        )}
                                    </div>
                                    {videoFile && (
                                        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent px-4 py-3">
                                            <p className="text-[10px] text-gold/80 tracking-wider uppercase flex items-center gap-1">
                                                <UploadCloud size={12} /> Nouvelle vidéo sélectionnée — sera uploadée à la sauvegarde
                                            </p>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                /* Drop Zone */
                                <div
                                    className={`border-2 border-dashed rounded-xl p-10 flex flex-col items-center justify-center gap-4 cursor-pointer transition-all ${
                                        dragOver ? 'border-gold bg-gold/5' : 'border-white/10 hover:border-gold/40 hover:bg-white/[0.02]'
                                    }`}
                                    onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                                    onDragLeave={() => setDragOver(false)}
                                    onDrop={handleDrop}
                                    onClick={() => fileInputRef.current?.click()}
                                >
                                    <div className="w-16 h-16 rounded-full bg-gold/10 flex items-center justify-center">
                                        <UploadCloud size={28} className="text-gold/60" />
                                    </div>
                                    <div className="text-center">
                                        <p className="text-ivory/70 text-sm mb-1">
                                            Glissez-déposez votre vidéo ici
                                        </p>
                                        <p className="text-ivory/30 text-[11px]">
                                            ou cliquez pour sélectionner — MP4, MOV, WebM • max 200 Mo
                                        </p>
                                    </div>
                                    <span className="text-[10px] uppercase tracking-luxury text-gold border border-gold/30 px-4 py-2 rounded-full hover:bg-gold/10 transition-colors">
                                        Choisir un fichier
                                    </span>
                                </div>
                            )}

                            {/* Hidden file input */}
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="video/*"
                                className="hidden"
                                onChange={(e) => handleVideoSelect(e.target.files[0])}
                            />
                            <p className="text-[10px] text-ivory/20 italic">
                                Cette vidéo sera affichée en tête de votre profil public pour présenter votre atelier aux clients.
                            </p>
                        </div>

                        {/* Bio */}
                        <div className="space-y-2">
                            <label className="text-[10px] uppercase tracking-widest text-ivory/40 flex items-center gap-2">
                                <FileText size={12} /> À Propos de la Maison
                            </label>
                            <textarea 
                                value={profile.about_text} 
                                onChange={e => setProfile({...profile, about_text: e.target.value})}
                                className="bg-noir border border-white/10 rounded-lg px-4 py-3 text-ivory w-full min-h-[120px] focus:border-gold/50 transition-colors resize-none"
                                placeholder="Décrivez votre vision, votre savoir-faire et l'histoire de votre atelier..."
                            />
                        </div>
                    </div>
                </section>

                <div className="flex justify-end pt-4">
                    <button 
                        type="submit" 
                        disabled={saving}
                        className="btn-luxury-cta min-w-[200px]"
                    >
                        {saving ? (
                            <><Loader2 className="animate-spin" size={18} /> ENREGISTREMENT...</>
                        ) : (
                            <><Save size={18} /> SAUVEGARDER LE PROFIL</>
                        )}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default ProfileSettings;
