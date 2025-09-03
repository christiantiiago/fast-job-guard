import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, FileText, Shield, Clock } from "lucide-react";
import { Link } from "react-router-dom";
import { KYCStatus } from "@/hooks/useKYCStatus";

interface KYCBlockedMessageProps {
  status: KYCStatus;
  userRole: string | null;
  action: 'job_creation' | 'proposal_submission';
}

export const KYCBlockedMessage = ({ status, userRole, action }: KYCBlockedMessageProps) => {
  const getActionText = () => {
    return action === 'job_creation' ? 'criar trabalhos' : 'enviar propostas';
  };

  const getBlockReason = () => {
    if (status.rejectedDocs.length > 0) {
      return {
        icon: AlertCircle,
        title: "Documentos Rejeitados",
        description: "Alguns dos seus documentos foram rejeitados e precisam ser reenviados.",
        variant: "destructive" as const
      };
    }
    
    if (status.pendingDocs.length > 0) {
      return {
        icon: Clock,
        title: "Documentos em Análise",
        description: "Seus documentos estão sendo analisados pela nossa equipe. Aguarde a aprovação.",
        variant: "default" as const
      };
    }

    return {
      icon: FileText,
      title: "Verificação de Identidade Incompleta",
      description: "Você precisa enviar todos os documentos necessários antes de continuar.",
      variant: "default" as const
    };
  };

  const reason = getBlockReason();
  const Icon = reason.icon;

  return (
    <Card className="max-w-md mx-auto">
      <CardHeader className="text-center">
        <div className="flex justify-center mb-4">
          <div className="p-3 rounded-full bg-orange-100 dark:bg-orange-900/20">
            <Shield className="h-8 w-8 text-orange-600 dark:text-orange-400" />
          </div>
        </div>
        <CardTitle className="text-xl">Ação Bloqueada</CardTitle>
        <CardDescription>
          Você não pode {getActionText()} no momento
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <Alert variant={reason.variant}>
          <Icon className="h-4 w-4" />
          <AlertTitle>{reason.title}</AlertTitle>
          <AlertDescription>
            {reason.description}
          </AlertDescription>
        </Alert>

        <div className="space-y-2">
          <h4 className="font-semibold text-sm">Status dos seus documentos:</h4>
          <div className="text-sm space-y-1">
            {status.completedDocs.length > 0 && (
              <div className="text-green-600 dark:text-green-400">
                ✓ Aprovados: {status.completedDocs.length}
              </div>
            )}
            {status.pendingDocs.length > 0 && (
              <div className="text-yellow-600 dark:text-yellow-400">
                ⏳ Em análise: {status.pendingDocs.length}
              </div>
            )}
            {status.rejectedDocs.length > 0 && (
              <div className="text-red-600 dark:text-red-400">
                ✗ Rejeitados: {status.rejectedDocs.length}
              </div>
            )}
          </div>
        </div>

        <div className="pt-4 space-y-2">
          <Button asChild className="w-full">
            <Link to="/kyc/verify">
              <FileText className="w-4 h-4 mr-2" />
              Completar Verificação
            </Link>
          </Button>
          
          <p className="text-xs text-muted-foreground text-center">
            A verificação de identidade é obrigatória para garantir a segurança da plataforma
          </p>
        </div>
      </CardContent>
    </Card>
  );
};