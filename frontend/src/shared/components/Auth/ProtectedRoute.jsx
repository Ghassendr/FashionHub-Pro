import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

/**
 * A wrapper component that guards routes based on authentication and roles.
 * 
 * @param {Array} allowedRoles - List of roles permitted to access the route.
 * @param {React.ReactNode} children - The component(s) to render if authorized.
 */
const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, loading, isAuthenticated } = useAuth();
  const location = useLocation();

  // Show nothing or a spinner while the auth status is being determined
  if (loading) {
    return (
      <div className="min-h-screen bg-noir flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-gold/30 border-t-gold rounded-full animate-spin"></div>
      </div>
    );
  }

  // 1. Not logged in? Redirect to home (where login modal is accessible)
  if (!isAuthenticated) {
    return <Navigate to="/" state={{ from: location }} replace />;
  }

  // 2. Logged in but role not allowed? Redirect to their specific dashboard
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    // Determine the safest fallback based on their actual role
    const fallbackMap = {
      'client': '/client/3d-measurements',
      'fournisseur': '/fournisseur/dashboard',
      'couture_house': '/couturehouse',
      'delivery': '/delivery',
      'admin': '/admin/review'
    };
    
    const fallbackPath = fallbackMap[user.role] || '/';
    return <Navigate to={fallbackPath} replace />;
  }

  // 3. Authorized? Render the children
  return children;
};

export default ProtectedRoute;
