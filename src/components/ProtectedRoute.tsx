import { ReactNode, useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { AuthService } from '@/lib/auth';
import { toast } from 'sonner';

interface ProtectedRouteProps {
  children: ReactNode;
  requiredRoles?: string[];
}

export default function ProtectedRoute({ children, requiredRoles }: ProtectedRouteProps) {
  const location = useLocation();
  const [isChecking, setIsChecking] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [hasRequiredRole, setHasRequiredRole] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      // Check if user is authenticated
      const authenticated = AuthService.isAuthenticated();
      setIsAuthenticated(authenticated);

      // Check if user has required role
      if (authenticated && requiredRoles && requiredRoles.length > 0) {
        const hasRole = AuthService.hasRole(requiredRoles);
        setHasRequiredRole(hasRole);
        
        if (!hasRole) {
          const currentUser = AuthService.getCurrentUser();
          toast.error(
            `Akses ditolak. Halaman ini hanya untuk: ${requiredRoles.join(', ')}`,
            { description: `Role Anda: ${currentUser?.role || 'Unknown'}` }
          );
        }
      }
    } catch (error) {
      console.error('Auth check error:', error);
      setIsAuthenticated(false);
    } finally {
      setIsChecking(false);
    }
  };

  // Show loading state
  if (isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Memverifikasi akses...</p>
        </div>
      </div>
    );
  }

  // Not authenticated - redirect to login with return URL
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Authenticated but doesn't have required role - redirect to dashboard
  if (!hasRequiredRole) {
    return <Navigate to="/" replace />;
  }

  // All checks passed - render children
  return <>{children}</>;
}