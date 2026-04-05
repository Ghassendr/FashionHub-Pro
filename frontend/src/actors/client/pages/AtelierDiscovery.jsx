import React, { useState, useEffect } from 'react';
import { Search, Loader2, Star, MapPin, ArrowRight, Filter, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../shared/context/AuthContext';

const AtelierDiscovery = () => {
    const navigate = useNavigate();
    const { token } = useAuth();
    const [ateliers, setAteliers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [filter, setFilter] = useState('all');

    const fetchAteliers = async (query = '') => {
        try {
            setLoading(true);
            const response = await fetch(`http://localhost:8000/api/client/ateliers/?search=${query}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            setAteliers(data.ateliers || []);
        } catch (err) {
            console.error("Failed to fetch ateliers", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (token) fetchAteliers();
    }, [token]);

    const handleSearch = (e) => {
        e.preventDefault();
        fetchAteliers(searchQuery);
    };

    return (
        <div className="min-h-screen bg-[#0d0d0b] text-[#f5f0e8] pb-20 selection:bg-gold/30">
            <div className="max-w-[1200px] mx-auto px-6 pt-12">
                
                {/* Header Section */}
                <div className="mb-16 animate-fade-in">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-[1px] h-4 bg-gold/40" />
                        <span className="text-[10px] uppercase tracking-[0.3em] text-gold/60 font-bold">
                            Exploration Artisanale
                        </span>
                    </div>
                    
                    <h1 className="font-display text-5xl md:text-6xl font-light italic mb-8 leading-tight">
                        Découvrez votre prochain <br/>
                        <span className="text-gold">Maître Tailleur</span>
                    </h1>
                    
                    <p className="text-sm text-ivory/40 leading-relaxed max-w-xl font-light">
                        Parcourez notre sélection exclusive de maisons de couture vérifiées. 
                        Chaque atelier est choisi pour son excellence et son savoir-faire unique.
                    </p>
                </div>

                {/* Search & Filter Bar */}
                <div className="mb-12 flex flex-col md:flex-row gap-4 items-center">
                    <form onSubmit={handleSearch} className="relative flex-1 group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gold/40 group-focus-within:text-gold transition-colors" size={18} />
                        <input 
                            type="text"
                            placeholder="Rechercher un atelier ou une spécialité..."
                            className="w-full bg-gold/[0.03] border border-gold/10 py-4 pl-12 pr-6 text-sm focus:outline-none focus:border-gold/40 transition-all placeholder:text-ivory/20 rounded-sm"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                        <button type="submit" className="absolute right-2 top-1/2 -translate-y-1/2 px-4 py-2 bg-gold/10 text-gold text-[10px] uppercase tracking-widest font-bold hover:bg-gold hover:text-noir transition-all rounded-sm">
                            Rechercher
                        </button>
                    </form>

                    <div className="flex gap-2">
                        <button className="flex items-center gap-2 px-6 py-4 bg-gold/[0.03] border border-gold/10 text-[10px] uppercase tracking-widest font-bold hover:border-gold/30 transition-all">
                            <Filter size={14} className="text-gold" />
                            Filtres
                        </button>
                    </div>
                </div>

                {/* Results Grid */}
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-32 opacity-40">
                        <Loader2 className="animate-spin text-gold mb-4" size={32} />
                        <p className="text-[10px] uppercase tracking-[0.3em]">Immersion dans les ateliers...</p>
                    </div>
                ) : ateliers.length === 0 ? (
                    <div className="text-center py-32 border border-gold/5 bg-gold/[0.01]">
                        <p className="text-ivory/40 italic font-light">Aucun atelier ne correspond à votre recherche.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {ateliers.map((atelier) => (
                            <div 
                                key={atelier.id}
                                className="group relative bg-[#111113] border border-gold/5 p-8 hover:border-gold/20 transition-all duration-700 cursor-pointer overflow-hidden"
                                onClick={() => navigate(`/client/ateliers/${atelier.id}`)}
                            >
                                {/* Decorative elements */}
                                <div className="absolute top-0 right-0 w-24 h-24 bg-gold/5 blur-[60px] group-hover:bg-gold/10 transition-colors" />
                                
                                <div className="relative z-10">
                                    <div className="flex justify-between items-start mb-6">
                                        <div className="p-3 bg-gold/5 rounded-sm border border-gold/10 group-hover:border-gold/30 transition-colors">
                                            <Sparkles size={20} className="text-gold" />
                                        </div>
                                        <div className="flex items-center gap-1 text-gold/40 group-hover:text-gold transition-colors">
                                            <Star size={12} fill="currentColor" />
                                            <span className="text-[10px] font-bold">4.9</span>
                                        </div>
                                    </div>

                                    <h3 className="font-display text-2xl mb-2 group-hover:text-gold transition-colors">{atelier.house_name}</h3>
                                    <p className="text-[10px] uppercase tracking-widest text-gold/60 font-bold mb-4">
                                        {atelier.specialization || "Haute Couture & Tailoring"}
                                    </p>
                                    
                                    <div className="space-y-3 mb-8">
                                        <div className="flex items-center gap-3 text-ivory/30 text-xs">
                                            <MapPin size={14} className="text-gold/20" />
                                            <span>Paris, France</span>
                                        </div>
                                        <div className="flex items-center gap-3 text-ivory/30 text-xs">
                                            <Star size={14} className="text-gold/20" />
                                            <span>Dès {atelier.starting_price} €</span>
                                        </div>
                                    </div>

                                    <div className="pt-6 border-t border-gold/5 flex items-center justify-between group-hover:border-gold/20 transition-colors">
                                        <span className="text-[9px] uppercase tracking-[0.2em] text-ivory/20 font-bold">
                                            Voir le profil
                                        </span>
                                        <ArrowRight size={16} className="text-gold/40 group-hover:translate-x-1 group-hover:text-gold transition-all" />
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

export default AtelierDiscovery;
