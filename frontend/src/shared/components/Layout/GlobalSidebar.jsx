import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
    User, Frame, Layers, History, CreditCard,
    Home, Package, Settings, Palette, Mail, ShieldCheck, ListChecks, Truck,
    LayoutGrid, Thermometer, Plus, TrendingUp, Users, Clock
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const GlobalSidebar = () => {
    const { user, isAuthenticated, isAdmin } = useAuth();
    const location = useLocation();

    if (!isAuthenticated || !user) return null;

    // Helper for active styling
    const getNavClass = ({ isActive }) => {
        return `flex items-center gap-4 px-6 py-3 text-[11px] tracking-luxury uppercase font-medium transition-all duration-300 border-l-2 ${isActive
                ? 'border-gold text-gold bg-gold/5'
                : 'border-transparent text-ivory/40 hover:text-ivory hover:bg-white/5'
            }`;
    };

    const renderLinks = () => {
        switch (user.role) {
            case 'client':
                return (
                    <>
                        <NavLink to="/profile" end className={getNavClass}>
                            <User size={16} /> My Profile
                        </NavLink>
                        <NavLink to="/client/posture" className={getNavClass}>
                            <Frame size={16} /> My Posture
                        </NavLink>
                        <NavLink to="/client/costumes" className={getNavClass}>
                            <Layers size={16} /> My Costumes
                        </NavLink>
                        <NavLink to="/client/history" className={getNavClass}>
                            <History size={16} /> Order History
                        </NavLink>
                        <NavLink to="/client/bank-card" className={getNavClass}>
                            <CreditCard size={16} /> Bank Card
                        </NavLink>
                    </>
                );
            case 'fournisseur':
                return (
                    <div className="flex flex-col gap-6">
                        <div>
                            <div className="px-6 mb-4 text-[9px] uppercase tracking-[0.2em] text-ivory/20 font-bold">Main</div>
                            <NavLink to="/fournisseur/dashboard" end className={getNavClass}>
                                <LayoutGrid size={16} /> Overview
                            </NavLink>
                            <NavLink to="/fournisseur/orders" className={getNavClass}>
                                <ListChecks size={16} /> Client Orders
                            </NavLink>
                            <NavLink to="/fournisseur/creations" className={getNavClass}>
                                <Package size={16} /> My Inventory
                            </NavLink>
                            <NavLink to="/fournisseur/creations?add=true" className={getNavClass}>
                                <Plus size={16} /> Add Fabric
                            </NavLink>
                        </div>

                        <div>
                            <div className="px-6 mb-4 text-[9px] uppercase tracking-[0.2em] text-ivory/20 font-bold">Operations</div>
                            <NavLink to="/fournisseur/dashboard?tab=analytics" className={getNavClass}>
                                <TrendingUp size={16} /> Analytics
                            </NavLink>
                            <NavLink to="/fournisseur/history" className={getNavClass}>
                                <History size={16} /> Sales History
                            </NavLink>
                            <NavLink to="/fournisseur/settings" className={getNavClass}>
                                <Settings size={16} /> Settings
                            </NavLink>
                        </div>

                        <div className="pt-4 border-t border-white/5">
                            <NavLink to="/profile" end className={getNavClass}>
                                <User size={16} /> My Profile
                            </NavLink>
                            <NavLink to="/fournisseur/bank-card" className={getNavClass}>
                                <CreditCard size={16} /> Bank Card
                            </NavLink>
                        </div>
                    </div>
                );
            case 'couture_house':
                return (
                    <>
                        <NavLink to="/profile" end className={getNavClass}>
                            <User size={16} /> My Profile
                        </NavLink>
                        <NavLink to="/couturehouse" end className={getNavClass}>
                            <Home size={16} /> Atelier
                        </NavLink>
                        <NavLink to="/couturehouse/creations" className={getNavClass}>
                            <Layers size={16} /> My Creations
                        </NavLink>
                        <NavLink to="/couturehouse/fabrics" className={getNavClass}>
                            <Package size={16} /> Fabrics Inventory
                        </NavLink>
                        <NavLink to="/couturehouse/inquiries" className={getNavClass}>
                            <Mail size={16} /> Inquiries
                        </NavLink>
                        <NavLink to="/couturehouse/orders" className={getNavClass}>
                            <Clock size={16} /> Production & Tracking
                        </NavLink>
                        <NavLink to="/couturehouse/create" className={getNavClass}>
                            <Plus size={16} /> New Creation
                        </NavLink>
                        <NavLink to="/couturehouse/bank-card" className={getNavClass}>
                            <CreditCard size={16} /> Bank Card
                        </NavLink>
                    </>
                );
            case 'delivery':
                return (
                    <div className="flex flex-col gap-6">
                        <div>
                            <div className="px-6 mb-4 text-[9px] uppercase tracking-[0.2em] text-ivory/20 font-bold">Main</div>
                            <NavLink to="/delivery" end className={getNavClass}>
                                <LayoutGrid size={16} /> Overview
                            </NavLink>
                            <NavLink to="/delivery?tab=orders" className={getNavClass}>
                                <div className="flex items-center justify-between w-full">
                                    <div className="flex items-center gap-4">
                                        <Package size={16} /> Order Handling
                                    </div>
                                    <span className="bg-gold text-noir text-[9px] font-black px-1.5 py-0.5 rounded-sm min-w-[18px] text-center">3</span>
                                </div>
                            </NavLink>
                            <NavLink to="/delivery?tab=trips" className={getNavClass}>
                                <Home size={16} /> Active Trips
                            </NavLink>
                            <NavLink to="/delivery?tab=fleet" className={getNavClass}>
                                <Truck size={16} /> Fleet
                            </NavLink>
                        </div>

                        <div>
                            <div className="px-6 mb-4 text-[9px] uppercase tracking-[0.2em] text-ivory/20 font-bold">Operations</div>
                            <NavLink to="/delivery?tab=scan" className={getNavClass}>
                                <Settings size={16} /> Scan & Auth
                            </NavLink>
                            <NavLink to="/delivery?tab=climate" className={getNavClass}>
                                <Thermometer size={16} /> Climate Logs
                            </NavLink>
                            <NavLink to="/delivery?tab=compliance" className={getNavClass}>
                                <ShieldCheck size={16} /> Compliance Docs
                            </NavLink>
                            <NavLink to="/delivery?tab=history" className={getNavClass}>
                                <History size={16} /> History
                            </NavLink>
                        </div>

                        <div className="pt-4 border-t border-white/5">
                            <NavLink to="/profile" end className={getNavClass}>
                                <User size={16} /> My Profile
                            </NavLink>
                            <NavLink to="/delivery/bank-card" className={getNavClass}>
                                <CreditCard size={16} /> Bank Card
                            </NavLink>
                        </div>
                    </div>
                );
            default:
                if (isAdmin) {
                    return (
                        <>
                            <NavLink to="/profile" end className={getNavClass}>
                                <User size={16} /> My Profile
                            </NavLink>
                            <NavLink to="/admin/overview" className={getNavClass}>
                                <ShieldCheck size={16} /> Admin Overview
                            </NavLink>
                            <NavLink to="/admin/review" className={getNavClass}>
                                <ListChecks size={16} /> Verification Queue
                            </NavLink>
                        </>
                    );
                }
                return null;
        }
    };

    return (
        <aside className="w-[260px] flex-shrink-0 border-r border-gold/10 bg-[#0a0a09] pt-12 min-h-screen">
            <div className="px-6 mb-12">
                <span className="text-[10px] tracking-[0.3em] uppercase text-gold/60 font-bold">
                    {user.role === 'client' ? 'Personal Space' : 'Professional Space'}
                </span>
            </div>
            <nav className="flex flex-col gap-2">
                {renderLinks()}
            </nav>
        </aside>
    );
};

export default GlobalSidebar;
