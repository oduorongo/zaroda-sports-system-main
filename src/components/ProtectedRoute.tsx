import { Navigate } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useAdmin } from '@/contexts/AdminContext';

type ProtectedRouteProps = {
  children: ReactNode;
  requiredRole?: 'admin' | 'super_admin';
};

const LoadingState = () => (
  <div className="min-h-[40vh] flex items-center justify-center text-muted-foreground">
    Loading...
  </div>
);

export const RequireAuth = ({ children }: ProtectedRouteProps) => {
  const { user, isLoading } = useAdmin();

  if (isLoading) return <LoadingState />;
  if (!user) return <Navigate to="/login" replace />;

  return <>{children}</>;
};

export const RequireAdmin = ({ children }: ProtectedRouteProps) => {
  const { user, isAdmin, isLoading } = useAdmin();

  if (isLoading) return <LoadingState />;
  if (!user) return <Navigate to="/login" replace />;
  // Hard paywall: a logged-in tenant with no active paid subscription and no
  // free Base championship is not an admin, so send them to pricing to pay.
  if (!isAdmin) return <Navigate to="/pricing" replace />;

  return <>{children}</>;
};

export const ProtectedRoute = ({ children, requiredRole }: ProtectedRouteProps) => {
  const { user, isAdmin, isSuperAdmin, isLoading } = useAdmin();

  if (isLoading) return <LoadingState />;
  if (!user) return <Navigate to="/login" replace />;

  if (requiredRole === 'super_admin' && !isSuperAdmin) {
    return <Navigate to="/unauthorized" replace />;
  }

  if (requiredRole === 'admin' && !isAdmin) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <>{children}</>;
};
