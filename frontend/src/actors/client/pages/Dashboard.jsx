import React from 'react';
import { Package, Clock, DollarSign, TrendingUp, ChevronRight, Truck } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const data = [
    { name: 'Mon', shipments: 4 },
    { name: 'Tue', shipments: 7 },
    { name: 'Wed', shipments: 5 },
    { name: 'Thu', shipments: 11 },
    { name: 'Fri', shipments: 9 },
    { name: 'Sat', shipments: 3 },
    { name: 'Sun', shipments: 2 },
];

const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-muted border border-subtle px-4 py-3">
                <p className="text-label mb-1">{label}</p>
                <p className="text-gold font-display text-lg">{payload[0].value} shipments</p>
            </div>
        );
    }
    return null;
};

const Dashboard = () => {
    return (
        <div className="wrapper pt-28 pb-16 animate-fade-in">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end mb-16 gap-4">
                <div>
                    <p className="text-label text-gold mb-3">Maison de Couture</p>
                    <h1 className="font-display text-4xl md:text-5xl font-bold text-ivory">
                        Global Activity
                    </h1>
                </div>
                <div className="flex gap-4">
                    <button 
                        onClick={() => window.location.href = '/couturehouse/designs'}
                        className="btn btn-secondary"
                    >
                        Atelier Designs
                    </button>
                    <button className="btn btn-primary">
                        Export Report
                    </button>
                </div>
            </div>
 
            {/* Stat Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-px bg-subtle/30 mb-16">
                <StatCard icon={<Package size={18} />} label="Designs Commissioned" value="03" trend="+1" trendUp />
                <StatCard icon={<TrendingUp size={18} />} label="Style Credits" value="850 pts" trend="+120" trendUp />
                <StatCard icon={<Clock size={18} />} label="In Production" value="01" trend="Stable" trendUp={false} />
                <StatCard icon={<DollarSign size={18} />} label="Total Credits" value="$1,200" trend="+5%" trendUp />
            </div>

            {/* Chart + Shipments */}
            <div className="grid lg:grid-cols-5 gap-px bg-subtle/30">
                {/* Chart */}
                <div className="lg:col-span-3 bg-noir p-8 border border-subtle/20">
                    <div className="flex justify-between items-center mb-8">
                        <h2 className="font-display text-xl text-ivory">Weekly Activity</h2>
                        <span className="text-label text-gold">This Week</span>
                    </div>
                    <div className="h-72">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={data}>
                                <defs>
                                    <linearGradient id="goldGradient" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#C6A75E" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#C6A75E" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#2A2A2A" />
                                <XAxis dataKey="name" stroke="#555" tick={{ fill: '#666', fontSize: 11 }} axisLine={false} />
                                <YAxis stroke="#555" tick={{ fill: '#666', fontSize: 11 }} axisLine={false} />
                                <Tooltip content={<CustomTooltip />} />
                                <Area
                                    type="monotone"
                                    dataKey="shipments"
                                    stroke="#C6A75E"
                                    strokeWidth={2}
                                    fill="url(#goldGradient)"
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Recent Activity */}
                <div className="lg:col-span-2 bg-noir p-8 border border-subtle/20">
                    <div className="flex justify-between items-center mb-8">
                        <h2 className="font-display text-xl text-ivory">Recent Activity</h2>
                        <button className="text-label text-gold hover:text-gold-light transition-colors flex items-center gap-1">
                            View All <ChevronRight size={12} />
                        </button>
                    </div>
                    <div className="space-y-1">
                        <ShipmentRow id="Gala Dress" origin="Atelier Paris" dest="Processing" status="Draft" statusColor="text-gold" />
                        <ShipmentRow id="Silk Suit" origin="London Fabrics" dest="Shipped" status="Active" statusColor="text-emerald" />
                        <ShipmentRow id="Summer Cape" origin="Milan Tailor" dest="Delivered" status="Completed" statusColor="text-ivory/40" />
                    </div>
                </div>
            </div>
        </div>
    );
};

const StatCard = ({ icon, label, value, trend, trendUp }) => (
    <div className="group bg-noir p-8 border border-subtle/10 hover:border-gold/20 transition-all duration-700">
        <div className="flex items-center justify-between mb-6">
            <span className="text-label">{label}</span>
            <span className="text-gold/40 group-hover:text-gold/70 transition-colors duration-500">{icon}</span>
        </div>
        <div className="flex items-end gap-3">
            <span className="font-display text-3xl font-bold text-ivory">{value}</span>
            <span className={`text-xs font-medium mb-1 ${trendUp ? 'text-emerald' : 'text-blush'}`}>
                {trend}
            </span>
        </div>
    </div>
);

const ShipmentRow = ({ id, origin, dest, status, statusColor }) => (
    <div className="group flex items-center justify-between py-4 border-b border-subtle/20 last:border-0 hover:bg-muted/30 px-3 -mx-3 transition-all duration-300">
        <div>
            <span className="font-display text-sm font-semibold text-ivory">{id}</span>
            <p className="text-ivory/30 text-xs mt-0.5">{origin} → {dest}</p>
        </div>
        <span className={`text-[10px] tracking-luxury uppercase font-medium ${statusColor}`}>{status}</span>
    </div>
);

export default Dashboard;
