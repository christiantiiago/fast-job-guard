import { useState, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { useKYCUpload, DocumentType } from '@/hooks/useKYCUpload';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ArrowLeft, Upload, FileText, Camera, Home, Receipt, CheckCircle, AlertCircle } from 'lucide-react';

const DOCUMENT_CONFIG = {
  rg: {
    title: 'RG',
    description: 'Envie uma foto clara do seu RG',
    icon: FileText,
    instructions: [
      'Tire uma foto clara do RG',
      'Certifique-se de que todos os dados estão legíveis',
      'Inclua frente e verso se necessário',
      'Evite reflexos e sombras'
    ],
    acceptedTypes: ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'],
    maxSize: '10MB'
  },
  cpf: {
    title: 'CPF',
    description: 'Envie uma foto clara do seu CPF',
    icon: FileText,
    instructions: [
      'Tire uma foto clara do CPF',
      'Certifique-se de que todos os dados estão legíveis',
      'Pode ser o documento físico ou comprovante de inscrição',
      'Evite reflexos e sombras'
    ],
    acceptedTypes: ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'],
    maxSize: '10MB'
  },
  selfie: {
    title: 'Selfie com Documento',
    description: 'Foto sua segurando o documento para prova de vida',
    icon: Camera,
    instructions: [
      'Segure seu documento de identidade próximo ao rosto',
      'Certifique-se de que seu rosto está bem iluminado',
      'Mantenha o documento legível na foto',
      'Use um fundo neutro se possível'
    ],
    acceptedTypes: ['image/jpeg', 'image/jpg', 'image/png'],
    maxSize: '10MB'
  },
  address_proof: {
    title: 'Comprovante de Residência',
    description: 'Conta de luz, água, telefone ou gás em seu nome',
    icon: Home,
    instructions: [
      'O comprovante deve ser recente (até 3 meses)',
      'Deve estar em seu nome',
      'Todos os dados devem estar visíveis',
      'Aceito: conta de luz, água, telefone, gás ou extrato bancário'
    ],
    acceptedTypes: ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'],
    maxSize: '10MB'
  },
  bank_info: {
    title: 'Dados Bancários',
    description: 'Informações para pagamentos e reembolsos',
    icon: Receipt,
    instructions: [
      'Envie comprovante de conta bancária',
      'Pode ser extrato ou cartão do banco',
      'Dados PIX também são aceitos',
      'Certifique-se de que os dados estão legíveis'
    ],
    acceptedTypes: ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'],
    maxSize: '10MB'
  },
  criminal_background: {
    title: 'Certidão de Antecedentes Criminais',
    description: 'Certidão negativa emitida pela Polícia Civil',
    icon: Receipt,
    instructions: [
      'Certidão deve ser NEGATIVA',
      'Emitida pela Polícia Civil ou Polícia Federal',
      'Documento deve estar válido (até 90 dias)',
      'Preferencialmente em formato PDF'
    ],
    acceptedTypes: ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'],
    maxSize: '10MB'
  }
};

export default function KYCUpload() {
  const { type } = useParams<{ type: DocumentType }>();
  const navigate = useNavigate();
  const { uploadDocument, uploading, progress } = useKYCUpload();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);

  if (!type || !DOCUMENT_CONFIG[type]) {
    return (
      <AppLayout showKYCBanner={false}>
        <div className="container mx-auto px-4 py-8">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Tipo de documento inválido</AlertTitle>
            <AlertDescription>
              O tipo de documento especificado não é válido.
            </AlertDescription>
          </Alert>
        </div>
      </AppLayout>
    );
  }

  const config = DOCUMENT_CONFIG[type];
  const Icon = config.icon;

  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validações
    if (!config.acceptedTypes.includes(file.type)) {
      alert('Tipo de arquivo não suportado');
      return;
    }

    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      alert('Arquivo muito grande. Máximo 10MB.');
      return;
    }

    setSelectedFile(file);

    // Criar preview se for imagem
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setPreview(null);
    }
  }, [config.acceptedTypes]);

  const handleUpload = async () => {
    if (!selectedFile) return;

    const success = await uploadDocument(selectedFile, type);
    if (success) {
      setUploadSuccess(true);
      // Redirecionar após 2 segundos
      setTimeout(() => {
        navigate('/kyc/verify');
      }, 2000);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (uploadSuccess) {
    return (
      <AppLayout showKYCBanner={false}>
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-2xl mx-auto text-center space-y-4">
            <CheckCircle className="h-16 w-16 text-green-600 mx-auto" />
            <h1 className="text-2xl font-bold text-green-800">Documento Enviado!</h1>
            <p className="text-muted-foreground">
              Seu documento foi enviado com sucesso e está em análise.
              Você será redirecionado em instantes...
            </p>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout showKYCBanner={false}>
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" asChild>
              <Link to="/kyc/verify">
                <ArrowLeft className="h-4 w-4" />
                Voltar
              </Link>
            </Button>
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <Icon className="h-6 w-6" />
                {config.title}
              </h1>
              <p className="text-muted-foreground">{config.description}</p>
            </div>
          </div>

          {/* Instruções */}
          <Card>
            <CardHeader>
              <CardTitle>Instruções Importantes</CardTitle>
              <CardDescription>
                Siga estas instruções para garantir que seu documento será aprovado
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {config.instructions.map((instruction, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <span className="flex-shrink-0 w-5 h-5 bg-primary text-primary-foreground rounded-full text-xs flex items-center justify-center mt-0.5">
                      {index + 1}
                    </span>
                    <span className="text-sm">{instruction}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          {/* Upload Area */}
          <Card>
            <CardHeader>
              <CardTitle>Enviar Documento</CardTitle>
              <CardDescription>
                Formatos aceitos: {config.acceptedTypes.join(', ')} • Tamanho máximo: {config.maxSize}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* File Input */}
              <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center">
                <input
                  type="file"
                  accept={config.acceptedTypes.join(',')}
                  onChange={handleFileSelect}
                  className="hidden"
                  id="file-upload"
                  disabled={uploading}
                />
                <label
                  htmlFor="file-upload"
                  className="cursor-pointer flex flex-col items-center gap-2"
                >
                  <Upload className="h-8 w-8 text-muted-foreground" />
                  <span className="font-medium">
                    Clique para selecionar arquivo
                  </span>
                  <span className="text-sm text-muted-foreground">
                    ou arraste e solte aqui
                  </span>
                </label>
              </div>

              {/* File Preview */}
              {selectedFile && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <div>
                      <p className="font-medium">{selectedFile.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {formatFileSize(selectedFile.size)}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSelectedFile(null);
                        setPreview(null);
                      }}
                      disabled={uploading}
                    >
                      Remover
                    </Button>
                  </div>

                  {/* Image Preview */}
                  {preview && (
                    <div className="border rounded-lg p-4">
                      <img
                        src={preview}
                        alt="Preview"
                        className="max-w-full h-auto max-h-64 mx-auto rounded"
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Upload Progress */}
              {uploading && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Enviando...</span>
                    <span>{progress}%</span>
                  </div>
                  <Progress value={progress} />
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3">
                <Button
                  onClick={handleUpload}
                  disabled={!selectedFile || uploading}
                  className="flex-1"
                >
                  {uploading ? 'Enviando...' : 'Enviar Documento'}
                </Button>
                <Button variant="outline" asChild>
                  <Link to="/kyc/verify">Cancelar</Link>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Help */}
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Problemas com o upload?</AlertTitle>
            <AlertDescription>
              Certifique-se de que o arquivo não ultrapassa 10MB e está em um formato aceito.
              Se continuar com problemas, entre em contato com nosso suporte.
            </AlertDescription>
          </Alert>
        </div>
      </div>
    </AppLayout>
  );
}