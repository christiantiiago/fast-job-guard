import { useState, useEffect } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
  AlertCircle
} from 'lucide-react';

type MyDocumentType = DocumentType;

const documentTypes = [
  { type: 'rg' as MyDocumentType, label: 'RG (Identidade)', description: 'Documento de identidade' },
  { type: 'cpf' as MyDocumentType, label: 'CPF', description: 'Cadastro de Pessoa Física' },
  { type: 'selfie' as MyDocumentType, label: 'Selfie', description: 'Foto para verificação' },
  { type: 'address_proof' as MyDocumentType, label: 'Comprovante de Endereço', description: 'Conta de luz, água, etc.' },
];

export default function MyDocuments() {
  const { toast } = useToast();
  const { user } = useAuth();
  const { uploadDocument, uploading } = useKYCUpload();
  const [selectedFiles, setSelectedFiles] = useState<{ [key in MyDocumentType]?: File }>({});
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

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
      <div className="p-6 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-foreground">Meus Documentos</h1>
          <p className="text-muted-foreground">
            Envie seus documentos para verificação de identidade
          </p>
        </div>

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
            </ul>
          </CardContent>
        </Card>

        {/* Document Upload Cards */}
        <div className="grid gap-4 md:grid-cols-2">
          {documentTypes.map(({ type, label, description }) => {
            const doc = getDocumentStatus(type);
            const hasDoc = !!doc;
            const selectedFile = selectedFiles[type];
            
            return (
              <Card key={type} className="relative">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg">{label}</CardTitle>
                      <CardDescription>{description}</CardDescription>
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
                        <div className="flex items-center gap-2 p-2 bg-muted rounded">
                          <FileText className="w-4 h-4" />
                          <span className="text-sm">{selectedFile.name}</span>
                          <span className="text-xs text-muted-foreground">
                            ({(selectedFile.size / 1024 / 1024).toFixed(1)}MB)
                          </span>
                        </div>
                      )}
                      
                      <Button 
                        onClick={() => handleUpload(type)}
                        disabled={!selectedFile || uploading}
                        className="w-full"
                      >
                        <Upload className="w-4 h-4 mr-2" />
                        {uploading ? 'Enviando...' : 'Enviar Documento'}
                      </Button>
                    </>
                  ) : (
                    <div className="text-center py-4">
                      {doc?.is_verified === true ? (
                        <div className="text-green-600">
                          <CheckCircle className="w-8 h-8 mx-auto mb-2" />
                          <p className="font-medium">Documento aprovado</p>
                          <p className="text-sm text-muted-foreground">
                            Enviado em {new Date(doc.created_at).toLocaleDateString('pt-BR')}
                          </p>
                        </div>
                      ) : (
                        <div className="text-yellow-600">
                          <Clock className="w-8 h-8 mx-auto mb-2" />
                          <p className="font-medium">Em análise</p>
                          <p className="text-sm text-muted-foreground">
                            Enviado em {new Date(doc.created_at).toLocaleDateString('pt-BR')}
                          </p>
                        </div>
                      )}
                      
                      {doc?.file_url && (
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="mt-2"
                          onClick={() => window.open(doc.file_url, '_blank')}
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          Visualizar
                        </Button>
                      )}
                    </div>
                  )}
                  
                  {doc?.notes && (
                    <div className="p-3 bg-muted rounded text-sm">
                      <p className="font-medium mb-1">Observações:</p>
                      <p>{doc.notes}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Additional Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5" />
              Informações Importantes
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>• Os documentos são analisados automaticamente por IA</p>
            <p>• O processo de verificação pode levar até 24 horas</p>
            <p>• Documentos rejeitados podem ser reenviados</p>
            <p>• Seus dados são protegidos e criptografados</p>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}