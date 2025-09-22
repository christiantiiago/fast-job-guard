-- Criar storage bucket para chat attachments
INSERT INTO storage.buckets (id, name, public) 
VALUES ('chat-attachments', 'chat-attachments', false);

-- Criar políticas de storage para chat attachments
CREATE POLICY "Users can upload their own chat attachments" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'chat-attachments' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Job parties can view chat attachments" 
ON storage.objects 
FOR SELECT 
USING (
  bucket_id = 'chat-attachments' 
  AND EXISTS (
    SELECT 1 FROM job_messages jm
    JOIN jobs j ON j.id = jm.job_id
    WHERE jm.attachment_url LIKE '%' || storage.objects.name || '%'
    AND (j.client_id = auth.uid() OR j.provider_id = auth.uid())
  )
);

-- Adicionar foreign key constraint entre job_messages.sender_id e profiles.user_id
ALTER TABLE job_messages 
ADD CONSTRAINT fk_job_messages_sender 
FOREIGN KEY (sender_id) REFERENCES profiles(user_id) ON DELETE CASCADE;

-- Criar índice para melhor performance
CREATE INDEX IF NOT EXISTS idx_job_messages_sender_profiles 
ON job_messages(sender_id);

-- Adicionar função para bloquear mensagens em jobs completados
CREATE OR REPLACE FUNCTION check_job_message_allowed()
RETURNS TRIGGER AS $$
BEGIN
  -- Verificar se o job está completo
  IF EXISTS (
    SELECT 1 FROM jobs 
    WHERE id = NEW.job_id 
    AND status = 'completed'
  ) THEN
    RAISE EXCEPTION 'Cannot send messages to completed jobs';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Criar trigger para bloquear mensagens em jobs completados
CREATE TRIGGER prevent_messages_completed_jobs
  BEFORE INSERT ON job_messages
  FOR EACH ROW
  EXECUTE FUNCTION check_job_message_allowed();