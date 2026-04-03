import React, { useState, useEffect } from 'react';
import { Users, ShieldCheck, Clock, CheckCircle, XCircle, TrendingUp, Scissors, Truck, Package, MapPin, Globe, LayoutGrid } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const StatCard = ({ icon: Icon, label, value, accent, onClick }) => (
    <div
        onClick={onClick}
        className={`group bg-[#111113] border border-subtle/20 rounded-sm p-6 transition-all duration-500 hover:border-gold/30 hover:shadow-glow-gold ${onClick ? 'cursor-pointer' : ''}`}
    >
        <div className="flex items-start justify-between mb-4">
            <div className={`w-10 h-10 rounded-sm flex items-center justify-center ${accent || 'bg-gold/10'}`}>
                <Icon size={18} className="text-gold" />
            </div>
            <TrendingUp size={14} className="text-ivory/10 group-hover:text-gold/40 transition-colors duration-300" />
        </div>
        <div className="flex items-baseline gap-2 mb-1">
            <p className="text-3xl font-display text-ivory font-bold">{value}</p>
        </div>
        <p className="text-[10px] uppercase tracking-[0.2em] text-ivory/30 font-sans">{label}</p>
    </div>
);

const DetailTable = ({ title, columns, data, icon: Icon }) => (
    <div className="bg-[#111113] border border-subtle/20 rounded-sm p-6 overflow-hidden">
        <div className="flex items-center gap-3 mb-6">
            <div className="w-8 h-8 rounded-sm bg-gold/10 flex items-center justify-center">
                <Icon size={16} className="text-gold" />
            </div>
            <h2 className="font-display text-lg text-ivory uppercase tracking-wider">{title}</h2>
        </div>
        <div className="overflow-x-auto">
            <table className="w-full text-left font-sans">
                <thead>
                    <tr className="border-b border-subtle/10">
                        {columns.map((col, i) => (
                            <th key={i} className="pb-4 text-[10px] uppercase tracking-widest text-ivory/40 font-semibold">
                                {col.label}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody className="divide-y divide-subtle/5">
                    {data && data.length > 0 ? (
                        data.map((row, i) => (
                            <tr key={i} className="group hover:bg-white/[0.02] transition-colors">
                                {columns.map((col, j) => (
                                    <td key={j} className="py-4 text-sm text-ivory/70">
                                        {col.render ? col.render(row) : row[col.key]}
                                    </td>
                                ))}
                            </tr>
                        ))
                    ) : (
                        <tr>
                            <td colSpan={columns.length} className="py-8 text-center text-ivory/20 text-xs italic">
                                No data available
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
    </div>
);

const AdminOverview = () => {
    const navigate = useNavigate();
    const [stats, setStats] = useState({
        users: { total: 0, couture_houses: 0, delivery: 0, clients: 0, fournisseurs: 0, status: { pending: 0, approved: 0, rejected: 0 } },
        catalogue: { designs: 0, fabrics: 0, fabric_types_count: 0 },
        logistics: { vehicles: 0, available_vehicles: 0, total_routes: 0, active_routes: 0, top_destinations: [] },
        suppliers: { fabric_origins: [] }
    });
    const [recentActivity, setRecentActivity] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchAllStats = async () => {
            try {
                const token = localStorage.getItem('token');
                const headers = { 'Authorization': `Bearer ${token}` };

                const API = import.meta.env.VITE_API_URL || 'http://localhost:8000';
                
                // Fetch comprehensive stats
                const statsRes = await fetch(`${API}/api/auth/admin/stats/`, { headers });
                if (statsRes.ok) {
                    const data = await statsRes.json();
                    setStats(data);
                }

                // Fetch pending queue for recent activity
                const queueRes = await fetch(`${API}/api/auth/admin/review-queue/`, { headers });
                if (queueRes.ok) {
                    const queue = await queueRes.json();
                    setRecentActivity(queue.slice(0, 5));
                }
            } catch (error) {
                console.error('Failed to fetch admin stats:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchAllStats();
    }, []);

    const overviewCards = [
        { icon: Users, label: 'Total Users', value: stats.users.total, accent: 'bg-gold/10' },
        { icon: Clock, label: 'Pending Review', value: stats.users.status.pending, accent: 'bg-amber-500/10', onClick: () => navigate('/admin/review') },
        { icon: LayoutGrid, label: 'Designs in App', value: stats.catalogue.designs, accent: 'bg-blue-500/10' },
        { icon: Truck, label: 'Vehicles Active', value: stats.logistics.vehicles, accent: 'bg-purple-500/10' },
    ];

    const logisticsColumns = [
        { label: 'Destination', key: 'end_location' },
        { label: 'Activity Level', key: 'count', render: (row) => (
            <div className="flex items-center gap-3">
                <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden max-w-[100px]">
                    <div 
                        className="h-full bg-gold" 
                        style={{ width: `${Math.min(100, (row.count / stats.logistics.total_routes) * 100)}%` }}
                    />
                </div>
                <span className="text-[10px] font-mono text-gold">{row.count} routes</span>
            </div>
        )}
    ];

    const supplierColumns = [
        { label: 'Origin Country', key: 'origin_country', render: (row) => (
            <div className="flex items-center gap-2">
                <Globe size={12} className="text-gold/50" />
                <span>{row.origin_country || 'Unknown'}</span>
            </div>
        )},
        { label: 'Partner Count', key: 'count', render: (row) => (
            <span className="px-2 py-0.5 bg-ivory/5 border border-ivory/10 rounded-sm text-[10px] text-ivory/60">
                {row.count} Suppliers
            </span>
        )}
    ];

    return (
        <div className="space-y-8 animate-fade-in pb-12">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h1 className="font-display text-4xl text-ivory mb-2">Platform Overview</h1>
                    <p className="text-ivory/40 text-sm font-sans tracking-wide">Real-time performance metrics and partner activity.</p>
                </div>
                <div className="flex items-center gap-2 px-4 py-2 bg-emerald-500/5 border border-emerald-500/10 rounded-sm shadow-glow-emerald/5">
                    <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                    <span className="text-[10px] uppercase tracking-widest text-emerald-500 font-bold">System Live</span>
                </div>
            </div>

            {/* Overview Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                {overviewCards.map((card, i) => (
                    <StatCard key={i} {...card} />
                ))}
            </div>

            {/* Details Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <DetailTable 
                    title="Active Delivery Zones" 
                    icon={MapPin}
                    columns={logisticsColumns}
                    data={stats.logistics.top_destinations}
                />
                <DetailTable 
                    title="Fabric Provenance" 
                    icon={Globe}
                    columns={supplierColumns}
                    data={stats.suppliers.fabric_origins}
                />
            </div>

            {/* Bottom Section: Activity & Distribution */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Recent Activity */}
                <div className="lg:col-span-2 bg-[#111113] border border-subtle/20 rounded-sm p-6 shadow-glow-ivory/5">
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h2 className="font-display text-xl text-ivory">Recent Verification Requests</h2>
                            <p className="text-xs text-ivory/20 mt-1 uppercase tracking-tighter">Queue management</p>
                        </div>
                        <button
                            onClick={() => navigate('/admin/review')}
                            className="bg-gold/10 hover:bg-gold/20 text-gold border border-gold/20 px-4 py-1.5 rounded-sm text-[10px] uppercase tracking-[0.2em] font-sans transition-all"
                        >
                            Review Queue →
                        </button>
                    </div>

                    {loading ? (
                        <div className="flex items-center justify-center py-12">
                            <div className="w-6 h-6 border-2 border-gold/30 border-t-gold rounded-full animate-spin"></div>
                        </div>
                    ) : recentActivity.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 border border-dashed border-subtle/10 rounded-sm">
                            <CheckCircle size={32} className="text-emerald-500/30 mb-4" />
                            <p className="text-ivory/30 text-xs font-sans tracking-wide">All verification requests processed.</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {recentActivity.map((user) => (
                                <div
                                    key={user.id}
                                    className="flex items-center justify-between p-4 bg-white/[0.015] border border-subtle/10 rounded-sm hover:border-gold/20 transition-all duration-500 group"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-sm bg-gradient-to-br from-gold/20 to-gold/5 flex items-center justify-center text-gold text-xs font-display font-bold uppercase group-hover:scale-105 transition-transform">
                                            {user.username?.charAt(0) || '?'}
                                        </div>
                                        <div>
                                            <p className="text-ivory/90 text-sm font-medium tracking-tight">{user.username}</p>
                                            <p className="text-ivory/20 text-[11px] font-mono">{user.email}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <span className="px-2.5 py-1 bg-ivory/5 text-ivory/40 text-[9px] uppercase tracking-widest font-bold border border-ivory/10 rounded-sm">
                                            {user.role?.replace('_', ' ')}
                                        </span>
                                        <Clock size={14} className="text-ivory/10" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Partner Distribution */}
                <div className="bg-[#111113] border border-subtle/20 rounded-sm p-6 overflow-hidden relative">
                    <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                        <Scissors size={120} className="text-gold" />
                    </div>
                    
                    <h2 className="font-display text-lg text-ivory mb-8 flex items-center gap-2">
                        <Users size={18} className="text-gold/50" />
                        Partner Distribution
                    </h2>
                    
                    <div className="space-y-5">
                        {[
                            { label: 'Couture Houses', count: stats.users.couture_houses, icon: Scissors, color: 'text-amber-500' },
                            { label: 'Fournisseurs', count: stats.users.fournisseurs, icon: Package, color: 'text-emerald-500' },
                            { label: 'Carriers', count: stats.users.delivery, icon: Truck, color: 'text-blue-500' },
                            { label: 'Clients', count: stats.users.clients, icon: Users, color: 'text-rose-500' },
                        ].map((partner, i) => (
                            <div key={i} className="group">
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-3">
                                        <partner.icon size={12} className={partner.color} />
                                        <span className="text-[10px] uppercase tracking-widest text-ivory/40 group-hover:text-ivory/70 transition-colors">{partner.label}</span>
                                    </div>
                                    <span className="font-display text-ivory text-sm font-bold">{partner.count}</span>
                                </div>
                                <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                                    <div 
                                        className={`h-full opacity-60 group-hover:opacity-100 transition-all duration-700 bg-gold`}
                                        style={{ width: `${Math.min(100, (partner.count / stats.users.total) * 100)}%` }}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="mt-10 pt-6 border-t border-subtle/10">
                        <div className="flex items-center justify-between text-ivory/30 text-[10px] uppercase tracking-[0.2em]">
                            <span>Total Platform Users</span>
                            <span className="text-gold font-bold">{stats.users.total}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminOverview;
