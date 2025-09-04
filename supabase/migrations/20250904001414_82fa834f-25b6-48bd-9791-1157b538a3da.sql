-- Fix remaining security issues for our custom functions
-- Note: spatial_ref_sys is a PostGIS system table that we cannot modify (normal for reference data)

-- Fix search_path for our custom functions
-- Fix calculate_distance_km function
CREATE OR REPLACE FUNCTION public.calculate_distance_km(lat1 numeric, lon1 numeric, lat2 numeric, lon2 numeric)
RETURNS numeric
LANGUAGE plpgsql
IMMUTABLE STRICT SECURITY DEFINER
SET search_path = public
AS $$
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
$$;

-- Fix generate_contract_on_proposal_acceptance trigger function
CREATE OR REPLACE FUNCTION public.generate_contract_on_proposal_acceptance()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  job_record RECORD;
  contract_terms TEXT;
BEGIN
  -- Só gerar contrato quando proposta for aceita
  IF NEW.status = 'accepted' AND OLD.status != 'accepted' THEN
    -- Buscar dados do job
    SELECT * INTO job_record 
    FROM public.jobs 
    WHERE id = NEW.job_id;
    
    -- Gerar termos padrão do contrato
    contract_terms := 'CONTRATO DE PRESTAÇÃO DE SERVIÇOS

1. OBJETO: ' || job_record.title || '

2. DESCRIÇÃO: ' || job_record.description || '

3. VALOR: R$ ' || NEW.price || '

4. PRAZO DE ENTREGA: ' || COALESCE(NEW.delivery_date::text, 'A combinar') || '

5. RESPONSABILIDADES:
   - O CONTRATANTE se compromete a fornecer todas as informações necessárias
   - O PRESTADOR se compromete a executar o serviço conforme especificado

6. PAGAMENTO: O pagamento será liberado mediante conclusão e aprovação do serviço

7. Este contrato é regido pelos Termos de Uso da plataforma Job Fast.';

    -- Criar contrato
    INSERT INTO public.contracts (
      job_id,
      client_id,
      provider_id, 
      proposal_id,
      agreed_price,
      agreed_deadline,
      terms_and_conditions,
      escrow_amount,
      status
    ) VALUES (
      NEW.job_id,
      job_record.client_id,
      NEW.provider_id,
      NEW.id,
      NEW.price,
      NEW.delivery_date,
      contract_terms,
      NEW.price,
      'pending'
    );
    
    -- Atualizar job para status in_proposal e adicionar provider
    UPDATE public.jobs 
    SET 
      provider_id = NEW.provider_id,
      status = 'in_proposal',
      final_price = NEW.price
    WHERE id = NEW.job_id;
  END IF;
  
  RETURN NEW;
END;
$$;