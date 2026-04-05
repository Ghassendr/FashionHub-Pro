import React, { useState, useEffect } from 'react';
import { 
    LayoutGrid, History, TrendingUp, Package, Gauge, Sparkles, 
    ArrowRight, DollarSign, Layers, Plus, CreditCard, User
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../../services/authService';
import './Dashboard.css';

const Atelier = () => {
    const navigate = useNavigate();
    const token = authService.getToken();
    const [stats, setStats] = useState({
        totalFabrics: 0,
        totalQuantity: 0,
        avgPrice: 0,
        topMaterial: "N/A"
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!token) {
            navigate('/login');
            return;
        }
        fetchData();
    }, [token, navigate]);

    const fetchData = async () => {
        try {
            setLoading(true);
            const response = await fetch("http://localhost:8000/api/fournisseur/fabrics", {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (response.ok) {
                const data = await response.json();
                const fabrics = data.fabrics || [];
                
                if (fabrics.length > 0) {
                    const totalQuantity = fabrics.reduce((sum, f) => sum + (f.quantite || 0), 0);
                    const avgPrice = fabrics.reduce((sum, f) => sum + (f.prix || 0), 0) / fabrics.length;
                    setStats({
                        totalFabrics: fabrics.length,
                        totalQuantity: Math.round(totalQuantity),
                        avgPrice: avgPrice.toFixed(2),
                        topMaterial: "Silk" // Simplified for demo
                    });
                }
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="animate-fade-in p-6 lg:p-12 max-w-[1600px] mx-auto min-h-screen">
            {/* Context Header */}
            <div className="mb-12 border-b border-gold/10 pb-8">
                <div className="flex items-center gap-4 mb-4">
                    <span className="text-[10px] tracking-[0.3em] uppercase text-gold font-bold bg-gold/10 px-4 py-1.5 rounded-full border border-gold/20 flex items-center gap-2">
                        <Gauge size={12} /> Supplier Atelier
                    </span>
                </div>
                <h1 className="text-4xl md:text-6xl font-display text-ivory italic flex items-center gap-4">
                    Command Center
                </h1>
                <p className="text-ivory/40 mt-4 max-w-2xl font-light leading-relaxed">
                    Welcome back to your professional space. Monitor your inventory, analyze material performance, and manage your fabric legacy.
                </p>
            </div>

            {/* Main Stats Summary View */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
                <StatOverviewCard 
                    icon={<Package size={24} />} 
                    label="Current Inventory" 
                    value={stats.totalFabrics} 
                    subValue="Active Fabric Rolls"
                    color="purple" 
                />
                <StatOverviewCard 
                    icon={<Layers size={24} />} 
                    label="Volume Managed" 
                    value={`${stats.totalQuantity} m`} 
                    subValue="Total Stock Surface"
                    color="blue" 
                />
                <StatOverviewCard 
                    icon={<TrendingUp size={24} />} 
                    label="Market Value" 
                    value={`$${stats.avgPrice}`} 
                    subValue="Average Price / meter"
                    color="gold" 
                />
                <StatOverviewCard 
                    icon={<Sparkles size={24} />} 
                    label="Status" 
                    value="Verified" 
                    subValue="Certified Supplier Account"
                    color="green" 
                />
            </div>

            {/* Action Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 bg-white/[0.02] border border-white/5 rounded-3xl p-8 hover:border-gold/30 transition-all duration-500 group">
                    <h3 className="text-2xl font-display text-ivory mb-6 flex items-center gap-3">
                        Quick Management <ArrowRight size={20} className="text-gold group-hover:translate-x-2 transition-transform" />
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <button 
                            onClick={() => navigate('/fournisseur/creations')}
                            className="flex flex-col gap-4 p-6 bg-white/5 rounded-2xl hover:bg-gold/10 transition-colors"
                        >
                            <div className="w-10 h-10 rounded-xl bg-gold/20 flex items-center justify-center text-gold">
                                <Package size={20} />
                            </div>
                            <div className="text-left">
                                <div className="text-ivory font-medium">My Creations</div>
                                <div className="text-[10px] text-ivory/40 uppercase tracking-widest mt-1">Manage Inventory Table</div>
                            </div>
                        </button>
                        <button 
                            onClick={() => navigate('/fournisseur/creations?add=true')}
                            className="flex flex-col gap-4 p-6 bg-white/5 rounded-2xl hover:bg-gold/10 transition-colors"
                        >
                            <div className="w-10 h-10 rounded-xl bg-gold/20 flex items-center justify-center text-gold">
                                <Plus size={20} />
                            </div>
                            <div className="text-left">
                                <div className="text-ivory font-medium">Add New Fabric</div>
                                <div className="text-[10px] text-ivory/40 uppercase tracking-widest mt-1">Instant Creation</div>
                            </div>
                        </button>
                    </div>
                </div>

                <div className="bg-gradient-to-br from-gold/10 to-transparent border border-gold/20 rounded-3xl p-8">
                    <div className="flex flex-col h-full">
                        <div className="mb-8">
                            <h3 className="text-xl font-display text-gold mb-2 italic">Pro Insights</h3>
                            <p className="text-sm text-ivory/60 leading-relaxed italic opacity-80">
                                "Premium silk is currently trending with Couture Houses. Consider updating your catalog with deep ivory materials."
                            </p>
                        </div>
                        <div className="mt-auto pt-6 border-t border-gold/10 flex items-center gap-4">
                            <div className="w-10 h-10 rounded-full bg-gold/20 flex items-center justify-center">
                                <TrendingUp size={18} className="text-gold" />
                            </div>
                            <div className="text-[10px] uppercase tracking-[0.2em] text-gold font-bold">
                                Market Trend +12%
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

const StatOverviewCard = ({ icon, label, value, subValue, color }) => (
    <div className="group relative overflow-hidden bg-white/[0.02] border border-white/5 p-8 rounded-3xl hover:border-gold/30 hover:bg-white/[0.04] transition-all duration-500">
        <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br transition-opacity duration-700 opacity-20 group-hover:opacity-40
            ${color === 'gold' ? 'from-gold/40' : color === 'purple' ? 'from-purple-500/40' : color === 'blue' ? 'from-blue-500/40' : 'from-green-500/40'} to-transparent`} 
            style={{ borderRadius: '0 0 0 100%' }}
        />
        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-6 
            ${color === 'gold' ? 'bg-gold/20 text-gold' : color === 'purple' ? 'bg-purple-500/20 text-purple-500' : color === 'blue' ? 'bg-blue-500/20 text-blue-500' : 'bg-green-500/20 text-green-500'}`}>
            {icon}
        </div>
        <div className="relative z-10">
            <div className="text-3xl font-display text-ivory mb-1 tracking-tight">{value}</div>
            <div className="text-[10px] text-gold uppercase tracking-[0.3em] font-bold mb-2">{label}</div>
            <div className="text-xs text-ivory/30">{subValue}</div>
        </div>
    </div>
);

export default Atelier;
