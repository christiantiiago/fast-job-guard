import { CheckCircle, Clock, XCircle, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { KYCStatus } from '@/hooks/useKYCStatus';

interface KYCProgressProps {
  status: KYCStatus;
  userRole: string | null;
}

const DOCUMENT_LABELS = {
  rg: 'RG',
  cpf: 'CPF', 
  selfie: 'Selfie (Prova de Vida)',
  address_proof: 'Comprovante de Residência',
  bank_info: 'Dados Bancários',
  criminal_background: 'Certidão de Antecedentes Criminais'
};

const DOCUMENT_DESCRIPTIONS = {
  rg: 'Registro Geral com foto',
  cpf: 'Cadastro de Pessoa Física',
  selfie: 'Foto sua segurando o documento',
  address_proof: 'Conta de luz, água ou telefone',
  bank_info: 'Dados para pagamentos',
  criminal_background: 'Certidão emitida pela Polícia Civil'
};

export const KYCProgress = ({ status, userRole }: KYCProgressProps) => {
  const getDocumentStatus = (docType: string) => {
    if (status.completedDocs.includes(docType)) {
      return { status: 'approved', icon: CheckCircle, color: 'text-green-600' };
    }
    if (status.rejectedDocs.includes(docType)) {
      return { status: 'rejected', icon: XCircle, color: 'text-red-600' };
    }
    if (status.pendingDocs.includes(docType)) {
      return { status: 'pending', icon: Clock, color: 'text-yellow-600' };
    }
    return { status: 'missing', icon: AlertCircle, color: 'text-gray-400' };
  };

  const progressPercentage = status.progress.percentage;

  const getRejectedDocument = (docType: string) => {
    return status.documents.find(doc => 
      doc.document_type === docType && !doc.is_verified && doc.notes
    );
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Verificação de Identidade (KYC)</span>
          <Badge variant={status.isComplete ? "default" : "secondary"}>
            {status.progress.completed}/{status.progress.total} concluído
          </Badge>
        </CardTitle>
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Progresso</span>
            <span>{progressPercentage}%</span>
          </div>
          <Progress value={progressPercentage} className="w-full" />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {status.requiredDocs.map((docType) => {
          const { status: docStatus, icon: Icon, color } = getDocumentStatus(docType);
          const rejectedDoc = getRejectedDocument(docType);
          
          return (
            <div key={docType} className="flex items-start gap-3 p-3 rounded-lg border">
              <Icon className={`h-5 w-5 mt-0.5 ${color}`} />
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">
                    {DOCUMENT_LABELS[docType as keyof typeof DOCUMENT_LABELS]}
                  </h4>
                  <Badge 
                    variant={
                      docStatus === 'approved' ? 'default' :
                      docStatus === 'rejected' ? 'destructive' :
                      docStatus === 'pending' ? 'secondary' : 'outline'
                    }
                  >
                    {docStatus === 'approved' && 'Aprovado'}
                    {docStatus === 'rejected' && 'Rejeitado'}  
                    {docStatus === 'pending' && 'Em análise'}
                    {docStatus === 'missing' && 'Pendente'}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  {DOCUMENT_DESCRIPTIONS[docType as keyof typeof DOCUMENT_DESCRIPTIONS]}
                </p>
                {rejectedDoc?.notes && (
                  <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                    <strong>Motivo da rejeição:</strong> {rejectedDoc.notes}
                  </div>
                )}
                {docType === 'criminal_background' && userRole === 'provider' && (
                  <p className="text-xs text-orange-600 mt-1">
                    ⚠️ Documento válido por 90 dias; mantenha sua certidão atualizada
                  </p>
                )}
              </div>
            </div>
          );
        })}

        {/* Aviso sobre certidão criminal para prestadores */}
        {userRole === 'provider' && status.criminalBackgroundExpiry && (
          <div className="mt-4 p-3 bg-orange-50 border border-orange-200 rounded-lg">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-orange-600" />
              <span className="text-sm font-medium text-orange-700">
                Certidão de Antecedentes Criminais
              </span>
            </div>
            <p className="text-xs text-orange-600 mt-1">
              Expira em: {new Date(status.criminalBackgroundExpiry).toLocaleDateString('pt-BR')}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};