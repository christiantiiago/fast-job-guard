import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useFacialAuth } from '@/hooks/useFacialAuth';
import { Camera, Shield, AlertTriangle, CheckCircle } from 'lucide-react';

interface FacialAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  reason?: string;
}

export const FacialAuthModal = ({ 
  isOpen, 
  onClose, 
  onSuccess, 
  reason = "Verificação de segurança necessária" 
}: FacialAuthModalProps) => {
  const { state, videoRef, startCapture, stopCapture, verifyIdentity } = useFacialAuth();
  const [step, setStep] = useState<'instruction' | 'capture' | 'verifying' | 'success' | 'error'>('instruction');
  const [error, setError] = useState<string | null>(null);

  const handleStartVerification = async () => {
    try {
      setStep('capture');
      await startCapture();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao acessar câmera');
      setStep('error');
    }
  };

  const handleVerify = async () => {
    try {
      setStep('verifying');
      const success = await verifyIdentity();
      
      if (success) {
        setStep('success');
        setTimeout(() => {
          stopCapture();
          onSuccess();
          onClose();
          setStep('instruction');
        }, 2000);
      } else {
        setError('Verificação facial falhou. Tente novamente.');
        setStep('error');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro durante verificação');
      setStep('error');
    }
  };

  const handleRetry = () => {
    setError(null);
    setStep('instruction');
    stopCapture();
  };

  const renderContent = () => {
    switch (step) {
      case 'instruction':
        return (
          <div className="text-center space-y-6">
            <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
              <Shield className="w-8 h-8 text-primary" />
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-2">Verificação Facial Necessária</h3>
              <p className="text-muted-foreground">{reason}</p>
            </div>
            <Alert>
              <Camera className="h-4 w-4" />
              <AlertDescription>
                Posicione seu rosto na frente da câmera e siga as instruções.
                Certifique-se de estar em um local bem iluminado.
              </AlertDescription>
            </Alert>
            <Button onClick={handleStartVerification} className="w-full">
              <Camera className="mr-2 h-4 w-4" />
              Iniciar Verificação
            </Button>
          </div>
        );

      case 'capture':
        return (
          <div className="space-y-6">
            <div className="text-center">
              <h3 className="text-lg font-semibold mb-2">Posicione seu rosto</h3>
              <p className="text-muted-foreground">
                Olhe diretamente para a câmera e mantenha o rosto centralizado
              </p>
            </div>
            
            <div className="relative mx-auto w-80 h-60 bg-muted rounded-lg overflow-hidden">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 border-4 border-primary rounded-lg pointer-events-none">
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-48 h-36 border-2 border-primary rounded-lg"></div>
              </div>
            </div>

            <div className="flex gap-3">
              <Button variant="outline" onClick={handleRetry} className="flex-1">
                Cancelar
              </Button>
              <Button 
                onClick={handleVerify} 
                disabled={!state.isActive || state.isVerifying}
                className="flex-1"
              >
                <Camera className="mr-2 h-4 w-4" />
                Verificar
              </Button>
            </div>
          </div>
        );

      case 'verifying':
        return (
          <div className="text-center space-y-6">
            <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-2">Verificando identidade...</h3>
              <p className="text-muted-foreground">
                Aguarde enquanto analisamos sua foto
              </p>
            </div>
          </div>
        );

      case 'success':
        return (
          <div className="text-center space-y-6">
            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-green-600 mb-2">
                Verificação Bem-sucedida!
              </h3>
              <p className="text-muted-foreground">
                Sua identidade foi confirmada com sucesso
              </p>
            </div>
          </div>
        );

      case 'error':
        return (
          <div className="text-center space-y-6">
            <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
              <AlertTriangle className="w-8 h-8 text-red-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-red-600 mb-2">
                Verificação Falhou
              </h3>
              <p className="text-muted-foreground">{error}</p>
            </div>
            <Button onClick={handleRetry} className="w-full">
              Tentar Novamente
            </Button>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Autenticação Facial
          </DialogTitle>
          <DialogDescription>
            Verificação biométrica de segurança para administradores
          </DialogDescription>
        </DialogHeader>
        
        {renderContent()}
      </DialogContent>
    </Dialog>
  );
};