import React from 'react';
import { 
    LayoutGrid, Users, Clock, Layers, Plus, 
    TrendingUp, Settings, LogOut, Palette 
} from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { authService } from '../../../services/authService';

const CoutureSidebar = ({ isOpen }) => {
    const navigate = useNavigate();
    const location = useLocation();

    const menuItems = [
        { id: 'designs', label: 'Mes Designs', icon: LayoutGrid, path: '/couturehouse/dashboard' },
        { id: 'inquiries', label: 'Demandes Clients', icon: Users, path: '/couturehouse/inquiries' },
        { id: 'orders', label: 'Production & Suivi', icon: Clock, path: '/couturehouse/orders' },
        { id: 'fabrics', label: 'Matiéthèque', icon: Layers, path: '/couturehouse/fabrics' },
        { id: 'create', label: 'Nouvelle Création', icon: Plus, path: '/couturehouse/create' },
        { id: 'analytics', label: 'Analytique', icon: TrendingUp, path: '#' },
        { id: 'settings', label: 'Paramètres', icon: Settings, path: '#' },
    ];

    const handleLogout = () => {
        authService.logout();
        navigate('/');
    };

    return (
        <aside className={`atelier-sidebar ${isOpen ? 'open' : 'closed'}`}>
            <div className="sidebar-header">
                <div className="sidebar-logo">
                    <Palette size={24} />
                    {isOpen && <span>ATELIER</span>}
                </div>
            </div>

            <nav className="flex-1 mt-6">
                {menuItems.map((item) => (
                    <div 
                        key={item.id}
                        className={`nav-item ${location.pathname === item.path ? 'active' : ''}`}
                        onClick={() => item.path !== '#' && navigate(item.path)}
                    >
                        <item.icon size={20} />
                        {isOpen && <span>{item.label}</span>}
                    </div>
                ))}
            </nav>

            <div className="sidebar-footer">
                <div className="nav-item" onClick={handleLogout}>
                    <LogOut size={20} />
                    {isOpen && <span>Déconnexion</span>}
                </div>
            </div>
        </aside>
    );
};

export default CoutureSidebar;
