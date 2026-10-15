import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { Spinner } from '../../shared/ui/Spinner';
import { getRouteAccess } from './routeAccess';


interface ProtectedRouteProps {
  children: React.ReactElement;
  requireSuperAdmin?: boolean;
}

export function ProtectedRoute({ children, requireSuperAdmin = false }: ProtectedRouteProps) {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  const access = getRouteAccess({ user, isLoading, requireSuperAdmin });

  if (access === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-theme-bg">
        <Spinner size="xl" className="text-theme-primary" />
      </div>
    );
  }

  if (access === 'login') {
    // Redireciona para o login passando a rota que o usuário tentou acessar
    return <Navigate to="/admin/login" state={{ from: location }} replace />;
  }

  if (access === 'unauthorized') {
    return <Navigate to="/admin/unauthorized" replace />;
  }

  return children;
}
