import { ReactNode, useState } from 'react';
import { useAdminFacialAuth } from '@/hooks/useAdminFacialAuth';
import { FacialAuthModal } from './FacialAuthModal';
import { Button } from '@/components/ui/button';
import { Shield, AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface CriticalActionGuardProps {
  children: ReactNode;
  action: string;
  description?: string;
  requireConfirmation?: boolean;
}

export const CriticalActionGuard = ({ 
  children, 
  action, 
  description,
  requireConfirmation = true
}: CriticalActionGuardProps) => {
  const {
    requireFacialAuth,
    handleAuthSuccess,
    handleModalClose,
    showModal,
    modalMode,
    isAdmin
  } = useAdminFacialAuth();
  
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [isPending, setIsPending] = useState(false);

  const handleActionRequest = async () => {
    if (!isAdmin) {
      // Non-admins can proceed directly
      return;
    }

    // Check if facial auth is required
    const authValid = requireFacialAuth(action);
    
    if (!authValid) {
      // Facial auth modal will be shown automatically
      setIsPending(true);
      return;
    }

    // If auth is valid, show confirmation if required
    if (requireConfirmation) {
      setShowConfirmation(true);
    }
  };

  const handleFacialAuthSuccess = () => {
    handleAuthSuccess();
    setIsPending(false);
    
    // After successful auth, show confirmation if required
    if (requireConfirmation) {
      setShowConfirmation(true);
    }
  };

  const handleConfirmAction = () => {
    setShowConfirmation(false);
    setIsPending(false);
  };

  const handleCancelAction = () => {
    setShowConfirmation(false);
    setIsPending(false);
  };

  if (showConfirmation) {
    return (
      <div className="space-y-4">
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>Ação Crítica:</strong> {description || action}
            <br />
            Esta ação requer confirmação adicional. Tem certeza que deseja continuar?
          </AlertDescription>
        </Alert>
        
        <div className="flex gap-2">
          <Button 
            variant="destructive" 
            onClick={handleConfirmAction}
            className="flex-1"
          >
            Confirmar e Executar
          </Button>
          <Button 
            variant="outline" 
            onClick={handleCancelAction}
            className="flex-1"
          >
            Cancelar
          </Button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div onClick={handleActionRequest}>
        {children}
      </div>
      
      {/* Show facial auth modal when needed */}
      <FacialAuthModal
        isOpen={showModal && isPending}
        onClose={handleModalClose}
        onSuccess={handleFacialAuthSuccess}
        mode={modalMode}
        reason={`Autenticação necessária para: ${description || action}`}
      />
    </>
  );
};