import { ReactNode, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useKYCStatus } from '@/hooks/useKYCStatus';
import { Navigate, useLocation } from 'react-router-dom';
import { KYCBlockedMessage } from './KYCBlockedMessage';

interface KYCGateProps {
  children: ReactNode;
}

const ALLOWED_ROUTES_WITHOUT_KYC = [
  '/auth/login',
  '/auth/register',
  '/auth/admin',
  '/kyc/verify',
  '/kyc/upload',
  '/kyc/documents',
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

  // Se o usuário não estiver autenticado, renderizar os filhos normalmente
  if (!user) {
    return <>{children}</>;
  }

  // Rota permitida sem KYC - permitir acesso  
  if (isAllowedRoute) {
    return <>{children}</>;
  }

  // BLOQUEIO RIGOROSO: Verificar se pode usar a plataforma
  // Usuários bloqueados, suspeitos ou rejeitados são redirecionados para tela específica
  if (status && ['bloqueado', 'suspeito'].includes(status.kyc_status)) {
    return <KYCBlockedMessage />;
  }

  // Bloquear se rejeitado explicitamente
  if (status && status.kyc_status === 'rejected') {
    return <Navigate to="/kyc/verify" replace />;
  }

  // Bloquear se não pode usar a plataforma (nem todos os documentos aprovados)
  if (!status || !status.canUsePlatform) {
    return <Navigate to="/kyc/verify" replace />;
  }

  // Verificação adicional para prestadores: certidão criminal válida
  if (userRole === 'provider' && status.criminalBackgroundExpiry) {
    const expiryDate = new Date(status.criminalBackgroundExpiry);
    if (expiryDate <= new Date()) {
      return <Navigate to="/kyc/verify" replace />;
    }
  }

  // KYC OK - permitir acesso
  return <>{children}</>;
};