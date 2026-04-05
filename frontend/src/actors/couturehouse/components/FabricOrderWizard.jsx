import React, { useState, useEffect } from 'react';
import { 
    Package, Truck, Clock, CheckCircle2, 
    ArrowRight, MapPin, Building2, Layers, 
    ShieldCheck, AlertCircle, Loader2, Sparkles, CarFront, Star
} from 'lucide-react';
import './FabricOrderWizard.css';

const FabricOrderWizard = ({ order, onClose, onComplete }) => {
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [carriers, setCarriers] = useState([]);
    const [selectedCarrier, setSelectedCarrier] = useState(null);
    const [deliveryType, setDeliveryType] = useState('standard');
    const [wizardQty, setWizardQty] = useState(parseFloat(order.quantity_needed) || 2.5);
    const [requestedNatures, setRequestedNatures] = useState([]);
    
    const NATURE_OPTIONS = ["Standard", "Secured", "Fragile", "Climate Controlled", "Guarantee"];
    
    const token = localStorage.getItem('token');
    const API_BASE = 'http://localhost:8000';

    const fetchCarriers = async () => {
        setLoading(true);
        try {
            // Simulated search for Nice -> Sousse logic
            const response = await fetch(`${API_BASE}/api/delivery/match/?start=Nice&end=Sousse`, {
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
        if (step === 3) {
            fetchCarriers();
        }
    }, [step]);

    const handleConfirmOrder = async () => {
        setLoading(true);
        try {
            // Extract fabric_id safely
            const fabricId = order.fabric_id || (order.stock_analysis?.fabric_id);
            const fabricName = order.fabric_requested;
            
            console.log("DEBUG: Confirming order", { fabricId, fabricName });

            const response = await fetch(`${API_BASE}/api/fournisseur/orders/create/`, {
                method: 'POST',
                headers: { 
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    fabric_id: fabricId,
                    fabric_name: fabricName, // Fallback for backend lookup
                    quantity: wizardQty,
                    couture_house_id: order.couture_house?.id || order.couture_house,
                    couture_house_name: order.house_name || "L'Atelier Haute Couture",
                    delivery_type: deliveryType,
                    carrier_id: selectedCarrier?.carrier,
                    route_id: selectedCarrier?.id
                })
            });

            if (response.ok) {
                onComplete();
            } else {
                const errorData = await response.json().catch(() => ({}));
                console.error("Order failed:", errorData);
                alert(`Erreur: ${errorData.error || "Impossible de créer la commande de tissu."}`);
            }
        } catch (err) {
            console.error("Connection error:", err);
            alert("Erreur de connexion au serveur.");
        } finally {
            setLoading(false);
        }
    };

    const adjustQty = (delta) => {
        setWizardQty(prev => {
            const current = parseFloat(prev) || 0;
            return parseFloat((current + delta).toFixed(1));
        });
    };

    const renderStep1 = () => (
        <div className="wizard-step animate-in">
            <header className="mb-8">
                <span className="text-[10px] uppercase tracking-widest font-black text-gold">Étape 01</span>
                <h2 className="text-4xl font-display text-ivory mt-2">Détails de la Matière</h2>
            </header>
            
            <div className="flex flex-col md:flex-row gap-8 items-start">
                {/* Visual Fabric Card */}
                <div className="w-full md:w-1/2 group relative">
                    <div className="aspect-square rounded-3xl overflow-hidden border border-white/10 shadow-2xl">
                        <img 
                            src={order.stock_analysis?.fabric_image_url 
                                ? (order.stock_analysis.fabric_image_url.startsWith('http') 
                                    ? order.stock_analysis.fabric_image_url 
                                    : `${API_BASE}${order.stock_analysis.fabric_image_url}`)
                                : "/assets/fabrics/luxury_cotton.png"
                            } 
                            alt="Fabric Texture" 
                            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-noir/80 to-transparent" />
                        <div className="absolute bottom-6 left-6">
                            <span className="text-[10px] uppercase font-black text-gold tracking-widest">Référence Textile</span>
                            <h3 className="text-2xl font-display text-ivory">{order.stock_analysis?.fabric_nature || order.fabric_requested}</h3>
                        </div>
                    </div>
                </div>

                <div className="w-full md:w-1/2 space-y-6">
                    <div className="p-6 bg-white/[0.02] border border-white/5 rounded-3xl space-y-4">
                        <div className="flex justify-between items-center">
                          <span className="text-[10px] uppercase font-black text-zinc-500 tracking-widest">Métrage Souhaité</span>
                          <span className="text-gold font-display text-xl">{wizardQty}m</span>
                        </div>
                        
                        <div className="flex items-center justify-between bg-noir/40 p-2 rounded-2xl border border-white/5">
                            <button onClick={() => adjustQty(-0.5)} className="w-12 h-12 flex items-center justify-center text-ivory/40 hover:text-gold hover:bg-white/5 rounded-xl transition-all font-black text-2xl">–</button>
                            <span className="text-3xl font-display text-ivory">{wizardQty}</span>
                            <button onClick={() => adjustQty(0.5)} className="w-12 h-12 flex items-center justify-center text-ivory/40 hover:text-gold hover:bg-white/5 rounded-xl transition-all font-black text-2xl">+</button>
                        </div>
                    </div>

                    <div className="p-6 bg-gold/5 border border-gold/10 rounded-3xl flex justify-between items-center">
                        <div>
                            <p className="text-[9px] uppercase tracking-widest text-zinc-500 font-bold">Prix Unitaire</p>
                            <p className="text-gold font-display text-lg">{order.stock_analysis?.fabric_price || 45}€ / m</p>
                        </div>
                        <div className="text-right">
                            <p className="text-[9px] uppercase tracking-widest text-zinc-500 font-bold">Total Estimation</p>
                            <p className="text-ivory font-display text-3xl">{(wizardQty * (order.stock_analysis?.fabric_price || 45)).toFixed(2)}€</p>
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-3 text-zinc-500 italic text-[10px]">
                        <AlertCircle size={14} className="text-amber-500" />
                        <span>Le métrage inclut une marge de sécurité de 10% pour la coupe haute couture.</span>
                    </div>
                </div>
            </div>

            <button onClick={() => setStep(2)} className="wizard-btn-next group mt-4 py-4">
                Valider le métrage <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
            </button>
        </div>
    );
    const renderStep2 = () => (
        <div className="wizard-step animate-in">
            <header className="mb-8">
                <span className="text-[10px] uppercase tracking-widest font-black text-gold">Étape 02</span>
                <h2 className="text-3xl font-display text-ivory mt-2">Priorité de Livraison</h2>
            </header>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
                {[
                    { id: 'standard', label: 'Standard', time: '5-7 jours', icon: Truck, desc: 'Terrestre' },
                    { id: 'fast', label: 'Rapide', time: '2-3 jours', icon: Clock, desc: 'Régional' },
                    { id: 'express', label: 'Express', time: '24-48h', icon: CarFront, desc: 'Premium' },
                    { id: 'urgent', label: 'Urgent', time: '12-24h', icon: Sparkles, desc: 'Priorité Absolue' },
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

            <div className="p-8 bg-white/[0.02] border border-white/5 rounded-3xl">
                <label className="text-[10px] uppercase tracking-widest font-black text-zinc-500 mb-6 block">Spécificités de Transport (Nature)</label>
                <div className="flex flex-wrap gap-3">
                    {NATURE_OPTIONS.map(opt => {
                        const isRequested = requestedNatures.includes(opt);
                        return (
                            <div 
                                key={opt}
                                onClick={() => {
                                    setRequestedNatures(prev => 
                                        isRequested ? prev.filter(n => n !== opt) : [...prev, opt]
                                    );
                                }}
                                style={{
                                    fontSize:'11px', 
                                    padding:'8px 16px', 
                                    background: isRequested ? 'rgba(111,207,151,0.1)' : 'transparent',
                                    border: isRequested ? '1px solid #6FCF97' : '0.5px solid var(--noir-border)',
                                    color: isRequested ? '#6FCF97' : 'var(--ivory-30)',
                                    borderRadius: '20px',
                                    cursor:'pointer',
                                    transition: '0.2s',
                                    userSelect: 'none'
                                }}
                            >
                                {isRequested && <span className="mr-2">✓</span>}
                                {opt}
                            </div>
                        );
                    })}
                </div>
                {requestedNatures.length > 0 && (
                    <p className="text-[9px] text-emerald-500 font-bold uppercase tracking-[0.1em] mt-6 flex items-center gap-2">
                        <CheckCircle2 size={12} /> {requestedNatures.length} filtre(s) actif(s). Le matching sera restreint aux partenaires certifiés.
                    </p>
                )}
            </div>

            <div className="flex gap-4 mt-12">
                <button onClick={() => setStep(1)} className="wizard-btn-prev">Précédent</button>
                <button onClick={() => setStep(3)} className="wizard-btn-next flex-1 group">
                    Trouver les Partenaires <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                </button>
            </div>
        </div>
    );

    const renderStep3 = () => (
        <div className="wizard-step animate-in">
            <header className="mb-8">
                <span className="text-[10px] uppercase tracking-widest font-black text-gold">Étape 03</span>
                <h2 className="text-3xl font-display text-ivory mt-2">Transporteurs Disponibles</h2>
                <p className="text-zinc-600 text-[10px] uppercase tracking-widest font-bold mt-1">Route : Nice → Sousse — {deliveryType.toUpperCase()}</p>
            </header>
            
            {loading ? (
                <div className="py-12 flex flex-col items-center">
                    <Loader2 className="animate-spin text-gold" size={32} />
                    <span className="text-zinc-500 text-[10px] uppercase font-bold tracking-widest mt-4">Calcul de l'itinéraire optimal...</span>
                </div>
            ) : carriers.length === 0 ? (
                <div className="py-12 text-center border border-dashed border-white/5 rounded-3xl">
                    <AlertCircle className="mx-auto text-zinc-800 mb-4" />
                    <p className="text-zinc-600 text-sm italic">Aucun partenaire ne dessert cette zone pour l'instant.</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {carriers
                        .map(route => {
                            // Intelligent Filtering: Find service matching Rapidity AND ALL requested natures
                            const matchedService = route.services?.find(s => 
                                s.type.toLowerCase().includes(deliveryType.toLowerCase()) &&
                                requestedNatures.every(req => s.nature?.includes(req))
                            );
                            if (!matchedService) return null; // If no service matches requirements, hide carrier
                            
                            return (
                                <div 
                                    key={route.id} 
                                    className={`p-6 border rounded-3xl cursor-pointer transition-all flex items-center justify-between ${
                                        selectedCarrier?.id === route.id ? 'bg-emerald-500/10 border-emerald-500/40 shadow-xl' : 'bg-white/[0.02] border-white/5 hover:border-white/20'
                                    }`}
                                    onClick={() => setSelectedCarrier({ ...route, matchedService })}
                                >
                                    <div className="flex items-center gap-6">
                                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${selectedCarrier?.id === route.id ? 'bg-emerald-500 text-noir' : 'bg-white/5 text-gold'}`}>
                                            <Building2 size={24} />
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-3">
                                                <h4 className="text-ivory font-display text-xl">{route.carrier_name || 'Partenaire Certifié'}</h4>
                                                <div className="flex items-center gap-1 bg-gold/10 px-2 py-0.5 rounded border border-gold/20">
                                                    <Star size={10} className="fill-gold text-gold" />
                                                    <span className="text-[10px] text-gold font-black">{route.carrier_rating || "4.5"}</span>
                                                    <span className="text-[8px] text-gold/50 ml-1">({route.carrier_reviews || "12"})</span>
                                                </div>
                                                {parseFloat(route.carrier_rating) >= 4.7 && (
                                                    <span className="text-[8px] uppercase tracking-tighter bg-ivory text-black px-1.5 font-black flex items-center gap-px rounded-sm shadow-xl transition-all hover:scale-105">
                                                        <ShieldCheck size={8} /> Trusted
                                                    </span>
                                                )}
                                            </div>
                                            <div className="flex flex-wrap gap-2 mt-2">
                                                {matchedService?.nature?.map((n, i) => (
                                                    <span key={i} className="text-[8px] px-2 py-0.5 bg-emerald-500/10 text-emerald-400 uppercase tracking-widest border border-emerald-500/20 rounded-full font-black">
                                                        {n}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-emerald-400 font-display text-3xl">{matchedService?.cost || 0}€</p>
                                        <p className="text-[10px] text-zinc-500 uppercase tracking-[0.2em] font-black mt-1">{matchedService?.eta || '5 Jours'}</p>
                                    </div>
                                </div>
                            );
                        })
                        .filter(Boolean) // Remove null entries
                    }
                    {carriers.length > 0 && carriers.filter(r => r.services?.some(s => s.type.toLowerCase().includes(deliveryType.toLowerCase()) && requestedNatures.every(req => s.nature?.includes(req)))).length === 0 && (
                        <div className="py-12 text-center border border-dashed border-rose-500/10 rounded-3xl bg-rose-500/[0.02]">
                            <AlertCircle className="mx-auto text-rose-800 mb-4" />
                            <p className="text-rose-400 text-[10px] uppercase tracking-widest font-black mb-2">Affinage Infructueux</p>
                            <p className="text-zinc-600 text-xs italic max-w-xs mx-auto">Aucun partenaire ne propose cette combinaison exacte d'attributs ({requestedNatures.join(', ')}).</p>
                        </div>
                    )}
                </div>
            )}
            
            <div className="flex gap-4 mt-12">
                <button onClick={() => setStep(2)} className="wizard-btn-prev">Précédent</button>
                <button 
                    onClick={() => setStep(4)} 
                    disabled={!selectedCarrier}
                    className={`wizard-btn-next flex-1 group ${!selectedCarrier ? 'opacity-20 cursor-not-allowed' : ''}`}
                >
                    Review Order <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                </button>
            </div>
        </div>
    );

    const renderStep4 = () => (
        <div className="wizard-step animate-in">
            <header className="mb-8">
                <span className="text-[10px] uppercase tracking-widest font-black text-gold">Étape 04</span>
                <h2 className="text-3xl font-display text-ivory mt-2">Résumé de la Commande</h2>
            </header>
            
            <div className="bg-white/[0.01] border border-white/10 rounded-3xl overflow-hidden shadow-2xl">
                <div className="p-8 border-b border-white/5 bg-emerald-500/[0.03] flex items-center gap-6">
                    <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-400">
                        <ShieldCheck size={28} />
                    </div>
                    <div>
                        <h4 className="text-ivory font-display text-xl">Dossier Certifié</h4>
                        <p className="text-zinc-500 text-[10px] uppercase tracking-widest font-bold">Prêt pour transmission fournisseur</p>
                    </div>
                </div>
                
                <div className="p-8 space-y-8">
                    {/* Items Breakdown */}
                    <div className="space-y-4">
                        <div className="flex justify-between items-end">
                            <div>
                                <p className="text-[9px] uppercase tracking-widest text-zinc-600 font-black mb-1">Matière</p>
                                <h5 className="text-ivory text-sm font-medium">{order.fabric_requested}</h5>
                            </div>
                            <div className="text-right">
                                <p className="text-zinc-400 text-xs">{wizardQty}m × {order.stock_analysis?.fabric_price || 45}€</p>
                                <p className="text-ivory font-display text-lg">{(wizardQty * (order.stock_analysis?.fabric_price || 45)).toFixed(2)}€</p>
                            </div>
                        </div>

                        <div className="flex justify-between items-end pt-4 border-t border-white/5">
                            <div>
                                <p className="text-[9px] uppercase tracking-widest text-zinc-600 font-black mb-1">Logistique ({deliveryType})</p>
                                <h5 className="text-ivory text-sm font-medium">{selectedCarrier?.carrier_name || 'Carrier Partner'}</h5>
                                <p className="text-zinc-500 text-[10px] uppercase tracking-widest mt-1">{selectedCarrier?.matchedService?.nature?.join(', ')}</p>
                            </div>
                            <div className="text-right">
                                <p className="text-zinc-400 text-xs">Frais de port</p>
                                <p className="text-gold font-display text-lg">{selectedCarrier?.matchedService?.cost || 0}€</p>
                            </div>
                        </div>
                    </div>

                    {/* Total */}
                    <div className="pt-6 border-t border-gold/20 flex justify-between items-center">
                        <span className="text-[10px] uppercase tracking-[0.2em] font-black text-gold">Total HT</span>
                        <span className="text-3xl font-display text-ivory">
                            {( (wizardQty * (order.stock_analysis?.fabric_price || 45)) + (selectedCarrier?.matchedService?.cost || 0) ).toFixed(2)}€
                        </span>
                    </div>
                </div>
            </div>
            
            <div className="flex gap-4 mt-6">
                <button onClick={() => setStep(3)} className="wizard-btn-prev">Précédent</button>
                <button 
                    onClick={handleConfirmOrder} 
                    className="wizard-btn-next mt-0 flex-1 bg-gold text-noir hover:bg-ivory font-black uppercase tracking-widest text-[10px] py-4"
                >
                    {loading ? <Loader2 className="animate-spin" /> : <><CheckCircle2 size={16} /> Confirmer la commande</>}
                </button>
            </div>
        </div>
    );

    return (
        <div className="wizard-box bg-noir relative">
            <button onClick={onClose} className="absolute top-6 right-6 text-zinc-600 hover:text-ivory">✕</button>
            <div className="p-10">
                {step === 1 && renderStep1()}
                {step === 2 && renderStep2()}
                {step === 3 && renderStep3()}
                {step === 4 && renderStep4()}
            </div>
            
            <div className="wizard-progress-bar">
                <div className="h-full bg-gold transition-all duration-700" style={{ width: `${(step/4)*100}%` }} />
            </div>
        </div>
    );
};

export default FabricOrderWizard;
