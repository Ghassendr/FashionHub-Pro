import React, { useState, useEffect } from 'react';
import {
    Users, Search, Loader2, ArrowLeft,
    Palette, LayoutGrid, Plus, TrendingUp, Settings,
    LogOut, Menu, Layers, Eye, Calendar, User,
    ChevronRight, Ruler, Sparkles, CheckCircle2, Clock, Package
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Viewer3D from '../../client/components/Viewer3D';
import './Inquiries.css';
import './CoutureDashboard.css';

const Inquiries = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [inquiries, setInquiries] = useState([]);
    const [orders, setOrders] = useState([]);
    const [activeTab, setActiveTab] = useState('projets');
    const [selectedInquiry, setSelectedInquiry] = useState(null);
    const [detailLoading, setDetailLoading] = useState(false);

    const token = localStorage.getItem('token');

    const fetchInquiries = async (silent = false) => {
        try {
            if (!silent) setLoading(true);
            const response = await fetch('http://localhost:8000/api/couturehouse/inquiries/', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            setInquiries(data.inquiries || []);
        } catch (err) {
            console.error("Failed to fetch inquiries", err);
        } finally {
            if (!silent) setLoading(false);
        }
    };

    const fetchOrders = async (silent = false) => {
        try {
            if (!silent) setLoading(true);
            const response = await fetch('http://localhost:8000/api/couturehouse/orders/', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) {
                const data = await response.json();
                setOrders(data.orders || []);
            }
        } catch (err) {
            console.error("Failed to fetch orders", err);
        } finally {
            if (!silent) setLoading(false);
        }
    };

    const fetchInquiryDetails = async (id) => {
        try {
            setDetailLoading(true);
            const response = await fetch(`http://localhost:8000/api/couturehouse/inquiries/${id}/`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            setSelectedInquiry(data);
        } catch (err) {
            console.error("Failed to fetch inquiry details", err);
        } finally {
            setDetailLoading(false);
        }
    };

    const handleAcceptInquiry = async (id) => {
        try {
            setDetailLoading(true);
            const response = await fetch(`http://localhost:8000/api/couturehouse/inquiries/${id}/convert/`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) {
                const newOrder = await response.json();
                navigate(`/couturehouse/orders/${newOrder.id}`);
            }
        } catch (err) {
            console.error("Failed to accept inquiry", err);
        } finally {
            setDetailLoading(false);
        }
    };

    useEffect(() => {
        if (!token) {
            navigate('/');
            return;
        }
        fetchInquiries();
        fetchOrders();

        // Optional: Real-time sync
        const interval = setInterval(() => {
            fetchInquiries(true);
            fetchOrders(true);
        }, 10000);
        return () => clearInterval(interval);
    }, [token]);

    const getStatusClass = (status) => {
        switch (status) {
            case 'pending': return 'status-pending';
            case 'in_production': return 'status-production';
            case 'completed': return 'status-completed';
            default: return 'status-pending';
        }
    };

    const getFabricStatusBadge = (status) => {
        switch (status) {
            case 'available': return (
                <div className="fabric-badge" style={{ color: '#10b981' }}>
                    <CheckCircle2 size={12} /> <span>Stock Prêt</span>
                </div>
            );
            case 'to_order': return (
                <div className="fabric-badge" style={{ color: '#ef4444' }}>
                    <Package size={12} /> <span>À Commander</span>
                </div>
            );
            case 'ordered': return (
                <div className="fabric-badge" style={{ color: '#f59e0b' }}>
                    <Clock size={12} /> <span>Livraison...</span>
                </div>
            );
            default: return <div className="fabric-badge text-zinc-500">Inconnu</div>;
        }
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'saved': return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
            case 'sent': return 'text-gold bg-gold/10 border-gold/20';
            case 'ordered': return 'text-blue-400 bg-blue-500/10 border-blue-500/20';
            case 'in_production': return 'text-purple-400 bg-purple-500/10 border-purple-500/20';
            case 'completed': return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
            case 'shipped': return 'text-emerald-500 bg-emerald-500/20 border-emerald-500/30';
            default: return 'text-zinc-500 bg-white/5 border-white/10';
        }
    };

    const API_BASE = 'http://localhost:8000';

    return (
        <div className="animate-fade-in p-6 lg:p-12 max-w-[1600px] mx-auto min-h-screen">
            {/* Context Header */}
            <div className="mb-12 border-b border-gold/10 pb-8">
                <div className="flex items-center gap-4 mb-4">
                    <span className="text-[10px] tracking-[0.3em] uppercase text-gold font-bold bg-gold/10 px-4 py-1.5 rounded-full border border-gold/20 flex items-center gap-2">
                        <Users size={12} /> Client Inquiries
                    </span>
                </div>
                <h1 className="text-4xl md:text-5xl font-display text-ivory italic flex items-center gap-4">
                    Order Queue
                </h1>
            </div>

            <div className="atelier-content">
                {!selectedInquiry ? (
                    <>
                        <div className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-6">
                            <div>
                                <span className="text-gold block mb-4 uppercase text-[10px] tracking-[0.3em]" style={{ letterSpacing: '0.3em' }}>Atelier Workflow</span>
                                <h1 className="text-5xl font-display text-ivory">Commandes & Projets</h1>
                            </div>
                            
                            <div className="flex flex-col md:flex-row items-center gap-6">
                                <div className="bg-black-soft" style={{ padding: '4px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)', display: 'flex' }}>
                                    <button 
                                        onClick={() => setActiveTab('projets')}
                                        className={`tab-button ${activeTab === 'projets' ? 'active' : ''}`}
                                    >
                                        Projets
                                    </button>
                                    <button 
                                        onClick={() => setActiveTab('commandes')}
                                        className={`tab-button ${activeTab === 'commandes' ? 'active' : ''}`}
                                    >
                                        Commandes
                                    </button>
                                </div>
                                <div className="atelier-search max-w-md w-full relative">
                                    <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" />
                                    <input type="text" placeholder="Rechercher..." className="bg-white/5 border border-white/10 rounded-xl py-3 pl-12 pr-4 w-full text-ivory outline-none focus:border-gold/50 transition-colors" />
                                </div>
                            </div>
                        </div>

                        {loading ? (
                            <div className="py-20 flex flex-col items-center justify-center">
                                <Loader2 className="animate-spin text-gold mb-4" size={40} />
                                <p className="text-zinc-500 text-sm uppercase tracking-widest">Récupération des dossiers...</p>
                            </div>
                        ) : activeTab === 'projets' ? (
                            inquiries.length === 0 ? (
                                <div className="py-32 text-center border border-dashed border-white/10 rounded-3xl bg-white/[0.02]">
                                    <Users size={48} className="mx-auto text-zinc-800 mb-6" />
                                    <h3 className="text-ivory/40 font-display text-xl mb-2">Pas encore de demandes</h3>
                                    <p className="text-zinc-600 text-sm max-w-xs mx-auto">Vos designs n'ont pas encore été sélectionnés par des clients.</p>
                                </div>
                            ) : (
                                <div className="grid gap-4">
                                    {inquiries.map(item => (
                                        <div
                                            key={item.id}
                                            className="inquiry-row group cursor-pointer"
                                            onClick={() => fetchInquiryDetails(item.id)}
                                        >
                                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 p-6 bg-noir/40 border border-white/5 rounded-2xl group-hover:border-gold/30 transition-all duration-500">
                                                <div className="flex items-center gap-5">
                                                    <div className="w-12 h-12 rounded-full bg-gold/10 flex items-center justify-center text-gold border border-gold/20">
                                                        <User size={20} />
                                                    </div>
                                                    <div>
                                                        <h3 className="text-ivory font-display text-xl group-hover:text-gold transition-colors">{item.client_name}</h3>
                                                        <div className="flex items-center gap-3 text-[10px] uppercase tracking-widest text-zinc-500 mt-1">
                                                            <Calendar size={12} />
                                                            {new Date(item.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="flex flex-wrap items-center gap-4">
                                                    <div className="flex flex-col text-right">
                                                        <span className="text-[9px] uppercase tracking-widest text-zinc-600 font-bold mb-1">Impact</span>
                                                        <span className="text-ivory text-xs font-black">{item.summary.designs_count} Design{item.summary.designs_count > 1 ? 's' : ''}</span>
                                                    </div>
                                                    <div className={`px-4 py-1.5 rounded-full text-[9px] uppercase tracking-widest font-black border ${getStatusColor(item.status)}`}>
                                                        {item.status}
                                                    </div>
                                                    <ChevronRight className="text-zinc-700 group-hover:text-gold transition-colors group-hover:translate-x-1 duration-300" />
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )
                        ) : (
                            /* ACTIVE ORDERS TAB */
                            <div className="grid gap-4">
                                {orders.length === 0 ? (
                                    <div className="py-32 text-center border border-dashed border-white/10 rounded-3xl bg-white/[0.02]">
                                        <Layers size={48} className="mx-auto text-zinc-800 mb-6" />
                                        <h3 className="text-ivory/40 font-display text-xl mb-2">Aucune commande active</h3>
                                        <p className="text-zinc-600 text-sm max-w-xs mx-auto">Acceptez des projets pour lancer la production.</p>
                                    </div>
                                ) : orders.map(order => (
                                    <div 
                                        key={order.id} 
                                        className="inquiry-row group cursor-pointer" 
                                        onClick={() => navigate(`/couturehouse/orders/${order.id}`)}
                                    >
                                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 p-6 bg-noir/40 border border-white/5 rounded-2xl group-hover:border-gold/30 transition-all duration-500">
                                            <div className="flex items-center gap-5">
                                                <div className="w-12 h-12 rounded-full bg-gold/10 flex items-center justify-center text-gold border border-gold/20 font-bold italic text-xs">
                                                    #{order.id}
                                                </div>
                                                <div>
                                                    <h3 className="text-ivory font-display text-xl group-hover:text-gold transition-colors">{order.client_name}</h3>
                                                    <div className="flex items-center gap-3 text-[10px] uppercase tracking-widest text-zinc-500 mt-1">
                                                        <Palette size={12} className="text-gold/50" />
                                                        {order.fabric_requested} — {order.quantity_needed}m
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-8">
                                                <div style={{ textAlign: 'right' }}>
                                                    <div style={{ fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#52525b', fontWeight: 800, marginBottom: '4px' }}>Matière</div>
                                                    {getFabricStatusBadge(order.fabric_status)}
                                                </div>
                                                <div style={{ textAlign: 'right', minWidth: '120px' }}>
                                                    <div style={{ fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#52525b', fontWeight: 800, marginBottom: '4px' }}>Production</div>
                                                    <div className={`px-4 py-1.5 rounded-full text-[9px] uppercase tracking-widest font-black border border-gold/10 bg-gold/5 text-gold`}>
                                                        {order.status ? order.status.replace('_', ' ') : 'PENDING'}
                                                    </div>
                                                </div>
                                                <ChevronRight className="text-zinc-700 group-hover:text-gold transition-colors group-hover:translate-x-1 duration-300" />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </>
                ) : (
                    /* Inquiry Details View */
                    <div className="inquiry-detail-view animate-in">
                        <button
                            onClick={() => setSelectedInquiry(null)}
                            className="flex items-center gap-2 text-zinc-500 hover:text-ivory mb-12 transition-colors text-xs uppercase tracking-widest font-bold"
                        >
                            <ArrowLeft size={14} /> Retour au dossier
                        </button>

                        <div className="flex flex-col lg:flex-row gap-10">
                            {/* Left Side: 3D Visualization */}
                            <div className="lg:w-2/5 shrink-0">
                                <div className="inquiry-3d-box sticky top-10">
                                    <div className="aspect-[4/5] bg-noir/80 border border-white/5 rounded-3xl overflow-hidden relative shadow-2xl">
                                        {selectedInquiry.scan_result?.mesh_url ? (
                                            <Viewer3D url={
                                                selectedInquiry.scan_result.mesh_url.startsWith('http')
                                                    ? selectedInquiry.scan_result.mesh_url
                                                    : `${API_BASE}${selectedInquiry.scan_result.mesh_url}`
                                            } />
                                        ) : (
                                            <div className="w-full h-full flex flex-col items-center justify-center text-zinc-800">
                                                <LayoutGrid size={64} className="opacity-10 mb-4" />
                                                <p className="text-[10px] uppercase tracking-widest font-black opacity-30">Scan 3D non disponible</p>
                                            </div>
                                        )}

                                        <div className="absolute top-6 left-6 z-10">
                                            <div className="px-3 py-1 bg-noir/60 backdrop-blur-md rounded-full border border-white/10 flex items-center gap-2">
                                                <div className="w-2 h-2 rounded-full bg-gold animate-pulse" />
                                                <span className="text-[9px] uppercase tracking-widest font-black text-white/80">Digital Twin Visualization</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="mt-8 p-6 bg-white/[0.03] border border-white/5 rounded-2xl">
                                        <h4 className="text-[10px] uppercase tracking-widest font-black text-gold mb-4 flex items-center gap-2">
                                            <Ruler size={14} /> Dimensions Clés
                                        </h4>
                                        <div className="grid grid-cols-2 gap-x-4 gap-y-6">
                                            <div className="inquiry-stat">
                                                <span className="label">Morphologie</span>
                                                <span className="value text-ivory">
                                                    {selectedInquiry.scan_result?.morphology?.silhouette?.shape_letter
                                                        ? `Silhouette ${selectedInquiry.scan_result.morphology.silhouette.shape_letter}`
                                                        : (selectedInquiry.scan_result?.morphology?.silhouette?.type_fr || 'NC')}
                                                </span>
                                            </div>
                                            <div className="inquiry-stat">
                                                <span className="label">Teint AI</span>
                                                <div className="flex items-center gap-3">
                                                    <span className="value text-emerald-400 capitalize">
                                                        {selectedInquiry.skin_result?.name || 'NC'}
                                                    </span>
                                                    {selectedInquiry.skin_result?.detected_rgb && (
                                                        <div
                                                            className="w-6 h-3 rounded-full border border-white/20 shadow-sm"
                                                            style={{
                                                                backgroundColor: `rgb(${selectedInquiry.skin_result.detected_rgb.join(',')})`
                                                            }}
                                                            title="Teint détecté"
                                                        />
                                                    )}
                                                </div>
                                            </div>

                                            {/* Core Measurements */}
                                            {(selectedInquiry.scan_result?.measurements?.basics || []).slice(0, 3).map(m => (
                                                <div className="inquiry-stat" key={m.key}>
                                                    <span className="label">{m.name}</span>
                                                    <span className="value text-zinc-300">{m.value_cm} {m.unit || 'cm'}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Right Side: Content */}
                            <div className="flex-1 space-y-12">
                                <div className="mb-12">
                                    <h2 className="text-5xl font-display text-ivory mb-4">{selectedInquiry.client_name || 'Client Inconnu'}</h2>
                                    <p className="text-zinc-500 uppercase tracking-widest text-[10px] font-bold">Dossier technique de commande — {selectedInquiry.id.slice(-8)}</p>
                                </div>

                                {/* Selected Designs */}
                                <section>
                                    <h3 className="text-[10px] tracking-widest uppercase font-bold text-ivory/40 mb-6 flex items-center gap-3">
                                        <Palette size={16} className="text-gold" />
                                        Designs Sélectionnés
                                        <div className="h-[1px] flex-1 bg-white/5" />
                                    </h3>
                                    <div className="grid sm:grid-cols-2 gap-4">
                                        {selectedInquiry.selected_designs?.map(design => (
                                            <div key={design.id} className={`p-4 bg-noir/40 border rounded-2xl flex items-center gap-4 ${design.is_mine ? 'border-gold/30' : 'border-white/5'}`}>
                                                <div className="w-16 h-20 bg-zinc-900 rounded-lg overflow-hidden flex items-center justify-center border border-white/5 shadow-inner">
                                                    {design.image_url ? (
                                                        <img
                                                            src={`${API_BASE.replace('/api', '')}${design.image_url}`}
                                                            alt={design.title}
                                                            className="w-full h-full object-cover"
                                                        />
                                                    ) : (
                                                        <LayoutGrid size={20} className={design.is_mine ? 'text-gold' : 'text-zinc-800'} />
                                                    )}
                                                </div>
                                                <div>
                                                    <p className="text-ivory font-display text-lg">{design.title}</p>
                                                    <p className={`text-[9px] uppercase tracking-widest mt-1 ${design.is_mine ? 'text-gold' : 'text-zinc-500'}`}>
                                                        {design.is_mine ? 'Votre Création' : 'Design Externe'}
                                                    </p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </section>

                                {/* Selected Fabrics */}
                                <section>
                                    <h3 className="text-[10px] tracking-widest uppercase font-bold text-ivory/40 mb-6 flex items-center gap-3">
                                        <Layers size={16} className="text-gold" />
                                        Matières Souhaitées
                                        <div className="h-[1px] flex-1 bg-white/5" />
                                    </h3>
                                    <div className="grid sm:grid-cols-2 gap-4">
                                        {selectedInquiry.selected_fabrics?.map(fabric => (
                                            <div key={fabric.id} className="p-4 bg-noir/40 border border-white/5 rounded-2xl flex items-center gap-4">
                                                {fabric.color ? (
                                                    <div
                                                        className="w-12 h-12 rounded-full border border-white/10 shadow-lg"
                                                        style={{
                                                            backgroundColor: `rgb(${fabric.color.join(',')})`
                                                        }}
                                                    />
                                                ) : (
                                                    <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500">
                                                        <Sparkles size={18} />
                                                    </div>
                                                )}
                                                <div>
                                                    <p className="text-ivory font-display text-lg">{fabric.name}</p>
                                                    <p className="text-[9px] uppercase tracking-widest text-emerald-500 mt-1">Stock Verified</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </section>

                                <div className="pt-10 border-t border-white/5">
                                    {['ordered', 'in_production', 'completed', 'shipped'].includes(selectedInquiry.status) ? (
                                        <button
                                            onClick={() => handleAcceptInquiry(selectedInquiry.id)}
                                            disabled={detailLoading}
                                            className="btn btn-secondary w-full py-5 flex items-center justify-center gap-4 group"
                                        >
                                            {detailLoading ? <Loader2 className="animate-spin" /> : (
                                                <>
                                                    <Eye size={20} />
                                                    Voir la commande en cours
                                                </>
                                            )}
                                        </button>
                                    ) : (
                                        <button
                                            onClick={() => handleAcceptInquiry(selectedInquiry.id)}
                                            disabled={detailLoading}
                                            className="btn btn-primary w-full py-5 flex items-center justify-center gap-4 group"
                                        >
                                            {detailLoading ? <Loader2 className="animate-spin" /> : (
                                                <>
                                                    <CheckCircle2 size={20} />
                                                    Prendre en charge la commande
                                                </>
                                            )}
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Inquiries;
