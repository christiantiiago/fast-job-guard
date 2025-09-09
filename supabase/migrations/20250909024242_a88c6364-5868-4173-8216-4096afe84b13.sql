-- Atualizar taxas da plataforma conforme nova estrutura
-- Taxa padrão: 7.5% cliente + 7.5% prestador = 15% total
-- Taxa premium: 2.5% cliente + 2.5% prestador = 5% total

UPDATE fee_rules 
SET 
  client_fee_standard = 7.50,
  provider_fee_standard = 7.50,
  client_fee_premium = 2.50,
  provider_fee_premium = 2.50,
  name = 'Nova Estrutura de Taxas'
WHERE is_active = true;

-- Criar nova regra de taxas se não existir nenhuma ativa
INSERT INTO fee_rules (name, client_fee_standard, provider_fee_standard, client_fee_premium, provider_fee_premium, is_active)
SELECT 'Taxas Atualizadas 2025', 7.50, 7.50, 2.50, 2.50, true
WHERE NOT EXISTS (SELECT 1 FROM fee_rules WHERE is_active = true);

-- Criar função para calcular prioridade premium nas buscas
CREATE OR REPLACE FUNCTION calculate_provider_priority(
  provider_user_id UUID,
  job_latitude NUMERIC DEFAULT NULL,
  job_longitude NUMERIC DEFAULT NULL
) 
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
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
$$;

-- Criar índices para performance nas buscas
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_status ON subscriptions(user_id, status) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_profiles_rating ON profiles(rating_avg DESC) WHERE rating_avg > 0;
CREATE INDEX IF NOT EXISTS idx_service_areas_provider ON service_areas(provider_id);
CREATE INDEX IF NOT EXISTS idx_jobs_location ON jobs(latitude, longitude) WHERE latitude IS NOT NULL AND longitude IS NOT NULL;