-- Verificar e habilitar RLS nas tabelas principais
-- Habilitar RLS na tabela jobs se não estiver habilitado
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;

-- Verificar se há tabelas sem RLS
-- Recriar algumas policies que podem estar faltando

-- Policy para permitir que clients vejam jobs que criaram
DROP POLICY IF EXISTS "Clients can view own jobs" ON public.jobs;
CREATE POLICY "Clients can view own jobs" 
ON public.jobs 
FOR SELECT 
USING (client_id = auth.uid());

-- Policy para permitir que providers vejam jobs abertos
DROP POLICY IF EXISTS "Providers can view open jobs" ON public.jobs;
CREATE POLICY "Providers can view open jobs" 
ON public.jobs 
FOR SELECT 
USING (status = 'open'::job_status AND is_provider());

-- Policy para permitir que providers vejam jobs atribuídos a eles
DROP POLICY IF EXISTS "Providers can view assigned jobs" ON public.jobs;
CREATE POLICY "Providers can view assigned jobs" 
ON public.jobs 
FOR SELECT 
USING (provider_id = auth.uid());

-- Função para calcular distância entre coordenadas (Haversine formula)
CREATE OR REPLACE FUNCTION calculate_distance_km(
  lat1 NUMERIC, lon1 NUMERIC, lat2 NUMERIC, lon2 NUMERIC
) RETURNS NUMERIC AS $$
DECLARE
  earth_radius NUMERIC := 6371; -- Raio da Terra em km
  dlat NUMERIC;
  dlon NUMERIC;
  a NUMERIC;
  c NUMERIC;
BEGIN
  -- Converter graus para radianos
  dlat := radians(lat2 - lat1);
  dlon := radians(lon2 - lon1);
  
  -- Fórmula de Haversine
  a := sin(dlat/2)^2 + cos(radians(lat1)) * cos(radians(lat2)) * sin(dlon/2)^2;
  c := 2 * atan2(sqrt(a), sqrt(1-a));
  
  RETURN earth_radius * c;
END;
$$ LANGUAGE plpgsql IMMUTABLE STRICT SECURITY DEFINER;