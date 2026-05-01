import React, { useState, useEffect } from 'react';
import { 
    Package, Search, Loader2, ArrowLeft, 
    Palette, LayoutGrid, Plus, TrendingUp, Settings, 
    LogOut, Menu, Layers, Eye, Calendar, User, 
    ChevronRight, CheckCircle2, Clock, Truck, ShoppingCart,
    Hexagon, MapPin, ShieldCheck, Zap
} from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { authService } from '../../services/authService';
import './Dashboard.css';

const API_BASE = "http://localhost:8000";

const SupplierFabricOrders = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const isHistoryPage = location.pathname === '/fournisseur/history';
    const [loading, setLoading] = useState(true);
    const [orders, setOrders] = useState([]);

    const userInfo = authService.getUserInfo();
    const token = authService.getToken();

    const fetchOrders = async (silent = false) => {
        try {
            if (!silent) setLoading(true);
            // Updated endpoint to match config/urls.py standardized prefix
            const response = await fetch(`${API_BASE}/api/fournisseur/orders`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) {
                const data = await response.json();
                let fetchedOrders = data.orders || [];
                
                if (isHistoryPage) {
                    fetchedOrders = fetchedOrders.filter(o => 
                        ['shipped', 'delivered', 'received'].includes(o.status)
                    );
                }
                
                setOrders(fetchedOrders);
            }
        } catch (err) {
            console.error("Failed to fetch received orders", err);
        } finally {
            if (!silent) setLoading(false);
        }
    };

    const updateOrderStatus = async (orderId, newStatus) => {
        try {
            const response = await fetch(`${API_BASE}/api/fournisseur/orders/${orderId}/status`, {
                method: 'PATCH',
                headers: { 
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ status: newStatus })
            });
            if (response.ok) {
                fetchOrders();
            }
        } catch (err) {
            console.error("Failed to update status", err);
        }
    };

    useEffect(() => {
        if (!token) {
            navigate('/login');
            return;
        }
        fetchOrders();

        // 5-second Silent Polling
        const interval = setInterval(() => {
            fetchOrders(true);
        }, 5000);

        return () => clearInterval(interval);
    }, [token]);

    const getStatusColor = (status) => {
        switch (status) {
            case 'pending': return { label: 'En attente', text: '#C6A75E', bg: 'rgba(198,167,94,0.1)', border: 'rgba(198,167,94,0.3)' };
            case 'confirmed': return { label: 'Confirmé', text: '#6FCF97', bg: 'rgba(111,207,151,0.1)', border: 'rgba(111,207,151,0.3)' };
            case 'preparing': return { label: 'Préparation', text: '#54A6FF', bg: 'rgba(84,166,255,0.1)', border: 'rgba(84,166,255,0.3)' };
            case 'ready_for_pickup': return { label: 'Prêt pour enlèvement', text: '#FFFFFF', bg: 'rgba(255,255,255,0.1)', border: 'rgba(255,255,255,0.3)' };
            case 'shipped': return { label: 'Expédié', text: '#9B51E0', bg: 'rgba(155,81,224,0.1)', border: 'rgba(155,81,224,0.3)' };
            case 'delivered': return { label: 'Livré', text: '#6FCF97', bg: 'rgba(111,207,151,0.2)', border: 'rgba(111,207,151,0.4)' };
            case 'cancelled': return { label: 'Annulé', text: '#EB5757', bg: 'rgba(235,87,87,0.1)', border: 'rgba(235,87,87,0.3)' };
            default: return { label: status, text: '#888', bg: 'rgba(255,255,255,0.05)', border: 'rgba(255,255,255,0.1)' };
        }
    };

    return (
        <div className="animate-fade-in p-6 lg:p-12 max-w-[1600px] mx-auto min-h-screen">
            {/* Context Header */}
            <div className="mb-12 border-b border-gold/10 pb-8">
                <div className="flex items-center gap-4 mb-4">
                    <span className="text-[10px] tracking-[0.3em] uppercase text-gold font-bold bg-gold/10 px-4 py-1.5 rounded-full border border-gold/20 flex items-center gap-2">
                        <Package size={12} /> Fulfillment Center
                    </span>
                </div>
                <h1 className="text-4xl md:text-6xl font-display text-ivory italic flex items-center gap-4">
                    {isHistoryPage ? 'Historique des Ventes' : 'Flux & Commandes'}
                </h1>
                <p className="text-ivory/40 mt-4 max-w-2xl font-light leading-relaxed">
                    {isHistoryPage 
                        ? 'Consultez les archives de vos transactions passées et les livraisons confirmées.' 
                        : 'Visualisation centralisée des flux textiles confirmés par les Maisons de Couture. Gérez les expéditions et assurez la traçabilité de vos matières précieuses.'
                    }
                </p>
            </div>

            {loading ? (
                        <div className="py-24 flex flex-col items-center">
                            <Loader2 className="animate-spin text-[#C6A75E] mb-6" size={48} />
                            <p className="text-[#C6A75E]/50 text-[10px] font-black uppercase tracking-[0.3em]">Synchro avec le réseau logistique...</p>
                        </div>
                    ) : orders.length === 0 ? (
                        <div className="py-40 text-center rounded-[40px] border border-white/5 bg-white/[0.01] backdrop-blur-sm">
                            <div className="w-24 h-24 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-8 border border-white/10 group">
                                <Package size={40} className="text-white/10 group-hover:scale-110 transition-transform duration-500" />
                            </div>
                            <h3 className="text-white/60 font-serif text-3xl mb-3">Aucun flux détecté</h3>
                            <p className="text-white/30 text-sm max-w-xs mx-auto font-medium">
                                Vos tissus n'ont pas encore fait l'objet de commandes de la part des Ateliers.
                            </p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 gap-8">
                            {orders.map(order => {
                                const styles = getStatusColor(order.status);
                                return (
                                    <div key={order.id} className="group relative">
                                        {/* Luxury Card */}
                                        <div className="p-6 rounded-[24px] border border-white/5 bg-gradient-to-br from-white/[0.03] to-transparent hover:border-[#C6A75E]/20 hover:from-white/[0.05] transition-all duration-700 relative overflow-hidden flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                                            
                                            {/* Hover Glow */}
                                            <div className="absolute top-0 right-0 w-64 h-64 bg-[#C6A75E]/5 blur-[100px] rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />
                                            
                                            {/* Left Section: Product Info */}
                                            <div className="flex items-center gap-6 relative z-10">
                                                <div className="w-16 h-20 rounded-xl overflow-hidden bg-white/5 border border-white/10 flex items-center justify-center group-hover:scale-105 transition-transform duration-700">
                                                    {/* We could add an image from f.image if we link it in the serializer */}
                                                    <Layers size={24} className="text-[#C6A75E]/30" />
                                                </div>
                                                
                                                <div className="space-y-2">
                                                    <div className="flex items-center gap-3">
                                                        <h3 className="text-xl font-serif text-white tracking-wide">{order.fabric_name}</h3>
                                                        <span className="text-[9px] bg-white/5 text-white/30 px-2 py-0.5 rounded border border-white/5 font-black tracking-widest uppercase">ID #{order.id}</span>
                                                    </div>
                                                    
                                                    <div className="flex flex-wrap items-center gap-6">
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-5 h-5 bg-[#C6A75E]/10 rounded flex items-center justify-center">
                                                                <User size={12} className="text-[#C6A75E]" />
                                                            </div>
                                                            <span className="text-xs font-bold text-white/50">{order.couture_house_name}</span>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-5 h-5 bg-[#C6A75E]/10 rounded flex items-center justify-center">
                                                                <Package size={12} className="text-[#C6A75E]" />
                                                            </div>
                                                            <span className="text-xs font-bold text-white/50">{order.quantity} m²</span>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-5 h-5 bg-[#C6A75E]/10 rounded flex items-center justify-center">
                                                                <Calendar size={12} className="text-[#C6A75E]" />
                                                            </div>
                                                            <span className="text-xs font-bold text-white/50">{new Date(order.created_at).toLocaleDateString('fr-FR')}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Right Section: Logistics & Status */}
                                            <div className="flex flex-wrap items-center gap-8 relative z-10 ml-auto">
                                                
                                                {/* Transport Priority */}
                                                <div className="text-right">
                                                    <p className="text-[9px] uppercase tracking-[0.2em] text-white/20 font-black mb-2">Expédition</p>
                                                    <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full border text-[11px] font-black tracking-widest ${
                                                        order.delivery_type === 'urgent' 
                                                            ? 'text-rose-400 border-rose-400/20 bg-rose-400/5' 
                                                            : 'text-white/60 border-white/5 bg-white/5'
                                                    }`}>
                                                        {order.delivery_type === 'urgent' ? <Zap size={14} /> : <Truck size={14} />}
                                                        {order.delivery_type.toUpperCase()}
                                                    </div>
                                                </div>

                                                {/* Status Lifecycle */}
                                                <div className="text-right min-w-[120px]">
                                                    <p className="text-[9px] uppercase tracking-[0.2em] text-white/20 font-black mb-2">Statut Dossier</p>
                                                    <div 
                                                        className="px-4 py-2 rounded-xl border text-[10px] font-black tracking-widest text-center transition-all duration-300"
                                                        style={{ 
                                                            color: styles.text, 
                                                            backgroundColor: styles.bg, 
                                                            borderColor: styles.border,
                                                            boxShadow: `0 0 20px ${styles.bg}`
                                                        }}
                                                    >
                                                        {(styles.label || order.status).toUpperCase()}
                                                    </div>
                                                </div>

                                                {/* Action Milestone Buttons */}
                                                <div className="flex items-center gap-3">
                                                    {order.status === 'pending' && (
                                                        <>
                                                            <button 
                                                                onClick={() => updateOrderStatus(order.id, 'confirmed')}
                                                                className="px-6 py-3 rounded-full bg-white text-black text-[10px] font-black tracking-widest uppercase hover:bg-[#C6A75E] transition-all whitespace-nowrap active:scale-95"
                                                            >
                                                                Accepter
                                                            </button>
                                                            <button 
                                                                onClick={() => updateOrderStatus(order.id, 'cancelled')}
                                                                className="px-6 py-3 rounded-full border border-rose-500/30 text-rose-500 text-[10px] font-black tracking-widest uppercase hover:bg-rose-500/10 transition-all whitespace-nowrap active:scale-95"
                                                            >
                                                                Décliner
                                                            </button>
                                                        </>
                                                    )}

                                                    {order.status === 'confirmed' && (
                                                        <button 
                                                            onClick={() => updateOrderStatus(order.id, 'preparing')}
                                                            className="px-6 py-3 rounded-full bg-[#C6A75E] text-black text-[10px] font-black tracking-widest uppercase hover:bg-white transition-all whitespace-nowrap shadow-[0_0_20px_rgba(198,167,94,0.3)] active:scale-95"
                                                        >
                                                            Lancer Préparation
                                                        </button>
                                                    )}

                                                    {order.status === 'preparing' && (
                                                        <button 
                                                            onClick={() => updateOrderStatus(order.id, 'ready_for_pickup')}
                                                            className="px-6 py-3 rounded-full border border-[#C6A75E] text-[#C6A75E] text-[10px] font-black tracking-widest uppercase hover:bg-[#C6A75E] hover:text-black transition-all whitespace-nowrap animate-pulse active:scale-95"
                                                        >
                                                            Marquer comme Prêt
                                                        </button>
                                                    )}

                                                    {order.status === 'ready_for_pickup' && (
                                                        <div className="px-6 py-3 rounded-full border border-white/10 text-white/30 text-[10px] font-black tracking-widest uppercase italic bg-white/5">
                                                            En attente Enlèvement
                                                        </div>
                                                    )}

                                                    {order.status === 'shipped' && (
                                                        <div className="flex items-center gap-2 text-gold/50 text-[10px] font-black tracking-widest uppercase">
                                                            <Truck size={14} className="animate-bounce" />
                                                            En cours de transit
                                                        </div>
                                                    )}

                                                    {order.status === 'delivered' && (
                                                        <div className="flex items-center gap-2 text-green-400 text-[10px] font-black tracking-widest uppercase">
                                                            <CheckCircle2 size={14} />
                                                            Livré avec succès
                                                        </div>
                                                    )}
                                                </div>

                                                <button className="w-10 h-10 rounded-full border border-white/5 bg-white/[0.02] flex items-center justify-center text-white/20 hover:text-[#C6A75E] hover:border-[#C6A75E]/30 hover:bg-[#C6A75E]/5 transition-all duration-500 group">
                                                    <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform" />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
        </div>
    );
};

export default SupplierFabricOrders;
