import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
    ChevronLeft, Palette, Layers, Loader2, Sparkles, User, Box
} from 'lucide-react';
import { useAuth } from '../../../shared/context/AuthContext';
import Viewer3D from '../components/Viewer3D';

const CostumeDetails = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { token } = useAuth();
    const [project, setProject] = useState(null);
    const [loading, setLoading] = useState(true);

    // Additional data fetched from endpoints if needed, but project object contains selected IDs
    const [designs, setDesigns] = useState([]);
    const [fabrics, setFabrics] = useState([]);

    useEffect(() => {
        const fetchDetails = async () => {
            try {
                // Fetch the project
                const res = await fetch(`http://localhost:8000/api/client/projects/${id}/`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                
                if (!res.ok) throw new Error("Failed to load");
                const data = await res.json();
                setProject(data);

                // For a real production app, you might fetch actual Design/Fabric details using data.selected_designs.
                // Since this is a detail view, we'll fetch them from the public endpoint or use placeholder info.
                
                // Fetch all public designs and filter
                const designsRes = await fetch('http://localhost:8000/api/couturehouse/public/designs/');
                if (designsRes.ok) {
                    const allDesigns = await designsRes.json();
                    setDesigns(allDesigns.filter(d => data.selected_designs.includes(d.id)));
                }

                // Fetch public fabrics and filter
                const fabricsRes = await fetch('http://localhost:8000/api/public/fabrics/trending');
                if (fabricsRes.ok) {
                    const fabricsData = await fabricsRes.json();
                    setFabrics(fabricsData.fabrics ? fabricsData.fabrics.filter(f => data.selected_fabrics.includes(f.id)) : []);
                }
                
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

        if (token) fetchDetails();
    }, [id, token]);

    if (loading) {
        return (
            <div className="min-h-screen bg-noir flex items-center justify-center pt-32">
                <Loader2 className="w-10 h-10 text-gold animate-spin" />
            </div>
        );
    }

    if (!project) {
        return (
            <div className="min-h-screen bg-noir pt-32 text-center">
                <h1 className="text-3xl font-display text-ivory/50">Projet introuvable</h1>
                <button onClick={() => navigate('/client/costumes')} className="mt-8 text-gold uppercase tracking-widest text-xs">Retour</button>
            </div>
        );
    }

    const { scan_result, skin_result } = project;
    const mesh_url = scan_result?.mesh_url 
        ? (scan_result.mesh_url.startsWith('http') ? scan_result.mesh_url : `http://localhost:8000${scan_result.mesh_url}`) 
        : null;
    const date = new Date(project.created_at).toLocaleDateString('fr-FR', {
        day: '2-digit', month: 'long', year: 'numeric'
    });

    return (
        <div className="min-h-screen bg-noir text-ivory pt-32 pb-20">
            <div className="max-w-[1200px] mx-auto px-8">
                {/* Header */}
                <div className="mb-12">
                    <button onClick={() => navigate('/client/costumes')} className="flex items-center gap-2 text-[10px] tracking-widest uppercase text-ivory/40 hover:text-gold transition-colors mb-8">
                        <ChevronLeft size={14} /> Retour à mes commandes
                    </button>
                    
                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-gold/10">
                        <div>
                            <p className="text-label text-gold mb-2 uppercase tracking-[0.3em]">Commande MT-CONF-{project.id.slice(-4).toUpperCase()}</p>
                            <h1 className="font-display text-4xl md:text-5xl font-light text-ivory">
                                Détails du Projet
                            </h1>
                        </div>
                        <div className="text-right">
                            <span className="text-[10px] uppercase tracking-widest text-ivory/30 block mb-1">Date de création</span>
                            <span className="font-serif italic text-ivory/80">{date}</span>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                    {/* Left Column: Data summary */}
                    <div className="space-y-10">
                        
                        {/* 1. Body Analysis */}
                        <section className="bg-[#0a0a09] border border-gold/5 p-8 relative overflow-hidden group hover:border-gold/20 transition-colors">
                            <div className="flex items-center gap-3 mb-6">
                                <User className="text-gold/50" size={18} />
                                <h3 className="text-xs tracking-[0.2em] uppercase font-bold text-ivory/80">Profil Biométrique</h3>
                            </div>
                            {scan_result && Object.keys(scan_result).length > 0 ? (
                                <div className="space-y-4">
                                    <div className="flex justify-between py-2 border-b border-white/5">
                                        <span className="text-xs text-ivory/40 uppercase tracking-widest">Morphologie</span>
                                        <span className="text-sm font-bold text-gold">{scan_result.morphology_type || scan_result.morphology?.silhouette?.shape_letter || 'NC'}</span>
                                    </div>
                                    <div className="flex justify-between py-2 border-b border-white/5">
                                        <span className="text-xs text-ivory/40 uppercase tracking-widest">Modèle 3D</span>
                                        <span className="text-sm text-emerald-400">Généré avec succès</span>
                                    </div>
                                </div>
                            ) : (
                                <p className="text-xs text-ivory/30 italic">Aucune donnée 3D associée.</p>
                            )}
                        </section>

                        {/* 2. Skin Analysis */}
                        <section className="bg-[#0a0a09] border border-gold/5 p-8 relative overflow-hidden group hover:border-gold/20 transition-colors">
                            <div className="flex items-center gap-3 mb-6">
                                <Sparkles className="text-gold/50" size={18} />
                                <h3 className="text-xs tracking-[0.2em] uppercase font-bold text-ivory/80">Profil Colorimétrique</h3>
                            </div>
                            {skin_result && skin_result.name ? (
                                <div className="flex items-center gap-6">
                                    <div className="w-16 h-16 rounded-full border border-gold/20" style={{ backgroundColor: `rgb(${skin_result.detected_rgb?.join(',')})` }} />
                                    <div>
                                        <p className="font-display text-xl text-ivory mb-1">{skin_result.name}</p>
                                        <p className="text-[10px] uppercase tracking-widest text-gold">{skin_result.undertone} Undertone</p>
                                    </div>
                                </div>
                            ) : (
                                <p className="text-xs text-ivory/30 italic">Aucune analyse de teinte associée.</p>
                            )}
                        </section>

                    </div>

                    {/* Right Column: Designs & Fabrics selection */}
                    <div className="space-y-10">
                        {/* Designs */}
                        <section className="bg-[#0a0a09] border border-gold/5 p-8">
                            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gold/10">
                                <Palette className="text-gold/50" size={18} />
                                <h3 className="text-xs tracking-[0.2em] uppercase font-bold text-ivory/80">Designs Choisis ({project.selected_designs?.length || 0})</h3>
                            </div>
                            <div className="space-y-4">
                                {designs.length > 0 ? (
                                    designs.map(d => (
                                        <div key={d.id} className="flex gap-4 p-4 border border-white/5 bg-white/[0.02]">
                                            <div className="w-16 h-16 bg-white/5 overflow-hidden flex items-center justify-center shrink-0">
                                                {d.media?.length > 0 ? (
                                                    <img src={`http://localhost:8000/api/couturehouse/designs/${d.id}/media/${(d.media.find(m=>m.is_cover)||d.media[0]).file.split(/[/\\]/).pop()}`} alt="" className="w-full h-full object-cover" />
                                                ) : <Palette size={16} className="text-white/20" />}
                                            </div>
                                            <div>
                                                <p className="text-sm font-medium text-ivory">{d.title}</p>
                                                <p className="text-[10px] text-ivory/40 uppercase tracking-widest mt-1">{d.category}</p>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <p className="text-xs text-ivory/30">Détails des designs non disponibles.</p>
                                )}
                            </div>
                        </section>

                        {/* Fabrics */}
                        <section className="bg-[#0a0a09] border border-gold/5 p-8">
                            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gold/10">
                                <Layers className="text-gold/50" size={18} />
                                <h3 className="text-xs tracking-[0.2em] uppercase font-bold text-ivory/80">Tissus Choisis ({project.selected_fabrics?.length || 0})</h3>
                            </div>
                            <div className="space-y-4">
                                {fabrics.length > 0 ? (
                                    fabrics.map(f => (
                                        <div key={f.id} className="flex gap-4 p-4 border border-white/5 bg-white/[0.02]">
                                            <div className="w-16 h-16 bg-white/5 overflow-hidden shrink-0">
                                                <img src={`http://localhost:8000${f.image_url || f.image || ''}`} alt="" className="w-full h-full object-cover" onError={e => e.target.style.display='none'} />
                                            </div>
                                            <div>
                                                <p className="text-sm font-medium text-ivory">{f.materiel || f.name}</p>
                                                <p className="text-xs text-gold/60 mt-1">{f.prix ? `${parseFloat(f.prix).toFixed(2)} DT/m` : ''}</p>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <p className="text-xs text-ivory/30">Détails des tissus non disponibles.</p>
                                )}
                            </div>
                        </section>
                    </div>
                </div>

                {/* Optional Viewer */}
                {mesh_url && (
                    <div className="mt-12 h-[500px] border border-gold/10 relative overflow-hidden bg-[#050505]">
                        <div className="absolute top-6 left-6 z-10">
                            <span className="bg-noir/90 backdrop-blur-sm border border-gold/20 px-4 py-2 text-[10px] uppercase font-bold tracking-widest text-gold flex items-center gap-2">
                                <Box size={12} /> Rendu du Jumeau Numérique
                            </span>
                        </div>
                        <Viewer3D url={mesh_url} />
                    </div>
                )}
            </div>
        </div>
    );
};

export default CostumeDetails;
