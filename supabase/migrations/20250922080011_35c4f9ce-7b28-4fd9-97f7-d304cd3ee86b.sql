-- Criar tabela de avaliações
CREATE TABLE public.reviews (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  job_id UUID NOT NULL,
  author_id UUID NOT NULL,
  target_id UUID NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  is_anonymous BOOLEAN NOT NULL DEFAULT false,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'published')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  published_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + INTERVAL '7 days'),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

-- Criar políticas RLS
CREATE POLICY "Authors can create their own reviews" 
  ON public.reviews 
  FOR INSERT 
  WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Users can view published reviews about them or by them" 
  ON public.reviews 
  FOR SELECT 
  USING (
    (status = 'published' AND published_at <= now()) OR 
    (auth.uid() = author_id) OR 
    (auth.uid() = target_id)
  );

CREATE POLICY "Authors can update their own pending reviews" 
  ON public.reviews 
  FOR UPDATE 
  USING (auth.uid() = author_id AND status = 'pending');

CREATE POLICY "Admins can manage all reviews" 
  ON public.reviews 
  FOR ALL 
  USING (is_admin());

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

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION public.update_reviews_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_reviews_updated_at
  BEFORE UPDATE ON public.reviews
  FOR EACH ROW
  EXECUTE FUNCTION public.update_reviews_updated_at();

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