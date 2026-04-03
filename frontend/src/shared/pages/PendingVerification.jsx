import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Clock, AlertCircle } from 'lucide-react';
import { Navigate } from 'react-router-dom';

const PendingVerification = () => {
    const { user, isApproved, loading } = useAuth();

    if (loading) return null;

    // If the user isn't logged in, redirect them
    if (!user) {
        return <Navigate to="/" replace />;
    }

    // If the user's role is client or admin, or they are already approved, redirect them
    if (isApproved || user.role === 'client' || user.role === 'admin') {
        return <Navigate to="/" replace />;
    }

    return (
        <div className="min-h-screen bg-noir flex items-center justify-center p-6 animate-fade-in">
            <div className="max-w-md w-full bg-secondary border border-subtle/30 rounded-sm p-8 text-center shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-gold/50 via-gold to-gold/50"></div>
                
                <div className="mb-6 flex justify-center">
                    <div className="relative">
                        <Clock size={64} className="text-gold/50" />
                        <div className="absolute -bottom-2 -right-2 bg-secondary p-1 rounded-full border border-subtle">
                            <AlertCircle size={20} className="text-gold" />
                        </div>
                    </div>
                </div>

                <h1 className="font-display text-3xl text-ivory mb-4">Account Pending Verification</h1>
                
                <p className="text-ivory/60 mb-6 text-sm leading-relaxed">
                    Thank you for registering on FashionHub Pro as a <span className="font-bold text-gold uppercase text-xs mx-1">{user.role.replace('_', ' ')}</span>.
                    Your account is currently under review by our administration team. 
                </p>

                <div className="bg-noir/50 p-4 border border-subtle/20 rounded-sm mb-6 text-left">
                    <h3 className="text-ivory/80 font-medium mb-2 text-sm">Next Steps:</h3>
                    <ul className="text-xs text-ivory/50 space-y-2 list-disc pl-4">
                        <li>Our team is reviewing the documents you provided.</li>
                        <li>This process usually takes 24-48 business hours.</li>
                        <li>You will be able to access your dashboard as soon as you are approved.</li>
                    </ul>
                </div>

                <div className="text-ivory/40 text-xs">
                    Need help? <a href="mailto:support@fashionhub.com" className="text-gold hover:underline">Contact Support</a>
                </div>
            </div>
        </div>
    );
};

export default PendingVerification;
