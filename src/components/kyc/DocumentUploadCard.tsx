import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useKYCUpload, DocumentType } from '@/hooks/useKYCUpload';
import { FileText, Camera, Upload, Check, X, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface DocumentUploadCardProps {
  documentType: DocumentType;
  title: string;
  description: string;
  isRequired?: boolean;
  maxSizeMB?: number;
}

const getDocumentIcon = (type: DocumentType) => {
  switch (type) {
    case 'selfie':
      return Camera;
    case 'rg':
    case 'cpf':
    case 'address_proof':
    case 'criminal_background':
    case 'bank_info':
      return FileText;
    default:
      return Upload;
  }
};

const ACCEPTED_FORMATS = {
  images: ['.jpg', '.jpeg', '.png', '.webp', '.heic', '.heif'],
  documents: ['.pdf']
};

export const DocumentUploadCard = ({
  documentType,
  title,
  description,
  isRequired = false,
  maxSizeMB = 10
}: DocumentUploadCardProps) => {
  const { uploadDocument, uploading, progress } = useKYCUpload();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  const Icon = getDocumentIcon(documentType);

  const handleFileSelect = (file: File) => {
    // Validar tipo de arquivo
    const isImage = file.type.startsWith('image/');
    const isPDF = file.type === 'application/pdf';
    
    if (!isImage && !isPDF) {
      return;
    }

    // Validar tamanho
    if (file.size > maxSizeMB * 1024 * 1024) {
      return;
    }

    setSelectedFile(file);
    setUploadSuccess(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    const success = await uploadDocument(selectedFile, documentType);
    if (success) {
      setUploadSuccess(true);
      setSelectedFile(null);
    }
  };

  const removeFile = () => {
    setSelectedFile(null);
    setUploadSuccess(false);
  };

  const openFileDialog = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = [...ACCEPTED_FORMATS.images, ...ACCEPTED_FORMATS.documents].join(',');
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        handleFileSelect(file);
      }
    };
    input.click();
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <Card className={`transition-all duration-200 ${uploadSuccess ? 'border-green-500 bg-green-50/50' : ''}`}>
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-base">
          <Icon className="h-5 w-5" />
          {title}
          {isRequired && <span className="text-red-500">*</span>}
        </CardTitle>
        <p className="text-sm text-muted-foreground">{description}</p>
      </CardHeader>

      <CardContent className="space-y-4">
        {uploadSuccess ? (
          <Alert className="border-green-500 bg-green-50">
            <Check className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-700">
              Documento enviado com sucesso! Aguardando análise.
            </AlertDescription>
          </Alert>
        ) : (
          <>
            {!selectedFile ? (
              <div
                className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors cursor-pointer
                  ${dragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-primary/50'}`}
                onDrop={handleDrop}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragActive(true);
                }}
                onDragLeave={() => setDragActive(false)}
                onClick={openFileDialog}
              >
                <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                <p className="font-medium mb-1">
                  Clique para escolher ou arraste o arquivo aqui
                </p>
                <p className="text-sm text-muted-foreground mb-2">
                  Aceito: Fotos (JPG, PNG, WEBP, HEIC) ou PDF
                </p>
                <p className="text-xs text-muted-foreground">
                  Tamanho máximo: {maxSizeMB}MB
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <Icon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{selectedFile.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatFileSize(selectedFile.size)}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={removeFile}
                    disabled={uploading}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>

                {uploading && (
                  <div className="space-y-2">
                    <Progress value={progress} className="h-2" />
                    <p className="text-xs text-center text-muted-foreground">
                      Enviando... {progress}%
                    </p>
                  </div>
                )}

                <div className="flex gap-2">
                  <Button
                    onClick={handleUpload}
                    disabled={uploading}
                    className="flex-1"
                  >
                    {uploading ? 'Enviando...' : 'Enviar Documento'}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={removeFile}
                    disabled={uploading}
                  >
                    Cancelar
                  </Button>
                </div>
              </div>
            )}
          </>
        )}

        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="text-xs">
            {documentType === 'selfie' 
              ? 'Tire uma selfie clara com boa iluminação, mostrando seu rosto completamente.'
              : 'Certifique-se de que todas as informações estão legíveis e visíveis.'
            }
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
};