import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../shared/context/AuthContext';
import { Check, X, Eye, FileText, AlertCircle, Clock } from 'lucide-react';

const ReviewDashboard = () => {
    const { user } = useAuth();
    const [queue, setQueue] = useState([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(null);
    const [error, setError] = useState(null);

    const API_URL = "http://localhost:8000/api/auth/admin";

    const fetchQueue = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_URL}/review-queue/`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!response.ok) throw new Error("Failed to fetch queue");
            const data = await response.json();
            setQueue(data);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchQueue();
    }, []);

    const handleAction = async (userId, action) => {
        setActionLoading(userId);
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_URL}/review-action/${userId}/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ action })
            });
            if (!response.ok) throw new Error(`Failed to ${action} user`);

            // Success - remove from local queue
            setQueue(prev => prev.filter(item => item.id !== userId));
        } catch (err) {
            alert(err.message);
        } finally {
            setActionLoading(null);
        }
    };

    if (loading) return <div className="p-20 text-center text-gold">Loading Review Queue...</div>;

    return (
        <div className="wrapper py-24 animate-fade-in">
            <div className="mb-12">
                <h1 className="font-display text-4xl text-ivory mb-2">Admin Review Queue</h1>
                <p className="text-ivory/50">Verify and approve professional accounts for the platform.</p>
            </div>

            {error && (
                <div className="mb-8 p-4 bg-red-950/20 border border-red-900/40 text-red-200 flex items-center gap-3">
                    <AlertCircle size={20} />
                    {error}
                </div>
            )}

            {queue.length === 0 ? (
                <div className="p-20 border border-dashed border-subtle/30 text-center rounded-sm">
                    <Clock size={48} className="mx-auto text-gold/30 mb-4" />
                    <p className="text-ivory/40">No pending accounts for review.</p>
                </div>
            ) : (
                <div className="grid gap-6">
                    {queue.map((req) => (
                        <div key={req.id} className="bg-secondary p-8 border border-subtle/30 rounded-sm hover:border-gold/30 transition-all flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                            <div className="flex-grow">
                                <div className="flex items-center gap-3 mb-2">
                                    <span className="px-2 py-0.5 bg-gold/10 text-gold text-[10px] uppercase tracking-widest font-bold border border-gold/20">
                                        {req.role}
                                    </span>
                                    <h3 className="text-xl text-ivory font-medium">{req.username}</h3>
                                </div>
                                <p className="text-ivory/50 text-sm mb-4">{req.email}</p>

                                <div className="flex gap-4">
                                    <button className="flex items-center gap-2 text-xs text-gold hover:underline">
                                        <Eye size={14} /> View Details
                                    </button>
                                    <button className="flex items-center gap-2 text-xs text-gold hover:underline">
                                        <FileText size={14} /> Documents
                                    </button>
                                </div>
                            </div>

                            <div className="flex items-center gap-3 shrink-0">
                                <button
                                    onClick={() => handleAction(req.id, 'reject')}
                                    disabled={actionLoading === req.id}
                                    className="p-3 border border-red-900/30 text-red-400 hover:bg-red-400/10 transition-colors rounded-sm"
                                    title="Reject"
                                >
                                    <X size={20} />
                                </button>
                                <button
                                    onClick={() => handleAction(req.id, 'approve')}
                                    disabled={actionLoading === req.id}
                                    className="px-6 py-3 bg-gold text-noir font-bold hover:bg-gold/80 transition-colors rounded-sm flex items-center gap-2 text-sm"
                                >
                                    <Check size={18} /> Approve Account
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default ReviewDashboard;
