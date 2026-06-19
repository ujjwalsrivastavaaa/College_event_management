import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, loading } = useAuth();

  // Premium loading state view
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center">
        <div className="relative w-16 h-16">
          <div className="absolute inset-0 rounded-full border-t-2 border-indigo-500 animate-spin"></div>
          <div className="absolute inset-2 rounded-full border-r-2 border-blue-400 animate-spin duration-1000"></div>
        </div>
        <p className="mt-4 text-slate-400 text-sm font-medium animate-pulse">Initializing Secure Session...</p>
      </div>
    );
  }

  // Not logged in: redirect to login page
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Role verification check
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    // If not authorized, redirect to their role's default dashboard
    if (user.role === 'admin') {
      return <Navigate to="/admin" replace />;
    } else if (user.role === 'clubHead') {
      return <Navigate to="/clubhead" replace />;
    } else {
      return <Navigate to="/student" replace />;
    }
  }

  return children;
};

export default ProtectedRoute;
