import { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { useAuth } from '@/hooks/useAuth';
import { useKYCStatus } from '@/hooks/useKYCStatus';
import { KYCProgress } from '@/components/kyc/KYCProgress';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, Upload, CheckCircle, FileText, Camera, Home, Receipt } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

const DOCUMENT_CONFIG = {
  rg: {
    title: 'RG',
    description: 'Registro Geral com foto',
    icon: FileText,
    instructions: 'Foto clara do RG (frente e verso se necessário)',
    acceptedFormats: 'JPG, PNG ou PDF'
  },
  cpf: {
    title: 'CPF',
    description: 'Cadastro de Pessoa Física',
    icon: FileText,
    instructions: 'Foto clara do CPF ou comprovante de inscrição',
    acceptedFormats: 'JPG, PNG ou PDF'
  },
  selfie: {
    title: 'Selfie com Documento',
    description: 'Prova de vida',
    icon: Camera,
    instructions: 'Foto sua segurando o documento de identidade',
    acceptedFormats: 'JPG ou PNG'
  },
  address_proof: {
    title: 'Comprovante de Residência',
    description: 'Conta de luz, água ou telefone',
    icon: Home,
    instructions: 'Comprovante recente (até 3 meses) em seu nome',
    acceptedFormats: 'JPG, PNG ou PDF'
  },
  bank_info: {
    title: 'Dados Bancários',
    description: 'Informações para pagamentos',
    icon: Receipt,
    instructions: 'Comprovante de conta bancária ou dados PIX',
    acceptedFormats: 'JPG, PNG ou PDF'
  },
  criminal_background: {
    title: 'Certidão de Antecedentes',
    description: 'Certidão emitida pela Polícia Civil',
    icon: Receipt,
    instructions: 'Certidão negativa de antecedentes criminais',
    acceptedFormats: 'PDF'
  }
};

export default function KYCVerify() {
  const { userRole } = useAuth();
  const { status, loading, refreshStatus } = useKYCStatus();
  const navigate = useNavigate();

  // Força atualização ao carregar
  useEffect(() => {
    refreshStatus();
  }, [refreshStatus]);

  if (loading) {
    return (
      <AppLayout showKYCBanner={false}>
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </AppLayout>
    );
  }

  if (!status) {
    return (
      <AppLayout showKYCBanner={false}>
        <div className="container mx-auto px-4 py-8">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Erro ao carregar informações</AlertTitle>
            <AlertDescription>
              Não foi possível carregar suas informações de KYC. Tente recarregar a página.
            </AlertDescription>
          </Alert>
        </div>
      </AppLayout>
    );
  }

  // Garante que isComplete reflete os documentos aprovados
  const allApproved =
    status.documents?.length > 0 &&
    status.documents.every((doc) => doc.status === 'approved');
  const isComplete = status.isComplete || allApproved;

  return (
    <AppLayout showKYCBanner={false}>
      <div className="container mx-auto px-4 py-8 space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold">Verificação de Identidade</h1>
          <p className="text-muted-foreground">
            Complete sua verificação para ter acesso completo à plataforma
          </p>
        </div>

        {/* Status Geral */}
        {isComplete ? (
          <Alert className="border-green-200 bg-green-50">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertTitle className="text-green-800">Verificação Completa! ✅</AlertTitle>
            <AlertDescription className="text-green-700">
              Sua identidade foi verificada com sucesso. Você tem acesso completo à plataforma.
            </AlertDescription>
          </Alert>
        ) : (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Verificação Pendente</AlertTitle>
            <AlertDescription>
              {userRole === 'provider'
                ? 'Como prestador, você precisa enviar documentos adicionais para começar a trabalhar.'
                : 'Complete sua verificação para usar todos os recursos da plataforma.'}
            </AlertDescription>
          </Alert>
        )}

        {/* Progresso */}
        <KYCProgress status={status} userRole={userRole} />

        {/* Cards de Upload */}
        <div className="grid gap-4 md:grid-cols-2">
          {status.documents.map((doc) => {
            const docType = doc.document_type;
            const config = DOCUMENT_CONFIG[docType as keyof typeof DOCUMENT_CONFIG];
            if (!config) return null;

            const isCompleted = doc.status === 'approved';
            const isRejected = doc.status === 'rejected';
            const isPending = doc.status === 'pending';
            const Icon = config.icon;

            return (
              <Card
                key={docType}
                className={`
                  ${isCompleted ? 'border-green-200 bg-green-50' : ''}
                  ${isRejected ? 'border-red-200 bg-red-50' : ''}
                  ${isPending ? 'border-yellow-200 bg-yellow-50' : ''}
                `}
              >
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Icon className="h-5 w-5" />
                    {config.title}
                    {isCompleted && <CheckCircle className="h-4 w-4 text-green-600" />}
                  </CardTitle>
                  <CardDescription>{config.description}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="text-sm text-muted-foreground">
                    <p>
                      <strong>Instruções:</strong> {config.instructions}
                    </p>
                    <p>
                      <strong>Formatos aceitos:</strong> {config.acceptedFormats}
                    </p>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      {isCompleted && (
                        <Badge className="bg-green-100 text-green-800">Aprovado</Badge>
                      )}
                      {isRejected && <Badge variant="destructive">Rejeitado</Badge>}
                      {isPending && <Badge variant="secondary">Em análise</Badge>}
                    </div>

                    <Button
                      asChild
                      variant={isCompleted ? 'outline' : 'default'}
                      size="sm"
                    >
                      <Link to={`/kyc/upload/${docType}`}>
                        <Upload className="h-4 w-4 mr-2" />
                        {isCompleted
                          ? 'Atualizar'
                          : isRejected
                          ? 'Reenviar'
                          : isPending
                          ? 'Substituir'
                          : 'Enviar'}
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Ações */}
        <div className="flex justify-center gap-4">
          <Button asChild variant="default">
            <Link to="/kyc/documents">
              <FileText className="h-4 w-4 mr-2" />
              Enviar Documentos
            </Link>
          </Button>

          <Button variant="outline" onClick={refreshStatus}>
            Atualizar Status
          </Button>

          {isComplete && (
            <Button onClick={() => navigate('/dashboard')}>Ir para Dashboard</Button>
          )}
        </div>

        {/* Informações de Suporte */}
        <Card>
          <CardHeader>
            <CardTitle>Precisa de Ajuda?</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Se você está tendo problemas com seus documentos ou tem dúvidas sobre o processo de
              verificação:
            </p>
            <ul className="text-sm text-muted-foreground space-y-1 ml-4">
              <li>• Certifique-se de que as fotos estão nítidas e legíveis</li>
              <li>• Documentos devem estar válidos e dentro do prazo</li>
              <li>• O comprovante de residência deve ser recente (até 3 meses)</li>
              <li>• Entre em contato conosco se precisar de ajuda adicional</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
