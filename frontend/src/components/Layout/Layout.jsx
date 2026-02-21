import React from 'react';
import Navbar from './Navbar';
import { Outlet } from 'react-router-dom';

const Layout = () => {
    return (
        <div className="min-h-screen flex flex-col bg-noir text-ivory selection:bg-gold/30 selection:text-ivory">
            <Navbar />
            <main className="flex-grow">
                <Outlet />
            </main>
            <footer className="border-t border-subtle/50 py-16 mt-0">
                <div className="wrapper">
                    <div className="flex flex-col items-center gap-6">
                        <div className="divider-gold"></div>
                        <p className="font-display text-xl italic text-ivory/70">"Where Art Meets Couture"</p>
                        <div className="flex items-center gap-8 text-label">
                            <span>Collections</span>
                            <span className="text-gold/30">◆</span>
                            <span>Atelier</span>
                            <span className="text-gold/30">◆</span>
                            <span>Private Clients</span>
                            <span className="text-gold/30">◆</span>
                            <span>Consultation</span>
                        </div>
                        <div className="mt-4 text-center">
                            <p className="text-label mb-1">© 2026 Maison Tissue</p>
                            <p className="text-ivory/20 text-xs tracking-wider">Haute Couture & Smart Logistics Platform</p>
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    );
};

export default Layout;
