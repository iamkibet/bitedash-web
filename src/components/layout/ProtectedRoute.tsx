import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import type { UserRole } from '../../types/auth.types';
import { Spinner } from '../common/Spinner';

interface ProtectedRouteProps {
  requiredRole?: UserRole | UserRole[];
  redirectTo?: string;
}

export const ProtectedRoute = ({
  requiredRole,
  redirectTo = '/login',
}: ProtectedRouteProps) => {
  const { isAuthenticated, role, isLoading } = useAuthStore();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Spinner size="lg" />
      </div>
    );
  }

  // Allow access to home and public pages without auth
  const publicPaths = ['/', '/stores'];
  if (publicPaths.includes(location.pathname)) {
    return <Outlet />;
  }

  if (!isAuthenticated) {
    return <Navigate to={redirectTo} replace />;
  }

  if (requiredRole) {
    const allowedRoles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
    if (!role || !allowedRoles.includes(role)) {
      return <Navigate to="/" replace />;
    }
  }

  return <Outlet />;
};
