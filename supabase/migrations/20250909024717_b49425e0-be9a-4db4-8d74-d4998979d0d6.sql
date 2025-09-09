-- Criar função otimizada de busca de prestadores
CREATE OR REPLACE FUNCTION search_providers_optimized(
  p_category TEXT DEFAULT NULL,
  p_latitude NUMERIC DEFAULT NULL,
  p_longitude NUMERIC DEFAULT NULL,
  p_max_distance INTEGER DEFAULT 50,
  p_min_rating NUMERIC DEFAULT 0,
  p_limit INTEGER DEFAULT 20
)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  full_name TEXT,
  avatar_url TEXT,
  rating_avg NUMERIC,
  rating_count INTEGER,
  is_premium BOOLEAN,
  priority_score INTEGER,
  distance_km NUMERIC,
  services JSONB,
  created_at TIMESTAMPTZ,
  verified_at TIMESTAMPTZ,
  kyc_status kyc_status
)
LANGUAGE plpgsql
SET search_path = public
AS $$
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
$$;