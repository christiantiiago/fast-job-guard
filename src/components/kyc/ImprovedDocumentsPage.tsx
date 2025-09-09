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
  Lock,
  Files,
  Send
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
  const [isUploadingAll, setIsUploadingAll] = useState(false);

  const filteredDocuments = documentTypes.filter(doc => 
    !doc.providerOnly || userRole === 'provider'
  );

  const getDocumentStatus = (docType: string) => {
    const doc = documents.find(d => d.document_type === docType);
    if (!doc) return { status: 'missing', doc: null };
    
    if (doc.is_verified) return { status: 'approved', doc };
    if (doc.notes && !doc.is_verified) return { status: 'rejected', doc };
    return { status: 'pending', doc };
  };

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

  const handleUploadAll = async () => {
    const filesToUpload = Object.entries(selectedFiles).filter(([docType, file]) => {
      const { status: docStatus } = getDocumentStatus(docType);
      return file && docStatus !== 'approved';
    });

    if (filesToUpload.length === 0) {
      toast({
        title: "Nenhum arquivo selecionado",
        description: "Selecione pelo menos um documento para enviar.",
        variant: "destructive",
      });
      return;
    }

    setIsUploadingAll(true);
    let successCount = 0;
    let errorCount = 0;

    for (const [docType, file] of filesToUpload) {
      try {
        await uploadDocument(file, docType as any);
        successCount++;
      } catch (error) {
        console.error(`Erro no upload de ${docType}:`, error);
        errorCount++;
      }
    }

    // Clear all uploaded files
    setSelectedFiles({});
    await fetchDocuments();
    refreshStatus();
    setIsUploadingAll(false);

    if (successCount > 0) {
      toast({
        title: "Upload realizado!",
        description: `${successCount} documento(s) enviado(s) com sucesso. ${errorCount > 0 ? `${errorCount} documento(s) falharam.` : ''}`,
      });
    } else {
      toast({
        title: "Erro no upload",
        description: "Não foi possível enviar nenhum documento. Tente novamente.",
        variant: "destructive",
      });
    }
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

  const hasSelectedFiles = Object.keys(selectedFiles).length > 0;
  const pendingUploads = Object.entries(selectedFiles).filter(([docType]) => {
    const { status: docStatus } = getDocumentStatus(docType);
    return docStatus !== 'approved';
  });

  return (
    <AppLayout>
      <div className="container mx-auto p-4 space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-r from-primary to-primary/80 text-white">
            <Files className="w-8 h-8" />
          </div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">
            Verificação de Documentos
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            {userRole === 'provider' 
              ? 'Complete sua verificação enviando todos os documentos necessários para prestadores de serviço'
              : 'Envie todos os seus documentos de uma só vez para completar sua verificação'
            }
          </p>
          {userRole === 'provider' && (
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-amber-50 border border-amber-200 rounded-full text-amber-700">
              <AlertCircle className="w-4 h-4" />
              <span className="text-sm font-medium">Prestadores precisam enviar certidão de antecedentes criminais</span>
            </div>
          )}
        </div>

        {/* Progress Card */}
        <Card className="border-0 shadow-lg bg-gradient-to-r from-background to-muted/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <FileCheck className="w-5 h-5 text-primary" />
              </div>
              <div>
                <div className="text-xl font-bold">Progresso da Verificação</div>
                <div className="text-sm text-muted-foreground">
                  {approvedDocsCount} de {requiredDocsCount} documentos aprovados
                </div>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span className="text-sm font-medium">Progresso Atual</span>
              </div>
              <span className="text-2xl font-bold text-primary">{Math.round(progressPercentage)}%</span>
            </div>
            <Progress value={progressPercentage} className="h-3" />
          </CardContent>
        </Card>

        {/* Upload All Section */}
        {hasSelectedFiles && (
          <Card className="border-2 border-primary/20 bg-gradient-to-r from-primary/5 to-primary/10">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <Send className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold">Documentos Selecionados</h3>
                    <p className="text-sm text-muted-foreground">
                      {pendingUploads.length} documento(s) pronto(s) para envio
                    </p>
                  </div>
                </div>
                <Button 
                  onClick={handleUploadAll}
                  disabled={isUploadingAll || pendingUploads.length === 0}
                  size="lg"
                  className="px-8"
                >
                  {isUploadingAll ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                      Enviando Todos...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-2" />
                      Enviar Todos os Documentos
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Documents Grid */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredDocuments.map((docType) => {
            const { status: docStatus, doc } = getDocumentStatus(docType.type);
            const selectedFile = selectedFiles[docType.type];
            const Icon = docType.icon;

            return (
              <Card key={docType.type} className={`
                relative transition-all duration-200 hover:shadow-lg
                ${docStatus === 'approved' ? 'border-green-200 bg-green-50/30' : ''}
                ${docStatus === 'rejected' ? 'border-red-200 bg-red-50/30' : ''}
                ${docStatus === 'pending' ? 'border-yellow-200 bg-yellow-50/30' : ''}
                ${selectedFile ? 'border-primary/30 bg-primary/5' : ''}
              `}>
                <CardHeader className="pb-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`
                        w-10 h-10 rounded-lg flex items-center justify-center
                        ${docStatus === 'approved' ? 'bg-green-100 text-green-600' :
                          docStatus === 'rejected' ? 'bg-red-100 text-red-600' :
                          docStatus === 'pending' ? 'bg-yellow-100 text-yellow-600' :
                          selectedFile ? 'bg-primary/10 text-primary' :
                          'bg-muted text-muted-foreground'}
                      `}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div>
                        <CardTitle className="text-base">{docType.label}</CardTitle>
                        <p className="text-sm text-muted-foreground mt-1">
                          {docType.description}
                        </p>
                      </div>
                    </div>
                    {getStatusBadge(docStatus, doc)}
                  </div>
                </CardHeader>
                
                <CardContent className="space-y-4">
                  {docStatus === 'rejected' && doc?.notes && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                      <div className="flex items-start gap-2">
                        <XCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="text-sm font-medium text-red-800">Motivo da rejeição:</p>
                          <p className="text-sm text-red-700 mt-1">{doc.notes.replace('REJEITADO: ', '')}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {docStatus !== 'approved' && (
                    <div className="space-y-3">
                      <div className="relative">
                        <Input
                          type="file"
                          accept=".jpg,.jpeg,.png,.pdf"
                          onChange={(e) => handleFileSelect(docType.type, e.target.files?.[0] || null)}
                          className="cursor-pointer file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
                        />
                      </div>
                      
                      {selectedFile && (
                        <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg">
                          <div className="flex items-center gap-2">
                            <FileCheck className="w-4 h-4 text-primary" />
                            <div className="flex-1">
                              <p className="text-sm font-medium text-primary">{selectedFile.name}</p>
                              <p className="text-xs text-muted-foreground">
                                {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {docStatus === 'approved' && doc && (
                    <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-green-600" />
                        <p className="text-sm text-green-800 font-medium">
                          Aprovado em {new Date(doc.verified_at).toLocaleDateString('pt-BR')}
                        </p>
                      </div>
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