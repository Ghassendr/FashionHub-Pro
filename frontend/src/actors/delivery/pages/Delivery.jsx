import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Truck, CreditCard, ChevronRight, ShieldCheck } from 'lucide-react';

const Delivery = () => {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-[#0a0a09] text-ivory flex flex-col font-sans">
            {/* Main Header / Hero */}
            <div className="flex-1 flex flex-col items-center justify-center text-center px-6 pt-20">
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-gold/10 border border-gold/20 rounded-full mb-8 animate-fade-in opacity-0 fill-mode-forwards" style={{ animationDelay: '0.1s' }}>
                    <Truck size={12} className="text-gold" />
                    <span className="text-[10px] uppercase tracking-luxury text-gold font-bold">Smart Logistics Hub</span>
                </div>
                
                <h1 className="text-5xl md:text-8xl font-display italic mb-6 animate-fade-in-up opacity-0 fill-mode-forwards" style={{ animationDelay: '0.2s' }}>
                    Delivery & <span className="text-gold">Strategy</span>
                </h1>
                
                <p className="text-lg text-ivory/40 max-w-2xl mx-auto mb-16 animate-fade-in-up opacity-0 fill-mode-forwards font-light leading-relaxed" style={{ animationDelay: '0.3s' }}>
                    Manage fleet, optimal routes, and logistics for Haute Couture across the globe. 
                    Our intelligent dispatching system ensures your creations arrive with precision.
                </p>

                {/* Quick Actions Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-4xl mx-auto animate-fade-in-up opacity-0 fill-mode-forwards" style={{ animationDelay: '0.4s' }}>
                    {/* Dashboard Placeholder */}
                    <div className="group p-8 bg-white/[0.02] border border-white/5 rounded-sm text-left hover:border-gold/20 transition-all duration-500 cursor-not-allowed opacity-60">
                        <div className="flex items-center justify-between mb-6">
                            <div className="w-12 h-12 bg-ivory/5 flex items-center justify-center rounded-sm">
                                <Truck size={24} className="text-ivory/20" />
                            </div>
                        </div>
                        <h3 className="text-xl font-display mb-2 text-ivory/50">Logistics Dashboard</h3>
                        <p className="text-xs text-ivory/20 uppercase tracking-widest italic">Coming Soon — Spring 2024</p>
                    </div>

                    {/* Bank Card Action (Functional) */}
                    <div 
                        onClick={() => navigate('/delivery/bank-card')}
                        className="group p-8 bg-gold/[0.02] border border-gold/10 rounded-sm text-left hover:border-gold/30 hover:shadow-glow-gold/5 transition-all duration-500 cursor-pointer"
                    >
                        <div className="flex items-center justify-between mb-6">
                            <div className="w-12 h-12 bg-gold/10 flex items-center justify-center rounded-sm group-hover:scale-110 transition-transform duration-500">
                                <CreditCard size={24} className="text-gold" />
                            </div>
                            <ChevronRight size={20} className="text-gold opacity-0 group-hover:opacity-100 group-hover:translate-x-2 transition-all duration-500" />
                        </div>
                        <h3 className="text-xl font-display mb-2">Financial Settings</h3>
                        <p className="text-xs text-gold/60 uppercase tracking-widest font-bold">Manage your Bank Card →</p>
                        
                        <div className="mt-8 flex items-center gap-2 py-2 px-3 bg-emerald-500/5 border border-emerald-500/10 rounded-sm w-fit">
                            <ShieldCheck size={12} className="text-emerald-500" />
                            <span className="text-[9px] uppercase tracking-widest text-emerald-500 font-bold italic">Secure Link</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Subtle Footer */}
            <footer className="p-10 text-center border-t border-white/5">
                <p className="text-[9px] uppercase tracking-[0.4em] text-ivory/10 font-medium">
                    FashionHub Global Logistics Interface
                </p>
            </footer>
        </div>
    );
};

export default Delivery;
