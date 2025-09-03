import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useToast } from './use-toast';

export type DocumentType = 'rg' | 'cpf' | 'selfie' | 'address_proof' | 'bank_info' | 'criminal_background';

export const useKYCUpload = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const uploadDocument = async (file: File, documentType: DocumentType) => {
    if (!user) {
      toast({
        title: "Erro de autenticação",
        description: "Você precisa estar logado para enviar documentos.",
        variant: "destructive",
      });
      return false;
    }

    try {
      setUploading(true);
      setProgress(0);

      // Validações básicas
      const maxSize = 10 * 1024 * 1024; // 10MB
      if (file.size > maxSize) {
        toast({
          title: "Arquivo muito grande",
          description: "O arquivo deve ter no máximo 10MB.",
          variant: "destructive",
        });
        return false;
      }

      const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
      if (!allowedTypes.includes(file.type)) {
        toast({
          title: "Tipo de arquivo não permitido",
          description: "Apenas imagens (JPG, PNG) e PDFs são aceitos.",
          variant: "destructive",
        });
        return false;
      }

      // Gerar nome único para o arquivo
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${documentType}/${Date.now()}.${fileExt}`;

      setProgress(25);

      // Upload para o Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('kyc-documents')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        throw uploadError;
      }

      setProgress(50);

      // Obter URL pública do arquivo
      const { data: { publicUrl } } = supabase.storage
        .from('kyc-documents')
        .getPublicUrl(fileName);

      setProgress(75);

      // Verificar se já existe um documento deste tipo
      const { data: existingDoc } = await supabase
        .from('kyc_documents')
        .select('id')
        .eq('user_id', user.id)
        .eq('document_type', documentType)
        .maybeSingle();

      if (existingDoc) {
        // Atualizar documento existente
        const { error: updateError } = await supabase
          .from('kyc_documents')
          .update({
            file_url: publicUrl,
            file_name: file.name,
            file_size: file.size,
            mime_type: file.type,
            is_verified: false,
            notes: null,
            verified_at: null,
            verified_by: null
          })
          .eq('id', existingDoc.id);

        if (updateError) {
          throw updateError;
        }
      } else {
        // Criar novo documento
        const { error: insertError } = await supabase
          .from('kyc_documents')
          .insert({
            user_id: user.id,
            document_type: documentType,
            file_url: publicUrl,
            file_name: file.name,
            file_size: file.size,
            mime_type: file.type,
            is_verified: false
          });

        if (insertError) {
          throw insertError;
        }
      }

      setProgress(100);

      toast({
        title: "Documento enviado com sucesso!",
        description: "Seu documento está em análise. Você será notificado quando for aprovado.",
      });

      return true;
    } catch (error: any) {
      console.error('Erro no upload:', error);
      toast({
        title: "Erro no envio",
        description: error.message || "Não foi possível enviar o documento. Tente novamente.",
        variant: "destructive",
      });
      return false;
    } finally {
      setUploading(false);
      setProgress(0);
    }
  };

  return {
    uploadDocument,
    uploading,
    progress,
  };
};