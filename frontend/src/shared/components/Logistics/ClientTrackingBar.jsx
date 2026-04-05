import React from 'react';
import { Package, Truck, CheckCircle, Clock, AlertCircle, Sparkles, CreditCard } from 'lucide-react';
import './LogisticsTracking.css';

const ClientTrackingBar = ({ status, onPay }) => {
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
            key: 'shipped',
            label: 'Costume Réceptionné',
            icon: <CheckCircle size={16} />,
            activeStatuses: ['shipped']
        }
    ];

    const getStatusIndex = (currentStatus) => {
        if (currentStatus === 'cancelled') return -1;
        if (currentStatus === 'pending') return 0;
        if (currentStatus === 'in_production') return 1;
        if (currentStatus === 'completed') return 2;
        if (currentStatus === 'shipped') return 3;
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

            <div className="tracking-footer flex justify-between items-center">
                <div className="footer-date">
                    <Clock size={10} />
                    Mise à jour le: {new Date().toLocaleDateString('fr-FR')}
                </div>
                
                <div className="footer-action">
                    {onPay && (
                        <button
                            className="footer-action-btn flex items-center gap-2"
                            onClick={onPay}
                        >
                            <CreditCard size={14} />
                            Payer le solde
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ClientTrackingBar;
