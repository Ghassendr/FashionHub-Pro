import React, { useEffect, useState } from 'react';
import { 
    Layers, Search, Loader2, Palette, 
    Menu, LogOut, Package, TrendingUp, Sparkles, LayoutGrid, Plus, Settings, Users
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../../../services/authService';
import './CoutureDashboard.css';

const CoutureHouseFabricsInventory = () => {
    const [fabrics, setFabrics] = useState([]);
    const [fabricImages, setFabricImages] = useState({});
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        total: 0,
        available: 0
    });
    
    const navigate = useNavigate();
    const token = authService.getToken();

    const fetchImage = async (fabricId) => {
        try {
            const response = await fetch(`http://localhost:8000/api/images/${fabricId}`, {
                method: "GET",
                headers: {
                    Authorization: `Bearer ${token}`,
                    Accept: "application/json",
                },
            });
            if (response.ok) {
                const data = await response.json();
                return data.image;
            }
        } catch (err) {
            console.error(`Error fetching image for fabric ${fabricId}:`, err);
        }
        return null;
    };

    const fetchFabrics = async () => {
        if (!token) {
            navigate('/');
            return;
        }

        try {
            setLoading(true);
            const response = await fetch("http://localhost:8000/api/fabrics", {
                method: "GET",
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                },
            });

            if (response.ok) {
                const data = await response.json();
                const fabricsList = data.fabrics || [];
                setFabrics(fabricsList);

                const total = fabricsList.length;
                const available = fabricsList.filter(f => f.quantite > 0).length;
                
                setStats({ total, available });

                const images = {};
                for (const fabric of fabricsList) {
                    const imageData = await fetchImage(fabric._id);
                    if (imageData) {
                        images[fabric._id] = imageData;
                    }
                }
                setFabricImages(images);

            } else if (response.status === 401) {
                authService.logout();
                navigate("/login");
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchFabrics();
    }, []);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-zinc-950 text-ivory">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="animate-spin text-amber-500" size={48} />
                    <p className="text-sm uppercase tracking-widest font-bold opacity-50">Loading Fabrics...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="animate-fade-in p-6 lg:p-12 max-w-[1600px] mx-auto min-h-screen">
            {/* Context Header */}
            <div className="mb-12 border-b border-gold/10 pb-8">
                <div className="flex items-center gap-4 mb-4">
                    <span className="text-[10px] tracking-[0.3em] uppercase text-gold font-bold bg-gold/10 px-4 py-1.5 rounded-full border border-gold/20 flex items-center gap-2">
                        <Layers size={12} /> Material Marketplace
                    </span>
                </div>
                <h1 className="text-4xl md:text-5xl font-display text-ivory italic flex items-center gap-4">
                    Supplier Fabrics
                </h1>
                <p className="text-ivory/40 mt-4 max-w-2xl font-light leading-relaxed">
                    Browse the finest materials curated from our global network of top-tier weavers and suppliers.
                </p>
            </div>

            <div className="atelier-content">
                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
                    <div className="atelier-stat-card group">
                        <div className="stat-icon purple">
                            <Package size={22} />
                        </div>
                        <div>
                            <div className="text-2xl font-display text-ivory mb-1">{stats.total}</div>
                            <div className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold group-hover:text-ivory/40 transition-colors">Total Supplier Fabrics</div>
                        </div>
                    </div>
                    <div className="atelier-stat-card group">
                        <div className="stat-icon blue">
                            <Sparkles size={22} />
                        </div>
                        <div>
                            <div className="text-2xl font-display text-ivory mb-1">{stats.available}</div>
                            <div className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold group-hover:text-ivory/40 transition-colors">In Stock</div>
                        </div>
                    </div>
                </div>

                <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-white/5 pb-6">
                    <h2 className="font-display text-2xl text-ivory/80">Available Materials</h2>
                    <div className="atelier-search max-w-md w-full relative">
                        <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" />
                        <input type="text" placeholder="Search fabrics..." className="bg-white/5 border border-white/10 rounded-xl py-2.5 pl-12 pr-4 w-full text-ivory outline-none focus:border-gold/50 transition-colors" />
                    </div>
                </div>

                {/* Fabric Grid */}
                {fabrics.length === 0 ? (
                    <div className="py-32 text-center border border-dashed border-white/10 rounded-3xl bg-white/[0.02]">
                        <Layers size={48} className="mx-auto text-zinc-800 mb-6" />
                        <h3 className="text-ivory/40 font-display text-xl mb-2">No Fabrics Found</h3>
                        <p className="text-zinc-600 text-sm max-w-xs mx-auto">There are currently no fabrics listed by suppliers.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {fabrics.map(fabric => (
                            <div key={fabric._id} className="design-card group bg-noir/40 border border-white/5 rounded-2xl overflow-hidden hover:bg-noir/60 transition-colors">
                                <div className="aspect-[4/5] overflow-hidden relative bg-zinc-900 flex items-center justify-center">
                                    {fabricImages[fabric._id] ? (
                                        <img 
                                            src={fabricImages[fabric._id]} 
                                            alt={fabric.materiel} 
                                            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 opacity-80 group-hover:opacity-100"
                                        />
                                    ) : (
                                        <div className="text-xs text-zinc-600 uppercase tracking-widest">No Image</div>
                                    )}
                                    <div className="absolute top-4 right-4 bg-noir/90 backdrop-blur-md px-3 py-1 rounded-full border border-white/10 flex items-center gap-1.5">
                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                                        <span className="text-[9px] uppercase tracking-widest text-ivory/70">{fabric.quantite}m Available</span>
                                    </div>
                                </div>
                                <div className="p-6">
                                    <div className="flex justify-between items-start mb-4">
                                        <div>
                                            <h3 className="text-lg font-display text-ivory group-hover:text-gold transition-colors">{fabric.materiel || "Unknown Material"}</h3>
                                            <p className="text-xs text-zinc-500 mt-1 line-clamp-2">{fabric.description || "No description provided."}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-between pt-4 border-t border-white/5">
                                        {fabric.color && Array.isArray(fabric.color) && fabric.color.length === 3 ? (
                                            <div className="flex items-center gap-2">
                                                <div className="w-4 h-4 rounded-full border border-white/20" style={{ backgroundColor: `rgb(${fabric.color[0]}, ${fabric.color[1]}, ${fabric.color[2]})` }}></div>
                                                <span className="text-[10px] text-zinc-500 font-mono tracking-wider">RGB({fabric.color.join(',')})</span>
                                            </div>
                                        ) : (
                                            <span className="text-[10px] text-zinc-500 uppercase">Multi-color</span>
                                        )}
                                        <span className="text-sm font-display text-gold">${parseFloat(fabric.prix).toFixed(2)}/m</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default CoutureHouseFabricsInventory;
