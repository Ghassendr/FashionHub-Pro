import React from 'react';
import { Package, Truck, CheckCircle, Clock, AlertCircle, Sparkles, CreditCard } from 'lucide-react';
import './LogisticsTracking.css';

const ClientTrackingBar = ({ status, onPay, isPaid, hasCard, updatedAt, deliveryInfo }) => {
    // Client milestone mappings: Couture House responsibility only
    const milestones = [
        {
            key: 'pending',
            label: 'En Attente',
            icon: <Clock size={16} />,
            activeStatuses: ['pending']
        },
        {
            key: 'in_production',
            label: 'En Confection',
            icon: <Sparkles size={16} />,
            activeStatuses: ['in_production']
        },
        {
            key: 'completed', // Production is done, ready to ship
            label: 'Prêt pour Expédition',
            icon: <Package size={16} />,
            activeStatuses: ['completed']
        },
        {
            key: 'in_delivery',
            label: 'En Livraison',
            icon: <Truck size={16} />,
            activeStatuses: ['in_delivery']
        },
        {
            key: 'shipped',
            label: 'Costume Réceptionné',
            icon: <CheckCircle size={16} />,
            activeStatuses: ['shipped']
        }
    ];

    const getStatusIndex = (currentStatus) => {
        if (!currentStatus || currentStatus === 'cancelled') return -1;
        if (currentStatus === 'pending') return 0;
        if (currentStatus === 'in_production') return 1;
        if (currentStatus === 'completed') return 2;
        if (currentStatus === 'in_delivery' || currentStatus === 'accepted' || currentStatus === 'picked_up' || currentStatus === 'in_transit') return 3;
        if (currentStatus === 'shipped' || currentStatus === 'delivered') return 4;
        return 0;
    };

    const currentIndex = getStatusIndex(status);

    if (status === 'cancelled') {
        return (
            <div className="cancelled-banner">
                <AlertCircle size={20} />
                <span className="cancelled-label">Commande Annulée</span>
            </div>
        );
    }

    return (
        <div className="tracking-container">
            <div className="tracking-wrapper">
                {/* Background Line */}
                <div className="tracking-line-bg" />

                {/* Progress Line */}
                <div
                    className="tracking-line-progress"
                    style={{ width: `${(currentIndex / (milestones.length - 1)) * 100}%` }}
                />

                {milestones.map((m, index) => {
                    const isCompleted = index < currentIndex;
                    const isActive = index === currentIndex;
                    const isFuture = index > currentIndex;

                    return (
                        <div
                            key={m.key}
                            className={`milestone-item ${isActive ? 'active' : ''} ${isCompleted ? 'completed' : ''} ${isFuture ? 'future' : ''}`}
                        >
                            <div className="milestone-icon">
                                {m.icon}
                            </div>
                            <div className="milestone-label">
                                {m.label}
                                {isActive && (
                                    <div className="milestone-sublabel">Action en cours</div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Trajectory visualization if in delivery */}
            {deliveryInfo && status !== 'shipped' && (
                <div className="mt-12 p-6 bg-gold/[0.03] border border-gold/10 rounded-2xl animate-in fade-in duration-700">
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3">
                            <Truck size={16} className="text-gold" />
                            <span className="text-[10px] uppercase tracking-widest font-black text-gold">Position du Livreur</span>
                        </div>
                        <div className="text-[10px] uppercase tracking-widest text-ivory/40 font-bold">
                            Arrivée estimée: <span className="text-ivory">{deliveryInfo.eta_minutes || 'calcul...'} min</span>
                        </div>
                    </div>
                    
                    <div className="relative h-1 bg-white/5 rounded-full overflow-hidden mb-4">
                        <div 
                            className="absolute inset-y-0 left-0 bg-gold transition-all duration-1000"
                            style={{ width: deliveryInfo.eta_minutes <= 15 ? '85%' : '40%' }}
                        />
                    </div>
                    
                    <div className="flex justify-between text-[8px] uppercase tracking-widest text-zinc-600 font-bold">
                        <span>Atelier</span>
                        <span>Sfax</span>
                    </div>
                </div>
            )}

            <div className="tracking-footer flex justify-between items-center">
                <div className="footer-date">
                    <Clock size={10} />
                    Mise à jour le: {updatedAt ? new Date(updatedAt).toLocaleDateString('fr-FR') : new Date().toLocaleDateString('fr-FR')}
                </div>
                
                <div className="footer-action">
                    {onPay && !isPaid && (
                        <button
                            className="footer-action-btn flex items-center gap-2"
                            onClick={onPay}
                        >
                            <CreditCard size={14} />
                            {hasCard ? "Payer le solde" : "Lier une Carte & Payer"}
                        </button>
                    )}
                    {isPaid && status !== 'shipped' && (
                        <div className="footer-success flex items-center gap-2">
                            <CheckCircle size={16} />
                            Paiement Confirmé · En attente d'expédition
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ClientTrackingBar;
