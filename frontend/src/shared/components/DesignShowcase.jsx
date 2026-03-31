import React from 'react';
import { ArrowRight, LayoutGrid } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import DesignCard from '../../actors/couturehouse/components/DesignCard';

const DesignShowcase = ({ designs, title, subtitle, icon }) => {
    const navigate = useNavigate();

    return (
        <section className="py-24 bg-zinc-950/50 relative overflow-hidden">
            {/* Background Accent */}
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-amber-500/5 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/2"></div>
            
            <div className="wrapper relative z-10">
                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-end gap-8 mb-12">
                    <div className="animate-fade-in">
                        <div className="flex items-center gap-3 text-amber-500/80 mb-4 tracking-[0.3em] uppercase text-[10px] font-bold">
                            {icon || <LayoutGrid size={14} />}
                            <span>{subtitle || "Atelier Collection"}</span>
                        </div>
                        <h2 className="font-display text-4xl md:text-5xl font-bold text-ivory">
                            {title || "The Atelier Showcase"}
                        </h2>
                        <div className="divider-gold mx-0 mt-6 w-32"></div>
                    </div>
                    
                    <button 
                        onClick={() => navigate('/couturehouse/designs')}
                        className="group flex items-center gap-3 text-ivory/40 hover:text-amber-500 transition-all duration-500 text-xs uppercase tracking-widest font-bold pb-2 border-b border-white/5 hover:border-amber-500/30"
                    >
                        View Full Atelier
                        <ArrowRight size={14} className="group-hover:translate-x-2 transition-transform" />
                    </button>
                </div>

                {/* Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    {designs.map((design, index) => (
                        <div 
                            key={design.id} 
                            className="animate-fade-in-up"
                            style={{ animationDelay: `${0.1 * (index + 1)}s` }}
                        >
                            <DesignCard design={design} isPublic={true} />
                        </div>
                    ))}
                </div>

                {/* Empty State */}
                {designs.length === 0 && (
                    <div className="py-20 text-center border border-dashed border-white/10 rounded-2xl">
                        <p className="text-zinc-500 italic">Curating the next masterpiece...</p>
                    </div>
                )}
            </div>
        </section>
    );
};

export default DesignShowcase;
