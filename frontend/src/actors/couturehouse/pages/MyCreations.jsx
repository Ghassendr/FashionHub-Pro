import React, { useEffect, useState } from 'react';
import { 
    Plus, LayoutGrid, Search, Loader2, Home, 
    Palette, BarChart3, Settings, LogOut, 
    Menu, TrendingUp, Sparkles, Layers, Users, CreditCard 
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import designService from '../services/designService';
import DesignCard from '../components/DesignCard';
import './CoutureDashboard.css';

const Dashboard = () => {
    const [designs, setDesigns] = useState([]);
    const [loading, setLoading] = useState(true);
    // sidebar state removed
    const [stats, setStats] = useState({
        total: 0,
        published: 0,
        likes: 0,
        reach: 0
    });
    const [hasCard, setHasCard] = useState(false);
    const navigate = useNavigate();

    const fetchDesigns = async () => {
        const token = localStorage.getItem('token');
        if (!token) {
            navigate('/');
            return;
        }

        try {
            setLoading(true);
            const data = await designService.getDesigns();
            setDesigns(data);
            
            // Calculate Stats
            const total = data.length;
            const published = data.filter(d => d.status === 'published').length;
            const likes = data.reduce((acc, d) => acc + (d.likes_count || 0), 0);
            
            setStats({
                total,
                published,
                likes,
                reach: Math.round((likes / (total || 1)) * 10) // Simple popularity score
            });
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDesigns();
        fetchCardStatus();
    }, []);

    const fetchCardStatus = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch('http://localhost:8000/api/auth/card/', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) {
                const data = await response.json();
                setHasCard(data.has_card);
            }
        } catch (err) {
            console.error("Failed to fetch card status:", err);
        }
    };

    const handlePublish = async (id) => {
        try {
            await designService.publishDesign(id);
            fetchDesigns();
        } catch (err) {
            console.error(err);
        }
    };

    const handleArchive = async (id) => {
        if (window.confirm("Are you sure you want to archive this design?")) {
            try {
                await designService.archiveDesign(id);
                fetchDesigns();
            } catch (err) {
                console.error(err);
            }
        }
    };

    const handleDelete = async (id) => {
        if (window.confirm("Are you absolutely sure you want to delete this design? This action cannot be undone.")) {
            try {
                await designService.deleteDesign(id);
                fetchDesigns();
            } catch (err) {
                console.error(err);
                alert("Failed to delete design.");
            }
        }
    };

    const handleEdit = (id) => {
        navigate(`/couturehouse/create?edit=${id}`);
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-zinc-950 text-ivory">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="animate-spin text-amber-500" size={48} />
                    <p className="text-sm uppercase tracking-widest font-bold opacity-50">Entering Atelier...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="animate-fade-in p-6 lg:p-12 max-w-[1600px] mx-auto">
            {/* Header Section */}
            <div className="mb-12 border-b border-gold/10 pb-8">
                <div className="flex items-center gap-4 mb-4">
                    <span className="text-[10px] tracking-[0.3em] uppercase text-gold font-bold bg-gold/10 px-4 py-1.5 rounded-full border border-gold/20 flex items-center gap-2">
                        <Sparkles size={12} /> Couture Workspace
                    </span>
                </div>
                <h1 className="text-4xl md:text-5xl font-display text-ivory italic flex items-center gap-4">
                    Atelier Dashboard
                </h1>
            </div>

            {/* Stats Grid */}
            <div className="atelier-stats mb-12">
                <StatCard 
                    icon={<Layers size={22} />} 
                    label="Total Assets" 
                    value={stats.total} 
                    color="purple" 
                />
                <StatCard 
                    icon={<Sparkles size={22} />} 
                    label="Published" 
                    value={stats.published} 
                    color="blue" 
                />
                <StatCard 
                    icon={<TrendingUp size={22} />} 
                    label="Total Likes" 
                    value={stats.likes} 
                    color="gold" 
                />
                <StatCard 
                    icon={<BarChart3 size={22} />} 
                    label="Reach Score" 
                    value={`${stats.reach}/10`} 
                    color="gold" 
                />
            </div>

            {/* Content Header */}
            <div className="flex justify-between items-end mb-8 border-b border-white/5 pb-6">
                <h2 className="font-display text-2xl text-ivory/80">Active Collection</h2>
                <button 
                    onClick={() => navigate('/couturehouse/create')}
                    className="btn btn-primary"
                >
                    <Plus size={18} /> Add Design
                </button>
            </div>

            {/* Design Grid */}
            {designs.length === 0 ? (
                <div className="py-32 text-center border border-dashed border-white/10 rounded-3xl bg-white/[0.02]">
                    <Palette size={48} className="mx-auto text-zinc-800 mb-6" />
                    <h3 className="text-ivory/40 font-display text-xl mb-2">Atelier is Empty</h3>
                    <p className="text-zinc-600 text-sm max-w-xs mx-auto">Your design legacy starts with a single thread.</p>
                    <button 
                        onClick={() => navigate('/couturehouse/create')}
                        className="mt-8 btn btn-secondary"
                    >
                        Start Creating
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {designs.map(design => (
                        <DesignCard 
                            key={design.id} 
                            design={design} 
                            onPublish={handlePublish}
                            onArchive={handleArchive}
                            onDelete={handleDelete}
                            onEdit={handleEdit}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

const StatCard = ({ icon, label, value, color }) => (
    <div className="atelier-stat-card group">
        <div className={`stat-icon ${color}`}>
            {icon}
        </div>
        <div>
            <div className="text-2xl font-display text-ivory mb-1">{value}</div>
            <div className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold group-hover:text-ivory/40 transition-colors">{label}</div>
        </div>
    </div>
);

export default Dashboard;
