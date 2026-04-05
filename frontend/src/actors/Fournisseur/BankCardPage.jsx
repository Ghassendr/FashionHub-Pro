import React from 'react';
import BankCardManager from '../../shared/components/BankCard/BankCardManager';
import { CreditCard, Shield, ChevronLeft, Lock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const BankCardPage = () => {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-[#0d0d0b] text-[#f5f0e8] pb-20 selection:bg-gold/30">
            <div className="max-w-[700px] mx-auto px-6 animate-fade-in">
                
                {/* Navigation Back */}
                <button 
                    onClick={() => navigate('/fournisseur/dashboard')}
                    className="flex items-center gap-2 text-[10px] uppercase tracking-luxury text-gold/40 hover:text-gold transition-colors mb-12 group"
                >
                    <ChevronLeft size={14} className="group-hover:-translate-x-1 transition-transform" />
                    Retour au Dashboard
                </button>

                {/* Page Header */}
                <div className="mb-14">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-[1px] h-4 bg-gold/40" />
                        <span className="text-[10px] uppercase tracking-[0.3em] text-gold/60 font-bold">
                            Espace Partenaire
                        </span>
                    </div>
                    
                    <h1 className="font-display text-4xl md:text-5xl font-light italic mb-6 leading-tight">
                        Gestion de <span className="text-gold">Paiement</span>
                    </h1>
                    
                    <p className="text-sm text-ivory/40 leading-relaxed max-w-lg font-light">
                        Liez une carte bancaire sécurisée à votre compte. Cette carte sera utilisée pour vos transactions sur la plateforme.
                    </p>
                </div>

                {/* Security Feature Box */}
                <div className="relative overflow-hidden group mb-12">
                    <div className="absolute inset-0 bg-gold/5 opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
                    <div className="relative flex items-start gap-4 bg-gold/[0.02] border border-gold/10 p-6 backdrop-blur-sm">
                        <div className="w-10 h-10 rounded-sm bg-gold/10 flex items-center justify-center flex-shrink-0">
                            <Shield size={18} className="text-gold" />
                        </div>
                        <div className="space-y-1">
                            <p className="text-[11px] uppercase tracking-widest text-gold/80 font-bold">Sécurité Certifiée</p>
                            <p className="text-xs text-ivory/30 leading-relaxed uppercase tracking-tighter">
                                Vos données sont chiffrées de bout en bout. Nous ne stockons jamais votre numéro complet ni votre CVV.
                            </p>
                        </div>
                        <Lock size={12} className="absolute bottom-4 right-4 text-gold/20" />
                    </div>
                </div>

                {/* Card Manager Component */}
                <div className="bg-[#111113] border border-gold/5 p-1 relative">
                    {/* Decorative corners */}
                    <div className="absolute top-0 left-0 w-4 h-[1px] bg-gold/30" />
                    <div className="absolute top-0 left-0 w-[1px] h-4 bg-gold/30" />
                    <div className="absolute bottom-0 right-0 w-4 h-[1px] bg-gold/30" />
                    <div className="absolute bottom-0 right-0 w-[1px] h-4 bg-gold/30" />
                    
                    <div className="p-4 md:p-8">
                        <BankCardManager />
                    </div>
                </div>

                {/* Footer Note */}
                <div className="mt-12 text-center">
                    <p className="text-[9px] uppercase tracking-[0.25em] text-ivory/20 font-medium italic">
                         FashionHub — Secure Transaction Protocol v2.4
                    </p>
                </div>
            </div>
        </div>
    );
};

export default BankCardPage;
