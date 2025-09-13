import { useAuth } from '@/hooks/useAuth';
import { useKYCStatus } from '@/hooks/useKYCStatus';
import { Navigate, useLocation } from 'react-router-dom';
import { ReactNode, useEffect } from 'react';
import { toast } from 'sonner';
import { KYCBlockedMessage } from '@/components/kyc/KYCBlockedMessage';

interface ProtectedKYCRouteProps {
  children: ReactNode;
}

export const ProtectedKYCRoute = ({ children }: ProtectedKYCRouteProps) => {
  const { user, userRole, loading: authLoading } = useAuth();
  const { status, loading: kycLoading } = useKYCStatus();
  const location = useLocation();

  // Verificar acesso quando KYC não está aprovado
  useEffect(() => {
    if (!authLoading && !kycLoading && user && status && !status.canUsePlatform) {
      toast.error('🔒 Acesso Restrito', {
        description: 'Complete sua verificação de identidade para acessar esta funcionalidade.',
        duration: 5000,
      });
    }
  }, [user, status, authLoading, kycLoading]);

  if (authLoading || kycLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth/login" state={{ from: location }} replace />;
  }

  // Verificar se conta está bloqueada/suspensa
  if (status && ['bloqueado', 'suspeito'].includes(status.kyc_status)) {
    return <KYCBlockedMessage />;
  }

  // Verificar se pode usar a plataforma
  if (!status || !status.canUsePlatform) {
    return <Navigate to="/kyc/verify" replace />;
  }

  return <>{children}</>;
};