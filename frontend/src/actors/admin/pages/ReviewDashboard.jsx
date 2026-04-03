import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../shared/context/AuthContext';
import { Check, X, Eye, FileText, AlertCircle, Clock, ExternalLink, ChevronDown, ChevronUp } from 'lucide-react';

/* ─── Detail Labels per role ─── */
const PROFILE_LABELS = {
    fournisseur: {
        nom: 'Nom', prenom: 'Prénom', organization: 'Organisation',
        lieu: 'Lieu', type_product: 'Type de Produit', specialites: 'Spécialités',
        numero_licence: 'N° de Licence', site_web: 'Site Web',
        nombre_employes: "Nombre d'Employés", annee_creation: 'Année de Création',
        description: 'Description', adresse: 'Adresse', code_postal: 'Code Postal',
        ville: 'Ville', pays: 'Pays', nom_contact: 'Nom du Contact',
        prenom_contact: 'Prénom du Contact', telephone_contact: 'Téléphone du Contact',
        certifications_qualite: 'Certifications Qualité', fabric_category: 'Catégorie Tissu',
        origin_country: "Pays d'Origine", min_price_per_meter: 'Prix Min / Mètre (€)',
        verification_status: 'Statut Vérification',
    },
    couture_house: {
        house_name: 'Nom de la Maison', specialization: 'Spécialisation',
        starting_price: 'Prix de Départ (€)', avg_production_time: 'Temps Moyen de Production',
        verification_status: 'Statut Vérification',
    },
    delivery: {
        company_name: 'Nom de la Société', contact_phone: 'Téléphone',
        service_type: 'Type de Service', delivery_time_guarantee: 'Garantie de Délai',
        insurance_coverage: "Couverture d'Assurance", verification_status: 'Statut Vérification',
    },
};

/* ─── Modal Backdrop ─── */
const Modal = ({ isOpen, onClose, title, children }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" onClick={onClose}>
            <div className="absolute inset-0 bg-noir/80 backdrop-blur-sm" />
            <div
                className="relative bg-[#111113] border border-subtle/30 rounded-sm w-full max-w-xl max-h-[80vh] overflow-y-auto shadow-2xl animate-fade-in scrollbar-none"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="sticky top-0 bg-[#111113] border-b border-subtle/20 px-6 py-4 flex items-center justify-between z-10">
                    <h2 className="font-display text-xl text-ivory">{title}</h2>
                    <button onClick={onClose} className="p-1 hover:bg-surface rounded-sm transition-colors">
                        <X size={18} className="text-ivory/40 hover:text-ivory" />
                    </button>
                </div>
                {/* Body */}
                <div className="p-6">{children}</div>
            </div>
        </div>
    );
};

/* ─── Main Component ─── */
const ReviewDashboard = () => {
    const { user } = useAuth();
    const [queue, setQueue] = useState([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(null);
    const [error, setError] = useState(null);

    // Modal state
    const [detailModal, setDetailModal] = useState({ open: false, data: null });
    const [docsModal, setDocsModal] = useState({ open: false, data: null });

    const API_URL = `${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/auth/admin`;

    const fetchQueue = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_URL}/review-queue/`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!response.ok) throw new Error("Failed to fetch queue");
            const data = await response.json();
            setQueue(data);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchQueue();
    }, []);

    const handleAction = async (userId, action) => {
        setActionLoading(userId);
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_URL}/review-action/${userId}/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ action })
            });
            if (!response.ok) throw new Error(`Failed to ${action} user`);
            setQueue(prev => prev.filter(item => item.id !== userId));
        } catch (err) {
            alert(err.message);
        } finally {
            setActionLoading(null);
        }
    };

    /* ─── Render a profile field value ─── */
    const renderValue = (value) => {
        if (value === null || value === undefined || value === '') return <span className="text-ivory/20 italic">—</span>;
        if (Array.isArray(value)) {
            if (value.length === 0) return <span className="text-ivory/20 italic">—</span>;
            return (
                <div className="flex flex-wrap gap-1.5">
                    {value.map((v, i) => (
                        <span key={i} className="px-2 py-0.5 bg-gold/10 text-gold text-[10px] border border-gold/20 rounded-sm">{v}</span>
                    ))}
                </div>
            );
        }
        if (typeof value === 'string' && value.startsWith('http')) {
            return (
                <a href={value} target="_blank" rel="noopener noreferrer" className="text-gold hover:underline text-xs flex items-center gap-1">
                    {value.length > 40 ? value.substring(0, 40) + '…' : value} <ExternalLink size={10} />
                </a>
            );
        }
        return <span className="text-ivory/80">{String(value)}</span>;
    };

    if (loading) return <div className="p-20 text-center text-gold">Loading Review Queue...</div>;

    return (
        <div className="animate-fade-in">
            <div className="mb-8">
                <h1 className="font-display text-3xl text-ivory mb-2">Verification Queue</h1>
                <p className="text-ivory/40 text-sm font-sans">Verify and approve professional accounts for the platform.</p>
            </div>

            {error && (
                <div className="mb-8 p-4 bg-red-950/20 border border-red-900/40 text-red-200 flex items-center gap-3 rounded-sm">
                    <AlertCircle size={20} />
                    {error}
                </div>
            )}

            {queue.length === 0 ? (
                <div className="p-20 border border-dashed border-subtle/30 text-center rounded-sm">
                    <Clock size={48} className="mx-auto text-gold/30 mb-4" />
                    <p className="text-ivory/40">No pending accounts for review.</p>
                </div>
            ) : (
                <div className="grid gap-5">
                    {queue.map((req) => (
                        <div key={req.id} className="bg-[#111113] p-6 border border-subtle/20 rounded-sm hover:border-gold/30 transition-all duration-300">
                            {/* Top Row */}
                            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                                <div className="flex items-center gap-4 flex-grow">
                                    <div className="w-11 h-11 rounded-full bg-gold/10 flex items-center justify-center text-gold font-bold text-sm uppercase shrink-0">
                                        {req.username?.charAt(0) || '?'}
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-3 mb-1">
                                            <h3 className="text-lg text-ivory font-medium">{req.username}</h3>
                                            <span className="px-2 py-0.5 bg-gold/10 text-gold text-[9px] uppercase tracking-[0.15em] font-bold border border-gold/20 rounded-sm">
                                                {req.role?.replace('_', ' ')}
                                            </span>
                                        </div>
                                        <p className="text-ivory/40 text-xs">{req.email}</p>
                                        <p className="text-ivory/20 text-[10px] mt-1">
                                            Inscrit le {new Date(req.date_joined).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                                        </p>
                                    </div>
                                </div>

                                {/* Action Buttons */}
                                <div className="flex items-center gap-3 shrink-0">
                                    <button
                                        onClick={() => handleAction(req.id, 'reject')}
                                        disabled={actionLoading === req.id}
                                        className="p-2.5 border border-red-900/30 text-red-400 hover:bg-red-400/10 transition-colors rounded-sm disabled:opacity-40"
                                        title="Reject"
                                    >
                                        <X size={18} />
                                    </button>
                                    <button
                                        onClick={() => handleAction(req.id, 'approve')}
                                        disabled={actionLoading === req.id}
                                        className="px-5 py-2.5 bg-gold text-noir font-bold hover:bg-gold/80 transition-colors rounded-sm flex items-center gap-2 text-xs uppercase tracking-wide disabled:opacity-40"
                                    >
                                        <Check size={16} /> Approve
                                    </button>
                                </div>
                            </div>

                            {/* Bottom: Detail + Document Buttons */}
                            <div className="mt-4 pt-4 border-t border-subtle/10 flex gap-4">
                                <button
                                    onClick={() => setDetailModal({ open: true, data: req })}
                                    className="flex items-center gap-2 text-[11px] text-gold/70 hover:text-gold transition-colors uppercase tracking-wide font-sans"
                                >
                                    <Eye size={14} /> View Details
                                </button>
                                <button
                                    onClick={() => setDocsModal({ open: true, data: req })}
                                    className="flex items-center gap-2 text-[11px] text-gold/70 hover:text-gold transition-colors uppercase tracking-wide font-sans"
                                >
                                    <FileText size={14} /> Documents
                                    {req.documents && req.documents.length > 0 && (
                                        <span className="ml-1 w-4 h-4 bg-gold/20 text-gold text-[9px] rounded-full flex items-center justify-center font-bold">
                                            {req.documents.length}
                                        </span>
                                    )}
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* ─── Details Modal ─── */}
            <Modal
                isOpen={detailModal.open}
                onClose={() => setDetailModal({ open: false, data: null })}
                title={`Profile — ${detailModal.data?.username || ''}`}
            >
                {detailModal.data && (
                    <div className="space-y-4">
                        {/* User Info Header */}
                        <div className="flex items-center gap-4 pb-4 border-b border-subtle/15">
                            <div className="w-12 h-12 rounded-full bg-gold/10 flex items-center justify-center text-gold font-bold text-lg uppercase">
                                {detailModal.data.username?.charAt(0)}
                            </div>
                            <div>
                                <p className="text-ivory font-medium">{detailModal.data.username}</p>
                                <p className="text-ivory/40 text-xs">{detailModal.data.email}</p>
                                <span className="mt-1 inline-block px-2 py-0.5 bg-gold/10 text-gold text-[9px] uppercase tracking-[0.15em] font-bold border border-gold/20 rounded-sm">
                                    {detailModal.data.role?.replace('_', ' ')}
                                </span>
                            </div>
                        </div>

                        {/* Profile Fields */}
                        {detailModal.data.profile && Object.keys(detailModal.data.profile).length > 0 ? (
                            <div className="space-y-3">
                                {Object.entries(detailModal.data.profile).map(([key, value]) => {
                                    const labels = PROFILE_LABELS[detailModal.data.role] || {};
                                    const label = labels[key] || key.replace(/_/g, ' ');
                                    return (
                                        <div key={key} className="flex flex-col gap-1 bg-surface/30 p-3 rounded-sm border border-subtle/10">
                                            <span className="text-[9px] uppercase tracking-[0.2em] text-gold/50 font-sans font-medium">{label}</span>
                                            <div className="text-sm">{renderValue(value)}</div>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="text-center py-8">
                                <AlertCircle size={32} className="mx-auto text-ivory/20 mb-3" />
                                <p className="text-ivory/30 text-sm">No profile data available.</p>
                            </div>
                        )}
                    </div>
                )}
            </Modal>

            {/* ─── Documents Modal ─── */}
            <Modal
                isOpen={docsModal.open}
                onClose={() => setDocsModal({ open: false, data: null })}
                title={`Documents — ${docsModal.data?.username || ''}`}
            >
                {docsModal.data && (
                    <div className="space-y-4">
                        {docsModal.data.documents && docsModal.data.documents.length > 0 ? (
                            docsModal.data.documents.map((doc, index) => (
                                <a
                                    key={index}
                                    href={doc.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-4 p-4 bg-surface/40 border border-subtle/20 rounded-sm hover:border-gold/30 hover:bg-surface transition-all duration-300 group"
                                >
                                    <div className="w-10 h-10 bg-gold/10 rounded-sm flex items-center justify-center shrink-0">
                                        <FileText size={18} className="text-gold" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-ivory text-sm font-medium">{doc.name}</p>
                                        <p className="text-ivory/30 text-xs truncate">{doc.url}</p>
                                    </div>
                                    <ExternalLink size={14} className="text-ivory/20 group-hover:text-gold transition-colors shrink-0" />
                                </a>
                            ))
                        ) : (
                            <div className="text-center py-12">
                                <FileText size={40} className="mx-auto text-ivory/15 mb-3" />
                                <p className="text-ivory/30 text-sm mb-1">No documents submitted.</p>
                                <p className="text-ivory/20 text-xs">This user did not provide verification documents during registration.</p>
                            </div>
                        )}
                    </div>
                )}
            </Modal>
        </div>
    );
};

export default ReviewDashboard;
