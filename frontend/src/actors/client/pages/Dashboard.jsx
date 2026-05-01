import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
    ShoppingBag, 
    Activity, 
    ArrowRight, 
    Star, 
    ShieldCheck, 
    ChevronRight,
    Loader2,
    Truck,
    Clock,
    AlertCircle,
    CreditCard
} from 'lucide-react';
import { useAuth } from '../../../shared/context/AuthContext';

const Dashboard = () => {
    const { user, token } = useAuth();
    const navigate = useNavigate();
    const [stats, setStats] = useState({ costumes: 0, measurements: 0 });
    const [loading, setLoading] = useState(true);
    const [activeDelivery, setActiveDelivery] = useState(null);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const res = await fetch('http://localhost:8000/api/client/projects/', {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                const data = await res.json();
                setStats({
                    costumes: data.projects?.length || 0,
                    measurements: data.projects?.filter(p => p.scan_result)?.length || 0
                });
                
                // Find active delivery with ETA around 15 mins
                const activeDelivery = data.projects?.find(p => 
                    p.delivery_info?.request_id && 
                    !p.delivery_info?.is_paid &&
                    p.delivery_info?.eta_minutes <= 20
                );
                setActiveDelivery(activeDelivery);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        if (token) fetchStats();
    }, [token]);

    return (
        <div className="min-h-screen bg-noir text-ivory pt-28 pb-20">
            <div className="wrapper max-w-[1200px]">
                {/* Hero / Welcome Section */}
                {/* Hero / Welcome Section */}
                {activeDelivery && (
                    <div className="mb-12 animate-bounce">
                        <div className="bg-gradient-to-r from-amber-500/20 to-gold/20 border border-gold/30 p-6 rounded-3xl flex flex-col md:flex-row items-center justify-between gap-6 backdrop-blur-xl">
                            <div className="flex items-center gap-6">
                                <div className="w-16 h-16 rounded-2xl bg-gold/20 flex items-center justify-center text-gold relative">
                                    <Truck size={32} />
                                    <div className="absolute -top-2 -right-2 w-6 h-6 bg-rose-500 rounded-full flex items-center justify-center text-[10px] font-black animate-pulse">
                                        !
                                    </div>
                                </div>
                                <div>
                                    <h3 className="text-xl font-display text-ivory mb-1">Votre livreur arrive !</h3>
                                    <p className="text-[10px] uppercase tracking-widest text-gold font-black flex items-center gap-2">
                                        <Clock size={12} /> Arrivée estimée : {activeDelivery.delivery_info.eta_minutes} minutes
                                    </p>
                                </div>
                            </div>
                            
                            <div className="flex flex-col md:flex-row items-center gap-4">
                                <p className="text-[10px] text-ivory/60 uppercase tracking-widest text-center md:text-right max-w-[200px]">
                                    Veuillez finaliser le paiement pour confirmer la réception.
                                </p>
                                <button 
                                    onClick={() => navigate(`/client/costumes/${activeDelivery.id}`)}
                                    className="px-8 py-3 bg-gold text-noir text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-ivory transition-all flex items-center gap-2"
                                >
                                    <CreditCard size={14} /> Payer Maintenant
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                <header className="mb-20 animate-fade-up">
                    <div className="flex items-center gap-4 mb-6">
                        <div className="h-[1px] w-12 bg-gold/30"></div>
                        <span className="text-[10px] tracking-luxury text-gold uppercase font-bold">Tableau de Bord Personnel</span>
                    </div>
                    <h1 className="font-display text-5xl md:text-7xl font-light italic text-ivory mb-8 leading-tight">
                        Bienvenue, <br />
                        <span className="text-gold capitalize">{user?.name || 'Monsieur'}</span>
                    </h1>
                    <p className="text-ivory/30 text-sm md:text-base max-w-xl leading-relaxed uppercase tracking-[0.2em] font-light">
                        Accédez à vos scans biométriques, vos designs personnalisés et le suivi de vos confections haute couture.
                    </p>
                </header>

                {/* Primary Action Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-gold/10 border border-gold/10 mb-20">
                    
                    {/* Card 1: Posture */}
                    <div 
                        onClick={() => navigate('/client/posture')}
                        className="group bg-noir p-12 transition-all duration-1000 hover:bg-gold/[0.02] cursor-pointer relative overflow-hidden"
                    >
                        <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity duration-1000 group-hover:scale-125 transform origin-top-right">
                            <Activity size={180} strokeWidth={0.5} />
                        </div>
                        
                        <div className="relative z-10">
                            <div className="flex items-center gap-4 mb-16">
                                <div className="w-10 h-10 rounded-full border border-gold/20 flex items-center justify-center group-hover:border-gold/60 transition-colors duration-700">
                                    <Activity size={18} className="text-gold/40 group-hover:text-gold" />
                                </div>
                                <span className="text-[10px] tracking-luxury text-ivory/40 uppercase font-bold">Digital Twin</span>
                            </div>
                            
                            <h2 className="font-display text-3xl text-ivory mb-4 font-light italic group-hover:text-gold transition-colors duration-700">Ma Posture & Biométrie</h2>
                            <p className="text-xs text-ivory/20 uppercase tracking-widest mb-10 max-w-xs leading-loose">
                                Consultez votre silhouette 3D, vos mesures exactes et votre diagnostic morphologique.
                            </p>
                            
                            <div className="flex items-center gap-2 text-gold/60 group-hover:translate-x-2 transition-transform duration-700 capitalize text-[10px] tracking-widest font-bold">
                                Explorer l'espace <ChevronRight size={14} />
                            </div>
                        </div>
                    </div>

                    {/* Card 2: Costumes */}
                    <div 
                        onClick={() => navigate('/client/costumes')}
                        className="group bg-noir p-12 transition-all duration-1000 hover:bg-gold/[0.02] cursor-pointer relative overflow-hidden"
                    >
                        <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity duration-1000 group-hover:scale-125 transform origin-top-right">
                            <ShoppingBag size={180} strokeWidth={0.5} />
                        </div>

                        <div className="relative z-10">
                            <div className="flex items-center gap-4 mb-16">
                                <div className="w-10 h-10 rounded-full border border-gold/20 flex items-center justify-center group-hover:border-gold/60 transition-colors duration-700">
                                    <ShoppingBag size={18} className="text-gold/40 group-hover:text-gold" />
                                </div>
                                <span className="text-[10px] tracking-luxury text-ivory/40 uppercase font-bold">Archives Design</span>
                            </div>
                            
                            <h2 className="font-display text-3xl text-ivory mb-4 font-light italic group-hover:text-gold transition-colors duration-700">Mes Costumes</h2>
                            <p className="text-xs text-ivory/20 uppercase tracking-widest mb-10 max-w-xs leading-loose">
                                Retrouvez vos projets de création, vos choix de tissus et l'historique de vos commandes.
                            </p>
                            
                            <div className="flex items-center gap-2 text-gold/60 group-hover:translate-x-2 transition-transform duration-700 capitalize text-[10px] tracking-widest font-bold">
                                Consulter mes designs <ChevronRight size={14} />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Secondary Status Section */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 animate-fade-in delay-500">
                    <div className="space-y-6">
                        <div className="flex items-center gap-3">
                            <Star size={14} className="text-gold/60" />
                            <h3 className="text-[10px] tracking-luxury uppercase text-ivory/50 font-bold border-b border-gold/10 pb-2 flex-1">Status Fidélité</h3>
                        </div>
                        <div className="bg-gold/[0.03] border border-gold/5 p-6 rounded-lg group hover:border-gold/20 transition-all duration-700">
                            <p className="text-2xl font-serif text-gold mb-1">Membre Privé</p>
                            <p className="text-[9px] text-ivory/30 uppercase tracking-widest">Accès Prioritaire Atelier</p>
                        </div>
                    </div>

                    <div className="space-y-6">
                        <div className="flex items-center gap-3">
                            <ShieldCheck size={14} className="text-gold/60" />
                            <h3 className="text-[10px] tracking-luxury uppercase text-ivory/50 font-bold border-b border-gold/10 pb-2 flex-1">Sécurité Données</h3>
                        </div>
                        <div className="bg-gold/[0.03] border border-gold/5 p-6 rounded-lg">
                            <p className="text-[11px] text-ivory/40 leading-relaxed uppercase tracking-widest">
                                Vos données biométriques sont cryptées et stockées exclusivement pour la confection de vos vêtements.
                            </p>
                        </div>
                    </div>

                    <div className="flex flex-col justify-end">
                        <button 
                            onClick={() => navigate('/client/create-design')}
                            className="btn btn-primary w-full py-6 text-[10px] tracking-luxury uppercase font-black"
                        >
                            Nouvelle Création Masterclass
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
