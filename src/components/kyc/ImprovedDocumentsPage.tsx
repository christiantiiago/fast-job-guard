import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { AppLayout } from '@/components/layout/AppLayout';
import { useAuth } from '@/hooks/useAuth';
import { useKYCUpload } from '@/hooks/useKYCUpload';
import { useKYCStatus } from '@/hooks/useKYCStatus';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import {
  FileText,
  Camera,
  MapPin,
  CreditCard,
  Shield,
  Upload,
  CheckCircle,
  Clock,
  XCircle,
  AlertCircle,
  FileCheck,
  Lock
} from 'lucide-react';

interface DocumentType {
  type: 'rg' | 'cpf' | 'selfie' | 'address_proof' | 'criminal_background' | 'bank_info';
  label: string;
  description: string;
  icon: typeof FileText;
  required: boolean;
  providerOnly?: boolean;
}

const documentTypes: DocumentType[] = [
  {
    type: 'rg',
    label: 'RG (Documento de Identidade)',
    description: 'Foto nítida do seu RG (frente e verso)',
    icon: FileText,
    required: true
  },
  {
    type: 'cpf',
    label: 'CPF',
    description: 'Documento do CPF ou comprovante',
    icon: CreditCard,
    required: true
  },
  {
    type: 'selfie',
    label: 'Selfie com Documento',
    description: 'Foto sua segurando o RG ao lado do rosto',
    icon: Camera,
    required: true
  },
  {
    type: 'address_proof',
    label: 'Comprovante de Endereço',
    description: 'Conta de luz, água, telefone (últimos 3 meses)',
    icon: MapPin,
    required: true
  },
  {
    type: 'criminal_background',
    label: 'Certidão de Antecedentes Criminais',
    description: 'Certidão negativa de antecedentes criminais',
    icon: Shield,
    required: true,
    providerOnly: true
  },
  {
    type: 'bank_info',
    label: 'Dados Bancários',
    description: 'Comprovante de conta bancária ou dados da conta',
    icon: CreditCard,
    required: true,
    providerOnly: true
  }
];

export const ImprovedDocumentsPage = () => {
  const { user, userRole } = useAuth();
  const { uploadDocument, uploading } = useKYCUpload();
  const { status, loading, refreshStatus } = useKYCStatus();
  const { toast } = useToast();

  const [selectedFiles, setSelectedFiles] = useState<{ [key: string]: File }>({});
  const [documents, setDocuments] = useState<any[]>([]);

  const filteredDocuments = documentTypes.filter(doc => 
    !doc.providerOnly || userRole === 'provider'
  );

  const requiredDocsCount = filteredDocuments.filter(doc => doc.required).length;
  
  // Calculate approved docs from KYC status for more accurate count
  const approvedDocsCount = filteredDocuments.filter(doc => {
    const docStatus = getDocumentStatus(doc.type);
    return docStatus.status === 'approved';
  }).length;
  
  const progressPercentage = requiredDocsCount > 0 ? (approvedDocsCount / requiredDocsCount) * 100 : 0;

  console.log('Documents progress:', { 
    userRole, 
    requiredDocsCount, 
    approvedDocsCount, 
    progressPercentage,
    filteredDocsCount: filteredDocuments.length 
  });

  useEffect(() => {
    fetchDocuments();
  }, [user]);

  const fetchDocuments = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('kyc_documents')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDocuments(data || []);
    } catch (error) {
      console.error('Erro ao buscar documentos:', error);
    }
  };

  const handleFileSelect = (docType: string, file: File | null) => {
    if (!file) return;
    
    const maxSize = 10 * 1024 * 1024; // 10MB
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];

    if (file.size > maxSize) {
      toast({
        title: "Arquivo muito grande",
        description: "O arquivo deve ter no máximo 10MB.",
        variant: "destructive",
      });
      return;
    }

    if (!allowedTypes.includes(file.type)) {
      toast({
        title: "Formato inválido",
        description: "Apenas imagens (JPG, PNG) e PDF são aceitos.",
        variant: "destructive",
      });
      return;
    }

    setSelectedFiles(prev => ({
      ...prev,
      [docType]: file
    }));
  };

  const handleUpload = async (docType: string) => {
    const file = selectedFiles[docType];
    if (!file) return;

    try {
      await uploadDocument(file, docType as any);
      setSelectedFiles(prev => {
        const newFiles = { ...prev };
        delete newFiles[docType];
        return newFiles;
      });
      await fetchDocuments();
      refreshStatus();
      
      toast({
        title: "Upload realizado!",
        description: "Documento enviado com sucesso. Aguarde a análise.",
      });
    } catch (error) {
      console.error('Erro no upload:', error);
      toast({
        title: "Erro no upload",
        description: "Tente novamente em alguns instantes.",
        variant: "destructive",
      });
    }
  };

  const getDocumentStatus = (docType: string) => {
    const doc = documents.find(d => d.document_type === docType);
    if (!doc) return { status: 'missing', doc: null };
    
    if (doc.is_verified) return { status: 'approved', doc };
    if (doc.notes && !doc.is_verified) return { status: 'rejected', doc };
    return { status: 'pending', doc };
  };

  const getStatusBadge = (status: string, doc: any) => {
    switch (status) {
      case 'approved':
        return <Badge variant="default" className="bg-green-500"><CheckCircle className="w-3 h-3 mr-1" />Aprovado</Badge>;
      case 'rejected':
        return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />Rejeitado</Badge>;
      case 'pending':
        return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" />Em análise</Badge>;
      default:
        return <Badge variant="outline"><AlertCircle className="w-3 h-3 mr-1" />Pendente</Badge>;
    }
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Carregando...</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="container mx-auto p-4 space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold">Verificação de Documentos</h1>
          <p className="text-muted-foreground">
            {userRole === 'provider' 
              ? 'Complete sua verificação enviando os documentos necessários para prestadores'
              : 'Complete sua verificação enviando os documentos necessários'
            }
          </p>
          {userRole === 'provider' && (
            <p className="text-sm text-amber-600">
              ⚠️ Prestadores precisam enviar certidão de antecedentes criminais
            </p>
          )}
        </div>

        {/* Progress Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileCheck className="w-5 h-5" />
              Progresso da Verificação
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                {approvedDocsCount} de {requiredDocsCount} documentos aprovados
              </span>
              <span className="font-semibold">{Math.round(progressPercentage)}%</span>
            </div>
            <Progress value={progressPercentage} className="w-full" />
          </CardContent>
        </Card>

        {/* Documents Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredDocuments.map((docType) => {
            const { status: docStatus, doc } = getDocumentStatus(docType.type);
            const selectedFile = selectedFiles[docType.type];
            const Icon = docType.icon;

            return (
              <Card key={docType.type} className="relative">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <Icon className="w-5 h-5 text-primary" />
                      <CardTitle className="text-lg">{docType.label}</CardTitle>
                    </div>
                    {getStatusBadge(docStatus, doc)}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {docType.description}
                  </p>
                </CardHeader>
                
                <CardContent className="space-y-4">
                  {docStatus === 'rejected' && doc?.notes && (
                    <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md">
                      <p className="text-sm text-destructive">
                        <strong>Motivo da rejeição:</strong> {doc.notes.replace('REJEITADO: ', '')}
                      </p>
                    </div>
                  )}

                  {docStatus !== 'approved' && (
                    <div className="space-y-3">
                      <Input
                        type="file"
                        accept=".jpg,.jpeg,.png,.pdf"
                        onChange={(e) => handleFileSelect(docType.type, e.target.files?.[0] || null)}
                        className="cursor-pointer"
                      />
                      
                      {selectedFile && (
                        <div className="p-2 bg-muted rounded-md">
                          <p className="text-sm truncate">{selectedFile.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                          </p>
                        </div>
                      )}
                      
                      <Button
                        onClick={() => handleUpload(docType.type)}
                        disabled={!selectedFile || uploading}
                        className="w-full"
                        size="sm"
                      >
                        {uploading ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                            Enviando...
                          </>
                        ) : (
                          <>
                            <Upload className="w-4 h-4 mr-2" />
                            Enviar Documento
                          </>
                        )}
                      </Button>
                    </div>
                  )}

                  {docStatus === 'approved' && doc && (
                    <div className="p-3 bg-green-50 border border-green-200 rounded-md">
                      <p className="text-sm text-green-700">
                        Documento aprovado em {new Date(doc.verified_at).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Security Notice */}
        <Card className="bg-muted/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="w-5 h-5" />
              Segurança e Privacidade
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-sm text-muted-foreground">
              • Seus documentos são armazenados com segurança e criptografia
            </p>
            <p className="text-sm text-muted-foreground">
              • Utilizamos apenas para verificação de identidade
            </p>
            <p className="text-sm text-muted-foreground">
              • Não compartilhamos seus dados com terceiros
            </p>
            <p className="text-sm text-muted-foreground">
              • Você pode solicitar a exclusão dos seus dados a qualquer momento
            </p>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
};