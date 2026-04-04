import React, { useState, useEffect } from 'react';
import { 
    LayoutGrid, History, TrendingUp, Package, Gauge, Sparkles, 
    ArrowRight, Palette, Layers, Plus, CreditCard, User, BarChart3
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import designService from '../services/designService';
import './CoutureDashboard.css';

const Atelier = () => {
    const navigate = useNavigate();
    const [stats, setStats] = useState({
        total: 0,
        published: 0,
        likes: 0,
        reach: 0
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchStats();
    }, []);

    const fetchStats = async () => {
        try {
            setLoading(true);
            const data = await designService.getDesigns();
            if (data) {
                const total = data.length;
                const published = data.filter(d => d.status === 'published').length;
                const likes = data.reduce((acc, d) => acc + (d.likes_count || 0), 0);
                setStats({
                    total,
                    published,
                    likes,
                    reach: Math.round((likes / (total || 1)) * 10)
                });
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
                        <Sparkles size={12} /> Design Atelier
                    </span>
                </div>
                <h1 className="text-4xl md:text-6xl font-display text-ivory italic flex items-center gap-4">
                    Creative Nexus
                </h1>
                <p className="text-ivory/40 mt-4 max-w-2xl font-light leading-relaxed">
                    Where raw talent meets digital precision. Oversee your collections, track engagement, and refine your creative vision.
                </p>
            </div>

            {/* Main Stats Summary View */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
                <StatOverviewCard 
                    icon={<Layers size={24} />} 
                    label="Active Assets" 
                    value={stats.total} 
                    subValue="Designs & Sketches"
                    color="purple" 
                />
                <StatOverviewCard 
                    icon={<Sparkles size={24} />} 
                    label="Public Reach" 
                    value={stats.published} 
                    subValue="Live on Platform"
                    color="blue" 
                />
                <StatOverviewCard 
                    icon={<TrendingUp size={24} />} 
                    label="Global Likes" 
                    value={stats.likes} 
                    subValue="Community Feedback"
                    color="gold" 
                />
                <StatOverviewCard 
                    icon={<BarChart3 size={24} />} 
                    label="Reach Score" 
                    value={`${stats.reach}/10`} 
                    subValue="Popularity Index"
                    color="gold" 
                />
            </div>

            {/* Action Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 bg-white/[0.02] border border-white/5 rounded-3xl p-8 hover:border-gold/30 transition-all duration-500 group">
                    <h3 className="text-2xl font-display text-ivory mb-6 flex items-center gap-3">
                        Quick Launch <ArrowRight size={20} className="text-gold group-hover:translate-x-2 transition-transform" />
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <button 
                            onClick={() => navigate('/couturehouse/creations')}
                            className="flex flex-col gap-4 p-6 bg-white/5 rounded-2xl hover:bg-gold/10 transition-colors"
                        >
                            <div className="w-10 h-10 rounded-xl bg-gold/20 flex items-center justify-center text-gold">
                                <Palette size={20} />
                            </div>
                            <div className="text-left">
                                <div className="text-ivory font-medium">My Creations</div>
                                <div className="text-[10px] text-ivory/40 uppercase tracking-widest mt-1">Manage Portfolio</div>
                            </div>
                        </button>
                        <button 
                            onClick={() => navigate('/couturehouse/create')}
                            className="flex flex-col gap-4 p-6 bg-white/5 rounded-2xl hover:bg-gold/10 transition-colors"
                        >
                            <div className="w-10 h-10 rounded-xl bg-gold/20 flex items-center justify-center text-gold">
                                <Plus size={20} />
                            </div>
                            <div className="text-left">
                                <div className="text-ivory font-medium">New Design</div>
                                <div className="text-[10px] text-ivory/40 uppercase tracking-widest mt-1">Start Sketching</div>
                            </div>
                        </button>
                    </div>
                </div>

                <div className="bg-gradient-to-br from-gold/10 to-transparent border border-gold/20 rounded-3xl p-8 shadow-2xl">
                    <div className="flex flex-col h-full">
                        <div className="mb-8">
                            <h3 className="text-xl font-display text-gold mb-4 italic">Designer Tip</h3>
                            <p className="text-sm text-ivory/60 leading-relaxed italic border-l-2 border-gold/30 pl-4 py-2">
                                "Asymmetry is the signature of modern luxury. Experiment with contrasting textures in your next collection."
                            </p>
                        </div>
                        <div className="mt-auto flex items-center gap-4">
                            <div className="flex -space-x-2">
                                {[1,2,3].map(i => <div key={i} className="w-8 h-8 rounded-full border-2 border-noir bg-gold/20 flex items-center justify-center text-[8px] font-bold">U{i}</div>)}
                            </div>
                            <div className="text-[10px] uppercase tracking-widest text-ivory/40">
                                Recently viewed designs
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
