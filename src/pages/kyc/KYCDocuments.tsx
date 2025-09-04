import { AppLayout } from '@/components/layout/AppLayout';
import { DocumentUploadCard } from '@/components/kyc/DocumentUploadCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useKYCStatus } from '@/hooks/useKYCStatus';
import { Shield, FileText, User, MapPin, Banknote, Scale } from 'lucide-react';

const DOCUMENT_TYPES = [
  {
    type: 'rg' as const,
    title: 'RG (Registro Geral)',
    description: 'Documento de identidade brasileiro oficial',
    icon: User,
    required: true,
    tips: 'Foto clara da frente e verso do RG, com todos os dados legíveis.'
  },
  {
    type: 'cpf' as const,
    title: 'CPF',
    description: 'Cadastro de Pessoas Físicas',
    icon: FileText,
    required: true,
    tips: 'Comprovante de CPF ou foto do cartão CPF.'
  },
  {
    type: 'selfie' as const,
    title: 'Selfie com Documento',
    description: 'Foto sua segurando o RG',
    icon: User,
    required: true,
    tips: 'Segure o RG próximo ao rosto, com boa iluminação e ambos visíveis.'
  },
  {
    type: 'address_proof' as const,
    title: 'Comprovante de Residência',
    description: 'Documento que comprove seu endereço',
    icon: MapPin,
    required: true,
    tips: 'Conta de luz, água, gás ou telefone dos últimos 3 meses.'
  },
  {
    type: 'bank_info' as const,
    title: 'Dados Bancários',
    description: 'Comprovante de conta bancária',
    icon: Banknote,
    required: false,
    tips: 'Extrato bancário ou comprovante de conta dos últimos 30 dias.'
  },
  {
    type: 'criminal_background' as const,
    title: 'Certidão Criminal',
    description: 'Certidão de antecedentes criminais',
    icon: Scale,
    required: true,
    tips: 'Certidão emitida pela Polícia Federal dos últimos 90 dias.'
  }
];

export default function KYCDocuments() {
  const { status } = useKYCStatus();

  const getCompletionStats = () => {
    if (!status) return { completed: 0, total: DOCUMENT_TYPES.length };
    
    let completed = 0;
    DOCUMENT_TYPES.forEach(doc => {
      const docStatus = status.documents[doc.type];
      if (docStatus?.isComplete) completed++;
    });
    
    return { completed, total: DOCUMENT_TYPES.length };
  };

  const { completed, total } = getCompletionStats();
  const completionPercentage = Math.round((completed / total) * 100);

  return (
    <AppLayout>
      <div className="container max-w-4xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
            <Shield className="w-8 h-8 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Verificação de Identidade</h1>
            <p className="text-muted-foreground mt-2">
              Envie os documentos necessários para completar sua verificação KYC
            </p>
          </div>
        </div>

        {/* Progress Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Progresso da Verificação
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">
                  Documentos Enviados
                </span>
                <span className="text-sm text-muted-foreground">
                  {completed}/{total}
                </span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div 
                  className="bg-primary h-2 rounded-full transition-all duration-300"
                  style={{ width: `${completionPercentage}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                {completionPercentage === 100 
                  ? 'Todos os documentos foram enviados! Aguardando análise.'
                  : 'Envie todos os documentos obrigatórios para completar a verificação.'
                }
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Document Upload Cards */}
        <div className="grid gap-4 md:grid-cols-2">
          {DOCUMENT_TYPES.map((doc) => (
            <DocumentUploadCard
              key={doc.type}
              documentType={doc.type}
              title={doc.title}
              description={doc.description}
              isRequired={doc.required}
              maxSizeMB={10}
            />
          ))}
        </div>

        {/* Help Section */}
        <Card className="bg-muted/50">
          <CardHeader>
            <CardTitle className="text-base">Dicas Importantes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-3 text-sm">
              <div className="flex items-start gap-2">
                <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0" />
                <p>
                  <strong>Qualidade da Imagem:</strong> Certifique-se de que todas as informações estão legíveis e em foco.
                </p>
              </div>
              <div className="flex items-start gap-2">
                <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0" />
                <p>
                  <strong>Iluminação:</strong> Use boa iluminação, evitando sombras sobre os documentos.
                </p>
              </div>
              <div className="flex items-start gap-2">
                <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0" />
                <p>
                  <strong>Formatos Aceitos:</strong> JPG, PNG, WEBP, HEIC (fotos) e PDF (documentos).
                </p>
              </div>
              <div className="flex items-start gap-2">
                <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0" />
                <p>
                  <strong>Privacidade:</strong> Seus documentos são criptografados e protegidos.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}