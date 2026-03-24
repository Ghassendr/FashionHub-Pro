import React from 'react';
import { Layout, Edit, Trash2, CheckCircle, Archive } from 'lucide-react';

const DesignCard = ({ design, onPublish, onArchive }) => {
    const getStatusColor = (status) => {
        switch (status) {
            case 'published': return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
            case 'archived': return 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30';
            default: return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
        }
    };

    const coverMedia = design.media?.find(m => m.is_cover) || design.media?.[0];

    return (
        <div className="group relative bg-white/5 border border-white/10 rounded-2xl overflow-hidden hover:bg-white/10 transition-all duration-300">
            {/* Image Preview */}
            <div className="aspect-[3/4] overflow-hidden bg-zinc-900 border-b border-white/5">
                {coverMedia ? (
                    <img 
                        src={`http://localhost:8000/media/${coverMedia.file}`} 
                        alt={design.title} 
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                    />
                ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-zinc-600">
                        <Layout size={48} strokeWidth={1} />
                        <span className="text-xs mt-2 uppercase tracking-widest font-medium">No Preview</span>
                    </div>
                )}
            </div>

            {/* Content */}
            <div className="p-5">
                <div className="flex justify-between items-start mb-3">
                    <span className={`text-[10px] uppercase tracking-widest font-bold px-2 py-0.5 rounded-full border ${getStatusColor(design.status)}`}>
                        {design.status}
                    </span>
                    <span className="text-[10px] text-zinc-500 uppercase tracking-widest font-semibold">{design.category}</span>
                </div>
                
                <h3 className="text-lg font-display text-ivory mb-1 truncate">{design.title}</h3>
                <p className="text-sm text-zinc-400 line-clamp-2 mb-4 h-10">{design.description}</p>

                {/* Actions */}
                <div className="flex items-center gap-2 pt-4 border-t border-white/5">
                    {design.status === 'draft' && (
                        <button 
                            onClick={() => onPublish(design.id)}
                            className="flex-1 flex items-center justify-center gap-2 py-2 bg-ivory text-zinc-900 rounded-lg text-xs font-bold hover:bg-white transition-colors"
                        >
                            <CheckCircle size={14} /> Publish
                        </button>
                    )}
                    <button className="p-2 text-zinc-400 hover:text-ivory hover:bg-white/5 rounded-lg transition-all">
                        <Edit size={16} />
                    </button>
                    {design.status !== 'archived' && (
                        <button 
                            onClick={() => onArchive(design.id)}
                            className="p-2 text-zinc-400 hover:text-red-400 hover:bg-red-400/5 rounded-lg transition-all"
                        >
                            <Archive size={16} />
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default DesignCard;
