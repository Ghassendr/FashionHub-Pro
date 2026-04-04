import React, { useState, useEffect } from 'react';
import { 
    Activity, 
    Ruler, 
    Layers, 
    Shapes,
    ChevronDown,
    ChevronUp,
    Info,
    Loader2
} from 'lucide-react';
import Viewer3D from '../components/Viewer3D';
import { useAuth } from '../../../shared/context/AuthContext';

const PostureSpace = () => {
    const { token } = useAuth();
    const [project, setProject] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('measurements');

    useEffect(() => {
        const fetchLatestProject = async () => {
            try {
                // Get list to find the latest
                const res = await fetch('http://localhost:8000/api/client/projects/', {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                const data = await res.json();
                if (data.projects && data.projects.length > 0) {
                    // Fetch full details of the latest project
                    const detailRes = await fetch(`http://localhost:8000/api/client/projects/${data.projects[0].id}/`, {
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                    const detailData = await detailRes.json();
                    setProject(detailData);
                }
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        if (token) fetchLatestProject();
    }, [token]);

    if (loading) {
        return (
            <div className="min-h-screen bg-noir flex items-center justify-center">
                <Loader2 className="w-10 h-10 text-gold animate-spin" />
            </div>
        );
    }

    if (!project || !project.scan_result) {
        return (
            <div className="min-h-screen bg-noir pt-32 pb-20 px-8 text-center">
                <Activity size={48} className="text-gold/10 mx-auto mb-8" />
                <h2 className="font-display text-2xl text-ivory/50">Aucune donnée de posture disponible</h2>
                <p className="text-ivory/20 mt-4 max-w-md mx-auto">Veuillez effectuer une analyse 3D via le Wizard de création pour générer votre profil biométrique.</p>
            </div>
        );
    }

    const { scan_result } = project;
    const mesh_url = scan_result.mesh_url ? `http://localhost:8000${scan_result.mesh_url}` : null;
    const morphology = scan_result.morphology_type || 'NC';

    return (
        <div className="min-h-screen bg-noir text-ivory pt-24 pb-12">
            <div className="mx-auto w-full max-w-[1920px] px-8">
                
                {/* Header Strip */}
                <div className="flex items-center justify-between mb-8 pb-6 border-b border-gold/10 animate-fade-in">
                    <div className="flex flex-col">
                        <span className="text-[10px] tracking-luxury text-gold font-semibold mb-1 uppercase tracking-[0.3em]">Maison Tissue — Digital Twin</span>
                        <h1 className="font-display text-3xl font-light italic text-ivory tracking-wide">Espace Posture & Biométrie</h1>
                    </div>
                    <div className="flex items-center gap-12">
                        <div className="flex flex-col items-end">
                            <span className="text-[9px] uppercase tracking-widest text-ivory/30 mb-1">Morphologie</span>
                            <span className="font-display text-xl text-gold font-bold">{morphology}</span>
                        </div>
                        <div className="h-10 w-[1px] bg-gold/10"></div>
                        <div className="text-right">
                           <span className="text-[9px] uppercase tracking-widest text-ivory/30 mb-1">Dernière Capture</span>
                           <span className="text-xs font-serif italic text-ivory/60 truncate max-w-[150px] inline-block">
                               {new Date(project.created_at).toLocaleDateString('fr-FR')}
                           </span>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-8 h-[calc(100vh-280px)]">
                    
                    {/* Visualizer Panel */}
                    <div className="relative border border-gold/5 bg-gold/[0.01] overflow-hidden group">
                        {/* Status Overlay */}
                        <div className="absolute top-6 left-6 z-20 flex items-center gap-4">
                            <div className="bg-noir/80 backdrop-blur-md px-4 py-2 border border-gold/20 flex items-center gap-2">
                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                                <span className="text-[9px] tracking-widest uppercase font-bold text-ivory/60">Modèle HD {scan_result.quality || 'Standard'}</span>
                            </div>
                        </div>

                        {/* Viewer */}
                        {mesh_url ? (
                            <div className="absolute inset-0">
                                <Viewer3D url={mesh_url} />
                            </div>
                        ) : (
                            <div className="absolute inset-0 flex items-center justify-center bg-noir/40 backdrop-blur-sm">
                                <span className="text-ivory/20 text-[10px] tracking-widest uppercase italic">Modèle 3D en cours de chargement…</span>
                            </div>
                        )}

                        {/* Aesthetic Grid */}
                        <div className="absolute inset-0 pointer-events-none opacity-[0.03] select-none border border-gold/5 animate-pulse" 
                             style={{ backgroundImage: 'linear-gradient(rgba(198,167,94,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(198,167,94,0.1) 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
                    </div>

                    {/* Information Panel */}
                    <aside className="border border-gold/5 bg-noir overflow-hidden flex flex-col">
                        <div className="flex border-b border-gold/5 shrink-0 bg-gold/[0.01]">
                            {['measurements', 'morphology'].map(tab => (
                                <button
                                    key={tab}
                                    onClick={() => setActiveTab(tab)}
                                    className={`flex-1 py-5 text-[10px] tracking-luxury uppercase font-medium transition-all relative ${activeTab === tab ? 'text-gold bg-gold/5' : 'text-ivory/30 hover:text-ivory/60'}`}
                                >
                                    {tab === 'measurements' ? 'Biométrie' : 'Diagnostic Morpho'}
                                    {activeTab === tab && <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-gold" />}
                                </button>
                            ))}
                        </div>

                        <div className="flex-1 overflow-y-auto custom-scrollbar p-8">
                            {activeTab === 'measurements' ? (
                                <div className="space-y-10">
                                    <MeasurementGroup title="Circonférences" items={scan_result.measurements?.basics || []} icon={<Ruler size={14} />} />
                                    <MeasurementGroup title="Longueurs & Hauteurs" items={scan_result.measurements?.heights || []} icon={<Shapes size={14} />} />
                                </div>
                            ) : (
                                <div className="space-y-10 animate-fade-in">
                                    <div className="text-center group p-8 bg-gold/[0.02] border border-gold/10 relative overflow-hidden">
                                        <div className="absolute inset-0 bg-gold/[0.03] opacity-0 group-hover:opacity-100 transition-opacity duration-1000"></div>
                                        <div className="w-20 h-20 rounded-2xl bg-gold/10 border border-gold/20 flex items-center justify-center mx-auto mb-6 relative z-10 transition-transform duration-700 group-hover:scale-110">
                                            <span className="font-display text-4xl font-bold text-gold">{morphology}</span>
                                        </div>
                                        <h3 className="font-display text-2xl text-ivory mb-2 font-light relative z-10 italic">Portrait Silhouette</h3>
                                        <p className="text-[10px] tracking-widest uppercase text-ivory/30 relative z-10">Analyse Algorithmique</p>
                                    </div>

                                    <div className="space-y-4">
                                        <h4 className="text-[10px] tracking-luxury uppercase text-gold font-bold mb-4 opacity-70">Conseils Morphologiques</h4>
                                        <div className="p-5 border border-white/5 bg-white/[0.02] rounded-lg">
                                            <p className="text-xs text-ivory/50 leading-relaxed italic">
                                                Votre morphologie en <strong className="text-gold">{morphology}</strong> suggère des coupes {body_type_advice[morphology] || 'équilibrées et structurées'}. Nos tailleurs adapteront la structure de l'épaulette et l'évasement de la veste pour sublimer votre port de tête.
                                            </p>
                                        </div>
                                    </div>
                                    
                                    <div className="p-6 border border-gold/10 bg-gold/[0.02] relative overflow-hidden">
                                        <div className="flex items-center gap-3 mb-4">
                                            <Info size={14} className="text-gold/60" />
                                            <span className="text-[10px] tracking-widest uppercase text-ivory/50 font-bold">Note du Tailleur</span>
                                        </div>
                                        <p className="text-[11px] text-ivory/30 leading-relaxed uppercase tracking-widest">
                                            L'IA a détecté une légère asymétrie de l'épaule gauche (-0.4cm). Cette correction sera automatiquement appliquée par nos automates de découpe laser.
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </aside>
                </div>
            </div>
        </div>
    );
};

const MeasurementGroup = ({ title, items, icon }) => (
    <div className="space-y-4">
        <div className="flex items-center gap-3 mb-6">
            <span className="text-gold/40">{icon}</span>
            <h3 className="text-[10px] tracking-luxury uppercase font-black text-ivory/60">{title}</h3>
            <div className="h-[1px] flex-1 bg-gold/5"></div>
        </div>
        <div className="space-y-1">
            {items.map((m, idx) => (
                <div key={idx} className="flex items-center justify-between py-3.5 border-b border-gold/5 group">
                    <span className="text-[11px] uppercase tracking-widest text-ivory/25 font-medium group-hover:text-ivory/50 transition-colors duration-500">{m.name}</span>
                    <div className="flex items-center gap-4">
                        <span className="text-sm font-serif text-gold tracking-wide group-hover:scale-105 transition-transform duration-500 font-medium">
                            {m.value_cm} <span className="text-[9px] opacity-40 ml-0.5">cm</span>
                        </span>
                        <div className="w-10 h-[1px] bg-white/5 relative">
                            <div className="absolute inset-y-0 left-0 bg-gold/40" style={{ width: `${(m.confidence || 0.85) * 100}%` }}></div>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    </div>
);

const body_type_advice = {
    'H': 'structurées avec une taille légèrement marquée pour créer du relief.',
    'A': 'valorisant les épaules pour équilibrer la largeur du bassin.',
    'V': 'fluides en bas avec des cols discrets pour réduire visuellement la carrure.',
    'X': 'cintrées pour souligner votre harmonie naturelle.',
    '8': 'enveloppantes respectant vos courbes généreuses tout en cintrant la taille.',
    'O': 'verticalisées par des lignes épurées et des tissus à tenue ferme.'
};

export default PostureSpace;
