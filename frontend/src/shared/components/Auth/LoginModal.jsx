import React, { useState } from 'react';
import { X, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const LoginModal = ({ isOpen, onClose, onSwitchToRegister }) => {
    const { login } = useAuth();
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        email: '',
        password: '',
        rememberMe: false
    });
    const [error, setError] = useState('');
    const [successMsg, setSuccessMsg] = useState('');

    if (!isOpen) return null;

    const handleChange = (e) => {
        setError('');
        setSuccessMsg('');
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!formData.email.trim() || !formData.password.trim()) {
            setError("Please fill in both email and password.");
            return;
        }

        try {
            setError('');
            setSuccessMsg('');

            const userData = await login(formData.email, formData.password);

            setSuccessMsg(`Welcome back, ${userData.role}!`);

            // Auto close and redirect after 1.5 seconds
            setTimeout(() => {
                onClose();
                setFormData({ email: '', password: '', rememberMe: false });
                setSuccessMsg('');
                setError('');

                // Role-based redirection
                if (userData.role === 'fournisseur') {
                    navigate('/fournisseur/dashboard');
                } else if (userData.role === 'couture_house') {
                    navigate('/couturehouse/designs');
                } else if (userData.role === 'delivery') {
                    navigate('/delivery');
                } else if (userData.role === 'admin') {
                    navigate('/admin/review');
                } else {
                    navigate('/profile'); // Default for clients
                }
            }, 1000);
        } catch (err) {
            setError(err.message || "Invalid email or password.");
            console.error(err);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-noir/90 backdrop-blur-sm">
            <div className="bg-secondary border border-subtle/50 w-full max-w-md rounded-sm shadow-2xl relative animate-fade-in">

                {/* Close Button */}
                <button
                    onClick={onClose}
                    className="absolute top-6 right-6 text-ivory/50 hover:text-gold transition-colors"
                >
                    <X size={24} />
                </button>

                <div className="p-8 md:p-10">
                    <div className="text-center mb-10">
                        <h2 className="font-display text-4xl text-ivory mb-2">Welcome</h2>
                        <p className="text-ivory/50 text-sm">Log in to your Maison Tissue account</p>
                    </div>

                    {successMsg && (
                        <div className="mb-6 p-4 rounded-sm bg-gold/10 border border-gold/30 flex items-center gap-3 animate-fade-in text-gold text-sm">
                            <CheckCircle2 size={18} className="shrink-0" />
                            <p>{successMsg}</p>
                        </div>
                    )}

                    {error && (
                        <div className="mb-6 p-4 rounded-sm bg-red-950/30 border border-red-900/50 flex items-center gap-3 animate-fade-in text-red-200 text-sm">
                            <AlertCircle size={18} className="text-red-400 shrink-0" />
                            <p>{error}</p>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="flex flex-col gap-2">
                            <label className="text-label">Email Address</label>
                            <input
                                type="email"
                                name="email"
                                value={formData.email}
                                onChange={handleChange}
                                className="input-couture"
                                required
                            />
                        </div>

                        <div className="flex flex-col gap-2">
                            <label className="text-label">Password</label>
                            <input
                                type="password"
                                name="password"
                                value={formData.password}
                                onChange={handleChange}
                                className="input-couture"
                                required
                            />
                        </div>

                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <input
                                    type="checkbox"
                                    id="rememberMe"
                                    name="rememberMe"
                                    checked={formData.rememberMe}
                                    onChange={handleChange}
                                    className="w-4 h-4 accent-gold bg-subtle border-subtle focus:ring-gold"
                                />
                                <label htmlFor="rememberMe" className="text-sm text-ivory/70 select-none cursor-pointer">
                                    Remember me
                                </label>
                            </div>
                            <a href="#" className="text-sm text-gold/70 hover:text-gold transition-colors">Forgot Password?</a>
                        </div>

                        <button type="submit" className="btn btn-primary w-full justify-center">
                            Sign In
                        </button>
                    </form>

                    <div className="mt-8 pt-8 border-t border-subtle/30 text-center">
                        <p className="text-sm text-ivory/60">
                            Don't have an account?{' '}
                            <button
                                onClick={onSwitchToRegister}
                                className="text-gold hover:underline transition-colors font-medium"
                            >
                                Register
                            </button>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LoginModal;
