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
                    <p className="text-label text-gold mb-3">Client Dashboard</p>
                    <h1 className="font-display text-4xl md:text-5xl font-bold text-ivory">
                        Your Atelier
                    </h1>
                </div>
                <button className="btn btn-primary">
                    New Commission
                </button>
            </div>

            {/* Stat Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-px bg-subtle/30 mb-16">
                <StatCard icon={<Truck size={18} />} label="Active Shipments" value="12" trend="+15%" trendUp />
                <StatCard icon={<Package size={18} />} label="Pending Orders" value="5" trend="-2" trendUp={false} />
                <StatCard icon={<Clock size={18} />} label="Avg. Delivery" value="1.2 Days" trend="-0.3d" trendUp />
                <StatCard icon={<DollarSign size={18} />} label="Collection Value" value="$4,200" trend="+12%" trendUp />
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

                {/* Recent Shipments */}
                <div className="lg:col-span-2 bg-noir p-8 border border-subtle/20">
                    <div className="flex justify-between items-center mb-8">
                        <h2 className="font-display text-xl text-ivory">Recent Shipments</h2>
                        <button className="text-label text-gold hover:text-gold-light transition-colors flex items-center gap-1">
                            View All <ChevronRight size={12} />
                        </button>
                    </div>
                    <div className="space-y-1">
                        <ShipmentRow id="#CT-8821" origin="Paris" dest="Milano" status="In Transit" statusColor="text-gold" />
                        <ShipmentRow id="#CT-8822" origin="London" dest="Dubai" status="Pending" statusColor="text-blush" />
                        <ShipmentRow id="#CT-8823" origin="Paris" dest="New York" status="Delivered" statusColor="text-emerald" />
                        <ShipmentRow id="#CT-8824" origin="Milano" dest="Tokyo" status="In Transit" statusColor="text-gold" />
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
