import { Link } from 'react-router-dom';
import { AlertCircle, CheckCircle, Clock, X } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { KYCStatus } from '@/hooks/useKYCStatus';
import { useState } from 'react';

interface KYCBannerProps {
  status: KYCStatus;
  userRole: string | null;
}

export const KYCBanner = ({ status, userRole }: KYCBannerProps) => {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed || status.isComplete) {
    return null;
  }

  const pendingCount = status.pendingDocs.length;
  const rejectedCount = status.rejectedDocs.length;
  const completedCount = status.completedDocs.length;
  const totalRequired = status.requiredDocs.length;

  const getAlertVariant = () => {
    if (rejectedCount > 0) return "destructive";
    if (pendingCount > 0) return "default";
    return "default";
  };

  const getIcon = () => {
    if (rejectedCount > 0) return AlertCircle;
    if (pendingCount > 0) return Clock;
    return CheckCircle;
  };

  const Icon = getIcon();

  return (
    <Alert variant={getAlertVariant()} className="relative">
      <Icon className="h-4 w-4" />
      <AlertTitle className="flex items-center gap-2">
        Verificação de Identidade (KYC)
        <Badge variant="outline">
          {completedCount}/{totalRequired} completo
        </Badge>
      </AlertTitle>
      <AlertDescription>
        <div className="space-y-2">
          <div>
            {rejectedCount > 0 && (
              <p>
                <strong>Atenção:</strong> {rejectedCount} documento(s) foram rejeitados e precisam ser reenviados.
              </p>
            )}
            {pendingCount > 0 && rejectedCount === 0 && (
              <p>
                <strong>Pendente:</strong> {pendingCount} documento(s) ainda precisam ser enviados ou estão em análise.
              </p>
            )}
            {userRole === 'provider' && (
              <p className="text-sm text-muted-foreground mt-1">
                Como prestador, você precisa completar todos os documentos para poder trabalhar na plataforma.
              </p>
            )}
          </div>
          <div className="flex gap-2">
            <Button asChild size="sm">
              <Link to="/kyc/verify">
                {rejectedCount > 0 ? 'Corrigir Documentos' : 'Completar Verificação'}
              </Link>
            </Button>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => setDismissed(true)}
            >
              <X className="h-3 w-3 mr-1" />
              Dispensar
            </Button>
          </div>
        </div>
      </AlertDescription>
    </Alert>
  );
};