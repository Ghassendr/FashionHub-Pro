import React from 'react';
import { CreditCard, Shield, Lock } from 'lucide-react';
import BankCardManager from '../../../shared/components/BankCard/BankCardManager';

const BankCardPage = () => {
    return (
        <div className="animate-fade-in p-6 lg:p-12 max-w-5xl mx-auto">
            {/* Header Section */}
            <div className="mb-12 border-b border-gold/10 pb-8 relative group">
                <div className="absolute top-0 right-0 w-32 h-32 bg-gold/5 blur-3xl rounded-full pointer-events-none transition-transform duration-700 group-hover:scale-150"></div>
                <div className="flex items-center gap-4 mb-4">
                    <span className="text-[10px] tracking-[0.3em] uppercase text-gold font-bold bg-gold/10 px-4 py-1.5 rounded-full border border-gold/20 flex items-center gap-2">
                        <Lock size={12} /> Sécurité Renforcée
                    </span>
                </div>
                <div className="flex items-end justify-between">
                    <div>
                        <h1 className="text-4xl md:text-5xl font-display text-ivory italic flex items-center gap-4">
                            <CreditCard className="text-gold" size={40} />
                            Moyen de Paiement
                        </h1>
                        <p className="mt-4 text-ivory/40 text-sm tracking-wide max-w-xl font-light">
                            Gérez votre méthode de facturation. Conformément à notre politique Premium, 
                            une seule carte bancaire active est autorisée par profil client.
                        </p>
                    </div>
                    <div className="hidden md:flex items-center gap-2 text-ivory/20 font-serif italic text-lg">
                        <Shield size={20} className="text-gold/40" />
                        PCI-DSS Compliant
                    </div>
                </div>
            </div>

            {/* Bank Card Component */}
            <div className="bg-[#0a0a09] border border-gold/10 rounded-2xl p-8 lg:p-12 shadow-2xl relative overflow-hidden group">
                {/* Decorative Elements */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-gold/5 blur-3xl -translate-y-1/2 translate-x-1/2 rounded-full pointer-events-none"></div>
                
                {/* Using the Shared Component */}
                <div className="relative z-10">
                    <BankCardManager />
                </div>
            </div>
        </div>
    );
};

export default BankCardPage;
