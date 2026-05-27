import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { PageLoader } from '../ui/LoadingSkeleton';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requireAdmin = false,
}) => {
  const { user, userProfile, loading } = useAuth();
  const location = useLocation();

  // Wait until auth finishes loading
  if (loading) {
    return <PageLoader />;
  }

  /**
   * AUTH CHECK
   *
   * Real users:
   * - Firebase user exists
   *
   * Demo users:
   * - userProfile exists with demo flag / role
   *
   * Avoid relying on stale object truthiness.
   */
  const isAuthenticated =
    !!user ||
    !!userProfile?.uid;

  // Not logged in
  if (!isAuthenticated) {
    return (
      <Navigate
        to="/login"
        state={{ from: location }}
        replace
      />
    );
  }

  // Prevent crash/blank screen
  if (!userProfile) {
    return <PageLoader />;
  }

  /**
   * ADMIN ACCESS
   */
  const isAdmin =
    userProfile.role === 'admin' ||
    userProfile.role === 'moderator';

  if (requireAdmin && !isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  /**
   * BLOCKED USER
   */
  if (userProfile.status === 'blocked') {
    return (
      <div className="min-h-screen animated-bg flex items-center justify-center p-4">
        <div className="glass rounded-2xl p-8 max-w-md w-full text-center border border-red-500/20">
          <div className="text-6xl mb-4">
            🚫
          </div>

          <h2 className="text-2xl font-bold text-red-400 mb-3">
            Account Suspended
          </h2>

          <p className="text-gray-400 leading-relaxed">
            Your account has been suspended.
            Please contact support for assistance.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export default ProtectedRoute;
