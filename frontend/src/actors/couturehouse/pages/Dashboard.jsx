import React, { useEffect, useState } from 'react';
import { Plus, LayoutGrid, Search, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import designService from '../services/designService';
import DesignCard from '../components/DesignCard';

const Dashboard = () => {
    const [designs, setDesigns] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
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
        } catch (err) {
            if (err.response?.status === 401) {
                localStorage.removeItem('token');
                navigate('/');
            } else {
                setError("Failed to load designs. Please check your connection.");
                console.error(err);
            }
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDesigns();
    }, []);

    const handlePublish = async (id) => {
        try {
            await designService.publishDesign(id);
            fetchDesigns();
        } catch (err) {
            alert("Error publishing design");
        }
    };

    const handleArchive = async (id) => {
        if (window.confirm("Are you sure you want to archive this design?")) {
            try {
                await designService.archiveDesign(id);
                fetchDesigns();
            } catch (err) {
                alert("Error archiving design");
            }
        }
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
        <div className="min-h-screen bg-zinc-950 pt-32 pb-20 px-6">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-12">
                    <div>
                        <div className="badge mb-4">Workspace Manager</div>
                        <h1 className="text-5xl font-display text-ivory">Atelier Design</h1>
                    </div>
                    
                    <div className="flex items-center gap-4">
                        <button 
                            onClick={() => navigate('/couturehouse')}
                            className="btn btn-secondary flex items-center gap-2 group"
                        >
                            <LayoutGrid size={20} className="group-hover:scale-110 transition-transform" />
                            Global Activity
                        </button>
                        <button 
                            onClick={() => navigate('/couturehouse/create')}
                            className="btn btn-primary flex items-center gap-2 group"
                        >
                            <Plus size={20} className="group-hover:rotate-90 transition-transform duration-300" />
                            Create New Design
                        </button>
                    </div>
                </div>

                {/* Filters/Stats (Visual Only for now) */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
                    <div className="bg-white/5 border border-white/10 p-4 rounded-xl flex items-center gap-4">
                        <div className="w-12 h-12 rounded-lg bg-amber-500/20 flex items-center justify-center text-amber-500">
                            <LayoutGrid size={24} />
                        </div>
                        <div>
                            <div className="text-2xl font-display text-ivory">{designs.length}</div>
                            <div className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">Total Assets</div>
                        </div>
                    </div>
                </div>

                {/* Search Bar */}
                <div className="relative mb-10 max-w-md">
                    <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" />
                    <input 
                        type="text" 
                        placeholder="Search designs, categories, tags..." 
                        className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-12 pr-4 text-sm text-ivory focus:border-amber-500/50 focus:outline-none transition-all"
                    />
                </div>

                {/* Design Grid */}
                {designs.length === 0 ? (
                    <div className="py-20 text-center border border-dashed border-white/10 rounded-3xl">
                        <div className="badge mb-4 mx-auto">Empty Atelier</div>
                        <p className="text-zinc-500">Start your creative journey by making your first design.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {designs.map(design => (
                            <DesignCard 
                                key={design.id} 
                                design={design} 
                                onPublish={handlePublish}
                                onArchive={handleArchive}
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default Dashboard;
