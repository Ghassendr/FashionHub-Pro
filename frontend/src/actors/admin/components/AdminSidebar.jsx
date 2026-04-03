import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, ShieldCheck, Users, Settings, LogOut } from 'lucide-react';
import { useAuth } from '../../../shared/context/AuthContext';

const navItems = [
    { label: 'Platform Dashboard', icon: LayoutDashboard, path: '/admin/overview' },
    { label: 'Verification Queue', icon: ShieldCheck, path: '/admin/review' },
    { label: 'Marketplace Stats', icon: Users, path: '/admin/users' }, // Reusing User Management for now
    { label: 'System Settings', icon: Settings, path: '/admin/settings' },
];

const AdminSidebar = () => {
    const { logout, user } = useAuth();

    return (
        <aside className="fixed top-0 left-0 h-screen w-64 bg-[#0d0d0e] border-r border-subtle/30 flex flex-col z-50">
            {/* Brand */}
            <div className="px-6 py-6 border-b border-subtle/20">
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-sm bg-gold/10 border border-gold/30 flex items-center justify-center">
                        <ShieldCheck size={18} className="text-gold" />
                    </div>
                    <div>
                        <h2 className="font-display text-lg text-ivory leading-tight">Maison Tissue</h2>
                        <span className="text-[8px] uppercase tracking-[0.3em] text-gold/50 font-sans">Admin Panel</span>
                    </div>
                </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 py-6 px-3 space-y-1 overflow-y-auto scrollbar-none">
                {navItems.map((item) => (
                    <NavLink
                        key={item.path}
                        to={item.path}
                        className={({ isActive }) =>
                            `flex items-center gap-3 px-4 py-3 rounded-sm text-[12px] font-sans tracking-wide uppercase transition-all duration-300 group ${
                                isActive
                                    ? 'bg-gold/10 text-gold border border-gold/20'
                                    : 'text-ivory/40 hover:text-ivory/80 hover:bg-surface border border-transparent'
                            }`
                        }
                    >
                        <item.icon size={16} className="shrink-0 transition-colors duration-300 group-hover:text-gold" />
                        <span>{item.label}</span>
                    </NavLink>
                ))}
            </nav>

            {/* User Info + Logout */}
            <div className="border-t border-subtle/20 px-4 py-4">
                <div className="flex items-center gap-3 mb-3">
                    <div className="w-8 h-8 rounded-full bg-gold/15 flex items-center justify-center text-gold text-xs font-bold uppercase">
                        {user?.name?.charAt(0) || 'A'}
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-ivory/80 text-xs font-medium truncate">{user?.name || 'Admin'}</p>
                        <p className="text-ivory/30 text-[10px] tracking-wide uppercase">Administrator</p>
                    </div>
                </div>
                <button
                    onClick={logout}
                    className="flex items-center gap-2 w-full px-3 py-2 rounded-sm text-[11px] font-sans tracking-wide uppercase text-red-400/70 hover:text-red-400 hover:bg-red-400/5 transition-all duration-300 border border-transparent hover:border-red-400/10"
                >
                    <LogOut size={14} />
                    <span>Logout</span>
                </button>
            </div>
        </aside>
    );
};

export default AdminSidebar;
