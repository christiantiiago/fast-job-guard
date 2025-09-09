import { useAuth } from '@/hooks/useAuth';
import { Navigate, useLocation } from 'react-router-dom';
import { ReactNode, useEffect } from 'react';
import { toast } from 'sonner';
import { useIdleTimer } from '@/hooks/useIdleTimer';

interface ProtectedRouteProps {
  children: ReactNode;
  requiredRole?: string;
}

export const ProtectedRoute = ({ children, requiredRole }: ProtectedRouteProps) => {
  const { user, userRole, loading } = useAuth();
  const location = useLocation();

  // Ativar timer de inatividade
  useIdleTimer({
    timeout: 30 * 60 * 1000, // 30 minutos
    onIdle: () => {
      toast.error('Sessão expirada por inatividade', {
        description: 'Você foi desconectado automaticamente por segurança.'
      });
    }
  });

  // Verificar acesso admin e mostrar alerta
  useEffect(() => {
    if (!loading && user && requiredRole === 'admin' && userRole !== 'admin') {
      toast.error('🚫 Acesso Negado', {
        description: 'Você não tem permissão para acessar a área administrativa.',
        duration: 5000,
      });
    }
  }, [user, userRole, requiredRole, loading]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth/login" state={{ from: location }} replace />;
  }

  if (requiredRole && userRole !== requiredRole) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};