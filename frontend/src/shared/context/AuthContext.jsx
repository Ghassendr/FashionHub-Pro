import React, { createContext, useContext, useState, useEffect } from 'react';
import { authService } from '../../services/authService';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isLoginOpen, setIsLoginOpen] = useState(false);
    const [isRegisterOpen, setIsRegisterOpen] = useState(false);

    const decodeToken = (token) => {
        try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            return {
                id: payload.user_id,
                role: payload.role,
                status: payload.account_status,
                email: payload.email, // If included in JWT
                name: payload.name    // If included in JWT
            };
        } catch (e) {
            return null;
        }
    };

    useEffect(() => {
        const initAuth = async () => {
            const token = authService.getToken();
            if (token) {
                const userData = decodeToken(token);
                if (userData) {
                    setUser(userData);
                } else {
                    authService.logout();
                }
            }
            setLoading(false);
        };
        initAuth();
    }, []);

    const login = async (email, password) => {
        const data = await authService.login(email, password);
        const userData = decodeToken(data.access);
        setUser(userData);
        return userData;
    };

    const logout = () => {
        authService.logout();
        setUser(null);
    };

    const value = {
        user,
        loading,
        login,
        logout,
        isAuthenticated: !!user,
        isAdmin: user?.role === 'admin',
        isApproved: user?.status === 'active' || user?.status === 'approved',
        isLoginOpen,
        setIsLoginOpen,
        isRegisterOpen,
        setIsRegisterOpen
    };

    return (
        <AuthContext.Provider value={value}>
            {!loading && children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
