-- ============================================
-- CORREÇÃO DE ERRO DE SINTAXE E SEGURANÇA
-- Corrigindo problema na função calculate_provider_priority
-- ============================================

-- 1. CORRIGIR FUNÇÃO COM ERRO DE SINTAXE
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
    
    -- Verificar se está dentro da área de serviço (CORRIGIDO)
    SELECT EXISTS(
      SELECT 1 FROM service_areas sa 
      WHERE sa.provider_id = provider_user_id
        AND ST_DWithin(
          ST_GeogFromText('POINT(' || job_longitude || ' ' || job_latitude || ')'),
          ST_GeogFromText('POINT(' || sa.center_longitude || ' ' || sa.center_latitude || ')'),
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

-- 2. HABILITAR RLS EM TABELAS PRINCIPAIS
ALTER TABLE IF EXISTS public.service_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.service_areas ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.real_time_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.user_roles ENABLE ROW LEVEL SECURITY;

-- 3. POLÍTICAS BÁSICAS DE SEGURANÇA
-- Service Categories
DROP POLICY IF EXISTS "Anyone can view service categories" ON public.service_categories;
CREATE POLICY "Anyone can view service categories" ON public.service_categories FOR SELECT USING (true);
CREATE POLICY "Admins can manage service categories" ON public.service_categories FOR ALL USING (is_admin());

-- Services  
DROP POLICY IF EXISTS "Anyone can view active services" ON public.services;
CREATE POLICY "Anyone can view active services" ON public.services FOR SELECT USING (is_active = true);
CREATE POLICY "Providers can manage own services" ON public.services FOR ALL USING (provider_id = auth.uid());
CREATE POLICY "Admins can manage all services" ON public.services FOR ALL USING (is_admin());

-- Reviews
DROP POLICY IF EXISTS "Anyone can view reviews" ON public.reviews;
CREATE POLICY "Anyone can view reviews" ON public.reviews FOR SELECT USING (true);
CREATE POLICY "Clients can create reviews" ON public.reviews FOR INSERT WITH CHECK (client_id = auth.uid());
CREATE POLICY "Users can update own reviews" ON public.reviews FOR UPDATE USING (client_id = auth.uid());
CREATE POLICY "Admins can manage all reviews" ON public.reviews FOR ALL USING (is_admin());

-- Subscriptions
DROP POLICY IF EXISTS "Users can view own subscriptions" ON public.subscriptions;
CREATE POLICY "Users can view own subscriptions" ON public.subscriptions FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "System can manage subscriptions" ON public.subscriptions FOR ALL USING (true);
CREATE POLICY "Admins can view all subscriptions" ON public.subscriptions FOR SELECT USING (is_admin());

-- User Roles (sem recursão)
DROP POLICY IF EXISTS "Users can view own role" ON public.user_roles;
CREATE POLICY "Users can view own role" ON public.user_roles FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "System can manage roles" ON public.user_roles FOR ALL USING (true);

-- Real Time Notifications
DROP POLICY IF EXISTS "Users can view own notifications" ON public.real_time_notifications;
CREATE POLICY "Users can view own notifications" ON public.real_time_notifications FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can update own notifications" ON public.real_time_notifications FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Users can delete own notifications" ON public.real_time_notifications FOR DELETE USING (user_id = auth.uid());
CREATE POLICY "System can create notifications" ON public.real_time_notifications FOR INSERT WITH CHECK (true);
CREATE POLICY "Admins can manage all notifications" ON public.real_time_notifications FOR ALL USING (is_admin());

-- Service Areas
DROP POLICY IF EXISTS "Anyone can view service areas" ON public.service_areas;
CREATE POLICY "Anyone can view service areas" ON public.service_areas FOR SELECT USING (true);
CREATE POLICY "Providers can manage own service areas" ON public.service_areas FOR ALL USING (provider_id = auth.uid());
CREATE POLICY "Admins can manage all service areas" ON public.service_areas FOR ALL USING (is_admin());

-- 4. RECRIAR VIEW SEM SECURITY DEFINER
DROP VIEW IF EXISTS public.public_jobs;
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

GRANT SELECT ON public.public_jobs TO anon, authenticated;

-- 5. LOG DA CORREÇÃO
INSERT INTO audit_logs (
    user_id,
    action,
    entity_type,
    entity_id,
    new_values,
    metadata
) VALUES (
    auth.uid(),
    'SYNTAX_ERROR_FIX',
    'system',
    gen_random_uuid(),
    jsonb_build_object('level', 'critical'),
    jsonb_build_object(
        'description', 'Fixed syntax error in calculate_provider_priority function and enabled RLS on missing tables',
        'fixed_function', 'calculate_provider_priority',
        'rls_tables', ARRAY['service_categories', 'services', 'service_areas', 'reviews', 'real_time_notifications', 'subscriptions', 'user_roles']
    )
);