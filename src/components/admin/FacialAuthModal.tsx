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
import { Camera, Shield, AlertTriangle, CheckCircle, UserCheck, Fingerprint } from 'lucide-react';

interface FacialAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  reason?: string;
  mode?: 'enrollment' | 'verification';
}

export const FacialAuthModal = ({ 
  isOpen, 
  onClose, 
  onSuccess, 
  reason = "Verificação de segurança necessária",
  mode = 'verification'
}: FacialAuthModalProps) => {
  const { state, videoRef, startCapture, stopCapture, enrollFace, verifyIdentity } = useFacialAuth();
  const [step, setStep] = useState<'instruction' | 'capture' | 'processing' | 'success' | 'error'>('instruction');
  const [error, setError] = useState<string | null>(null);

  const isEnrollment = mode === 'enrollment' || state.enrollmentRequired;

  const handleStartCapture = async () => {
    try {
      setStep('capture');
      await startCapture();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao acessar câmera');
      setStep('error');
    }
  };

  const handleProcess = async () => {
    try {
      setStep('processing');
      
      if (isEnrollment) {
        const success = await enrollFace();
        if (success) {
          setStep('success');
          setTimeout(() => {
            stopCapture();
            onSuccess();
            handleClose();
          }, 2000);
        }
      } else {
        const success = await verifyIdentity();
        if (success) {
          setStep('success');
          setTimeout(() => {
            stopCapture();
            onSuccess();
            handleClose();
          }, 2000);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro durante processamento');
      setStep('error');
    }
  };

  const handleRetry = () => {
    setError(null);
    setStep('instruction');
    stopCapture();
  };

  const handleClose = () => {
    if (!isEnrollment) {
      onClose();
      setStep('instruction');
      setError(null);
      stopCapture();
    }
    // Para enrollment, não permitir fechar até completar
  };

  const renderContent = () => {
    switch (step) {
      case 'instruction':
        return (
          <div className="text-center space-y-6">
            <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
              {isEnrollment ? (
                <UserCheck className="w-8 h-8 text-primary" />
              ) : (
                <Shield className="w-8 h-8 text-primary" />
              )}
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-2">
                {isEnrollment ? 'Cadastro Facial Obrigatório' : 'Verificação Facial Necessária'}
              </h3>
              <p className="text-muted-foreground">
                {isEnrollment 
                  ? 'Para sua segurança, é necessário cadastrar seu rosto antes de continuar.'
                  : reason
                }
              </p>
            </div>
            <Alert>
              <Camera className="h-4 w-4" />
              <AlertDescription>
                {isEnrollment 
                  ? 'Posicione seu rosto na frente da câmera. Certifique-se de estar em um local bem iluminado e siga as instruções.'
                  : 'Posicione seu rosto na frente da câmera e siga as instruções. Certifique-se de estar em um local bem iluminado.'
                }
              </AlertDescription>
            </Alert>
            <Button onClick={handleStartCapture} className="w-full">
              <Camera className="mr-2 h-4 w-4" />
              {isEnrollment ? 'Iniciar Cadastro' : 'Iniciar Verificação'}
            </Button>
          </div>
        );

      case 'capture':
        return (
          <div className="space-y-6">
            <div className="text-center">
              <h3 className="text-lg font-semibold mb-2">Posicione seu rosto</h3>
              <p className="text-muted-foreground">
                {isEnrollment 
                  ? 'Olhe diretamente para a câmera. Mantenha o rosto centralizado e aguarde a captura automática.'
                  : 'Olhe diretamente para a câmera e mantenha o rosto centralizado'
                }
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
              {isEnrollment && (
                <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black/80 text-white px-3 py-1 rounded text-sm">
                  <Fingerprint className="inline mr-1 h-3 w-3" />
                  Cadastro Facial
                </div>
              )}
            </div>

            <div className="flex gap-3">
              <Button 
                variant="outline" 
                onClick={isEnrollment ? undefined : handleRetry} 
                className="flex-1"
                disabled={isEnrollment}
              >
                {isEnrollment ? 'Obrigatório' : 'Cancelar'}
              </Button>
              <Button 
                onClick={handleProcess} 
                disabled={!state.isActive || state.isVerifying || state.isEnrolling}
                className="flex-1"
              >
                <Camera className="mr-2 h-4 w-4" />
                {isEnrollment ? 'Cadastrar' : 'Verificar'}
              </Button>
            </div>
          </div>
        );

      case 'processing':
        return (
          <div className="text-center space-y-6">
            <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-2">
                {isEnrollment ? 'Processando cadastro...' : 'Verificando identidade...'}
              </h3>
              <p className="text-muted-foreground">
                {isEnrollment 
                  ? 'Analisando e salvando seus dados faciais de forma segura'
                  : 'Aguarde enquanto analisamos sua foto'
                }
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
                {isEnrollment ? 'Cadastro Concluído!' : 'Verificação Bem-sucedida!'}
              </h3>
              <p className="text-muted-foreground">
                {isEnrollment 
                  ? 'Seu rosto foi cadastrado com sucesso. Agora você pode usar a verificação facial.'
                  : 'Sua identidade foi confirmada com sucesso'
                }
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
                {isEnrollment ? 'Falha no Cadastro' : 'Verificação Falhou'}
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
    <Dialog open={isOpen} onOpenChange={isEnrollment ? undefined : handleClose}>
      <DialogContent className="max-w-md" onPointerDownOutside={isEnrollment ? (e) => e.preventDefault() : undefined}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isEnrollment ? (
              <>
                <UserCheck className="h-5 w-5" />
                Cadastro Facial Obrigatório
              </>
            ) : (
              <>
                <Shield className="h-5 w-5" />
                Autenticação Facial
              </>
            )}
          </DialogTitle>
          <DialogDescription>
            {isEnrollment 
              ? 'Cadastro biométrico obrigatório para administradores'
              : 'Verificação biométrica de segurança para administradores'
            }
          </DialogDescription>
        </DialogHeader>
        
        {renderContent()}
      </DialogContent>
    </Dialog>
  );
};