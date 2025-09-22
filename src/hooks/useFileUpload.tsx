import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export const useFileUpload = () => {
  const { user } = useAuth();
  const [uploading, setUploading] = useState(false);

  const uploadFile = async (file: File, jobId: string): Promise<string> => {
    if (!user) throw new Error('User not authenticated');
    
    setUploading(true);
    try {
      const fileName = `${user.id}/${jobId}/${Date.now()}-${file.name}`;
      
      const { data, error } = await supabase.storage
        .from('chat-attachments')
        .upload(fileName, file);

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
        .from('chat-attachments')
        .getPublicUrl(data.path);

      return publicUrl;
    } finally {
      setUploading(false);
    }
  };

  return { uploadFile, uploading };
};