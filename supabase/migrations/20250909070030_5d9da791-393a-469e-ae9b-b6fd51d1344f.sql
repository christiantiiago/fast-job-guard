-- Criar tabela para rastrear visitas ao perfil
CREATE TABLE public.profile_visits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  visitor_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  visited_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(visitor_id, visited_user_id, DATE(created_at))
);

-- Enable RLS
ALTER TABLE public.profile_visits ENABLE ROW LEVEL SECURITY;

-- RLS policies para profile_visits
CREATE POLICY "Users can view visits to their own profile"
ON public.profile_visits
FOR SELECT
USING (visited_user_id = auth.uid());

CREATE POLICY "Anyone can record profile visits"
ON public.profile_visits
FOR INSERT
WITH CHECK (true);

-- Função para deletar notificações
CREATE OR REPLACE FUNCTION delete_notification(notification_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM real_time_notifications 
  WHERE id = notification_id 
  AND user_id = auth.uid();
  
  RETURN FOUND;
END;
$$;

-- Função para buscar estatísticas de visitas ao perfil
CREATE OR REPLACE FUNCTION get_profile_visit_stats(target_user_id UUID)
RETURNS TABLE(
  total_visits BIGINT,
  unique_visitors BIGINT,
  recent_visits BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*) as total_visits,
    COUNT(DISTINCT visitor_id) as unique_visitors,
    COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days') as recent_visits
  FROM profile_visits
  WHERE visited_user_id = target_user_id;
END;
$$;

-- Função para buscar visitantes do perfil (apenas para premium)
CREATE OR REPLACE FUNCTION get_profile_visitors(target_user_id UUID, limit_count INTEGER DEFAULT 20)
RETURNS TABLE(
  visitor_id UUID,
  visitor_name TEXT,
  visitor_avatar TEXT,
  visit_date TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_premium BOOLEAN;
BEGIN
  -- Verificar se o usuário é premium
  SELECT EXISTS(
    SELECT 1 FROM subscriptions 
    WHERE user_id = auth.uid() 
    AND status = 'active'
  ) INTO is_premium;
  
  -- Só retornar dados se for premium e for o próprio perfil
  IF is_premium AND target_user_id = auth.uid() THEN
    RETURN QUERY
    SELECT 
      pv.visitor_id,
      p.full_name as visitor_name,
      p.avatar_url as visitor_avatar,
      pv.created_at as visit_date
    FROM profile_visits pv
    LEFT JOIN profiles p ON p.user_id = pv.visitor_id
    WHERE pv.visited_user_id = target_user_id
    AND pv.visitor_id IS NOT NULL
    ORDER BY pv.created_at DESC
    LIMIT limit_count;
  END IF;
END;
$$;

-- Criar índices para performance
CREATE INDEX idx_profile_visits_visited_user ON profile_visits(visited_user_id);
CREATE INDEX idx_profile_visits_visitor ON profile_visits(visitor_id);
CREATE INDEX idx_profile_visits_date ON profile_visits(created_at);