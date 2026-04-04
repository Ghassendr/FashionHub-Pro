import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { LogIn, User, LogOut, Settings, Menu, X } from 'lucide-react';
import RegistrationModal from '../Auth/RegistrationModal';
import LoginModal from '../Auth/LoginModal';
import { useAuth } from '../../context/AuthContext';

const Navbar = () => {
    const { user, logout, isAuthenticated, isLoginOpen, setIsLoginOpen, isRegisterOpen, setIsRegisterOpen } = useAuth();
    const [isOpen, setIsOpen] = useState(false);
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate('/');
    };

    const handleSettings = () => {
        navigate('/profile'); 
    };

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
                <div className="mx-auto w-full max-w-[1400px] px-6 md:px-12 h-full">
                    <div className="flex items-center justify-between h-full">
                        
                        {/* Wordmark Section - Left */}
                        <div className="flex items-center">
                            <Link to="/" className="group flex items-center gap-4">
                                <span className="text-gold text-[12px] tracking-[0.4em] uppercase font-medium whitespace-nowrap">
                                    M A I S O N &nbsp; T I S S U E
                                </span>
                            </Link>
                        </div>

                        {/* Auth / User Actions - Right */}
                        <div className="hidden md:flex items-center gap-6">
                            {isAuthenticated ? (
                                <div className="flex items-center gap-6">
                                    {/* User Profile Link */}
                                    <div 
                                        className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity"
                                        onClick={() => navigate('/profile')}
                                    >
                                        <User size={14} className="text-gold opacity-80" /> 
                                        <span className="text-[10px] tracking-luxury uppercase text-gold font-bold">
                                            {user.name || (user.email && user.email.split('@')[0]) || 'User'}
                                        </span>
                                    </div>
                                    
                                    <div className="h-4 w-[1px] bg-white/10"></div>
                                    
                                    {/* Settings Icon */}
                                    <button
                                        onClick={handleSettings}
                                        className="text-ivory/40 hover:text-gold transition-colors p-1"
                                        title="Settings"
                                    >
                                        <Settings size={14} />
                                    </button>

                                    {/* Logout Icon */}
                                    <button
                                        onClick={handleLogout}
                                        className="text-ivory/40 hover:text-red-400 transition-colors p-1"
                                        title="Logout"
                                    >
                                        <LogOut size={14} />
                                    </button>
                                </div>
                            ) : (
                                <button
                                    onClick={() => setIsLoginOpen(true)}
                                    className="text-[9px] tracking-luxury uppercase text-gold border border-gold/30 px-6 py-2 hover:bg-gold/10 transition-all duration-500"
                                >
                                    Login
                                </button>
                            )}
                        </div>

                        {/* Mobile Toggle */}
                        <button
                            className="md:hidden text-ivory/60 hover:text-gold transition-colors p-2"
                            onClick={() => setIsOpen(!isOpen)}
                        >
                            {isOpen ? <X size={20} /> : <Menu size={20} />}
                        </button>
                    </div>
                </div>

                {/* Mobile Menu */}
                {isOpen && (
                    <div className="md:hidden absolute top-full left-0 w-full bg-noir/98 backdrop-blur-xl border-b border-subtle/30 animate-fade-in">
                        <div className="flex flex-col gap-1 p-8">
                            {isAuthenticated ? (
                                <div className="flex flex-col gap-4">
                                    <div 
                                        className="flex items-center gap-3 py-3 text-[11px] tracking-luxury uppercase text-gold font-medium border-b border-subtle/20 cursor-pointer"
                                        onClick={() => { setIsOpen(false); navigate('/profile'); }}
                                    >
                                        <User size={16} /> {user.name || 'User'}
                                    </div>
                                    <div 
                                        className="flex items-center gap-3 py-3 text-[11px] tracking-luxury uppercase text-ivory/60 font-medium border-b border-subtle/20 cursor-pointer"
                                        onClick={() => { setIsOpen(false); handleSettings(); }}
                                    >
                                        <Settings size={16} /> Settings
                                    </div>
                                    <button
                                        onClick={handleLogout}
                                        className="btn btn-secondary w-full justify-center flex items-center gap-2 text-red-500 border-red-900/30 mt-4"
                                    >
                                        <LogOut size={16} /> Logout
                                    </button>
                                </div>
                            ) : (
                                <button
                                    onClick={() => { setIsLoginOpen(true); setIsOpen(false); }}
                                    className="btn btn-primary w-full justify-center flex items-center gap-2"
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
