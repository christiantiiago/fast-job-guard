-- Melhorar o trigger para análise automática de IA
-- Primeiro, criar uma função mais robusta para chamar a análise de IA
CREATE OR REPLACE FUNCTION trigger_ai_analysis()
RETURNS TRIGGER AS $$
DECLARE
  job_id bigint;
BEGIN
  -- Só executar para novos documentos inseridos
  IF TG_OP = 'INSERT' THEN
    -- Usar pg_cron para agendar a análise (mais confiável que HTTP direto)
    -- Como alternativa, vamos usar uma abordagem simples com notify
    
    -- Inserir um registro para processar depois
    INSERT INTO public.background_jobs (
      job_type,
      payload,
      status,
      created_at
    ) VALUES (
      'ai_document_analysis',
      json_build_object(
        'documentId', NEW.id,
        'documentType', NEW.document_type,
        'imageUrl', NEW.file_url
      ),
      'pending',
      now()
    );
    
    -- Notificar que há um novo job para processar
    PERFORM pg_notify('ai_analysis_job', NEW.id::text);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Criar tabela para jobs em background se não existir
CREATE TABLE IF NOT EXISTS public.background_jobs (
  id bigserial PRIMARY KEY,
  job_type text NOT NULL,
  payload jsonb NOT NULL,
  status text DEFAULT 'pending',
  created_at timestamp with time zone DEFAULT now(),
  processed_at timestamp with time zone,
  error_message text
);

-- Enable RLS na tabela background_jobs
ALTER TABLE public.background_jobs ENABLE ROW LEVEL SECURITY;

-- Política para admins gerenciarem jobs
CREATE POLICY "Admins can manage background jobs" ON public.background_jobs
  FOR ALL USING (is_admin());