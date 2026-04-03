import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
    Clock, 
    ChevronRight, 
    ShoppingBag, 
    Palette, 
    ArrowRight,
    User,
    CheckCircle2,
    Loader2,
    Plus
} from 'lucide-react';
import { useAuth } from '../../../shared/context/AuthContext';

const MyCostumes = () => {
    const { token } = useAuth();
    const navigate = useNavigate();
    const [projects, setProjects] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchProjects = async () => {
            try {
                const res = await fetch('http://localhost:8000/api/client/projects/', {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (!res.ok) throw new Error("Erreur lors du chargement");
                const data = await res.json();
                setProjects(data.projects || []);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        if (token) fetchProjects();
    }, [token]);

    return (
        <div className="min-h-screen bg-noir text-ivory pt-32 pb-20">
            <div className="wrapper max-w-[1200px]">
                {/* Header Section */}
                <div className="flex flex-col md:flex-row md:items-end justify-between mb-16 gap-6">
                    <div className="animate-fade-up">
                        <p className="text-label text-gold mb-3 uppercase tracking-[0.3em]">Maison Tissue — Atelier</p>
                        <h1 className="font-display text-4xl md:text-5xl lg:text-6xl font-light text-ivory leading-tight">
                            Mes Costumes & <br /> Designs
                        </h1>
                    </div>
                    <div className="flex items-center gap-4 animate-fade-in delay-200">
                        <div className="text-right hidden sm:block">
                            <p className="text-[10px] tracking-luxury text-ivory/30 uppercase mb-1">Total Commandes</p>
                            <p className="text-xl font-serif text-gold">{projects.length < 10 ? `0${projects.length}` : projects.length}</p>
                        </div>
                        {projects.length > 0 && (
                            <button 
                                onClick={() => navigate('/client/create-design')}
                                className="btn btn-primary px-6 py-3 text-[10px] tracking-luxury uppercase font-bold ml-4 relative z-10"
                            >
                                Nouvelle Création
                            </button>
                        )}
                   </div>
                </div>

                {loading ? (
                    <div className="flex flex-col items-center justify-center py-40 border border-gold/5 bg-gold/[0.01]">
                        <Loader2 className="w-8 h-8 text-gold animate-spin mb-4" />
                        <p className="text-label text-ivory/30 uppercase tracking-widest">Consultation des archives…</p>
                    </div>
                ) : projects.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-32 border border-gold/5 bg-noir relative overflow-hidden group">
                        <div className="absolute inset-0 bg-gold/[0.02] opacity-0 group-hover:opacity-100 transition-opacity duration-1000 pointer-events-none"></div>
                        <ShoppingBag size={48} strokeWidth={1} className="text-gold/20 mb-8" />
                        <h3 className="font-display text-2xl text-ivory/70 mb-4 font-light italic">Aucun design pour l'instant</h3>
                        <p className="text-sm text-ivory/30 mb-10 tracking-widest uppercase text-center max-w-sm">
                            Commencez votre expérience de création assistée par IA pour voir vos costumes apparaître ici.
                        </p>
                        <button 
                            onClick={() => navigate('/client/create-design')}
                            className="btn btn-primary px-10 py-4 text-[10px] tracking-luxury uppercase font-bold relative z-10"
                        >
                            Démarrer une Création
                        </button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {/* Persistent Create Card */}
                        <div 
                            onClick={() => navigate('/client/create-design')}
                            className="group relative bg-transparent border border-dashed border-gold/20 p-8 flex flex-col items-center justify-center transition-all duration-700 hover:border-gold/60 hover:bg-gold/[0.02] cursor-pointer min-h-[300px] animate-fade-up"
                        >
                            <div className="w-12 h-12 rounded-full border border-gold/20 flex items-center justify-center mb-6 text-gold/40 group-hover:text-gold group-hover:scale-110 transition-all duration-700">
                                <Plus size={24} strokeWidth={1} />
                            </div>
                            <h3 className="font-display text-xl text-ivory/70 font-light italic mb-2 tracking-wide group-hover:text-gold transition-colors duration-700">
                                Nouveau Design
                            </h3>
                            <p className="text-[10px] uppercase tracking-widest text-ivory/30 text-center max-w-[200px]">
                                Configurer une nouvelle pièce sur mesure avec l'IA
                            </p>
                        </div>
                        
                        {/* Existing Projects */}
                        {projects.map((project, idx) => (
                            <ProjectCard 
                                key={project.id} 
                                project={project} 
                                index={idx + 1} 
                                onClick={() => navigate(`/client/costumes/${project.id}`)} 
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

const ProjectCard = ({ project, index, onClick }) => {
    const date = new Date(project.created_at).toLocaleDateString('fr-FR', {
        day: '2-digit', month: 'long', year: 'numeric'
    });

    return (
        <div 
            onClick={onClick}
            className="group relative bg-[#0a0a09] border border-gold/5 p-8 transition-all duration-700 hover:border-gold/20 cursor-pointer animate-fade-up"
            style={{ animationDelay: `${index * 150}ms` }}
        >
            {/* Visual Header */}
            <div className="flex items-start justify-between mb-10">
                <div className="w-12 h-12 rounded-full border border-gold/10 flex items-center justify-center bg-gold/[0.02] group-hover:bg-gold/5 transition-colors duration-700">
                    <Palette size={20} strokeWidth={1} className="text-gold/40 group-hover:text-gold transition-colors duration-700" />
                </div>
                <div className="flex flex-col items-end">
                    <span className="text-[9px] tracking-luxury text-gold font-bold uppercase mb-1">MT-CONF-{project.id.slice(-4).toUpperCase()}</span>
                    <span className="text-[10px] text-ivory/30">{date}</span>
                </div>
            </div>

            {/* Title & Status */}
            <div className="mb-8">
                <h3 className="font-display text-xl text-ivory font-light italic mb-2 tracking-wide group-hover:text-gold transition-colors duration-700">
                    {project.summary.designs_count > 1 ? 'Collection Personnalisée' : 'Costume Sur Mesure'}
                </h3>
                <div className="flex items-center gap-2">
                    <CheckCircle2 size={12} className="text-emerald-400 opacity-60" />
                    <span className="text-[10px] uppercase tracking-widest text-ivory/40 font-medium">Envoyé à l'Atelier</span>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-4 py-6 border-y border-gold/5 mb-8">
                <div>
                    <span className="text-[9px] uppercase tracking-luxury text-ivory/20 block mb-1">Designs</span>
                    <span className="text-lg font-serif text-ivory/80">{project.summary.designs_count} pièce{project.summary.designs_count > 1 ? 's' : ''}</span>
                </div>
                <div>
                    <span className="text-[9px] uppercase tracking-luxury text-ivory/20 block mb-1">Tissus</span>
                    <span className="text-lg font-serif text-ivory/80">{project.summary.fabrics_count} choix</span>
                </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between group-hover:translate-x-2 transition-transform duration-700 mt-2">
                <span className="text-[10px] tracking-[0.2em] uppercase font-bold text-gold/60">Détails de la commande</span>
                <ArrowRight size={14} className="text-gold/40" />
            </div>

            {/* Luxury Hover Effect */}
            <div className="absolute inset-x-0 bottom-0 h-0.5 bg-gradient-to-r from-transparent via-gold/30 to-transparent scale-x-0 group-hover:scale-x-100 transition-transform duration-1000 origin-center"></div>
        </div>
    );
};

export default MyCostumes;
