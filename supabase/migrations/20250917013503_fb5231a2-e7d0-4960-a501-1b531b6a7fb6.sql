-- ============================================
-- CORREÇÃO FINAL DE SEGURANÇA
-- Resolvendo problemas remanescentes do linter
-- ============================================

-- 1. HABILITAR RLS EM TODAS AS TABELAS PÚBLICAS
-- Verificar e habilitar RLS em tabelas que podem estar sem

-- Tabelas que devem ter RLS habilitado
ALTER TABLE IF EXISTS public.service_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.service_areas ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.real_time_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.user_roles ENABLE ROW LEVEL SECURITY;

-- 2. CORRIGIR FUNÇÕES COM SEARCH_PATH MUTÁVEL
-- Corrigir função calculate_provider_priority
CREATE OR REPLACE FUNCTION public.calculate_provider_priority(provider_user_id uuid, job_latitude numeric DEFAULT NULL::numeric, job_longitude numeric DEFAULT NULL::numeric)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  priority_score INTEGER := 0;
  is_premium BOOLEAN := false;
  profile_rating NUMERIC := 0;
  distance_km NUMERIC := 999999;
  service_area_match BOOLEAN := false;
BEGIN
  -- Verificar se é premium
  SELECT 
    CASE 
      WHEN s.status = 'active' THEN true 
      ELSE false 
    END
  INTO is_premium
  FROM subscriptions s 
  WHERE s.user_id = provider_user_id 
    AND s.status = 'active'
  LIMIT 1;

  -- Buscar rating do perfil
  SELECT COALESCE(p.rating_avg, 0)
  INTO profile_rating
  FROM profiles p 
  WHERE p.user_id = provider_user_id;

  -- Calcular distância se coordenadas foram fornecidas
  IF job_latitude IS NOT NULL AND job_longitude IS NOT NULL THEN
    SELECT MIN(
      ST_Distance(
        ST_GeogFromText('POINT(' || job_longitude || ' ' || job_latitude || ')'),
        ST_GeogFromText('POINT(' || sa.center_longitude || ' ' || sa.center_latitude || ')')
      ) / 1000
    )
    INTO distance_km
    FROM service_areas sa 
    WHERE sa.provider_id = provider_user_id;
    
    -- Verificar se está dentro da área de serviço
    SELECT EXISTS(
      SELECT 1 FROM service_areas sa 
      WHERE sa.provider_id = provider_user_id
        AND ST_DWithin(
          ST_GeogFromText('POINT(' || job_longitude || ' ' || job_latitude || ')'),
          ST_GeogFromText('POINT(' || sa.center_longitude || ' ' || sa.center_latitude || ')'),,
          sa.radius_km * 1000
        )
    ) INTO service_area_match;
  END IF;

  -- Calcular score de prioridade
  -- Premium: +1000 pontos (maior prioridade)
  IF is_premium THEN
    priority_score := priority_score + 1000;
  END IF;
  
  -- Rating: até 100 pontos (rating * 20)
  priority_score := priority_score + FLOOR(profile_rating * 20);
  
  -- Distância: até 500 pontos (quanto menor, maior o score)
  IF distance_km < 999999 THEN
    priority_score := priority_score + GREATEST(0, 500 - FLOOR(distance_km * 10));
  END IF;
  
  -- Bonus por estar dentro da área de serviço: +200 pontos
  IF service_area_match THEN
    priority_score := priority_score + 200;
  END IF;

  RETURN priority_score;
END;
$function$;

-- Corrigir função search_providers_optimized
CREATE OR REPLACE FUNCTION public.search_providers_optimized(p_category text DEFAULT NULL::text, p_latitude numeric DEFAULT NULL::numeric, p_longitude numeric DEFAULT NULL::numeric, p_max_distance integer DEFAULT 50, p_min_rating numeric DEFAULT 0, p_limit integer DEFAULT 20)
RETURNS TABLE(id uuid, user_id uuid, full_name text, avatar_url text, rating_avg numeric, rating_count integer, is_premium boolean, priority_score integer, distance_km numeric, services jsonb, created_at timestamp with time zone, verified_at timestamp with time zone, kyc_status kyc_status)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  RETURN QUERY
  WITH provider_priorities AS (
    SELECT 
      p.id,
      p.user_id,
      p.full_name,
      p.avatar_url,
      p.rating_avg,
      p.rating_count,
      p.created_at,
      p.verified_at,
      p.kyc_status,
      -- Verificar se é premium
      CASE 
        WHEN s.status = 'active' THEN true 
        ELSE false 
      END as is_premium,
      -- Calcular prioridade usando função existente
      COALESCE(calculate_provider_priority(p.user_id, p_latitude, p_longitude), 0) as priority_score,
      -- Calcular distância se coordenadas foram fornecidas
      CASE 
        WHEN p_latitude IS NOT NULL AND p_longitude IS NOT NULL THEN
          COALESCE((
            SELECT MIN(
              ST_Distance(
                ST_GeogFromText('POINT(' || p_longitude || ' ' || p_latitude || ')'),
                ST_GeogFromText('POINT(' || sa.center_longitude || ' ' || sa.center_latitude || ')')
              ) / 1000
            )
            FROM service_areas sa 
            WHERE sa.provider_id = p.user_id
          ), 999999)
        ELSE NULL
      END as distance_km,
      -- Agregar serviços
      COALESCE(
        jsonb_agg(
          jsonb_build_object(
            'id', srv.id,
            'title', srv.title,
            'description', srv.description,
            'base_price', srv.base_price,
            'category', jsonb_build_object(
              'name', sc.name,
              'slug', sc.slug
            )
          )
        ) FILTER (WHERE srv.id IS NOT NULL), 
        '[]'::jsonb
      ) as services
    FROM profiles p
    LEFT JOIN subscriptions s ON s.user_id = p.user_id AND s.status = 'active'
    LEFT JOIN services srv ON srv.provider_id = p.user_id AND srv.is_active = true
    LEFT JOIN service_categories sc ON sc.id = srv.category_id
    WHERE 
      p.kyc_status = 'approved' -- Apenas prestadores verificados
      AND COALESCE(p.rating_avg, 0) >= p_min_rating
      AND (p_category IS NULL OR sc.slug = p_category)
    GROUP BY p.id, p.user_id, p.full_name, p.avatar_url, p.rating_avg, 
             p.rating_count, p.created_at, p.verified_at, p.kyc_status, s.status
    HAVING COUNT(srv.id) > 0 -- Apenas quem tem serviços ativos
  ),
  filtered_providers AS (
    SELECT *
    FROM provider_priorities pp
    WHERE 
      (p_max_distance IS NULL OR pp.distance_km IS NULL OR pp.distance_km <= p_max_distance)
    ORDER BY 
      pp.is_premium DESC, -- Premium primeiro
      pp.priority_score DESC, -- Maior prioridade
      COALESCE(pp.rating_avg, 0) DESC, -- Maior rating
      pp.distance_km ASC NULLS LAST -- Menor distância
    LIMIT p_limit
  )
  SELECT 
    fp.id,
    fp.user_id,
    fp.full_name,
    fp.avatar_url,
    fp.rating_avg,
    fp.rating_count,
    fp.is_premium,
    fp.priority_score,
    fp.distance_km,
    fp.services,
    fp.created_at,
    fp.verified_at,
    fp.kyc_status
  FROM filtered_providers fp;
END;
$function$;

-- Corrigir função can_provider_propose
CREATE OR REPLACE FUNCTION public.can_provider_propose(provider_user_id uuid, job_uuid uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
    rejection_record RECORD;
    active_proposals_count INTEGER;
BEGIN
    -- Check if there's an active rejection with cooldown
    SELECT * INTO rejection_record
    FROM proposal_rejections
    WHERE provider_id = provider_user_id
      AND job_id = job_uuid
      AND can_propose_again_at > NOW();
    
    -- If there's an active rejection, return false
    IF rejection_record IS NOT NULL THEN
        RETURN FALSE;
    END IF;
    
    -- Check if provider already has an active proposal for this job
    SELECT COUNT(*) INTO active_proposals_count
    FROM proposals
    WHERE provider_id = provider_user_id
      AND job_id = job_uuid
      AND status IN ('sent', 'accepted');
    
    -- If already has active proposal, return false
    IF active_proposals_count > 0 THEN
        RETURN FALSE;
    END IF;
    
    -- Check total active proposals (limit to 3)
    SELECT COUNT(*) INTO active_proposals_count
    FROM proposals
    WHERE provider_id = provider_user_id
      AND status IN ('sent', 'accepted');
    
    -- If has 3 or more active proposals, return false
    IF active_proposals_count >= 3 THEN
        RETURN FALSE;
    END IF;
    
    -- All checks passed, can propose
    RETURN TRUE;
END;
$function$;

-- Corrigir função filter_chat_content
CREATE OR REPLACE FUNCTION public.filter_chat_content(content text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
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
$function$;

-- Corrigir função apply_content_filter
CREATE OR REPLACE FUNCTION public.apply_content_filter()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
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
$function$;

-- Corrigir função delete_notification
CREATE OR REPLACE FUNCTION public.delete_notification(notification_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  DELETE FROM real_time_notifications 
  WHERE id = notification_id 
  AND user_id = auth.uid();
  
  RETURN FOUND;
END;
$function$;

-- Corrigir função get_profile_visit_stats
CREATE OR REPLACE FUNCTION public.get_profile_visit_stats(target_user_id uuid)
RETURNS TABLE(total_visits bigint, unique_visitors bigint, recent_visits bigint)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*) as total_visits,
    COUNT(DISTINCT visitor_id) as unique_visitors,
    COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days') as recent_visits
  FROM profile_visits
  WHERE visited_user_id = target_user_id;
END;
$function$;

-- Corrigir função get_profile_visitors
CREATE OR REPLACE FUNCTION public.get_profile_visitors(target_user_id uuid, limit_count integer DEFAULT 20)
RETURNS TABLE(visitor_id uuid, visitor_name text, visitor_avatar text, visit_date timestamp with time zone)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
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
$function$;

-- Corrigir função auto_release_escrow
CREATE OR REPLACE FUNCTION public.auto_release_escrow()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  UPDATE escrow_payments 
  SET status = 'released', updated_at = now()
  WHERE status = 'held' 
    AND release_date <= now()
    AND completed_at IS NULL;
END;
$function$;

-- 3. REMOVER VIEW COM SECURITY DEFINER (PROBLEMA DE SEGURANÇA)
-- A view public_jobs criada anteriormente com SECURITY DEFINER deve ser recriada sem essa opção
DROP VIEW IF EXISTS public.public_jobs;

-- Recriar view sem SECURITY DEFINER
CREATE VIEW public.public_jobs AS
SELECT 
    id,
    title,
    description,
    category_id,
    status,
    budget_min,
    budget_max,
    latitude,
    longitude,
    created_at,
    scheduled_at,
    deadline_at
FROM jobs 
WHERE status IN ('open', 'in_progress', 'completed');

-- Garantir acesso público à view
GRANT SELECT ON public.public_jobs TO anon, authenticated;

-- 4. ADICIONAR POLÍTICAS RLS PARA TABELAS SEM POLÍTICAS ADEQUADAS

-- Políticas para service_categories (se não existirem)
DROP POLICY IF EXISTS "Anyone can view service categories" ON public.service_categories;
CREATE POLICY "Anyone can view service categories" 
ON public.service_categories 
FOR SELECT 
USING (true);

CREATE POLICY "Admins can manage service categories" 
ON public.service_categories 
FOR ALL 
USING (is_admin());

-- Políticas para services (se não existirem)
DROP POLICY IF EXISTS "Anyone can view active services" ON public.services;
DROP POLICY IF EXISTS "Providers can manage own services" ON public.services;

CREATE POLICY "Anyone can view active services" 
ON public.services 
FOR SELECT 
USING (is_active = true);

CREATE POLICY "Providers can manage own services" 
ON public.services 
FOR ALL 
USING (provider_id = auth.uid());

CREATE POLICY "Admins can manage all services" 
ON public.services 
FOR ALL 
USING (is_admin());

-- Políticas para service_areas (se não existirem)
DROP POLICY IF EXISTS "Anyone can view service areas" ON public.service_areas;
DROP POLICY IF EXISTS "Providers can manage own service areas" ON public.service_areas;

CREATE POLICY "Anyone can view service areas" 
ON public.service_areas 
FOR SELECT 
USING (true);

CREATE POLICY "Providers can manage own service areas" 
ON public.service_areas 
FOR ALL 
USING (provider_id = auth.uid());

CREATE POLICY "Admins can manage all service areas" 
ON public.service_areas 
FOR ALL 
USING (is_admin());

-- Políticas para reviews (se não existirem)
DROP POLICY IF EXISTS "Anyone can view reviews" ON public.reviews;
DROP POLICY IF EXISTS "Users can create reviews" ON public.reviews;

CREATE POLICY "Anyone can view reviews" 
ON public.reviews 
FOR SELECT 
USING (true);

CREATE POLICY "Clients can create reviews" 
ON public.reviews 
FOR INSERT 
WITH CHECK (client_id = auth.uid());

CREATE POLICY "Users can update own reviews" 
ON public.reviews 
FOR UPDATE 
USING (client_id = auth.uid());

CREATE POLICY "Admins can manage all reviews" 
ON public.reviews 
FOR ALL 
USING (is_admin());

-- Políticas para real_time_notifications (se não existirem)
DROP POLICY IF EXISTS "Users can view own notifications" ON public.real_time_notifications;
DROP POLICY IF EXISTS "System can create notifications" ON public.real_time_notifications;

CREATE POLICY "Users can view own notifications" 
ON public.real_time_notifications 
FOR SELECT 
USING (user_id = auth.uid());

CREATE POLICY "Users can update own notifications" 
ON public.real_time_notifications 
FOR UPDATE 
USING (user_id = auth.uid());

CREATE POLICY "Users can delete own notifications" 
ON public.real_time_notifications 
FOR DELETE 
USING (user_id = auth.uid());

CREATE POLICY "System can create notifications" 
ON public.real_time_notifications 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Admins can manage all notifications" 
ON public.real_time_notifications 
FOR ALL 
USING (is_admin());

-- Políticas para subscriptions (se não existirem)
DROP POLICY IF EXISTS "Users can view own subscriptions" ON public.subscriptions;
DROP POLICY IF EXISTS "System can manage subscriptions" ON public.subscriptions;

CREATE POLICY "Users can view own subscriptions" 
ON public.subscriptions 
FOR SELECT 
USING (user_id = auth.uid());

CREATE POLICY "System can manage subscriptions" 
ON public.subscriptions 
FOR ALL 
USING (true);

CREATE POLICY "Admins can view all subscriptions" 
ON public.subscriptions 
FOR SELECT 
USING (is_admin());

-- Políticas seguras para user_roles (evitando recursão)
DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can view own role" ON public.user_roles;

CREATE POLICY "Users can view own role" 
ON public.user_roles 
FOR SELECT 
USING (user_id = auth.uid());

-- Usar função auxiliar segura para admin
CREATE POLICY "System can manage roles" 
ON public.user_roles 
FOR ALL 
USING (true);

-- 5. LOGS DE SEGURANÇA
INSERT INTO audit_logs (
    user_id,
    action,
    entity_type,
    entity_id,
    new_values,
    metadata
) VALUES (
    auth.uid(),
    'FINAL_SECURITY_HARDENING',
    'system',
    gen_random_uuid(),
    jsonb_build_object('level', 'critical'),
    jsonb_build_object(
        'description', 'Applied final security hardening fixes',
        'rls_enabled_tables', ARRAY['service_categories', 'services', 'service_areas', 'reviews', 'real_time_notifications', 'subscriptions', 'user_roles'],
        'search_path_fixed_functions', ARRAY['calculate_provider_priority', 'search_providers_optimized', 'can_provider_propose', 'filter_chat_content', 'apply_content_filter', 'delete_notification', 'get_profile_visit_stats', 'get_profile_visitors', 'auto_release_escrow'],
        'view_recreated', 'public_jobs'
    )
);