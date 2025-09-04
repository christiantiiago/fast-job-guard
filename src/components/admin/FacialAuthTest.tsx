import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FacialAuthModal } from '@/components/admin/FacialAuthModal';
import { useFacialAuth } from '@/hooks/useFacialAuth';
import { Camera, Shield, User, CheckCircle, AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

export const FacialAuthTest = () => {
  const { state, checkEnrollmentStatus } = useFacialAuth();
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<'enrollment' | 'verification'>('verification');
  const [lastResult, setLastResult] = useState<string | null>(null);

  const handleTestEnrollment = () => {
    setModalMode('enrollment');
    setShowModal(true);
    setLastResult(null);
  };

  const handleTestVerification = () => {
    setModalMode('verification');
    setShowModal(true);
    setLastResult(null);
  };

  const handleSuccess = () => {
    setLastResult('sucesso');
    setShowModal(false);
    // Atualizar status após sucesso
    setTimeout(() => {
      checkEnrollmentStatus();
    }, 1000);
  };

  const handleClose = () => {
    setShowModal(false);
    if (!lastResult) {
      setLastResult('cancelado');
    }
  };

  return (
    <div className="space-y-6">
      {/* Status Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Status da Autenticação Facial
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <p className="text-sm font-medium">Status do Cadastro:</p>
              <div className="flex items-center gap-2">
                {state.isEnrolled ? (
                  <>
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span className="text-green-700">Cadastrado</span>
                  </>
                ) : (
                  <>
                    <AlertTriangle className="h-4 w-4 text-orange-600" />
                    <span className="text-orange-700">Não Cadastrado</span>
                  </>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium">Última Verificação:</p>
              <div className="flex items-center gap-2">
                <Camera className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  {state.lastVerification 
                    ? new Date(state.lastVerification).toLocaleString('pt-BR')
                    : 'Nunca'
                  }
                </span>
              </div>
            </div>
          </div>

          {state.enrollmentRequired && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                O cadastro facial é obrigatório para administradores. Clique em "Testar Cadastro" para começar.
              </AlertDescription>
            </Alert>
          )}

          {lastResult && (
            <Alert className={lastResult === 'sucesso' ? 'border-green-500 bg-green-50' : 'border-orange-500 bg-orange-50'}>
              <div className="flex items-center gap-2">
                {lastResult === 'sucesso' ? (
                  <CheckCircle className="h-4 w-4 text-green-600" />
                ) : (
                  <AlertTriangle className="h-4 w-4 text-orange-600" />
                )}
                <AlertDescription className={lastResult === 'sucesso' ? 'text-green-700' : 'text-orange-700'}>
                  Último teste: {lastResult === 'sucesso' ? 'Sucesso!' : 'Cancelado ou falhou'}
                </AlertDescription>
              </div>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Test Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5" />
            Testes de Funcionalidade
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4" />
                <h4 className="font-medium">Cadastro Facial</h4>
              </div>
              <p className="text-sm text-muted-foreground">
                Testa o processo completo de cadastro biométrico inicial.
              </p>
              <Button 
                onClick={handleTestEnrollment}
                variant="outline"
                className="w-full"
                disabled={state.isCapturing || state.isEnrolling || state.isVerifying}
              >
                <User className="mr-2 h-4 w-4" />
                Testar Cadastro
              </Button>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4" />
                <h4 className="font-medium">Verificação Facial</h4>
              </div>
              <p className="text-sm text-muted-foreground">
                Testa a verificação de identidade usando biometria.
              </p>
              <Button 
                onClick={handleTestVerification}
                className="w-full"
                disabled={!state.isEnrolled || state.isCapturing || state.isEnrolling || state.isVerifying}
              >
                <Shield className="mr-2 h-4 w-4" />
                Testar Verificação
              </Button>
            </div>
          </div>

          {!state.isEnrolled && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                A verificação facial só estará disponível após completar o cadastro biométrico.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Debug Info */}
      <Card className="border-dashed">
        <CardHeader>
          <CardTitle className="text-sm text-muted-foreground">Informações de Debug</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-xs font-mono bg-muted p-3 rounded">
            <p>isActive: {state.isActive.toString()}</p>
            <p>isCapturing: {state.isCapturing.toString()}</p>
            <p>isEnrolling: {state.isEnrolling.toString()}</p>
            <p>isVerifying: {state.isVerifying.toString()}</p>
            <p>isEnrolled: {state.isEnrolled.toString()}</p>
            <p>enrollmentRequired: {state.enrollmentRequired.toString()}</p>
            <p>verificationRequired: {state.verificationRequired.toString()}</p>
          </div>
        </CardContent>
      </Card>

      {/* Modal */}
      <FacialAuthModal
        isOpen={showModal}
        onClose={handleClose}
        onSuccess={handleSuccess}
        mode={modalMode}
        reason={modalMode === 'verification' 
          ? "Teste de verificação de identidade facial" 
          : "Teste de cadastro biométrico inicial"
        }
      />
    </div>
  );
};