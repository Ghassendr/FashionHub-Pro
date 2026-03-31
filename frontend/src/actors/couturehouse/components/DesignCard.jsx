import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout, Edit, Trash2, CheckCircle, Archive, Heart } from 'lucide-react';
import { useAuth } from '../../../shared/context/AuthContext';

const DesignCard = ({ design, onPublish, onArchive, isPublic = false }) => {
    const navigate = useNavigate();
    const { user, isAuthenticated, setIsRegisterOpen } = useAuth();
    const [isLiked, setIsLiked] = useState(design.is_liked_by_user || false);
    const [likesCount, setLikesCount] = useState(design.likes_count || 0);

    const handleLike = async (e) => {
        e.stopPropagation();

        if (!isAuthenticated) {
            setIsRegisterOpen(true);
            return;
        }

        try {
            // Optimistic UI
            const newLikedStatus = !isLiked;
            setIsLiked(newLikedStatus);
            setLikesCount(prev => newLikedStatus ? prev + 1 : Math.max(0, prev - 1));

            const token = localStorage.getItem('token');
            const response = await fetch(`http://localhost:8000/api/couturehouse/designs/${design.id}/like/`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                setIsLiked(data.liked);
                setLikesCount(data.likes_count);
            }
        } catch (err) {
            console.error("Error toggling design like:", err);
        }
    };

    const handleProfileClick = (e) => {
        e.stopPropagation();
        if (user?.role === 'client') {
            navigate(`/profile/${design.fashion_house_id}`);
        }
    };
    const getStatusColor = (status) => {
        switch (status) {
            case 'published': return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
            case 'archived': return 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30';
            default: return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
        }
    };

    const coverMedia = design.media?.find(m => m.is_cover) || design.media?.[0];

    return (
        <div
            className="group relative bg-noir/40 border border-white/5 hover:border-gold/30 transition-all duration-700 overflow-hidden"
            onClick={() => {/* Navigate to detail view if needed */ }}
        >
            {/* Image Container */}
            <div className="aspect-[3/4] overflow-hidden relative bg-zinc-900/50">
                {coverMedia ? (
                    <img
                        src={`http://localhost:8000/api/couturehouse/designs/${design.id}/media/${coverMedia.file.split(/[/\\]/).pop()}`}
                        alt={design.title}
                        className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110"
                    />
                ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-zinc-800">
                        <Layout size={42} strokeWidth={1} />
                        <span className="text-[10px] mt-4 uppercase tracking-[0.3em] font-bold opacity-30">No Preview</span>
                    </div>
                )}

                {/* Status Badge (Overlay style like Fabric details but on image for design) */}
                <div className="absolute bottom-4 left-4 z-10 transition-opacity duration-500">
                    <span className={`text-[9px] uppercase tracking-widest font-black px-2.5 py-1 rounded-sm border ${getStatusColor(design.status)} backdrop-blur-md`}>
                        {design.status}
                    </span>
                </div>

                {/* Heart Icon (Public and Owner both see it for visual consistency) */}
                <button
                    onClick={handleLike}
                    className={`absolute top-4 right-4 p-3 rounded-full backdrop-blur-xl transition-all duration-300 z-20 shadow-2xl ${isLiked
                        ? 'bg-red-500/30 text-red-500 scale-110'
                        : 'bg-noir/60 text-ivory/60 hover:text-red-500 hover:bg-red-500/20 hover:scale-110'
                        }`}
                >
                    <Heart size={20} fill={isLiked ? "currentColor" : "none"} />
                </button>
            </div>

            {/* Details (Matching FabricCard P-6) */}
            <div className="p-6">
                <div className="flex justify-between items-start mb-3">
                    <span 
                        onClick={handleProfileClick}
                        className={`text-[10px] uppercase tracking-[0.2em] font-bold transition-colors ${
                            user?.role === 'client' 
                            ? 'text-gold hover:text-white cursor-pointer' 
                            : 'text-zinc-500'
                        }`}
                    >
                        {design.fashion_house_name || design.category}
                    </span>
                    {design.fashion_house_name && (
                         <span className="text-[10px] uppercase tracking-[0.2em] font-bold text-zinc-500 opacity-30 select-none px-2">•</span>
                    )}
                    {design.fashion_house_name && (
                        <span className="text-[10px] uppercase tracking-[0.2em] font-bold text-zinc-500">{design.category}</span>
                    )}
                </div>

                <h3 className="font-display text-2xl text-ivory mb-5 line-clamp-1 group-hover:text-white transition-colors capitalize">{design.title}</h3>

                {/* Actions (Owner Only) - Integrated discretely */}
                {!isPublic && (
                    <div className={`flex items-center gap-4 transition-all duration-500 ${design.status === 'published' ? 'opacity-40 group-hover:opacity-100' : 'opacity-100'}`}>
                        {design.status === 'draft' && (
                            <button
                                onClick={() => onPublish(design.id)}
                                className="px-4 py-1.5 bg-gold/10 text-gold border border-gold/20 rounded-sm text-[10px] uppercase tracking-widest font-black hover:bg-gold hover:text-noir transition-all"
                            >
                                Publish Asset
                            </button>
                        )}
                        <button className="text-zinc-600 hover:text-ivory transition-colors">
                            <Edit size={14} />
                        </button>
                        {design.status !== 'archived' && (
                            <button
                                onClick={() => onArchive(design.id)}
                                className="text-zinc-600 hover:text-red-400 transition-colors"
                            >
                                <Archive size={14} />
                            </button>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default DesignCard;
