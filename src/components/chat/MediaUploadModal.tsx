import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Upload, Image, FileText, X } from 'lucide-react';
import { toast } from 'sonner';
import { useFileUpload } from '@/hooks/useFileUpload';

interface MediaUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpload: (url: string, type: string) => void;
  jobId?: string;
}

export function MediaUploadModal({ isOpen, onClose, onUpload, jobId }: MediaUploadModalProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const { uploadFile, uploading } = useFileUpload();

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error('Arquivo muito grande. Máximo 10MB.');
      return;
    }

    setSelectedFile(file);

    // Create preview for images
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setPreview(null);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || !jobId) return;
    
    try {
      const fileUrl = await uploadFile(selectedFile, jobId);
      onUpload(fileUrl, selectedFile.type);
      toast.success('Arquivo enviado com sucesso!');
      handleClose();
    } catch (error) {
      console.error('Error uploading file:', error);
      toast.error('Erro ao enviar arquivo');
    }
  };

  const handleClose = () => {
    setSelectedFile(null);
    setPreview(null);
    onClose();
  };

  const getFileIcon = (type: string) => {
    if (type.startsWith('image/')) {
      return <Image className="w-8 h-8 text-primary" />;
    }
    return <FileText className="w-8 h-8 text-primary" />;
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5" />
            Enviar Arquivo
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* File Input */}
          <div className="space-y-2">
            <Label htmlFor="file-upload">Selecionar arquivo</Label>
            <Input
              id="file-upload"
              type="file"
              accept="image/*,application/pdf,.doc,.docx,.txt"
              onChange={handleFileSelect}
              className="cursor-pointer"
            />
            <p className="text-xs text-muted-foreground">
              Máximo 10MB. Formatos: imagens, PDF, documentos de texto.
            </p>
          </div>

          {/* File Preview */}
          {selectedFile && (
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-3">
                  {getFileIcon(selectedFile.type)}
                  <div>
                    <p className="text-sm font-medium truncate max-w-[200px]">
                      {selectedFile.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    setSelectedFile(null);
                    setPreview(null);
                  }}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>

              {/* Image Preview */}
              {preview && (
                <div className="relative">
                  <img
                    src={preview}
                    alt="Preview"
                    className="w-full max-h-48 object-contain rounded-lg border"
                  />
                </div>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={handleClose}>
              Cancelar
            </Button>
            <Button 
              onClick={handleUpload} 
              disabled={!selectedFile || uploading}
            >
              {uploading ? 'Enviando...' : 'Enviar'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}