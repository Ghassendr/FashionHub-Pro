import React, { useState, useEffect } from 'react';
import { 
    Package, Truck, Clock, CheckCircle2, 
    ArrowRight, MapPin, Building2, 
    ShieldCheck, AlertCircle, Loader2, Sparkles, CarFront, Star, X
} from 'lucide-react';

const ClientDeliveryWizard = ({ order, onClose, onComplete }) => {
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [carriers, setCarriers] = useState([]);
    const [selectedCarrier, setSelectedCarrier] = useState(null);
    const [deliveryType, setDeliveryType] = useState('express');
    
    const token = localStorage.getItem('token');
    const API_BASE = 'http://localhost:8000';

    const fetchMatchedCarriers = async () => {
        setLoading(true);
        try {
            // Match route from Sousse (Atelier) to Sfax (Client)
            const response = await fetch(`${API_BASE}/api/delivery/match/?start=Sousse&end=Sfax`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) {
                const data = await response.json();
                setCarriers(data || []);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (step === 2) {
            fetchMatchedCarriers();
        }
    }, [step]);

    const handleConfirmDelivery = async () => {
        setLoading(true);
        try {
            const response = await fetch(`${API_BASE}/api/couturehouse/orders/${order.id}/request-delivery/`, {
                method: 'POST',
                headers: { 
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    carrier_id: selectedCarrier?.carrier,
                    route_id: selectedCarrier?.id
                })
            });

            if (response.ok) {
                onComplete();
            } else {
                const errorData = await response.json();
                alert(`Erreur: ${errorData.error || "Impossible de planifier la livraison."}`);
            }
        } catch (err) {
            console.error("Connection error:", err);
            alert("Erreur de connexion au serveur.");
        } finally {
            setLoading(false);
        }
    };

    const renderStep1 = () => (
        <div className="wizard-step animate-in">
            <header className="mb-8">
                <span className="text-[10px] uppercase tracking-widest font-black text-gold">Étape 01</span>
                <h2 className="text-3xl font-display text-ivory mt-2">Priorité de Livraison</h2>
                <p className="text-zinc-500 text-[10px] uppercase tracking-widest font-bold mt-1">Expédition Finale : Sousse → Sfax</p>
            </header>
            
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
                {[
                    { id: 'standard', label: 'Standard', time: '24-48h', icon: Truck, desc: 'Économique' },
                    { id: 'fast', label: 'Rapide', time: '12-24h', icon: Clock, desc: 'Prioritaire' },
                    { id: 'express', label: 'Express', time: '4-8h', icon: CarFront, desc: 'Course Dédiée' },
                    { id: 'urgent', label: 'Urgent', time: '1-3h', icon: Sparkles, desc: 'Flash CTR' },
                ].map(opt => (
                    <div 
                        key={opt.id} 
                        className={`p-6 border rounded-3xl cursor-pointer transition-all ${
                            deliveryType.toLowerCase() === opt.id.toLowerCase() ? 'bg-gold/10 border-gold shadow-xl shadow-gold/5' : 'bg-white/[0.02] border-white/5 opacity-40 hover:opacity-100'
                        }`}
                        onClick={() => setDeliveryType(opt.id)}
                    >
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 ${deliveryType.toLowerCase() === opt.id.toLowerCase() ? 'bg-gold text-noir' : 'bg-white/5 text-zinc-500'}`}>
                            <opt.icon size={20} />
                        </div>
                        <h4 className="text-ivory font-display text-lg leading-none">{opt.label}</h4>
                        <p className="text-[9px] text-gold uppercase tracking-[0.1em] mt-2 font-black">{opt.time}</p>
                    </div>
                ))}
            </div>

            <button onClick={() => setStep(2)} className="w-full py-5 bg-gold text-noir font-black uppercase tracking-widest text-[11px] rounded-2xl flex items-center justify-center gap-3 hover:bg-ivory transition-all shadow-xl shadow-gold/10">
                Trouver un Partenaire <ArrowRight size={18} />
            </button>
        </div>
    );

    const renderStep2 = () => (
        <div className="wizard-step animate-in">
            <header className="mb-8">
                <div className="flex justify-between items-start">
                    <div>
                        <span className="text-[10px] uppercase tracking-widest font-black text-gold">Étape 02</span>
                        <h2 className="text-3xl font-display text-ivory mt-2">Partenaires de Transport</h2>
                    </div>
                    <div className="text-right">
                        <p className="text-[10px] text-zinc-500 uppercase font-black">Route</p>
                        <p className="text-gold font-display text-lg">Sousse → Sfax</p>
                    </div>
                </div>
            </header>
            
            {loading ? (
                <div className="py-20 flex flex-col items-center">
                    <Loader2 className="animate-spin text-gold" size={32} />
                    <span className="text-zinc-500 text-[10px] uppercase font-bold tracking-widest mt-4">Matching Logistique en cours...</span>
                </div>
            ) : (
                <div className="space-y-4 max-h-[50vh] overflow-y-auto custom-scrollbar pr-2">
                    {carriers.length === 0 ? (
                        <div className="py-12 text-center border border-dashed border-white/5 rounded-3xl">
                            <AlertCircle className="mx-auto text-zinc-800 mb-4" />
                            <p className="text-zinc-600 text-sm italic">Aucun livreur disponible pour cet itinéraire.</p>
                        </div>
                    ) : (
                        carriers.map(route => (
                            <div 
                                key={route.id} 
                                className={`p-6 border rounded-3xl cursor-pointer transition-all flex items-center justify-between ${
                                    selectedCarrier?.id === route.id ? 'bg-emerald-500/10 border-emerald-500/40 shadow-xl' : 'bg-white/[0.02] border-white/5 hover:border-white/20'
                                }`}
                                onClick={() => setSelectedCarrier(route)}
                            >
                                <div className="flex items-center gap-6">
                                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${selectedCarrier?.id === route.id ? 'bg-emerald-500 text-noir' : 'bg-white/5 text-gold'}`}>
                                        <Truck size={24} />
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-3">
                                            <h4 className="text-ivory font-display text-xl">{route.carrier_name}</h4>
                                            <div className="flex items-center gap-1 bg-gold/10 px-2 py-0.5 rounded border border-gold/20">
                                                <Star size={10} className="fill-gold text-gold" />
                                                <span className="text-[10px] text-gold font-black">{Number(route.carrier_rating).toFixed(1) || "4.5"}</span>
                                            </div>
                                        </div>
                                        <p className="text-[9px] uppercase tracking-widest text-zinc-500 font-bold mt-1">Véhicule : {route.vehicle_details?.vehicle_type || 'Fourgon Premium'}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-emerald-400 font-display text-2xl">{route.services?.[0]?.cost || 15} DT</p>
                                    <p className="text-[9px] text-zinc-500 uppercase tracking-widest font-black mt-1">Prise en charge : Immédiate</p>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}

            <div className="flex gap-4 mt-12">
                <button onClick={() => setStep(1)} className="px-8 py-4 bg-white/5 border border-white/10 text-zinc-500 font-bold uppercase tracking-widest text-[10px] rounded-2xl hover:text-ivory transition-all">Retour</button>
                <button 
                    onClick={handleConfirmDelivery} 
                    disabled={!selectedCarrier || loading}
                    className={`flex-1 py-4 bg-gold text-noir font-black uppercase tracking-widest text-[10px] rounded-2xl flex items-center justify-center gap-3 hover:bg-ivory transition-all shadow-glow-gold/10 ${(!selectedCarrier || loading) ? 'opacity-20 cursor-not-allowed' : ''}`}
                >
                    {loading ? <Loader2 className="animate-spin" /> : <><CheckCircle2 size={16} /> Confirmer la Livraison</>}
                </button>
            </div>
        </div>
    );

    return (
        <div className="wizard-box bg-noir relative w-full max-w-4xl mx-auto rounded-3xl border border-gold/20 shadow-2xl overflow-hidden">
            <button onClick={onClose} className="absolute top-6 right-6 text-zinc-600 hover:text-ivory z-20">
                <X size={24} />
            </button>
            <div className="p-10">
                {step === 1 && renderStep1()}
                {step === 2 && renderStep2()}
            </div>
            
            <div className="h-1 bg-white/5 w-full">
                <div className="h-full bg-gold transition-all duration-700" style={{ width: `${(step/2)*100}%` }} />
            </div>
        </div>
    );
};

export default ClientDeliveryWizard;
