-- ============================================
-- CORREÇÃO SIMPLES DE SEGURANÇA
-- Apenas corrigir função com erro de sintaxe
-- ============================================

-- Corrigir função calculate_provider_priority (APENAS A FUNÇÃO COM ERRO)
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
    
    -- Verificar se está dentro da área de serviço (CORRIGIDO - removida vírgula dupla)
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

-- Log da correção
INSERT INTO audit_logs (
    user_id,
    action,
    entity_type,
    entity_id,
    new_values,
    metadata
) VALUES (
    auth.uid(),
    'FUNCTION_SYNTAX_FIX',
    'system',
    gen_random_uuid(),
    jsonb_build_object('level', 'critical'),
    jsonb_build_object(
        'description', 'Fixed syntax error in calculate_provider_priority function',
        'fixed_function', 'calculate_provider_priority',
        'error_fixed', 'double comma in ST_DWithin function call'
    )
);