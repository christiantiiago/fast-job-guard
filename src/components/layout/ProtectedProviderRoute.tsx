import { useAuth } from '@/hooks/useAuth';
import { useKYCStatus } from '@/hooks/useKYCStatus';
import { Navigate } from 'react-router-dom';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, Shield, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';

interface ProtectedProviderRouteProps {
  children: React.ReactNode;
}

export const ProtectedProviderRoute = ({ children }: ProtectedProviderRouteProps) => {
  const { user, userRole, loading } = useAuth();
  const { status: kycStatus, loading: kycLoading } = useKYCStatus();

  if (loading || kycLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth/login" replace />;
  }

  if (userRole !== 'provider') {
    return <Navigate to="/dashboard" replace />;
  }

  // Verificar status KYC para prestadores
  if (!kycStatus || kycStatus.kyc_status !== 'approved') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="max-w-md w-full space-y-6">
          <div className="text-center">
            <Shield className="h-16 w-16 text-orange-500 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-foreground">Verificação Necessária</h1>
            <p className="text-muted-foreground mt-2">
              Para acessar esta funcionalidade, você precisa completar a verificação KYC.
            </p>
          </div>

          <Alert className="border-orange-200 bg-orange-50">
            <AlertTriangle className="h-4 w-4 text-orange-600" />
            <AlertDescription className="text-orange-800">
              {(!kycStatus || kycStatus.kyc_status === 'incomplete') && 'Complete o envio de todos os documentos necessários.'}
              {kycStatus?.kyc_status === 'pending' && 'Seus documentos estão sendo analisados. Aguarde a aprovação.'}
              {kycStatus?.kyc_status === 'rejected' && 'Alguns documentos foram rejeitados. Revise e reenvie os documentos necessários.'}
              {kycStatus?.kyc_status === 'em_analise' && 'Seus documentos estão em análise. Aguarde a conclusão.'}
              {kycStatus?.kyc_status === 'suspeito' && 'Documentos suspeitos detectados. Entre em contato com o suporte.'}
              {kycStatus?.kyc_status === 'bloqueado' && 'Acesso bloqueado. Entre em contato com o suporte.'}
            </AlertDescription>
          </Alert>

          <div className="space-y-3">
            <Button asChild className="w-full">
              <Link to="/kyc/documents">
                <FileText className="h-4 w-4 mr-2" />
                {(!kycStatus || kycStatus.kyc_status === 'incomplete') ? 'Enviar Documentos' : 'Ver Status dos Documentos'}
              </Link>
            </Button>
            
            <Button variant="outline" asChild className="w-full">
              <Link to="/dashboard">
                Voltar ao Dashboard
              </Link>
            </Button>
          </div>

          <div className="text-center text-sm text-muted-foreground">
            <p>
              A verificação KYC garante a segurança e confiabilidade da nossa plataforma.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};