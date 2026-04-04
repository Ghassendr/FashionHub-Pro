import React, { useState, useEffect } from 'react';
import { 
    Users, Search, Loader2, 
    Palette, LayoutGrid, Plus, 
    LogOut, Menu, Layers, Clock, Package, CheckCircle2, ChevronRight
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import './CoutureDashboard.css';

const CommandesEnCours = () => {
    const navigate = useNavigate();
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [loading, setLoading] = useState(true);
    const [orders, setOrders] = useState([]);

    const token = localStorage.getItem('token');

    const fetchOrders = async () => {
        try {
            setLoading(true);
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
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!token) {
            navigate('/');
            return;
        }
        fetchOrders();
    }, [token]);

    const getStatusColor = (status) => {
        switch (status) {
            case 'pending': return 'text-amber-400 bg-amber-500/10 border-amber-500/20';
            case 'in_production': return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
            case 'completed': return 'text-blue-400 bg-blue-500/10 border-blue-500/20';
            default: return 'text-zinc-500 bg-white/5 border-white/10';
        }
    };

    const getFabricStatusBadge = (status) => {
        switch (status) {
            case 'available': return <span className="flex items-center gap-1 text-[10px] text-emerald-500 font-bold uppercase tracking-wider"><CheckCircle2 size={10} /> Stock Prêt</span>;
            case 'to_order': return <span className="flex items-center gap-1 text-[10px] text-rose-500 font-bold uppercase tracking-wider"><Package size={10} /> À Commander</span>;
            case 'ordered': return <span className="flex items-center gap-1 text-[10px] text-amber-500 font-bold uppercase tracking-wider"><Clock size={10} /> Livraison...</span>;
            default: return <span className="text-[10px] text-zinc-500 uppercase tracking-wider">Inconnu</span>;
        }
    };

    return (
        <div className="atelier-layout">
            <aside className={`atelier-sidebar ${sidebarOpen ? 'open' : 'closed'}`}>
                <div className="sidebar-header">
                    <div className="sidebar-logo">
                        <Palette size={24} />
                        {sidebarOpen && <span>ATELIER</span>}
                    </div>
                </div>
                <nav className="flex-1 mt-6">
                    <div className="nav-item" onClick={() => navigate('/couturehouse/dashboard')}>
                        <LayoutGrid size={20} />
                        {sidebarOpen && <span>Mes Designs</span>}
                    </div>
                    <div className="nav-item" onClick={() => navigate('/couturehouse/inquiries')}>
                        <Users size={20} />
                        {sidebarOpen && <span>Demandes Clients</span>}
                    </div>
                    <div className="nav-item active" onClick={() => navigate('/couturehouse/orders')}>
                        <Clock size={20} />
                        {sidebarOpen && <span>Commandes en cours</span>}
                    </div>
                    <div className="nav-item" onClick={() => navigate('/couturehouse/fabrics')}>
                        <Layers size={20} />
                        {sidebarOpen && <span>Matiéthèque</span>}
                    </div>
                    <div className="nav-item" onClick={() => navigate('/couturehouse/create')}>
                        <Plus size={20} />
                        {sidebarOpen && <span>Nouvelle Création</span>}
                    </div>
                </nav>
                <div className="sidebar-footer">
                    <div className="nav-item" onClick={() => navigate('/')}>
                        <LogOut size={20} />
                        {sidebarOpen && <span>Déconnexion</span>}
                    </div>
                </div>
            </aside>

            <main className={`atelier-main ${!sidebarOpen ? 'expanded' : ''}`}>
                <header className="atelier-top-bar">
                    <div className="flex items-center gap-6">
                        <button onClick={() => setSidebarOpen(!sidebarOpen)} className="text-zinc-500 hover:text-ivory transition-colors">
                            <Menu size={20} />
                        </button>
                        <div className="atelier-search">
                            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" />
                            <input type="text" placeholder="Rechercher une commande..." />
                        </div>
                    </div>
                </header>

                <div className="atelier-content animate-in">
                    <div className="mb-12">
                        <span className="text-label text-gold block mb-4 uppercase text-[10px] tracking-[0.3em]">Production Workflow</span>
                        <h1 className="text-5xl font-display text-ivory">Commandes en cours</h1>
                        <p className="text-zinc-500 mt-4 max-w-2xl">Suivez l'avancement de vos projets, gérez vos stocks de tissus et coordonnez les livraisons en un clic.</p>
                    </div>

                    {loading ? (
                        <div className="py-20 flex flex-col items-center justify-center">
                            <Loader2 className="animate-spin text-gold mb-4" size={40} />
                            <p className="text-zinc-500 text-sm uppercase tracking-widest">Initialisation de l'atelier...</p>
                        </div>
                    ) : orders.length === 0 ? (
                        <div className="py-32 text-center border border-dashed border-white/10 rounded-3xl bg-white/[0.02]">
                            <Package size={48} className="mx-auto text-zinc-800 mb-6" />
                            <h3 className="text-ivory/40 font-display text-xl mb-2">Aucun projet actif</h3>
                            <p className="text-zinc-600 text-sm max-w-xs mx-auto">Acceptez des demandes clients dans l'onglet "Demandes Clients" pour commencer la production.</p>
                        </div>
                    ) : (
                        <div className="grid gap-4">
                            {orders.map(order => (
                                <div 
                                    key={order.id} 
                                    className="inquiry-row group cursor-pointer"
                                    onClick={() => navigate(`/couturehouse/orders/${order.id}`)}
                                >
                                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 p-6 bg-noir/40 border border-white/5 rounded-2xl group-hover:border-gold/30 transition-all duration-500">
                                        <div className="flex items-center gap-5">
                                            <div className="w-12 h-12 rounded-full bg-gold/10 flex items-center justify-center text-gold border border-gold/20">
                                                <div className="text-[10px] font-black italic">#{order.id}</div>
                                            </div>
                                            <div>
                                                <h3 className="text-ivory font-display text-xl group-hover:text-gold transition-colors">{order.client_name}</h3>
                                                <div className="flex items-center gap-3 text-[10px] uppercase tracking-widest text-zinc-500 mt-1 font-black">
                                                    <Palette size={12} className="text-gold/50" />
                                                    {order.fabric_requested} — {order.quantity_needed}m
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex flex-wrap items-center gap-8">
                                            <div className="flex flex-col text-right">
                                                <span className="text-[9px] uppercase tracking-widest text-zinc-600 font-bold mb-1">Matière</span>
                                                {getFabricStatusBadge(order.fabric_status)}
                                            </div>
                                            
                                            <div className="flex flex-col text-right min-w-[120px]">
                                                <span className="text-[9px] uppercase tracking-widest text-zinc-600 font-bold mb-1">Status</span>
                                                <div className={`px-4 py-1.5 rounded-full text-[9px] uppercase tracking-widest font-black border text-center ${getStatusColor(order.status)}`}>
                                                    {order.status.replace('_', ' ')}
                                                </div>
                                            </div>
                                            
                                            <ChevronRight className="text-zinc-700 group-hover:text-gold transition-colors group-hover:translate-x-1 duration-300" />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
};

export default CommandesEnCours;
