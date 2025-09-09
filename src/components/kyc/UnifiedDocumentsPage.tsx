import { useState, useEffect } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/components/ui/use-toast';
import { useKYCUpload, type DocumentType } from '@/hooks/useKYCUpload';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { 
  Upload, 
  FileText, 
  CheckCircle, 
  Clock, 
  XCircle, 
  Eye,
  Camera,
  AlertCircle,
  Award,
  Shield,
  Zap
} from 'lucide-react';

type MyDocumentType = DocumentType;

const documentTypes = [
  { 
    type: 'rg' as MyDocumentType, 
    label: 'RG (Identidade)', 
    description: 'Documento de identidade oficial',
    icon: FileText,
    priority: 1
  },
  { 
    type: 'cpf' as MyDocumentType, 
    label: 'CPF', 
    description: 'Cadastro de Pessoa Física',
    icon: FileText,
    priority: 2
  },
  { 
    type: 'selfie' as MyDocumentType, 
    label: 'Selfie', 
    description: 'Foto para verificação facial',
    icon: Camera,
    priority: 3
  },
  { 
    type: 'address_proof' as MyDocumentType, 
    label: 'Comprovante de Endereço', 
    description: 'Conta de luz, água ou telefone',
    icon: FileText,
    priority: 4
  },
];

export function UnifiedDocumentsPage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const { uploadDocument, uploading } = useKYCUpload();
  const [selectedFiles, setSelectedFiles] = useState<{ [key in MyDocumentType]?: File }>({});
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Calculate progress
  const approvedDocuments = documents.filter(doc => doc.is_verified === true).length;
  const totalDocuments = documentTypes.length;
  const completionPercentage = (approvedDocuments / totalDocuments) * 100;

  // Fetch user documents
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
      console.error('Error fetching documents:', error);
      toast({
        title: "Erro ao carregar documentos",
        description: "Tente novamente mais tarde",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, [user]);

  const handleFileSelect = (type: MyDocumentType, file: File | null) => {
    if (file) {
      // Validate file type
      const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf'];
      if (!validTypes.includes(file.type)) {
        toast({
          title: "Tipo de arquivo inválido",
          description: "Por favor, selecione apenas imagens ou PDFs",
          variant: "destructive",
        });
        return;
      }

      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        toast({
          title: "Arquivo muito grande",
          description: "O arquivo deve ter no máximo 10MB",
          variant: "destructive",
        });
        return;
      }

      setSelectedFiles(prev => ({ ...prev, [type]: file }));
    }
  };

  const handleUpload = async (type: MyDocumentType) => {
    const file = selectedFiles[type];
    if (!file) {
      toast({
        title: "Nenhum arquivo selecionado",
        description: "Por favor, selecione um arquivo antes de enviar",
        variant: "destructive",
      });
      return;
    }

    try {
      const success = await uploadDocument(file, type);
      if (success) {
        // Clear selected file after successful upload
        setSelectedFiles(prev => {
          const newFiles = { ...prev };
          delete newFiles[type];
          return newFiles;
        });
        // Refresh documents list
        await fetchDocuments();
      }
    } catch (error) {
      console.error('Upload error:', error);
    }
  };

  const getDocumentStatus = (type: MyDocumentType) => {
    const doc = documents.find(d => d.document_type === type);
    if (!doc) return null;
    return doc;
  };

  const getStatusBadge = (isVerified: boolean | undefined, hasDoc: boolean) => {
    if (!hasDoc) {
      return (
        <Badge variant="outline" className="bg-gray-50 text-gray-600">
          <AlertCircle className="w-3 h-3 mr-1" />
          Pendente
        </Badge>
      );
    }
    
    if (isVerified === true) {
      return (
        <Badge className="bg-green-100 text-green-800">
          <CheckCircle className="w-3 h-3 mr-1" />
          Aprovado
        </Badge>
      );
    } else if (isVerified === false) {
      return (
        <Badge variant="destructive">
          <XCircle className="w-3 h-3 mr-1" />
          Rejeitado
        </Badge>
      );
    } else {
      return (
        <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
          <Clock className="w-3 h-3 mr-1" />
          Em análise
        </Badge>
      );
    }
  };

  const getStepIcon = (index: number, isCompleted: boolean, isActive: boolean) => {
    if (isCompleted) {
      return <CheckCircle className="h-6 w-6 text-green-600" />;
    } else if (isActive) {
      return <Zap className="h-6 w-6 text-primary" />;
    } else {
      return (
        <div className="h-6 w-6 rounded-full border-2 border-muted-foreground/30 flex items-center justify-center">
          <span className="text-sm text-muted-foreground">{index + 1}</span>
        </div>
      );
    }
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="p-6">
          <div className="text-center py-12">
            <p>Carregando documentos...</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="p-6 space-y-8">
        {/* Header with Progress */}
        <div className="relative overflow-hidden rounded-2xl">
          <div className="absolute inset-0 primary-gradient opacity-90" />
          <div className="relative p-8 text-white">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-3xl font-bold mb-2 flex items-center gap-3">
                  <Shield className="h-8 w-8" />
                  Verificação de Identidade
                </h1>
                <p className="text-white/80">
                  Complete sua verificação para usar todos os recursos da plataforma
                </p>
              </div>
              <div className="text-right">
                <div className="text-4xl font-bold">{Math.round(completionPercentage)}%</div>
                <div className="text-white/80">Concluído</div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex justify-between text-sm">
                <span>{approvedDocuments} de {totalDocuments} documentos aprovados</span>
                <span>{completionPercentage === 100 ? 'Verificação completa!' : 'Em progresso'}</span>
              </div>
              <Progress value={completionPercentage} className="h-3 bg-white/20" />
            </div>

            {completionPercentage === 100 && (
              <div className="mt-6 flex items-center gap-2 text-green-300">
                <Award className="h-5 w-5" />
                <span className="font-semibold">Parabéns! Sua conta está totalmente verificada</span>
              </div>
            )}
          </div>
        </div>

        {/* Step Progress */}
        <Card>
          <CardHeader>
            <CardTitle>Progresso da Verificação</CardTitle>
            <CardDescription>
              Acompanhe o status de cada documento necessário
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {documentTypes.map((docType, index) => {
                const doc = getDocumentStatus(docType.type);
                const hasDoc = !!doc;
                const isCompleted = doc?.is_verified === true;
                const isActive = !isCompleted && index === 0; // First incomplete step is active
                const IconComponent = docType.icon;

                return (
                  <div key={docType.type} className="flex items-center gap-4">
                    {getStepIcon(index, isCompleted, isActive)}
                    
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <IconComponent className="h-4 w-4" />
                        <h3 className="font-medium">{docType.label}</h3>
                        {getStatusBadge(doc?.is_verified, hasDoc)}
                      </div>
                      <p className="text-sm text-muted-foreground">{docType.description}</p>
                    </div>

                    {!isCompleted && (
                      <div className="text-sm text-muted-foreground">
                        {hasDoc ? 'Em análise' : 'Pendente'}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Instructions */}
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Camera className="w-5 h-5 text-blue-600" />
              <CardTitle className="text-blue-900">Instruções para envio</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="text-blue-800">
            <ul className="space-y-2 text-sm">
              <li>• Fotografe ou escaneie seus documentos com boa qualidade</li>
              <li>• Certifique-se de que todas as informações estão legíveis</li>
              <li>• Formatos aceitos: JPG, PNG, WEBP, PDF (máximo 10MB)</li>
              <li>• Os documentos passarão por análise automática</li>
              <li>• Você pode reenviar documentos rejeitados</li>
            </ul>
          </CardContent>
        </Card>

        {/* Document Upload Cards */}
        <div className="grid gap-6 md:grid-cols-2">
          {documentTypes.map(({ type, label, description, icon: IconComponent }) => {
            const doc = getDocumentStatus(type);
            const hasDoc = !!doc;
            const selectedFile = selectedFiles[type];
            const isCompleted = doc?.is_verified === true;
            
            return (
              <Card key={type} className={`relative transition-all ${isCompleted ? 'ring-2 ring-green-500' : ''}`}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${isCompleted ? 'bg-green-100 text-green-600' : 'bg-primary/10 text-primary'}`}>
                        <IconComponent className="h-5 w-5" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">{label}</CardTitle>
                        <CardDescription>{description}</CardDescription>
                      </div>
                    </div>
                    {getStatusBadge(doc?.is_verified, hasDoc)}
                  </div>
                </CardHeader>
                
                <CardContent className="space-y-4">
                  {!hasDoc || doc?.is_verified === false ? (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor={`file-${type}`}>Selecionar arquivo</Label>
                        <Input
                          id={`file-${type}`}
                          type="file"
                          accept="image/*,application/pdf"
                          onChange={(e) => handleFileSelect(type, e.target.files?.[0] || null)}
                          className="cursor-pointer"
                        />
                      </div>
                      
                      {selectedFile && (
                        <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                          <FileText className="w-4 h-4" />
                          <div className="flex-1">
                            <p className="text-sm font-medium">{selectedFile.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {(selectedFile.size / 1024 / 1024).toFixed(1)}MB
                            </p>
                          </div>
                        </div>
                      )}
                      
                      <Button 
                        onClick={() => handleUpload(type)}
                        disabled={!selectedFile || uploading}
                        className="w-full"
                        size="lg"
                      >
                        <Upload className="w-4 h-4 mr-2" />
                        {uploading ? 'Enviando...' : 'Enviar Documento'}
                      </Button>
                    </>
                  ) : (
                    <div className="text-center py-6">
                      {doc?.is_verified === true ? (
                        <div className="text-green-600">
                          <CheckCircle className="w-12 h-12 mx-auto mb-3" />
                          <p className="font-semibold text-lg">Documento aprovado!</p>
                          <p className="text-sm text-muted-foreground">
                            Enviado em {new Date(doc.created_at).toLocaleDateString('pt-BR')}
                          </p>
                        </div>
                      ) : (
                        <div className="text-yellow-600">
                          <Clock className="w-12 h-12 mx-auto mb-3" />
                          <p className="font-semibold text-lg">Em análise</p>
                          <p className="text-sm text-muted-foreground">
                            Enviado em {new Date(doc.created_at).toLocaleDateString('pt-BR')}
                          </p>
                        </div>
                      )}
                      
                      {doc?.file_url && (
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="mt-3"
                          onClick={() => window.open(doc.file_url, '_blank')}
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          Visualizar
                        </Button>
                      )}
                    </div>
                  )}
                  
                  {doc?.notes && (
                    <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <p className="font-medium text-yellow-800 text-sm mb-1">Observações do revisor:</p>
                      <p className="text-yellow-700 text-sm">{doc.notes}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Security Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5" />
              Segurança e Privacidade
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <h4 className="font-medium text-foreground mb-2">Como funciona</h4>
                <ul className="space-y-1">
                  <li>• Análise automatizada por IA</li>
                  <li>• Verificação em até 24 horas</li>
                  <li>• Reenvio para documentos rejeitados</li>
                  <li>• Notificação por email do resultado</li>
                </ul>
              </div>
              <div>
                <h4 className="font-medium text-foreground mb-2">Seus dados estão seguros</h4>
                <ul className="space-y-1">
                  <li>• Criptografia de ponta a ponta</li>
                  <li>• Armazenamento seguro na nuvem</li>
                  <li>• Conformidade com LGPD</li>
                  <li>• Acesso restrito apenas aos verificadores</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}