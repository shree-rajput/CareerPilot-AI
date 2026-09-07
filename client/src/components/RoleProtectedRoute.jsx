import React from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../context/useAuth";

export function RoleProtectedRoute({ role }) {
  const { user, isAuthenticated, isBootstrapping } = useAuth();

  if (isBootstrapping) {
    return <div className="screen-loader flex h-screen items-center justify-center bg-bg">Loading...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/mentor/login" replace />;
  }

  // Allow admins to also access mentor pages if they want
  const allowedRoles = Array.isArray(role) ? role : [role];
  if (user && allowedRoles.includes(user.role)) {
    return <Outlet />;
  }

  // Authorized but wrong role -> Send back to main dashboard
  return <Navigate to="/dashboard" replace />;
}
