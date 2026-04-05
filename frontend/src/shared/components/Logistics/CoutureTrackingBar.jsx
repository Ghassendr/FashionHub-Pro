import React from 'react';
import { Package, Truck, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import './LogisticsTracking.css';

const CoutureTrackingBar = ({ status, onConfirm }) => {
    // Premium milestone mappings
    const milestones = [
        {
            key: 'pending',
            label: 'En Confection',
            icon: <Clock size={16} />,
            activeStatuses: ['pending', 'confirmed', 'preparing']
        },
        {
            key: 'ready',
            label: 'Prêt pour Enlèvement',
            icon: <Package size={16} />,
            activeStatuses: ['ready_for_pickup', 'accepted', 'shipped']
        },
        {
            key: 'transit',
            label: 'En Transit Sécurisé',
            icon: <Truck size={16} />,
            activeStatuses: ['in_transit']
        },
        {
            key: 'delivered',
            label: 'Arrivée à l\'Atelier',
            icon: <CheckCircle size={16} />,
            activeStatuses: ['delivered', 'received']
        }
    ];

    const getStatusIndex = (currentStatus) => {
        if (currentStatus === 'cancelled') return -1;
        if (['pending', 'confirmed', 'preparing'].includes(currentStatus)) return 0;
        if (['ready_for_pickup', 'accepted', 'shipped'].includes(currentStatus)) return 1;
        if (currentStatus === 'in_transit') return 2;
        if (['delivered', 'received'].includes(currentStatus)) return 3;
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

            {/* Premium Footer as seen in prompt */}
            <div className="tracking-footer">
                <div className="footer-date">
                    <Clock size={10} />
                    Mise à jour le: {new Date().toLocaleDateString('fr-FR')}
                </div>

                <div className="footer-action">
                    {status === 'delivered' && onConfirm && (
                        <button
                            className="footer-action-btn"
                            onClick={onConfirm}
                        >
                            Confirmer Réception
                        </button>
                    )}

                    {status === 'received' && (
                        <div className="footer-success">
                            <CheckCircle size={12} />
                            Arrivage Archivé & Stock mis à jour
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default CoutureTrackingBar;
