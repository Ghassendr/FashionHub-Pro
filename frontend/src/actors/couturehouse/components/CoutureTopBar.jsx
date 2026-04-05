import React from 'react';
import { Menu, Search } from 'lucide-react';

const CoutureTopBar = ({ sidebarOpen, setSidebarOpen, children }) => {
    return (
        <header className="atelier-top-bar">
            <div className="flex items-center gap-6">
                <button onClick={() => setSidebarOpen(!sidebarOpen)} className="text-zinc-500 hover:text-ivory transition-colors">
                    <Menu size={20} />
                </button>
                <div className="atelier-search">
                    <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" />
                    <input type="text" placeholder="Rechercher..." />
                </div>
            </div>
            <div className="flex items-center gap-4">
                {children}
            </div>
        </header>
    );
};

export default CoutureTopBar;
