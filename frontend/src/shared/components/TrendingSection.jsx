import React, { useRef } from 'react';
import { ChevronLeft, ChevronRight, Zap, Sparkles } from 'lucide-react';
import FabricCard from './FabricCard';

const TrendingSection = ({ title, fabrics, subtitle, icon, showLikes = false }) => {
    const scrollRef = useRef(null);

    const scroll = (direction) => {
        const { current } = scrollRef;
        if (current) {
            const scrollAmount = direction === 'left' ? -400 : 400;
            current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
        }
    };

    if (!fabrics || fabrics.length === 0) return null;

    return (
        <section className="py-24 border-t border-subtle/10 relative overflow-hidden">
            <div className="wrapper">
                <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-6">
                    <div>
                        <div className="flex items-center gap-3 text-gold mb-4">
                            {icon}
                            <span className="text-label tracking-[0.3em] uppercase">{subtitle}</span>
                        </div>
                        <h2 className="font-display text-4xl md:text-5xl font-bold text-ivory">
                            {title}
                        </h2>
                    </div>
                    
                    {/* Navigation Buttons */}
                    <div className="flex gap-3">
                        <button 
                            onClick={() => scroll('left')}
                            className="w-12 h-12 flex items-center justify-center border border-subtle/30 text-ivory/40 hover:border-gold hover:text-gold transition-all duration-500 rounded-full"
                            aria-label="Previous"
                        >
                            <ChevronLeft size={20} />
                        </button>
                        <button 
                            onClick={() => scroll('right')}
                            className="w-12 h-12 flex items-center justify-center border border-subtle/30 text-ivory/40 hover:border-gold hover:text-gold transition-all duration-500 rounded-full"
                            aria-label="Next"
                        >
                            <ChevronRight size={20} />
                        </button>
                    </div>
                </div>

                {/* Carousel Container */}
                <div 
                    ref={scrollRef}
                    className="flex gap-8 overflow-x-auto pb-12 scrollbar-none snap-x snap-mandatory"
                    style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                >
                    {fabrics.map((fabric) => (
                        <div key={fabric.id} className="snap-start">
                            <FabricCard fabric={fabric} showLikes={showLikes} />
                        </div>
                    ))}
                    
                    {/* View All Card Placeholder */}
                    <div className="w-72 flex-shrink-0 flex flex-col items-center justify-center border border-dashed border-subtle/20 group hover:border-gold/30 transition-all cursor-pointer bg-noir/40">
                         <div className="w-16 h-16 rounded-full bg-subtle/10 flex items-center justify-center text-gold/40 group-hover:bg-gold/10 group-hover:text-gold transition-all mb-4">
                            <ChevronRight size={24} />
                         </div>
                         <span className="text-label text-gold/50 group-hover:text-gold">Explore All</span>
                    </div>
                </div>
            </div>

            {/* Decorative background element */}
            <div className="absolute -bottom-20 -right-20 w-96 h-96 bg-gold/5 blur-[120px] rounded-full pointer-events-none"></div>
        </section>
    );
};

export default TrendingSection;
