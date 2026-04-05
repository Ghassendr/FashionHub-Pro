import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
    ArrowLeft, 
    Clock, 
    Truck, 
    Palette, 
    ShieldCheck, 
    ChevronRight,
    CreditCard,
    CheckCircle2,
    Loader2,
    AlertCircle,
    MapPin
} from 'lucide-react';
import { useAuth } from '../../../shared/context/AuthContext';
import ClientTrackingBar from '../../../shared/components/Logistics/ClientTrackingBar';

const ProjectDetail = () => {
    const { id } = useParams();
    const { token } = useAuth();
    const navigate = useNavigate();
    const [project, setProject] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isPaying, setIsPaying] = useState(false);
    const [paymentSuccess, setPaymentSuccess] = useState(false);

    useEffect(() => {
        const fetchDetails = async () => {
            try {
                const res = await fetch(`http://localhost:8000/api/client/projects/${id}/`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (!res.ok) throw new Error("Projet introuvable");
                const data = await res.json();
                setProject(data);
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
            <div className="min-h-screen bg-noir flex items-center justify-center">
                <Loader2 className="text-gold animate-spin" size={32} />
            </div>
        );
    }

    if (!project) return null;

    // Determine the unified tracking status 
    // Client sees only Couture House Production Statuses
    const getTrackingStatus = () => {
        if (project.status === 'completed') return 'completed'; // Final milestone
        
        const mainOrder = project.tracking?.[0];
        if (!mainOrder) return 'pending';

        return mainOrder.status; // pending, in_production, shipped, completed
    };

    const currentStatus = getTrackingStatus();

    const handlePayment = async () => {
        setIsPaying(true);
        try {
            const res = await fetch(`http://localhost:8000/api/client/projects/${id}/pay/`, {
                method: 'POST',
                headers: { 
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            if (res.ok) {
                setPaymentSuccess(true);
                // Refresh project details to update tracking bar
                const refreshRes = await fetch(`http://localhost:8000/api/client/projects/${id}/`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (refreshRes.ok) {
                    const newData = await refreshRes.json();
                    setProject(newData);
                }
            }
        } catch (err) {
            console.error("Payment error:", err);
        } finally {
            setIsPaying(false);
        }
    };

    return (
        <div className="min-h-screen bg-noir text-ivory pb-20">
            <div className="wrapper max-w-[1000px]">
                {/* Back Button */}
                <button 
                    onClick={() => navigate('/client/costumes')}
                    className="flex items-center gap-2 text-zinc-500 hover:text-gold transition-colors mb-8 group"
                >
                    <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
                    <span className="text-[10px] uppercase tracking-widest font-bold">Retour à mes costumes</span>
                </button>

                {/* Header Card */}
                <div className="relative mb-12 p-8 md:p-12 border border-gold/10 bg-gold/[0.02] rounded-3xl overflow-hidden group">
                    <div className="absolute top-0 right-0 p-12 opacity-[0.03] group-hover:opacity-[0.05] transition-opacity duration-1000">
                        <ShieldCheck size={200} weight="thin" />
                    </div>

                    <div className="relative z-10">
                        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                            <div>
                                <p className="text-[10px] tracking-luxury text-gold uppercase font-bold mb-4">Commande Confirmée · Ref: MT-{id.slice(-6).toUpperCase()}</p>
                                <h1 className="font-display text-4xl md:text-5xl font-light italic mb-4">
                                    Costume Haute Couture
                                </h1>
                                <div className="flex items-center gap-4 text-ivory/40 text-xs">
                                    <span className="flex items-center gap-1.5"><Clock size={14} /> Distinctions Atelier</span>
                                    <span className="w-1 h-1 rounded-full bg-gold/30"></span>
                                    <span>{new Date(project.created_at).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}</span>
                                </div>
                            </div>

                            {currentStatus === 'completed' && !paymentSuccess && (
                                <button 
                                    onClick={handlePayment}
                                    disabled={isPaying}
                                    className="px-10 py-5 bg-gold text-noir font-bold rounded-2xl flex items-center gap-3 hover:bg-ivory hover:scale-105 transition-all duration-500 shadow-glow-gold/20"
                                >
                                    {isPaying ? <Loader2 className="animate-spin" size={20} /> : (
                                        <>
                                            <CreditCard size={20} />
                                            <span>RÉGLER LE SOLDE</span>
                                        </>
                                    )}
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                {/* Payment Success Overlay */}
                {paymentSuccess && (
                    <div className="mb-12 p-10 bg-emerald-500/10 border border-emerald-500/20 rounded-3xl text-center animate-in fade-in slide-in-from-bottom-10 duration-1000">
                        <div className="w-16 h-16 bg-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg shadow-emerald-500/20">
                            <CheckCircle2 size={32} className="text-noir" />
                        </div>
                        <h2 className="font-display text-3xl text-ivory mb-2">Paiement Partiel Réussi</h2>
                        <p className="text-emerald-500/80 text-sm max-w-sm mx-auto uppercase tracking-widest font-medium">Votre commande est maintenant libérée pour expédition finale.</p>
                    </div>
                )}

                {/* Tracking Section */}
                <div className="mb-16">
                    <div className="flex justify-between items-baseline mb-10 px-2">
                        <h3 className="text-[10px] tracking-luxury uppercase font-black text-ivory/60">Suivi Logistique & Confection</h3>
                        <div className="text-[10px] text-gold font-mono uppercase tracking-widest flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-gold animate-pulse"></span>
                            Live Updates
                        </div>
                    </div>
                    {/* The Tracking Bar fixed by our logic */}
                    <ClientTrackingBar 
                        status={currentStatus} 
                        onPay={(currentStatus === 'completed' && !project.tracking?.[0]?.is_paid) ? handlePayment : undefined}
                        isPaid={project.tracking?.[0]?.is_paid}
                    />
                </div>

                {/* Grid Details */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {/* Left Column: Designs */}
                    <div className="md:col-span-2 space-y-8">
                        <section className="p-8 border border-white/5 bg-white/[0.01] rounded-3xl">
                            <h4 className="text-[11px] uppercase tracking-[0.3em] font-bold text-ivory/20 mb-8 border-b border-white/5 pb-4">Designs Sélectionnés</h4>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {project.selected_designs.map((dId, i) => (
                                    <div key={i} className="p-4 border border-white/5 bg-noir rounded-2xl flex items-center gap-4">
                                        <div className="w-12 h-12 bg-white/5 rounded-xl flex items-center justify-center">
                                            <Palette size={20} className="text-gold/40" />
                                        </div>
                                        <div>
                                            <div className="text-xs font-bold text-ivory">Design Reference</div>
                                            <div className="text-[10px] text-zinc-500 font-mono">#{dId.slice(-8).toUpperCase()}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </section>

                        <section className="p-8 border border-white/5 bg-white/[0.01] rounded-3xl">
                            <h4 className="text-[11px] uppercase tracking-[0.3em] font-bold text-ivory/20 mb-8 border-b border-white/5 pb-4">Analyse Biométrique</h4>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-6">
                                {project.scan_result?.measurements?.basics?.map((m, i) => (
                                    <div key={i}>
                                        <div className="text-[10px] text-zinc-600 uppercase mb-1">{m.name}</div>
                                        <div className="text-lg font-serif text-gold">{m.value}</div>
                                    </div>
                                ))}
                            </div>
                        </section>
                    </div>

                    {/* Right Column: Status Summary */}
                    <div className="space-y-8">
                        <div className="p-8 border border-gold/10 bg-gold/[0.03] rounded-3xl">
                            <h4 className="text-[11px] uppercase tracking-[0.2em] font-bold text-gold/60 mb-6">Résumé Atelier</h4>
                            <div className="space-y-4">
                                <div className="flex justify-between items-center text-xs">
                                    <span className="text-zinc-500">Maison de Couture</span>
                                    <span className="text-ivory font-bold">{project.tracking?.[0]?.couture_house_name || "Maison Tissue"}</span>
                                </div>
                                <div className="flex justify-between items-center text-xs">
                                    <span className="text-zinc-500">Matière Principale</span>
                                    <span className="text-gold italic">{project.tracking?.[0]?.fabric_requested || "Soie de Luxe"}</span>
                                </div>
                                <div className="pt-4 border-t border-white/5 mt-4">
                                    <div className="flex justify-between items-center text-[10px] text-zinc-400">
                                        <span>Total Approuvé</span>
                                        <span className="text-xl font-display text-ivory">Sur Devis</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="p-8 border border-white/5 bg-zinc-900/50 rounded-3xl">
                            <div className="flex items-center gap-3 mb-4">
                                <MapPin size={16} className="text-emerald-500" />
                                <span className="text-[10px] uppercase tracking-widest font-black text-ivory/40">Point de Livraison</span>
                            </div>
                            <div className="text-xs text-zinc-500 leading-relaxed">
                                {project.client_address || "Retrait à l'Atelier (Paris, FR)"}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ProjectDetail;
