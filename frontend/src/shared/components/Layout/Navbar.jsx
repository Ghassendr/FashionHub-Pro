import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X, LogIn, User, LogOut, ShieldCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import RegistrationModal from '../Auth/RegistrationModal';
import LoginModal from '../Auth/LoginModal';
import { useAuth } from '../../context/AuthContext';

const Navbar = () => {
    const { user, logout, isAuthenticated, isAdmin, isLoginOpen, setIsLoginOpen, isRegisterOpen, setIsRegisterOpen } = useAuth();
    const [isOpen, setIsOpen] = useState(false);
    const navigate = useNavigate();
    const location = useLocation();

    const handleLogout = () => {
        logout();
        navigate('/');
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
            <nav className="fixed top-0 left-0 right-0 z-[1000] bg-noir/90 backdrop-blur-md border-b border-gold/10 shadow-glow-gold/5 transition-all duration-500 font-sans h-[60px]">
                <div className="mx-auto w-full max-w-[1100px] px-12 h-full">
                    <div className="flex items-center justify-between h-full gap-8">
                        {/* Wordmark Section */}
                        <div className="flex items-center gap-12">
                            <Link to="/" className="group flex items-center gap-4">
                                <span className="text-gold text-[12px] tracking-[0.4em] uppercase font-medium whitespace-nowrap">
                                    M A I S O N &nbsp; T I S S U E
                                </span>
                            </Link>

                            <div className="h-8 w-[0.5px] bg-gold/20"></div>

                            {/* Session & Project Info */}
                            {isAuthenticated && (
                                <div className="flex items-center gap-8 text-[9px] tracking-[0.2em] font-light uppercase text-ivory/40">
                                    <div className="flex flex-col leading-tight">
                                        <span className="text-gold/60 font-semibold mb-0.5">IDENTIFIANT PROJET</span>
                                        <span className="text-ivory/60">MT-X72-SCAN-2026</span>
                                    </div>
                                    <div className="flex flex-col leading-tight">
                                        <span className="text-gold/60 font-semibold mb-0.5">SESSION</span>
                                        <span className="text-ivory/60">{user?.role === 'client' ? 'CLIENT · ACTIVE' : user?.role?.toUpperCase()}</span>
                                    </div>
                                    <div className="hidden lg:flex flex-col leading-tight">
                                        <span className="text-gold/60 font-semibold mb-0.5">COURRIEL</span>
                                        <span className="text-ivory/60 lowercase">{user.email}</span>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Navigation Tabs - Full Width Center */}
                        <div className="flex-grow flex justify-center items-center gap-12">
                            <Link to="/" className={`text-[10px] tracking-luxury uppercase font-medium transition-all duration-700 relative py-2 ${isActive('/') ? 'text-gold' : 'text-ivory/30 hover:text-ivory/70'}`}>
                                PORTAL
                                {isActive('/') && <div className="absolute -bottom-1 left-0 right-0 h-[1px] bg-gold animate-glow"></div>}
                            </Link>

                            {user?.role === 'client' && (
                                <>
                                    <Link to="/client/posture" className={`text-[10px] tracking-luxury uppercase font-medium transition-all duration-700 relative py-2 ${location.pathname.startsWith('/client/posture') ? 'text-gold' : 'text-ivory/30 hover:text-ivory/70'}`}>
                                        MA POSTURE
                                        {location.pathname.startsWith('/client/posture') && <div className="absolute -bottom-1 left-0 right-0 h-[1px] bg-gold animate-glow"></div>}
                                    </Link>
                                    <Link to="/client/costumes" className={`text-[10px] tracking-luxury uppercase font-medium transition-all duration-700 relative py-2 ${location.pathname.startsWith('/client/costumes') ? 'text-gold' : 'text-ivory/30 hover:text-ivory/70'}`}>
                                        MES COSTUMES
                                        {location.pathname.startsWith('/client/costumes') && <div className="absolute -bottom-1 left-0 right-0 h-[1px] bg-gold animate-glow"></div>}
                                    </Link>
                                </>
                            )}

                            {user?.role === 'couture_house' && (
                                <Link to="/couturehouse" className={`text-[10px] tracking-luxury uppercase font-medium transition-all duration-700 relative py-2 ${location.pathname.startsWith('/couturehouse') ? 'text-gold' : 'text-ivory/30 hover:text-ivory/70'}`}>
                                    COUTURE
                                    {location.pathname.startsWith('/couturehouse') && <div className="absolute -bottom-1 left-0 right-0 h-[1px] bg-gold animate-glow"></div>}
                                </Link>
                            )}

                            {isAdmin && (
                                <Link to="/admin" className={`text-[10px] tracking-luxury uppercase font-medium transition-all duration-700 relative py-2 ${isActive('/admin') ? 'text-gold' : 'text-ivory/30 hover:text-ivory/70'}`}>
                                    ADMIN
                                    {isActive('/admin') && <div className="absolute -bottom-1 left-0 right-0 h-[1px] bg-gold animate-glow"></div>}
                                </Link>
                            )}
                        </div>

                        {/* Auth Section */}
                        <div className="flex items-center gap-6">
                            {isAuthenticated ? (
                                <div className="flex items-center gap-8">
                                    <div 
                                        className={`flex flex-col items-end pt-1 transition-opacity ${user?.role === 'client' ? 'cursor-pointer hover:opacity-80' : ''}`}
                                        onClick={() => user?.role === 'client' && navigate('/profile')}
                                    >
                                        <div className="flex items-center gap-2 text-[10px] tracking-luxury uppercase text-gold font-bold">
                                            <User size={12} className="opacity-80" /> 
                                            {user.name || (user.email && user.email.split('@')[0]) || 'User'}
                                        </div>
                                        <span className="text-[8px] text-ivory/40 uppercase tracking-[0.2em] mt-0.5">
                                            {user.role} {user.status ? `• ${user.status}` : ''}
                                        </span>
                                    </div>
                                    <div className="h-6 w-[1px] bg-white/10"></div>
                                    <button
                                        onClick={handleLogout}
                                        className="text-[9px] tracking-luxury uppercase text-ivory/40 hover:text-red-400 transition-all duration-500 flex items-center gap-2"
                                    >
                                        <LogOut size={12} />
                                        Logout
                                    </button>
                                </div>
                            ) : (
                                <button
                                    onClick={() => setIsLoginOpen(true)}
                                    className="text-[9px] tracking-luxury uppercase text-gold border border-gold/30 px-6 py-2 hover:bg-gold/10 transition-all duration-500"
                                >
                                    Connexion
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                {/* Mobile Toggle & Menu - Re-integrated for responsiveness */}
                <button
                    className="md:hidden absolute top-6 right-8 text-ivory/60 hover:text-gold transition-colors p-2"
                    onClick={() => setIsOpen(!isOpen)}
                >
                    {isOpen ? <X size={20} /> : <Menu size={20} />}
                </button>

                {/* Mobile Menu */}
                {isOpen && (
                    <div className="md:hidden absolute top-full left-0 w-full bg-noir/98 backdrop-blur-xl border-b border-subtle/30 animate-fade-in">
                        <div className="flex flex-col gap-1 p-8">
                            <Link to="/" className={`py-3 text-[11px] tracking-luxury uppercase font-medium ${isActive('/')}`} onClick={() => setIsOpen(false)}>Portal</Link>

                            {user?.role === 'client' && (
                                <>
                                    <Link to="/client/posture" className={`py-3 text-[11px] tracking-luxury uppercase font-medium ${location.pathname.startsWith('/client/posture') ? 'text-gold' : 'text-ivory/60'}`} onClick={() => setIsOpen(false)}>MA POSTURE</Link>
                                    <Link to="/client/costumes" className={`py-3 text-[11px] tracking-luxury uppercase font-medium ${location.pathname.startsWith('/client/costumes') ? 'text-gold' : 'text-ivory/60'}`} onClick={() => setIsOpen(false)}>MES COSTUMES</Link>
                                </>
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
                                <Link to="/admin" className={`py-3 text-[11px] tracking-luxury uppercase text-gold font-bold flex items-center gap-1 ${isActive('/admin')}`} onClick={() => setIsOpen(false)}>
                                    <ShieldCheck size={14} /> Admin
                                </Link>
                            )}
                            <div className="divider-gold mt-6 mb-4 mx-0"></div>
                            {isAuthenticated ? (
                                <div className="flex flex-col gap-4">
                                    <div 
                                        className={`flex items-center gap-3 py-3 text-[11px] tracking-luxury uppercase text-gold font-medium border-b border-subtle/20 transition-colors ${user?.role === 'client' ? 'cursor-pointer hover:text-ivory' : ''}`}
                                        onClick={() => { setIsOpen(false); user?.role === 'client' && navigate('/profile'); }}
                                    >
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
