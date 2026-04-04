import React, { useState, useEffect } from 'react';
import { Heart, Maximize2, ShoppingBag } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const FabricCard = ({ fabric, showLikes = false }) => {
    const { user, isAuthenticated, setIsRegisterOpen } = useAuth();
    const [isLiked, setIsLiked] = useState(fabric.is_liked || false);
    const [likes, setLikes] = useState(fabric.likes || 0);
    const [isHovered, setIsHovered] = useState(false);
    const [isExpanded, setIsExpanded] = useState(false);
    const [isSelected, setIsSelected] = useState(false);

    // Sync with fabric prop changes (useful for profile updates)
    useEffect(() => {
        setIsLiked(fabric.is_liked || false);
        setLikes(fabric.likes || 0);
    }, [fabric.is_liked, fabric.likes]);

    const handleLike = async (e) => {
        e.stopPropagation();
        
        if (!isAuthenticated) {
            setIsRegisterOpen(true);
            return;
        }

        try {
            // Optimistic UI update
            const newLikedStatus = !isLiked;
            const newLikes = newLikedStatus ? likes + 1 : Math.max(0, likes - 1);
            
            setIsLiked(newLikedStatus);
            setLikes(newLikes);

            const token = localStorage.getItem('token');
            const fabricId = fabric.id || fabric._id;
            const response = await fetch(`http://localhost:8000/api/fournisseur/fabrics/${fabricId}/like`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                setLikes(data.likes);
                setIsLiked(data.is_liked);
            } else {
                // Revert on failure
                setIsLiked(!newLikedStatus);
                setLikes(likes);
            }
        } catch (err) {
            console.error("Error toggling like:", err);
            setIsLiked(isLiked);
            setLikes(likes);
        }
    };

    const handleExpand = (e) => {
        e.stopPropagation();
        setIsExpanded(true);
    };

    const handleSelect = (e) => {
        e.stopPropagation();
        setIsSelected(!isSelected);
        // Additional logic like adding to a cart context could go here
    };

    return (
        <>
        <div 
            className="w-72 flex-shrink-0 group relative bg-noir/40 border border-subtle/20 hover:border-gold/30 transition-all duration-700 overflow-hidden"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            {/* Image Container */}
            <div className="aspect-[3/4] overflow-hidden relative">
                <img 
                    src={`http://localhost:8000/api/fournisseur/images/${fabric.id || fabric._id}`} 
                    alt={fabric.materiel}
                    className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110"
                    onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = "https://images.unsplash.com/photo-1544445837-de12def58fa1?w=800&q=80"; // Fallback image if fabric doesn't have an image
                    }}
                />
                
                {/* Overlay on Hover */}
                <div className={`absolute inset-0 bg-noir/40 backdrop-blur-[2px] transition-opacity duration-500 flex items-center justify-center gap-4 ${isHovered ? 'opacity-100' : 'opacity-0'}`}>
                    <button 
                        onClick={handleSelect}
                        className={`w-12 h-12 rounded-full flex items-center justify-center transition-all scale-90 hover:scale-100 duration-300 ${
                            isSelected ? 'bg-gold text-noir shadow-glow-gold' : 'bg-gold/80 text-noir hover:bg-gold'
                        }`}
                    >
                        <ShoppingBag size={20} fill={isSelected ? "currentColor" : "none"} />
                    </button>
                    <button 
                        onClick={handleExpand}
                        className="w-12 h-12 rounded-full bg-ivory/10 backdrop-blur-md text-ivory flex items-center justify-center hover:bg-ivory/20 transition-colors scale-90 hover:scale-100 duration-300"
                    >
                        <Maximize2 size={20} />
                    </button>
                </div>

                {/* Heart Icon / Like Count */}
                {user?.role === 'fournisseur' ? (
                    <div className="absolute top-4 right-4 px-3 py-1.5 rounded-full bg-noir/80 backdrop-blur-xl text-ivory/80 flex items-center gap-2 border border-white/5 shadow-2xl z-50 pointer-events-auto">
                        <Heart size={14} className="text-red-500" fill="currentColor" />
                        <span className="text-[10px] font-bold">{likes}</span>
                    </div>
                ) : (
                    <button 
                        onClick={handleLike}
                        className={`absolute top-4 right-4 p-3 rounded-full backdrop-blur-xl transition-all duration-300 z-50 pointer-events-auto shadow-2xl ${
                            isLiked 
                            ? 'bg-red-500/30 text-red-500 scale-110 shadow-red-500/20' 
                            : 'bg-noir/60 text-ivory/60 hover:text-red-500 hover:bg-red-500/20 hover:scale-110'
                        }`}
                    >
                        <Heart size={22} fill={isLiked ? "currentColor" : "none"} />
                    </button>
                )}
            </div>

            {/* Details */}
            <div className="p-6">
                <div className="flex justify-between items-start mb-2">
                    <span className="text-label text-gold/60">{fabric.materiel}</span>
                    <span className="font-display text-lg text-ivory">${fabric.prix}</span>
                </div>
                <h3 className="font-display text-xl text-ivory mb-4 line-clamp-1">{fabric.description || 'Premium Fabric'}</h3>
                
                <div className="flex items-center justify-between">
                    <div className="flex gap-2">
                        {fabric.color && Array.isArray(fabric.color) && fabric.color.map((c, i) => (
                            <div key={i} className="w-3 h-3 rounded-full border border-ivory/10" style={{ backgroundColor: `rgb(${c[0]}, ${c[1]}, ${c[2]})` }}></div>
                        ))}
                    </div>
                    {showLikes && (
                        <span className="text-[10px] tracking-widest uppercase text-ivory/30">
                            {likes} {likes === 1 ? 'Like' : 'Likes'}
                        </span>
                    )}
                </div>
            </div>
            </div>

            {/* Lightbox / Expanded View */}
            {isExpanded && (
                <div 
                    className="fixed inset-0 z-[9999] bg-noir/95 backdrop-blur-xl flex items-center justify-center p-8 animate-fade-in"
                    onClick={() => setIsExpanded(false)}
                >
                    <button 
                        className="absolute top-10 right-10 text-ivory/60 hover:text-ivory transition-colors"
                        onClick={() => setIsExpanded(false)}
                    >
                        <Maximize2 size={32} className="rotate-45" />
                    </button>
                    
                    <div className="max-w-5xl w-full flex flex-col md:flex-row gap-12 items-center">
                        <div className="w-full md:w-2/3 aspect-[3/4] rounded-sm overflow-hidden shadow-2xl border border-ivory/10 flex items-center justify-center bg-noir/50">
                            <img 
                                src={`http://localhost:8000/api/fournisseur/images/${fabric.id || fabric._id}`} 
                                alt={fabric.materiel}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                    e.target.onerror = null;
                                    e.target.src = "https://images.unsplash.com/photo-1544445837-de12def58fa1?w=800&q=80";
                                }}
                            />
                        </div>
                        
                        <div className="w-full md:w-1/3 text-left">
                            <span className="text-label text-gold mb-4 block">{fabric.materiel}</span>
                            <h2 className="font-display text-4xl text-ivory mb-6">{fabric.description || 'Premium Fabric'}</h2>
                            <p className="text-ivory/60 mb-8 leading-relaxed">
                                A premium {fabric.materiel} selection curated for Haute Couture excellence. 
                                Hand-picked for the Maison Tissue collection.
                            </p>
                            <div className="flex items-center gap-8 mb-12">
                                <div>
                                    <span className="text-[10px] uppercase tracking-widest text-ivory/30 block mb-1">Price</span>
                                    <span className="font-display text-2xl text-ivory">${fabric.prix} /m</span>
                                </div>
                                <div>
                                    <span className="text-[10px] uppercase tracking-widest text-ivory/30 block mb-1">Stock</span>
                                    <span className="font-display text-2xl text-ivory">{fabric.quantite} m</span>
                                </div>
                            </div>
                            
                            <button 
                                onClick={handleSelect}
                                className="btn btn-primary w-full"
                            >
                                <ShoppingBag size={18} />
                                {isSelected ? 'In Selection' : 'Add to Selection'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default FabricCard;
