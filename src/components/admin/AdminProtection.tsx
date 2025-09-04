import { ReactNode, useEffect } from 'react';
import { useAdminFacialAuth } from '@/hooks/useAdminFacialAuth';
import { FacialAuthModal } from './FacialAuthModal';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Shield, Lock, UserCheck } from 'lucide-react';

interface AdminProtectionProps {
  children: ReactNode;
  action?: string;
  className?: string;
}

export const AdminProtection = ({ 
  children, 
  action = 'admin_access',
  className = ''
}: AdminProtectionProps) => {
  const {
    isBlocked,
    showModal,
    modalMode,
    requireFacialAuth,
    handleAuthSuccess,
    handleModalClose,
    isAdmin,
    facialAuthEnabled
  } = useAdminFacialAuth();

  // Check authentication requirement when component mounts
  useEffect(() => {
    if (isAdmin) {
      requireFacialAuth(action);
    }
  }, [isAdmin, requireFacialAuth, action]);

  // If user is not admin, block access completely
  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="max-w-md mx-auto text-center space-y-6 p-6">
          <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
            <Shield className="w-8 h-8 text-red-600" />
          </div>
          
          <div>
            <h2 className="text-2xl font-bold text-foreground mb-2">
              Acesso Negado
            </h2>
            <p className="text-muted-foreground">
              Você não tem permissões de administrador para acessar esta área.
            </p>
          </div>

          <Alert>
            <Shield className="h-4 w-4" />
            <AlertDescription>
              Esta área é restrita apenas para administradores do sistema.
            </AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  // If blocked, show blocking UI
  if (isBlocked && !showModal) {
    return (
      <div className={`min-h-screen flex items-center justify-center bg-background ${className}`}>
        <div className="max-w-md mx-auto text-center space-y-6 p-6">
          <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
            <Lock className="w-8 h-8 text-red-600" />
          </div>
          
          <div>
            <h2 className="text-2xl font-bold text-foreground mb-2">
              Acesso Bloqueado
            </h2>
            <p className="text-muted-foreground">
              Autenticação facial necessária para continuar. 
              {modalMode === 'enrollment' 
                ? ' Cadastro facial obrigatório para administradores.'
                : ' Verificação de segurança requerida.'
              }
            </p>
          </div>

          <Alert>
            <Shield className="h-4 w-4" />
            <AlertDescription>
              {modalMode === 'enrollment' 
                ? 'Para sua segurança, é necessário completar o cadastro facial antes de acessar as funções administrativas.'
                : 'Por motivos de segurança, verificações faciais periódicas são necessárias para administradores.'
              }
            </AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Render children only if not blocked */}
      {!isBlocked && children}
      
      {/* Facial Authentication Modal */}
      <FacialAuthModal
        isOpen={showModal}
        onClose={handleModalClose}
        onSuccess={handleAuthSuccess}
        mode={modalMode}
        reason={
          modalMode === 'enrollment'
            ? 'Cadastro facial obrigatório para administradores'
            : `Verificação de segurança necessária para: ${action}`
        }
      />
    </>
  );
};