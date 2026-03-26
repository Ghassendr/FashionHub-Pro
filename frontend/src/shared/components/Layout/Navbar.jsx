import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X, LogIn, User, LogOut, ShieldCheck } from 'lucide-react';
import RegistrationModal from '../Auth/RegistrationModal';
import LoginModal from '../Auth/LoginModal';
import { useAuth } from '../../context/AuthContext';

const Navbar = () => {
    const { user, logout, isAuthenticated, isAdmin, isLoginOpen, setIsLoginOpen, isRegisterOpen, setIsRegisterOpen } = useAuth();
    const [isOpen, setIsOpen] = useState(false);
    const location = useLocation();

    const handleLogout = () => {
        logout();
    };

    const isActive = (path) =>
        location.pathname === path
            ? 'text-gold'
            : 'text-ivory/60 hover:text-gold transition-all duration-500';

    return (
        <>
            <RegistrationModal
                isOpen={isRegisterOpen}
                onClose={() => setIsRegisterOpen(false)}
                onSwitchToLogin={() => {
                    setIsRegisterOpen(false);
                    setIsLoginOpen(true);
                }}
            />
            <LoginModal
                isOpen={isLoginOpen}
                onClose={() => setIsLoginOpen(false)}
                onSwitchToRegister={() => {
                    setIsLoginOpen(false);
                    setIsRegisterOpen(true);
                }}
            />
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

                            {/* Role-Based Links */}
                            {user?.role === 'client' && (
                                <Link to="/client/3d-measurements" className={`text-[11px] tracking-luxury uppercase font-medium ${isActive('/client/3d-measurements') || location.pathname.startsWith('/client') ? 'text-gold' : 'text-ivory/60 hover:text-gold transition-all duration-500'}`}>
                                    Client
                                </Link>
                            )}

                            {user?.role === 'delivery' && (
                                <Link to="/delivery" className={`text-[11px] tracking-luxury uppercase font-medium ${isActive('/delivery')}`}>
                                    Delivery
                                </Link>
                            )}

                            {user?.role === 'couture_house' && (
                                <Link to="/couturehouse" className={`text-[11px] tracking-luxury uppercase font-medium ${location.pathname.startsWith('/couturehouse') ? 'text-gold' : 'text-ivory/60 hover:text-gold transition-all duration-500'}`}>
                                    Couture House
                                </Link>
                            )}

                            {user?.role === 'fournisseur' && (
                                <Link to="/fournisseur/dashboard" className={`text-[11px] tracking-luxury uppercase font-medium ${location.pathname.startsWith('/fournisseur') ? 'text-gold' : 'text-ivory/60 hover:text-gold transition-all duration-500'}`}>
                                    Supplier
                                </Link>
                            )}

                            {isAdmin && (
                                <Link to="/admin/review" className={`text-[11px] tracking-luxury uppercase font-gold font-bold flex items-center gap-1 ${isActive('/admin/review')}`}>
                                    <ShieldCheck size={14} /> Admin
                                </Link>
                            )}

                            <div className="h-4 w-px bg-subtle ml-2"></div>

                            {isAuthenticated ? (
                                <div className="flex items-center gap-6">
                                    <div className="flex flex-col items-end">
                                        <div className="flex items-center gap-2 text-[11px] tracking-luxury uppercase text-gold font-medium">
                                            <User size={14} /> {user.name || (user.email && user.email.split('@')[0]) || 'User'}
                                        </div>
                                        <span className="text-[9px] text-ivory/40 uppercase tracking-tighter">{user.role} • {user.status}</span>
                                    </div>
                                    <button
                                        onClick={handleLogout}
                                        className="text-ivory/50 hover:text-red-400 transition-colors"
                                        title="Logout"
                                    >
                                        <LogOut size={16} />
                                    </button>
                                </div>
                            ) : (
                                <button
                                    onClick={() => setIsLoginOpen(true)}
                                    className="btn-ghost flex items-center gap-2 text-[11px] tracking-luxury uppercase font-medium border border-gold/40 px-5 py-2 hover:bg-gold/10 transition-all duration-500"
                                >
                                    <LogIn size={14} /> Login
                                </button>
                            )}
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
                            
                            {user?.role === 'client' && (
                                <Link to="/client/3d-measurements" className={`py-3 text-[11px] tracking-luxury uppercase font-medium ${location.pathname.startsWith('/client') ? 'text-gold' : 'text-ivory/60 hover:text-gold transition-all duration-500'}`} onClick={() => setIsOpen(false)}>Client</Link>
                            )}
                            
                            {user?.role === 'delivery' && (
                                <Link to="/delivery" className={`py-3 text-[11px] tracking-luxury uppercase font-medium ${isActive('/delivery')}`} onClick={() => setIsOpen(false)}>Delivery</Link>
                            )}
                            
                            {user?.role === 'couture_house' && (
                                <Link to="/couturehouse" className={`py-3 text-[11px] tracking-luxury uppercase font-medium ${location.pathname.startsWith('/couturehouse') ? 'text-gold' : 'text-ivory/60 hover:text-gold transition-all duration-500'}`} onClick={() => setIsOpen(false)}>Couture House</Link>
                            )}

                            {user?.role === 'fournisseur' && (
                                <Link to="/fournisseur/dashboard" className={`py-3 text-[11px] tracking-luxury uppercase font-medium ${location.pathname.startsWith('/fournisseur') ? 'text-gold' : 'text-ivory/60 hover:text-gold transition-all duration-500'}`} onClick={() => setIsOpen(false)}>Supplier</Link>
                            )}

                            {isAdmin && (
                                <Link to="/admin/review" className={`py-3 text-[11px] tracking-luxury uppercase font-gold font-bold flex items-center gap-1 ${isActive('/admin/review')}`} onClick={() => setIsOpen(false)}>
                                    <ShieldCheck size={14} /> Admin
                                </Link>
                            )}
                            <div className="divider-gold mt-6 mb-4 mx-0"></div>
                            {isAuthenticated ? (
                                <div className="flex flex-col gap-4">
                                    <div className="flex items-center gap-3 py-3 text-[11px] tracking-luxury uppercase text-gold font-medium border-b border-subtle/20">
                                        <User size={16} /> {user.name}
                                    </div>
                                    <button
                                        onClick={handleLogout}
                                        className="btn btn-secondary w-full justify-center flex items-center gap-2 text-red-400 border-red-900/30"
                                    >
                                        <LogOut size={16} /> Logout
                                    </button>
                                </div>
                            ) : (
                                <button
                                    onClick={() => { setIsLoginOpen(true); setIsOpen(false); }}
                                    className="btn btn-primary w-full justify-center mt-2 flex items-center gap-2"
                                >
                                    <LogIn size={16} /> Login
                                </button>
                            )}
                        </div>
                    </div>
                )}
            </nav>
        </>
    );
};

export default Navbar;
