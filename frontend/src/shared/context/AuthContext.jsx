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
                try {
                    // Actively verify token by fetching the profile (minimal cost check)
                    const response = await fetch('http://localhost:8000/api/auth/profile/', {
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                    
                    if (response.ok) {
                        const userData = decodeToken(token);
                        if (userData) {
                            setUser(userData);
                        } else {
                            authService.logout();
                        }
                    } else if (response.status === 401) {
                        // Token invalid or expired
                        authService.logout();
                        setUser(null);
                    } else {
                        // Other error (server down?), keep visual session for now
                        const userData = decodeToken(token);
                        setUser(userData);
                    }
                } catch (err) {
                    console.error("Auth initialization check failed:", err);
                    // Fallback to visual decode if network is down
                    const userData = decodeToken(token);
                    setUser(userData);
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
        token: authService.getToken(),
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
