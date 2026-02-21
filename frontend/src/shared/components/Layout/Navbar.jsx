import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X } from 'lucide-react';

const Navbar = () => {
    const [isOpen, setIsOpen] = useState(false);
    const location = useLocation();

    const isActive = (path) =>
        location.pathname === path
            ? 'text-gold'
            : 'text-ivory/60 hover:text-gold transition-all duration-500';

    return (
        <nav className="fixed top-0 left-0 right-0 z-50 bg-noir/90 backdrop-blur-md border-b border-subtle/30 transition-all duration-500">
            <div className="wrapper">
                <div className="flex justify-between items-center h-20">
                    {/* Wordmark */}
                    <Link to="/" className="group flex items-center gap-4">
                        <span className="text-gold text-lg tracking-luxury uppercase font-sans font-medium">
                            Maison Tissue
                        </span>
                    </Link>

                    {/* Desktop Navigation */}
                    <div className="hidden md:flex items-center gap-10">
                        <Link to="/" className={`text-[11px] tracking-luxury uppercase font-medium ${isActive('/')}`}>
                            Portal
                        </Link>
                        <Link to="/client/dashboard" className={`text-[11px] tracking-luxury uppercase font-medium ${isActive('/client/dashboard') || location.pathname.startsWith('/client') ? 'text-gold' : 'text-ivory/60 hover:text-gold transition-all duration-500'}`}>
                            Client
                        </Link>
                        <Link to="/delivery" className={`text-[11px] tracking-luxury uppercase font-medium ${isActive('/delivery')}`}>
                            Delivery
                        </Link>
                        <Link to="/couturehouse" className={`text-[11px] tracking-luxury uppercase font-medium ${isActive('/couturehouse')}`}>
                            Couture House
                        </Link>

                        <div className="h-4 w-px bg-subtle ml-2"></div>

                        <Link to="/client/onboarding" className="btn-ghost text-[11px] tracking-luxury uppercase font-medium border border-gold/40 px-5 py-2 hover:bg-gold/10 transition-all duration-500">
                            Private Client
                        </Link>
                    </div>

                    {/* Mobile Toggle */}
                    <button
                        className="md:hidden text-ivory/60 hover:text-gold transition-colors p-2"
                        onClick={() => setIsOpen(!isOpen)}
                    >
                        {isOpen ? <X size={24} /> : <Menu size={24} />}
                    </button>
                </div>
            </div>

            {/* Mobile Menu */}
            {isOpen && (
                <div className="md:hidden absolute top-full left-0 w-full bg-noir/98 backdrop-blur-xl border-b border-subtle/30 animate-fade-in">
                    <div className="flex flex-col gap-1 p-8">
                        <Link to="/" className={`py-3 text-[11px] tracking-luxury uppercase font-medium ${isActive('/')}`} onClick={() => setIsOpen(false)}>Portal</Link>
                        <Link to="/client/dashboard" className={`py-3 text-[11px] tracking-luxury uppercase font-medium ${isActive('/client/dashboard') || location.pathname.startsWith('/client') ? 'text-gold' : 'text-ivory/60 hover:text-gold transition-all duration-500'}`} onClick={() => setIsOpen(false)}>Client</Link>
                        <Link to="/delivery" className={`py-3 text-[11px] tracking-luxury uppercase font-medium ${isActive('/delivery')}`} onClick={() => setIsOpen(false)}>Delivery</Link>
                        <Link to="/couturehouse" className={`py-3 text-[11px] tracking-luxury uppercase font-medium ${isActive('/couturehouse')}`} onClick={() => setIsOpen(false)}>Couture House</Link>
                        <div className="divider-gold mt-6 mb-4 mx-0"></div>
                        <Link to="/client/onboarding" className="btn btn-primary w-full justify-center mt-2" onClick={() => setIsOpen(false)}>
                            Private Client
                        </Link>
                    </div>
                </div>
            )}
        </nav>
    );
};

export default Navbar;
