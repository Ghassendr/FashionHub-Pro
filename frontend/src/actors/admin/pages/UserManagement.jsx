import React, { useState, useEffect } from 'react';
import { Users, Search, Filter, MoreVertical, ShieldCheck, Mail, Calendar } from 'lucide-react';

const UserManagement = () => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        try {
            const token = localStorage.getItem('token');
            const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
            const res = await fetch(`${API_URL}/api/auth/admin/users/`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setUsers(data);
            }
        } catch (err) {
            console.error("Failed to fetch users:", err);
        } finally {
            setLoading(false);
        }
    };

    const filteredUsers = users.filter(user => 
        user.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.email.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const getRoleBadge = (role) => {
        const styles = {
            admin: 'bg-red-500/10 text-red-400 border-red-500/20',
            client: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
            couture_house: 'bg-gold/10 text-gold border-gold/20',
            fournisseur: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
            delivery: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
        };
        return styles[role] || 'bg-white/5 text-white/40 border-white/10';
    };

    const getStatusColor = (status) => {
        switch(status) {
            case 'active': return 'bg-emerald-500';
            case 'approved': return 'bg-emerald-500';
            case 'pending_review': return 'bg-amber-500';
            case 'rejected': return 'bg-red-500';
            default: return 'bg-white/20';
        }
    };

    return (
        <div className="animate-fade-in">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
                <div>
                    <h1 className="font-display text-3xl text-ivory mb-2 text-balance">User Directory</h1>
                    <p className="text-ivory/40 text-sm font-sans">Manage and monitor all platform participants in real-time.</p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="relative">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ivory/20" />
                        <input
                            type="text"
                            placeholder="Find user by name or email..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-9 pr-4 py-2 bg-[#0d0d0e] border border-subtle/30 text-ivory/70 text-xs rounded-sm w-64 focus:outline-none focus:border-gold/40 transition-colors"
                        />
                    </div>
                    <button className="p-2 bg-[#0d0d0e] border border-subtle/30 text-ivory/40 rounded-sm hover:text-gold transition-colors">
                        <Filter size={16} />
                    </button>
                </div>
            </div>

            <div className="bg-[#111113] border border-subtle/20 rounded-sm overflow-hidden">
                <table className="w-full text-left font-sans">
                    <thead>
                        <tr className="border-b border-subtle/10 bg-white/[0.02]">
                            <th className="p-5 text-[10px] uppercase tracking-[0.2em] text-ivory/30 font-bold">Identity</th>
                            <th className="p-5 text-[10px] uppercase tracking-[0.2em] text-ivory/30 font-bold">Role</th>
                            <th className="p-5 text-[10px] uppercase tracking-[0.2em] text-ivory/30 font-bold">Status</th>
                            <th className="p-5 text-[10px] uppercase tracking-[0.2em] text-ivory/30 font-bold">Registered</th>
                            <th className="p-5 text-[10px] uppercase tracking-[0.2em] text-ivory/30 font-bold text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-subtle/5">
                        {loading ? (
                            <tr><td colSpan="5" className="p-20 text-center text-gold/50 text-sm animate-pulse">Synchronizing platform data...</td></tr>
                        ) : filteredUsers.length === 0 ? (
                            <tr><td colSpan="5" className="p-20 text-center text-ivory/20 text-sm italic">No users found matching your search.</td></tr>
                        ) : filteredUsers.map(user => (
                            <tr key={user.id} className="group hover:bg-white/[0.01] transition-colors">
                                <td className="p-5">
                                    <div className="flex items-center gap-4">
                                        <div className="w-9 h-9 rounded-sm bg-gold/10 border border-gold/20 flex items-center justify-center text-gold font-bold text-xs uppercase">
                                            {user.username.charAt(0)}
                                        </div>
                                        <div>
                                            <p className="text-ivory/90 text-[13px] font-medium leading-none mb-1.5">{user.username}</p>
                                            <p className="text-ivory/20 text-[10px] font-mono flex items-center gap-1.5">
                                                <Mail size={10} /> {user.email}
                                            </p>
                                        </div>
                                    </div>
                                </td>
                                <td className="p-5">
                                    <span className={`px-2 py-0.5 border text-[9px] uppercase tracking-widest font-bold rounded-sm ${getRoleBadge(user.role)}`}>
                                        {user.role.replace('_', ' ')}
                                    </span>
                                </td>
                                <td className="p-5">
                                    <div className="flex items-center gap-2">
                                        <div className={`w-1.5 h-1.5 rounded-full ${getStatusColor(user.status)}`} />
                                        <span className="text-[11px] text-ivory/60 capitalize">{user.status.replace('_', ' ')}</span>
                                    </div>
                                </td>
                                <td className="p-5">
                                    <div className="flex items-center gap-2 text-ivory/30 text-[11px]">
                                        <Calendar size={12} />
                                        {new Date(user.date_joined).toLocaleDateString()}
                                    </div>
                                </td>
                                <td className="p-5 text-right">
                                    <button className="p-1.5 text-ivory/20 hover:text-gold hover:bg-gold/5 rounded-sm transition-all">
                                        <MoreVertical size={16} />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                <div className="p-6 border-t border-subtle/5 bg-white/[0.01] flex justify-between items-center">
                    <p className="text-[10px] text-ivory/20 uppercase tracking-[0.2em]">
                        Showing {filteredUsers.length} of {users.length} participants
                    </p>
                    <div className="flex gap-2">
                        {/* Pagination would go here */}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default UserManagement;
