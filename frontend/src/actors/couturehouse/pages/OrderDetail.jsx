import React, { useState, useEffect } from 'react';
import {
    Users, Search, Loader2, ArrowLeft,
    Palette, LayoutGrid, Plus, TrendingUp, Settings,
    LogOut, Menu, Layers, Eye, Calendar, User,
    ChevronRight, Ruler, Sparkles, CheckCircle2, Clock, Package,
    Truck, MapPin, Mail, Phone, AlertTriangle, X
} from 'lucide-react';
import { useParams, useNavigate } from 'react-router-dom';
import Viewer3D from '../../client/components/Viewer3D';
import FabricOrderWizard from '../components/FabricOrderWizard';
import CoutureLayout from '../components/CoutureLayout';
import CoutureTrackingBar from '../../../shared/components/Logistics/CoutureTrackingBar';
import './CoutureDashboard.css';

const OrderDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [order, setOrder] = useState(null);
    const [fabricOrders, setFabricOrders] = useState([]);
    const [showWizard, setShowWizard] = useState(false);
    const [isEditingQty, setIsEditingQty] = useState(false);
    const [newQty, setNewQty] = useState('');

    const token = localStorage.getItem('token');
    const API_BASE = 'http://localhost:8000';

    const fetchOrderDetails = async (silent = false) => {
        try {
            if (!silent) setLoading(true);
            const response = await fetch(`${API_BASE}/api/couturehouse/orders/${id}/`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) {
                const data = await response.json();
                setOrder(data);
            }
        } catch (err) {
            console.error("Failed to fetch order details", err);
        } finally {
            if (!silent) setLoading(false);
        }
    };

    const fetchFabricOrders = async (silent = false) => {
        try {
            const response = await fetch(`${API_BASE}/api/couturehouse/orders/fabric-purchases/`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) {
                const data = await response.json();
                setFabricOrders(data.orders || []);
            }
        } catch (err) {
            console.error("Failed to fetch fabric orders", err);
        }
    };

    const handleConfirmReceipt = async (orderId) => {
        try {
            const response = await fetch(`${API_BASE}/api/couturehouse/orders/${orderId}/confirm-receipt/`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) {
                fetchOrderDetails();
                fetchFabricOrders();
            }
        } catch (err) {
            console.error("Confirmation failed", err);
        }
    };

    const handleUpdateQuantity = async () => {
        try {
            const response = await fetch(`${API_BASE}/api/couturehouse/orders/${id}/update-quantity/`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ quantity_needed: newQty })
            });
            if (response.ok) {
                setIsEditingQty(false);
                fetchOrderDetails();
            }
        } catch (err) {
            console.error("Failed to update quantity", err);
        }
    };

    const handleStartProduction = async () => {
        try {
            const response = await fetch(`${API_BASE}/api/couturehouse/orders/${id}/start/`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) {
                fetchOrderDetails();
            }
        } catch (err) {
            console.error("Failed to start production", err);
        }
    };

    const handleCompleteProduction = async () => {
        try {
            const response = await fetch(`${API_BASE}/api/couturehouse/orders/${id}/complete/`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) {
                fetchOrderDetails();
            }
        } catch (err) {
            console.error("Failed to complete production", err);
        }
    };

    const handleShipOrder = async () => {
        try {
            const response = await fetch(`${API_BASE}/api/couturehouse/orders/${id}/ship/`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) {
                fetchOrderDetails();
            }
        } catch (err) {
            console.error("Failed to ship order", err);
        }
    };

    useEffect(() => {
        if (!token) {
            navigate('/');
            return;
        }
        fetchOrderDetails();
        fetchFabricOrders();

        // Real-time synchronization (polling every 5 seconds)
        const syncInterval = setInterval(() => {
            fetchOrderDetails(true);
            fetchFabricOrders(true);
        }, 5000);

        return () => clearInterval(syncInterval);
    }, [id, token]);

    if (loading || !order) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-noir text-ivory">
                <Loader2 className="animate-spin text-gold" size={48} />
            </div>
        );
    }

    const { stock_analysis } = order;

    return (
        <CoutureLayout>
            <div className="flex flex-col lg:flex-row gap-12">
                {/* Left Column: Visual & Measurements */}
                <div className="lg:w-1/3">
                    <div className="sticky top-8 space-y-8">
                        <div className="aspect-[3/4] bg-noir/60 border border-white/5 rounded-3xl overflow-hidden relative shadow-2xl">
                            {order.scan_result?.mesh_url ? (
                                <Viewer3D url={
                                    order.scan_result.mesh_url.startsWith('http')
                                        ? order.scan_result.mesh_url
                                        : `${API_BASE}${order.scan_result.mesh_url}`
                                } />
                            ) : (
                                <div className="w-full h-full flex flex-col items-center justify-center text-zinc-800">
                                    <LayoutGrid size={64} className="opacity-10 mb-4" />
                                    <p className="text-[10px] uppercase tracking-widest font-black opacity-30">Scan 3D non disponible</p>
                                </div>
                            )}
                            <div className="absolute top-6 left-6 px-3 py-1 bg-noir/60 backdrop-blur-md rounded-full border border-white/10 flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-gold animate-pulse" />
                                <span className="text-[9px] uppercase tracking-widest font-black text-white/80">Digital Twin</span>
                            </div>
                        </div>
                        {order.design_preview_url && (
                            <div className="p-4 bg-white/[0.02] border border-white/5 rounded-2xl group/ref">
                                <h4 className="text-[10px] uppercase tracking-widest font-black text-gold mb-3 flex items-center gap-2">
                                    <Palette size={14} /> Modèle de Référence
                                </h4>
                                <div className="aspect-[4/3] w-full rounded-xl overflow-hidden border border-white/10 relative">
                                    <img
                                        src={`${API_BASE}${order.design_preview_url}`}
                                        alt="Design Preview"
                                        className="w-full h-full object-cover grayscale opacity-60 group-hover/ref:grayscale-0 group-hover/ref:opacity-100 transition-all duration-700"
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-noir via-transparent to-transparent opacity-60" />
                                </div>
                            </div>
                        )}

                        <div className="p-6 bg-white/[0.02] border border-white/5 rounded-2xl">
                            <h4 className="text-[10px] uppercase tracking-widest font-black text-gold mb-4 flex items-center gap-2">
                                <Ruler size={14} /> Mensurations du Projet
                            </h4>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="stat-item">
                                    <span className="text-[9px] text-zinc-600 block uppercase font-bold">Morphologie</span>
                                    <span className="text-ivory font-display">Silhouette {order.scan_result?.morphology?.silhouette?.shape_letter || 'NC'}</span>
                                </div>
                                <div className="stat-item text-right">
                                    <span className="text-[9px] text-zinc-600 block uppercase font-bold">Teint</span>
                                    <span className="text-emerald-400 font-display">{order.skin_result?.name || 'NC'}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Column: Order Details & Logic */}
                <div className="flex-1 space-y-12">
                    <section>
                        <div className="flex justify-between items-start mb-6">
                            <div>
                                <h1 className="text-6xl font-display text-ivory mb-2">{order.client_name}</h1>
                                <p className="text-zinc-500 uppercase tracking-widest text-[10px] font-bold">Dossier de Production — ORDR-{order.id.toString().padStart(4, '0')}</p>
                            </div>
                            <div className="flex flex-col items-end gap-2">
                                <div className="flex items-center gap-2">
                                    {order.is_paid && (
                                        <div className="px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[8px] uppercase tracking-widest font-black rounded-lg flex items-center gap-1.5">
                                            <CreditCard size={10} /> Paiement Reçu
                                        </div>
                                    )}
                                    <div className={`px-6 py-2 rounded-full text-[10px] uppercase tracking-widest font-black border ${order.status === 'in_production' ? 'text-emerald-400 border-emerald-500/20 bg-emerald-500/5' :
                                            order.status === 'completed' ? 'text-blue-400 border-blue-500/20 bg-blue-500/5' :
                                                order.status === 'shipped' ? 'text-purple-400 border-purple-500/20 bg-purple-500/5' :
                                                    'text-amber-400 border-amber-500/20 bg-amber-500/5'
                                        }`}>
                                        {order.status.replace('_', ' ')}
                                    </div>
                                </div>
                                {order.status === 'in_production' && (
                                    <button
                                        onClick={handleCompleteProduction}
                                        className="text-[9px] uppercase tracking-widest font-black text-gold hover:text-ivory transition-colors flex items-center gap-2 px-4 py-2 bg-white/5 rounded-full border border-white/5"
                                    >
                                        <CheckCircle2 size={12} /> Terminer Production
                                    </button>
                                )}
                                {order.status === 'completed' && (
                                    <button
                                        onClick={handleShipOrder}
                                        disabled={!order.is_paid}
                                        className={`text-[9px] uppercase tracking-widest font-black flex items-center gap-2 px-4 py-2 rounded-full border transition-all ${order.is_paid 
                                            ? 'text-emerald-400 border-emerald-500/20 bg-emerald-500/10 hover:bg-emerald-500/20' 
                                            : 'text-zinc-600 border-zinc-800 bg-white/5 cursor-not-allowed opacity-50'}`}
                                    >
                                        <Truck size={12} /> {order.is_paid ? "Confirmer Expédition" : "En attente de paiement"}
                                    </button>
                                )}
                            </div>
                        </div>

                        <div className="grid sm:grid-cols-3 gap-4 py-8 border-y border-white/5">
                            <div className="flex items-center gap-4">
                                <Mail className="text-gold/40" size={18} />
                                <div>
                                    <p className="text-[9px] uppercase tracking-widest text-zinc-600 font-bold">Email</p>
                                    <p className="text-ivory text-sm">{order.client_email || 'nc@client.com'}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-4">
                                <MapPin className="text-gold/40" size={18} />
                                <div>
                                    <p className="text-[9px] uppercase tracking-widest text-zinc-600 font-bold">Localisation</p>
                                    <p className="text-ivory text-sm">Paris, France</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-4">
                                <Calendar className="text-gold/40" size={18} />
                                <div>
                                    <p className="text-[9px] uppercase tracking-widest text-zinc-600 font-bold">Deadline</p>
                                    <p className="text-rose-400 text-sm font-black">{order.deadline || '15 Juin 2024'}</p>
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* Fabric Availability Section */}
                    <section className="p-10 bg-noir/40 border border-white/5 rounded-3xl relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-gold/5 blur-[100px] rounded-full -translate-y-1/2 translate-x-1/2" />

                        <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-10">
                            <div className="space-y-6">
                                <h3 className="text-[10px] tracking-[0.3em] uppercase font-black text-gold">Logistique Matière</h3>
                                <div className="flex items-center gap-4">
                                    {stock_analysis.fabric_image_url && (
                                        <div className="w-16 h-16 rounded-2xl overflow-hidden border border-white/10 bg-noir/40 group/fabric relative">
                                            <img
                                                src={`${API_BASE}${stock_analysis.fabric_image_url}`}
                                                alt="Fabric"
                                                className="w-full h-full object-cover grayscale opacity-60 group-hover/fabric:grayscale-0 group-hover/fabric:opacity-100 transition-all duration-500"
                                            />
                                            <div className="absolute inset-0 bg-gold/10 opacity-0 group-hover/fabric:opacity-100 transition-opacity" />
                                        </div>
                                    )}
                                    <div className="flex flex-col">
                                        <span className="text-[9px] uppercase text-zinc-600 font-bold mb-1">Matière Demandée</span>
                                        <span className="text-2xl font-display text-ivory tracking-tight">{order.fabric_requested}</span>
                                    </div>
                                </div>

                                <div className="flex flex-col">
                                    <span className="text-[9px] uppercase text-zinc-600 font-bold mb-1">Besoin Projet</span>
                                    {isEditingQty ? (
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="number"
                                                step="0.1"
                                                value={newQty}
                                                onChange={(e) => setNewQty(e.target.value)}
                                                className="bg-noir/60 border border-gold/30 text-ivory text-xl font-display w-24 px-2 rounded focus:outline-none focus:border-gold"
                                            />
                                            <button
                                                onClick={handleUpdateQuantity}
                                                className="text-gold hover:text-ivory transition-colors"
                                                title="Sauvegarder"
                                            >
                                                <CheckCircle2 size={20} />
                                            </button>
                                            <button
                                                onClick={() => setIsEditingQty(false)}
                                                className="text-zinc-500 hover:text-rose-400 transition-colors"
                                                title="Annuler"
                                            >
                                                <X size={20} />
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-4 group/qty">
                                            <span className="text-xl font-display text-ivory">{stock_analysis.needed_quantity}m</span>
                                            <button
                                                onClick={() => {
                                                    setIsEditingQty(true);
                                                    setNewQty(stock_analysis.needed_quantity);
                                                }}
                                                className="opacity-0 group-hover/qty:opacity-100 transition-opacity text-gold/60 hover:text-gold"
                                                title="Modifier"
                                            >
                                                <Settings size={14} />
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="w-full md:w-auto">
                                {stock_analysis.is_available_locally ? (
                                    <div className="flex flex-col items-center gap-4">
                                        <div className="w-20 h-20 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500 border border-emerald-500/20">
                                            <CheckCircle2 size={40} />
                                        </div>
                                        <span className="text-[10px] uppercase tracking-[0.2em] font-black text-emerald-500">Fabric Available</span>
                                        {order.status === 'pending' && (
                                            <button
                                                onClick={handleStartProduction}
                                                className="px-8 py-4 bg-gold text-noir font-black uppercase tracking-widest text-[10px] rounded-2xl hover:bg-ivory hover:scale-105 active:scale-95 transition-all shadow-xl shadow-gold/20"
                                            >
                                                Lancer la production
                                            </button>
                                        )}
                                        {order.status === 'in_production' && (
                                            <div className="flex flex-col items-center gap-4">
                                                <div className="flex items-center gap-2 text-emerald-500 text-[9px] font-black uppercase tracking-widest">
                                                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                                                    En cours de confection
                                                </div>
                                                <button
                                                    onClick={handleCompleteProduction}
                                                    className="px-8 py-4 bg-emerald-600/20 border border-emerald-500/30 text-emerald-500 font-black uppercase tracking-widest text-[10px] rounded-2xl hover:bg-emerald-500 hover:text-noir hover:scale-105 active:scale-95 transition-all"
                                                >
                                                    Terminer la production
                                                </button>
                                            </div>
                                        )}
                                        {order.status === 'completed' && (
                                            <div className="flex flex-col items-center gap-4">
                                                <div className="w-20 h-20 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-500 border border-emerald-500/40">
                                                    <CheckCircle2 size={40} />
                                                </div>
                                                <div className="text-center">
                                                    <span className="text-[10px] uppercase tracking-[0.2em] font-black text-emerald-500">Confection Terminée</span>
                                                    <p className="text-[8px] text-zinc-500 mt-1 uppercase tracking-widest">Le client a été notifié</p>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center gap-6 w-full p-6 rounded-3xl bg-white/[0.02] border border-white/5 shadow-inner">
                                        <div className="flex flex-col items-center gap-2">
                                            <div className="flex items-center gap-3 px-4 py-2 bg-rose-500/10 border border-rose-500/20 rounded-full text-rose-500 text-[10px] font-black uppercase tracking-widest animate-pulse">
                                                <AlertTriangle size={14} /> Stock Insuffisant
                                            </div>
                                            <span className="text-[10px] text-zinc-600 uppercase font-black tracking-[0.2em] mt-2">Marché Logistique Recommandé</span>
                                        </div>

                                        <button
                                            onClick={() => setShowWizard(true)}
                                            className="group relative w-full px-8 py-5 bg-gold text-noir font-black uppercase tracking-widest text-[11px] rounded-2xl transition-all shadow-xl shadow-gold/20 flex items-center justify-center gap-3 hover:bg-ivory hover:-translate-y-1 active:scale-95 overflow-hidden"
                                        >
                                            <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                                            <Package size={20} className="relative z-10 group-hover:scale-110 transition-transform" />
                                            <span className="relative z-10 transition-all group-hover:tracking-[0.2em]">Commander le tissu</span>
                                        </button>
                                        <div className="flex flex-col items-center gap-1">
                                            <p className="text-[9px] text-zinc-600 text-center italic font-bold">Disponibilité fournisseur : {stock_analysis.supplier_available_quantity}m</p>
                                            <p className="text-[8px] text-gold/60 uppercase tracking-widest font-black">Matching Partenaires : 2 disponibles</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </section>

                    {/* Delivery Tracking (If ordered) */}
                    {order.fabric_status === 'ordered' && (
                        <section className="p-8 border border-white/5 bg-white/[0.01] rounded-3xl">
                            <h3 className="text-[10px] tracking-widest uppercase font-bold text-zinc-600 mb-6 flex items-center gap-3">
                                <Truck size={16} className="text-gold" />
                                Suivi Logistique Fournisseur
                                <div className="h-[1px] flex-1 bg-white/5" />
                            </h3>
                            {fabricOrders.filter(fo => fo.fabric === order.fabric_id).slice(0, 1).map(latestFOrder => (
                                <div key={latestFOrder.id} className="space-y-6">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-6">
                                            <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center text-gold">
                                                <Package size={24} />
                                            </div>
                                            <div>
                                                <p className="text-ivory font-display text-lg">
                                                    {latestFOrder.status === 'delivered' ? 'Commande Livrée' : 'En transit : Nice → Sousse'}
                                                </p>
                                                <p className="text-[10px] text-emerald-500 uppercase font-black tracking-widest">
                                                    {latestFOrder.status === 'delivered' ? 'Livraison confirmée' : 'Arrivée estimée : Demain, 14:00'}
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="pt-4 border-t border-white/5">
                                        <CoutureTrackingBar 
                                            status={latestFOrder.status} 
                                            onConfirm={() => handleConfirmReceipt(latestFOrder.id)}
                                        />
                                    </div>
                                </div>
                            ))}
                            {!fabricOrders.some(fo => fo.fabric === order.fabric_id) && (
                                <div className="text-zinc-500 text-sm italic">
                                    Aucune commande de tissu associée trouvée.
                                </div>
                            )}
                        </section>
                    )}
                </div>
            </div>

            {/* Fabric Order Wizard Modal */}
            {showWizard && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 backdrop-blur-2xl bg-noir/80">
                    <div className="w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-3xl border border-white/10 shadow-2xl custom-scrollbar">
                        <FabricOrderWizard
                            order={order}
                            onClose={() => setShowWizard(false)}
                            onComplete={() => {
                                setShowWizard(false);
                                fetchOrderDetails();
                            }}
                        />
                    </div>
                </div>
            )}
        </CoutureLayout>
    );
};

export default OrderDetail;
