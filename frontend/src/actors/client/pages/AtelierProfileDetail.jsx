import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
    ArrowLeft, Loader2, Star, MapPin, 
    CreditCard, Calendar, ShieldCheck, Mail, Phone,
    Palette, Ruler, Sparkles, MessageSquare, ChevronRight
} from 'lucide-react';
import { useAuth } from '../../../shared/context/AuthContext';

const AtelierProfileDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { token } = useAuth();
    const [atelier, setAtelier] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchAtelier = async () => {
            try {
                setLoading(true);
                const response = await fetch(`http://localhost:8000/api/client/ateliers/${id}/`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                const data = await response.json();
                setAtelier(data);
            } catch (err) {
                console.error("Failed to fetch atelier", err);
            } finally {
                setLoading(false);
            }
        };
        if (token) fetchAtelier();
    }, [id, token]);

    if (loading) {
        return (
            <div className="min-h-screen bg-[#0d0d0b] flex items-center justify-center">
                <Loader2 className="text-gold animate-spin" size={32} />
            </div>
        );
    }

    if (!atelier) return null;

    return (
        <div className="min-h-screen bg-[#0d0d0b] text-[#f5f0e8] pb-24 selection:bg-gold/30">
            {/* Header / Hero Cover */}
            <div className="relative h-[25vh] md:h-[35vh] overflow-hidden">
                <div className="absolute inset-0 bg-gold/5 backdrop-blur-[100px]" />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0d0d0b] via-noir/40 to-transparent" />
                
                <div className="max-w-[1200px] mx-auto px-6 h-full flex items-end pb-12 relative z-10">
                   <button 
                        onClick={() => navigate('/client/discovery')}
                        className="absolute top-12 left-6 flex items-center gap-2 text-[10px] uppercase tracking-luxury text-gold/40 hover:text-gold transition-colors group"
                    >
                        <ArrowLeft size={14} className="group-hover:-translate-x-1 transition-transform" />
                        Retour à l'exploration
                    </button>
                    
                    <div className="animate-fade-up">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 rounded-sm bg-gold/10 border border-gold/20 flex items-center justify-center">
                                <Sparkles size={20} className="text-gold" />
                            </div>
                            <span className="text-[10px] uppercase tracking-[0.3em] text-gold/60 font-bold">
                                Atelier Vérifié par FashionHub
                            </span>
                        </div>
                        <h1 className="font-display text-5xl md:text-7xl font-light italic leading-tight">
                            {atelier.house_name}
                        </h1>
                    </div>
                </div>
            </div>

            {/* Introduction Video */}
            {atelier.introduction_video_url && (
                <div className="max-w-[1200px] mx-auto px-6 -mt-32 relative z-20">
                    <div className="aspect-video w-full bg-noir border border-white/5 rounded-2xl overflow-hidden shadow-2xl group transition-all hover:border-gold/20">
                        {atelier.introduction_video_url.includes('youtube.com') || atelier.introduction_video_url.includes('youtu.be') ? (
                            <iframe 
                                className="w-full h-full"
                                src={atelier.introduction_video_url.replace('watch?v=', 'embed/').split('&')[0]} 
                                title="Atelier Introduction"
                                frameBorder="0" 
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                                allowFullScreen
                            />
                        ) : (
                            <video 
                                className="w-full h-full"
                                src={atelier.introduction_video_url} 
                                controls
                                preload="metadata"
                                crossOrigin="anonymous"
                                style={{ background: '#000' }}
                                onError={(e) => console.error('Video load error:', e.target.error)}
                            >
                                <source src={atelier.introduction_video_url} />
                                Votre navigateur ne supporte pas la lecture vidéo.
                            </video>
                        )}
                    </div>
                </div>
            )}


            <div className={`max-w-[1200px] mx-auto px-6 ${atelier.introduction_video_url ? 'pt-16' : 'pt-16'}`}>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-16">
                    
                    {/* Left Column: Details & Philosophy */}
                    <div className="lg:col-span-2 space-y-16 animate-fade-in">
                        <section>
                            <h2 className="text-[10px] uppercase tracking-luxury text-gold/40 mb-8 border-b border-gold/5 pb-4">
                                À propos de la Maison
                            </h2>
                            <div className="space-y-6">
                                <p className="text-xl text-ivory/80 leading-relaxed font-light font-display italic">
                                    Spécialiste renommé en <span className="text-gold">{atelier.specialization}</span>.
                                </p>
                                {atelier.about_text ? (
                                    <p className="text-lg text-ivory/60 leading-relaxed font-light whitespace-pre-line">
                                        {atelier.about_text}
                                    </p>
                                ) : (
                                    <p className="text-lg text-ivory/60 leading-relaxed font-light">
                                        La Maison {atelier.house_name} incarne l'élégance et la précision artisanale. 
                                        Chaque pièce est conçue pour sublimer la silhouette de nos clients à travers un processus de création unique et personnalisé.
                                    </p>
                                )}
                            </div>
                        </section>

                        <section className="grid grid-cols-1 md:grid-cols-2 gap-12">
                            <div className="p-8 border border-gold/5 bg-gold/[0.01] rounded-sm group hover:border-gold/20 transition-colors">
                                <Palette size={24} className="text-gold/40 mb-6 group-hover:text-gold transition-colors" />
                                <h4 className="text-[10px] uppercase tracking-widest font-black text-ivory/40 mb-3">Esthétique Signature</h4>
                                <p className="text-sm text-ivory/60 leading-relaxed uppercase tracking-tighter">
                                    Un mélange subtil de classicisme et d'innovation textile, privilégiant les matières nobles et les coupes ajustées.
                                </p>
                            </div>
                            <div className="p-8 border border-gold/5 bg-gold/[0.01] rounded-sm group hover:border-gold/20 transition-colors">
                                <Ruler size={24} className="text-gold/40 mb-6 group-hover:text-gold transition-colors" />
                                <h4 className="text-[10px] uppercase tracking-widest font-black text-ivory/40 mb-3">Savoir-Faire Biométrique</h4>
                                <p className="text-sm text-ivory/60 leading-relaxed uppercase tracking-tighter">
                                    Utilisation de notre moteur ML pour une précision millimétrée, garantissant un tombé parfait dès le premier essayage virtuel.
                                </p>
                            </div>
                        </section>

                        <section>
                            <h2 className="text-[10px] uppercase tracking-luxury text-gold/40 mb-12 border-b border-gold/5 pb-4">
                                Portfolio & Créations
                            </h2>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="aspect-[3/4] bg-gold/5 border border-gold/10" />
                                <div className="aspect-[3/4] bg-gold/5 border border-gold/10" />
                            </div>
                        </section>
                    </div>

                    {/* Right Column: Reservation & Quick Stats */}
                    <div className="space-y-8 animate-fade-in-right">
                        <div className="p-10 bg-gold/[0.02] border border-gold/10 relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-gold/5 blur-[50px]" />
                            
                            <h3 className="text-[10px] uppercase tracking-[0.2em] font-bold text-gold/60 mb-10">Conditions & Tarifs</h3>
                            
                            <div className="space-y-8">
                                <div className="flex justify-between items-center text-xs">
                                    <span className="text-ivory/20 uppercase tracking-widest font-bold">Investissement</span>
                                    <span className="text-gold font-display text-xl italic">dès {atelier.starting_price} €</span>
                                </div>
                                <div className="flex justify-between items-center text-xs">
                                    <span className="text-ivory/20 uppercase tracking-widest font-bold">Délais de production</span>
                                    <span className="text-ivory/60 text-[10px] uppercase font-black">{atelier.avg_production_time || "4 - 6 semaines"}</span>
                                </div>
                                <div className="flex justify-between items-center text-xs">
                                    <span className="text-ivory/20 uppercase tracking-widest font-bold">Localisation</span>
                                    <span className="text-ivory/60 text-[10px] uppercase font-black">Paris · 1er Arr.</span>
                                </div>
                            </div>

                            <button
                                onClick={() => navigate('/client/create-design', { state: { atelierId: atelier.id } })}
                                className="w-full mt-12 py-5 bg-gold text-noir text-[10px] uppercase tracking-[0.3em] font-black hover:bg-ivory transition-all duration-700 flex items-center justify-center gap-2 group"
                            >
                                <Sparkles size={14} className="group-hover:rotate-12 transition-transform" />
                                Commander une Création
                            </button>
                            
                            <p className="mt-6 text-[9px] text-ivory/20 text-center uppercase tracking-widest">
                                Paiement Sécurisé via FashionHub Protocol
                            </p>
                        </div>

                        <div className="p-8 border border-gold/5 bg-noir rounded-sm">
                            <h4 className="text-[9px] uppercase tracking-widest font-black text-ivory/20 mb-6 flex items-center gap-2">
                                <ShieldCheck size={14} className="text-gold/40" /> Engagement Excellence
                            </h4>
                            <p className="text-[10px] text-ivory/30 leading-relaxed uppercase tracking-tighter">
                                Cette maison respecte le code de déontologie de la plateforme. Votre satisfaction et la qualité des finitions sont garanties contractuellement.
                            </p>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
};

export default AtelierProfileDetail;
