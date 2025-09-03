import { ReactNode, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useKYCStatus } from '@/hooks/useKYCStatus';
import { Navigate, useLocation } from 'react-router-dom';

interface KYCGateProps {
  children: ReactNode;
}

const ALLOWED_ROUTES_WITHOUT_KYC = [
  '/auth/login',
  '/auth/register',
  '/auth/admin',
  '/kyc/verify',
  '/kyc/upload',
  '/profile',
  '/'
];

export const KYCGate = ({ children }: KYCGateProps) => {
  const { user, userRole, loading: authLoading } = useAuth();
  const { status, loading: kycLoading } = useKYCStatus();
  const location = useLocation();

  // Verificar se a rota atual é permitida sem KYC
  const isAllowedRoute = ALLOWED_ROUTES_WITHOUT_KYC.some(route => 
    location.pathname.startsWith(route)
  );

  // Ainda carregando
  if (authLoading || kycLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Não logado - deixar o ProtectedRoute lidar com isso
  if (!user) {
    return <>{children}</>;
  }

  // Rota permitida sem KYC - permitir acesso
  if (isAllowedRoute) {
    return <>{children}</>;
  }

  // Verificar se KYC é obrigatório para esta ação
  const needsKYC = !status?.canUsePlatform;

  if (needsKYC) {
    // Redirecionar para página de verificação KYC
    return <Navigate to="/kyc/verify" replace />;
  }

  // Verificar regras específicas por role
  if (userRole === 'provider') {
    // Prestadores precisam de KYC completo + certidão válida
    if (!status?.canUsePlatform) {
      return <Navigate to="/kyc/verify" replace />;
    }
    
    // Avisar sobre expiração próxima da certidão (30 dias)
    if (status?.criminalBackgroundExpiry) {
      const expiryDate = new Date(status.criminalBackgroundExpiry);
      const daysToExpiry = Math.ceil(
        (expiryDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
      );
      
      if (daysToExpiry <= 30 && daysToExpiry > 0) {
        // Poderia mostrar um banner de aviso aqui
        console.warn(`Certidão de antecedentes criminais expira em ${daysToExpiry} dias`);
      }
    }
  } else if (userRole === 'client') {
    // Clientes precisam apenas do KYC básico
    if (!status?.isComplete) {
      return <Navigate to="/kyc/verify" replace />;
    }
  }

  // KYC OK - permitir acesso
  return <>{children}</>;
};