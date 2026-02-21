import React from "react";
import { Navigate } from "react-router-dom";
import { authService } from "../services/authService";

// Protected Route - Redirect to login if not authenticated
function ProtectedRoute({ children }) {
  const isAuthenticated = authService.isAuthenticated();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

export default ProtectedRoute;
