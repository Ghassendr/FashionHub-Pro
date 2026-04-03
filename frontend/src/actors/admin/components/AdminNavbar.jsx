import React from 'react';
import { useLocation } from 'react-router-dom';
import { Bell, Search } from 'lucide-react';

const pageTitles = {
    '/admin/overview': 'Dashboard Overview',
    '/admin/review': 'Verification Queue',
    '/admin/users': 'User Management',
    '/admin/settings': 'Settings',
};

const AdminNavbar = () => {
    const location = useLocation();
    const currentTitle = pageTitles[location.pathname] || 'Admin';

    return (
        <header className="h-16 bg-[#0d0d0e]/80 backdrop-blur-md border-b border-subtle/20 flex items-center justify-between px-8 sticky top-0 z-40">
            {/* Page Title */}
            <div>
                <h1 className="font-display text-xl text-ivory/90 tracking-wide">{currentTitle}</h1>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-4">
                {/* Search */}
                <div className="relative">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ivory/20" />
                    <input
                        type="text"
                        placeholder="Search..."
                        className="pl-9 pr-4 py-2 bg-surface border border-subtle/30 text-ivory/70 text-xs rounded-sm w-56 focus:outline-none focus:border-gold/40 transition-colors duration-300 placeholder:text-ivory/15 font-sans tracking-wide"
                    />
                </div>

                {/* Notifications */}
                <button className="relative p-2 rounded-sm hover:bg-surface border border-transparent hover:border-subtle/30 transition-all duration-300 group">
                    <Bell size={16} className="text-ivory/40 group-hover:text-gold transition-colors duration-300" />
                    <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-gold rounded-full animate-pulse"></span>
                </button>
            </div>
        </header>
    );
};

export default AdminNavbar;
