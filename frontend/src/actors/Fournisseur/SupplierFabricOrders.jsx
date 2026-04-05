import React, { useState, useEffect } from 'react';
import { 
    Package, Search, Loader2, ArrowLeft, 
    Palette, LayoutGrid, Plus, TrendingUp, Settings, 
    LogOut, Menu, Layers, Eye, Calendar, User, 
    ChevronRight, CheckCircle2, Clock, Truck, ShoppingCart,
    Hexagon, MapPin, ShieldCheck, Zap
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../../services/authService';
import './Dashboard.css';

const API_BASE = "http://localhost:8000";

const SupplierFabricOrders = () => {
    const navigate = useNavigate();
    const [sidebarOpen, setSidebarOpen] = useState(true);
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
                setOrders(data.orders || []);
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
        <div className="flex h-screen bg-[#0A0A0A] font-inter overflow-hidden text-white">
            {/* Atelier Sidebar (Noir/Gold Theme) */}
            <aside className={`w-64 flex-shrink-0 border-r border-white/5 bg-black/40 backdrop-blur-2xl flex flex-col transition-all duration-500 ease-in-out ${sidebarOpen ? 'ml-0' : '-ml-64'}`}>
                <div className="p-8 border-b border-white/5">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-[#C6A75E] to-[#8E793E] rounded-lg flex items-center justify-center text-black font-black shadow-[0_0_20px_rgba(198,167,94,0.3)]">FP</div>
                        <span className="text-sm font-black tracking-[0.2em] text-[#C6A75E]">SUPPLIER</span>
                    </div>
                </div>
                
                <nav className="flex-1 p-6 space-y-2">
                    <div className="text-[10px] uppercase font-black text-white/30 tracking-widest mb-4 px-4">Inventaire & Flux</div>
                    
                    <div onClick={() => navigate('/fournisseur/dashboard')} className="flex items-center gap-4 p-4 text-white/50 hover:text-[#C6A75E] hover:bg-white/[0.03] transition-all rounded-xl cursor-pointer group">
                        <Layers size={18} className="group-hover:scale-110 transition-transform" />
                        <span className="text-sm font-medium">Catalogue Matières</span>
                    </div>

                    <div className="flex items-center gap-4 p-4 text-[#C6A75E] bg-[#C6A75E]/10 rounded-xl border border-[#C6A75E]/20 shadow-[0_0_15px_rgba(198,167,94,0.05)]">
                        <ShoppingCart size={18} />
                        <span className="text-sm font-bold">Commandes Clients</span>
                    </div>

                    {/* Removed Analytiques pending future dev */}

                    <div className="pt-8 text-[10px] uppercase font-black text-white/30 tracking-widest mb-4 px-4">Paramètres</div>
                    <div onClick={() => navigate('/fournisseur/settings')} className="flex items-center gap-4 p-4 text-white/50 hover:text-[#C6A75E] hover:bg-white/[0.03] transition-all rounded-xl cursor-pointer group">
                        <Settings size={18} className="group-hover:scale-110 transition-transform" />
                        <span className="text-sm font-medium">Atelier Settings</span>
                    </div>
                </nav>

                <div className="p-6 border-t border-white/5">
                    <button onClick={() => { authService.logout(); navigate('/login'); }} className="flex items-center gap-4 p-4 w-full text-white/30 hover:text-rose-400 hover:bg-rose-500/5 transition-all rounded-xl cursor-pointer group">
                        <LogOut size={18} className="group-hover:translate-x-1 transition-transform" />
                        <span className="text-sm font-bold">Déconnexion</span>
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 flex flex-col overflow-hidden">
                <header className="h-20 border-b border-white/5 flex items-center justify-between px-10 bg-black/20 backdrop-blur-xl">
                    <div className="flex items-center gap-6">
                        <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2 text-white/40 hover:text-white transition-colors bg-white/5 rounded-lg border border-white/5">
                            <Menu size={20} />
                        </button>
                        <div className="h-6 w-[1px] bg-white/10" />
                        <div className="text-[11px] font-black tracking-widest text-[#C6A75E] uppercase bg-[#C6A75E]/5 px-3 py-1.5 rounded-md border border-[#C6A75E]/10">
                            Fulfillment Center
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="flex flex-col items-end">
                            <span className="text-[10px] font-black text-white/30 tracking-widest uppercase">Authenticated Session</span>
                            <span className="text-xs font-bold text-white/80">{userInfo?.name || "L'Artisan Textile"}</span>
                        </div>
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#C6A75E]/20 to-transparent border border-[#C6A75E]/30 flex items-center justify-center font-black text-xs text-[#C6A75E] shadow-inner">
                            {userInfo?.name?.[0] || "AT"}
                        </div>
                    </div>
                </header>

                <div className="flex-1 overflow-y-auto p-12 custom-scrollbar">
                    {/* Hero Section */}
                    <div className="mb-16">
                        <div className="flex items-center gap-2 mb-4">
                            <div className="w-8 h-[1px] bg-[#C6A75E]" />
                            <span className="text-[11px] uppercase font-black tracking-[0.4em] text-[#C6A75E]">Ordres de Livraison</span>
                        </div>
                        <h1 className="text-5xl font-serif text-white leading-tight">Flux & Commandes</h1>
                        <p className="text-white/40 mt-4 max-w-xl text-lg font-light leading-relaxed">
                            Visualisation centralisée des flux textiles confirmés par les Maisons de Couture. 
                            Gérez les expéditions et assurez la traçabilité de vos matières précieuses.
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
            </main>
            
            <style dangerouslySetInnerHTML={{ __html: `
                .custom-scrollbar::-webkit-scrollbar { width: 5px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(198,167,94,0.1); border-radius: 10px; }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(198,167,94,0.3); }
            `}} />
        </div>
    );
};

export default SupplierFabricOrders;
