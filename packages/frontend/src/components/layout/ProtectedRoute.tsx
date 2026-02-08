import { Navigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/auth.store';

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  // In development, auto-authenticate with demo user
  if (!isAuthenticated && import.meta.env.DEV) {
    const store = useAuthStore.getState();
    if (!store.user) {
      useAuthStore.setState({
        user: {
          id: 'demo-user-1',
          email: 'demo@flowforge.dev',
          firstName: 'Demo',
          lastName: 'User',
          role: 'ADMIN',
          organizationId: 'demo-org-1',
        },
        accessToken: 'demo-token',
        isAuthenticated: true,
      });
    }
    return <>{children}</>;
  }

  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
}
