-- Criar tabela para controlar cooldown de propostas rejeitadas
CREATE TABLE public.proposal_rejections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL,
  provider_id UUID NOT NULL,
  rejected_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  can_propose_again_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + INTERVAL '2 hours'),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(job_id, provider_id)
);

-- Enable RLS
ALTER TABLE public.proposal_rejections ENABLE ROW LEVEL SECURITY;

-- Policies for proposal rejections
CREATE POLICY "Providers can view their own rejections" 
ON public.proposal_rejections 
FOR SELECT 
USING (provider_id = auth.uid());

CREATE POLICY "System can manage rejections" 
ON public.proposal_rejections 
FOR ALL 
USING (true);

-- Criar tabela para notificações em tempo real mais avançadas
CREATE TABLE public.real_time_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  data JSONB DEFAULT '{}',
  is_read BOOLEAN DEFAULT false,
  is_system BOOLEAN DEFAULT false,
  priority INTEGER DEFAULT 1, -- 1=low, 2=medium, 3=high, 4=urgent
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.real_time_notifications ENABLE ROW LEVEL SECURITY;

-- Policies for real time notifications
CREATE POLICY "Users can view their own notifications" 
ON public.real_time_notifications 
FOR SELECT 
USING (user_id = auth.uid());

CREATE POLICY "Users can update their own notifications" 
ON public.real_time_notifications 
FOR UPDATE 
USING (user_id = auth.uid());

CREATE POLICY "System can create notifications" 
ON public.real_time_notifications 
FOR INSERT 
WITH CHECK (true);

-- Adicionar campos para rastreamento de ações nas propostas
ALTER TABLE public.proposals ADD COLUMN IF NOT EXISTS proposal_type TEXT DEFAULT 'custom'; -- 'direct_accept' or 'custom'
ALTER TABLE public.proposals ADD COLUMN IF NOT EXISTS auto_accepted BOOLEAN DEFAULT false;

-- Criar tabela para filtro de conteúdo do chat
CREATE TABLE public.blocked_content_patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pattern TEXT NOT NULL,
  pattern_type TEXT NOT NULL, -- 'phone', 'email', 'social', 'address', 'personal_data'
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.blocked_content_patterns ENABLE ROW LEVEL SECURITY;

-- Policy for blocked content patterns
CREATE POLICY "Admins can manage blocked patterns" 
ON public.blocked_content_patterns 
FOR ALL 
USING (is_admin());

CREATE POLICY "Anyone can view active patterns" 
ON public.blocked_content_patterns 
FOR SELECT 
USING (is_active = true);

-- Inserir padrões básicos de conteúdo bloqueado
INSERT INTO public.blocked_content_patterns (pattern, pattern_type, description) VALUES
('(\d{2})\s?\d{4,5}-?\d{4}', 'phone', 'Números de telefone brasileiros'),
('(\d{2})\s?\d{8,9}', 'phone', 'Números de telefone simples'),
('\b\d{11}\b', 'phone', 'Telefone celular brasileiro'),
('\b\d{10}\b', 'phone', 'Telefone fixo brasileiro'),
('[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}', 'email', 'Endereços de email'),
('\b(?:whatsapp|whats|zap|telegram|instagram|facebook|fb|insta)\b', 'social', 'Redes sociais e apps de mensagem'),
('\b(?:fone|telefone|celular|número|numero|contato|tel)\b', 'personal_data', 'Palavras relacionadas a contato'),
('\b(?:cpf|rg|documento|identidade)\b', 'personal_data', 'Documentos pessoais');

-- Função para verificar se um prestador pode fazer proposta
CREATE OR REPLACE FUNCTION can_provider_propose(provider_user_id UUID, job_uuid UUID)
RETURNS BOOLEAN AS $$
DECLARE
  rejection_record RECORD;
BEGIN
  -- Verificar se há rejeição recente
  SELECT * INTO rejection_record
  FROM proposal_rejections
  WHERE job_id = job_uuid 
    AND provider_id = provider_user_id
    AND can_propose_again_at > now();
    
  -- Se não há rejeição recente, pode propor
  RETURN rejection_record IS NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para filtrar conteúdo do chat
CREATE OR REPLACE FUNCTION filter_chat_content(content TEXT)
RETURNS JSONB AS $$
DECLARE
  pattern_record RECORD;
  filtered_content TEXT;
  violations JSONB := '[]';
  violation_count INTEGER := 0;
BEGIN
  filtered_content := content;
  
  -- Verificar cada padrão ativo
  FOR pattern_record IN 
    SELECT pattern, pattern_type, description 
    FROM blocked_content_patterns 
    WHERE is_active = true
  LOOP
    -- Se o conteúdo corresponde ao padrão
    IF filtered_content ~* pattern_record.pattern THEN
      violation_count := violation_count + 1;
      violations := violations || jsonb_build_object(
        'type', pattern_record.pattern_type,
        'description', pattern_record.description
      );
      -- Substituir o conteúdo por asteriscos
      filtered_content := regexp_replace(filtered_content, pattern_record.pattern, '[CONTEÚDO BLOQUEADO]', 'gi');
    END IF;
  END LOOP;
  
  RETURN jsonb_build_object(
    'original_content', content,
    'filtered_content', filtered_content,
    'violations', violations,
    'violation_count', violation_count,
    'is_blocked', violation_count > 0
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para aplicar filtro de conteúdo automaticamente nas mensagens
CREATE OR REPLACE FUNCTION apply_content_filter()
RETURNS TRIGGER AS $$
DECLARE
  filter_result JSONB;
BEGIN
  -- Aplicar filtro no conteúdo
  filter_result := filter_chat_content(NEW.content);
  
  -- Se há violações, substituir o conteúdo
  IF (filter_result->>'violation_count')::INTEGER > 0 THEN
    NEW.content := filter_result->>'filtered_content';
    
    -- Criar notificação para admins sobre violação
    INSERT INTO admin_alerts (
      type, 
      severity, 
      title, 
      message, 
      entity_type, 
      entity_id, 
      metadata
    ) VALUES (
      'content_violation',
      'medium',
      'Conteúdo bloqueado no chat',
      'Usuário tentou enviar conteúdo bloqueado no chat do trabalho',
      'job_message',
      NEW.id,
      jsonb_build_object(
        'user_id', NEW.sender_id,
        'job_id', NEW.job_id,
        'violations', filter_result->'violations',
        'original_content', filter_result->>'original_content'
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Aplicar trigger na tabela de mensagens
DROP TRIGGER IF EXISTS content_filter_trigger ON job_messages;
CREATE TRIGGER content_filter_trigger
  BEFORE INSERT OR UPDATE ON job_messages
  FOR EACH ROW EXECUTE FUNCTION apply_content_filter();

-- Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_proposal_rejections_provider_job ON proposal_rejections(provider_id, job_id);
CREATE INDEX IF NOT EXISTS idx_proposal_rejections_can_propose ON proposal_rejections(can_propose_again_at);
CREATE INDEX IF NOT EXISTS idx_real_time_notifications_user_read ON real_time_notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_real_time_notifications_priority ON real_time_notifications(priority DESC, created_at DESC);