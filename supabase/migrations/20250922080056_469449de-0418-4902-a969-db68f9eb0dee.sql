-- Adicionar campos necessários à tabela reviews existente (se não existirem)
DO $$ 
BEGIN
    -- Adicionar is_anonymous se não existir
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'reviews' AND column_name = 'is_anonymous') THEN
        ALTER TABLE public.reviews ADD COLUMN is_anonymous BOOLEAN NOT NULL DEFAULT false;
    END IF;
    
    -- Adicionar status se não existir
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'reviews' AND column_name = 'status') THEN
        ALTER TABLE public.reviews ADD COLUMN status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'published'));
    END IF;
    
    -- Adicionar published_at se não existir
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'reviews' AND column_name = 'published_at') THEN
        ALTER TABLE public.reviews ADD COLUMN published_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + INTERVAL '7 days');
    END IF;
END $$;

-- Função para auto-publicar reviews após 7 dias
CREATE OR REPLACE FUNCTION public.auto_publish_reviews()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.reviews 
  SET status = 'published', updated_at = now()
  WHERE status = 'pending' 
    AND published_at <= now();
END;
$$;

-- Função para verificar se usuário pode avaliar
CREATE OR REPLACE FUNCTION public.can_review_job(job_uuid UUID, target_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  job_record RECORD;
  existing_review_count INTEGER;
BEGIN
  -- Buscar dados do job
  SELECT * INTO job_record 
  FROM jobs 
  WHERE id = job_uuid AND status = 'completed';
  
  -- Se job não existe ou não está completo, não pode avaliar
  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;
  
  -- Verificar se usuário atual é parte do job
  IF auth.uid() != job_record.client_id AND auth.uid() != job_record.provider_id THEN
    RETURN FALSE;
  END IF;
  
  -- Verificar se target é a outra parte do job
  IF (auth.uid() = job_record.client_id AND target_user_id != job_record.provider_id) OR
     (auth.uid() = job_record.provider_id AND target_user_id != job_record.client_id) THEN
    RETURN FALSE;
  END IF;
  
  -- Verificar se já existe avaliação
  SELECT COUNT(*) INTO existing_review_count
  FROM reviews
  WHERE job_id = job_uuid 
    AND author_id = auth.uid() 
    AND target_id = target_user_id;
  
  RETURN existing_review_count = 0;
END;
$$;