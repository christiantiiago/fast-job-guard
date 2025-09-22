-- Atualizar fee_rules com valores corretos para premium e não-premium
UPDATE public.fee_rules 
SET 
  provider_fee_premium = 5.0,
  provider_fee_standard = 7.5,
  client_fee_premium = 5.0,
  client_fee_standard = 7.5
WHERE is_active = true;

-- Adicionar nova coluna para status de aprovação de trabalho
ALTER TYPE job_status ADD VALUE IF NOT EXISTS 'waiting_approval';

-- Criar função para verificar status premium
CREATE OR REPLACE FUNCTION public.is_premium_user(target_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  RETURN EXISTS(
    SELECT 1 FROM subscriptions 
    WHERE user_id = target_user_id 
    AND status = 'active'
  );
END;
$$;

-- Função para notificar cliente sobre conclusão de trabalho
CREATE OR REPLACE FUNCTION public.notify_job_completion(job_uuid uuid, provider_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  job_record RECORD;
BEGIN
  -- Buscar dados do job
  SELECT * INTO job_record 
  FROM jobs 
  WHERE id = job_uuid;
  
  IF NOT FOUND THEN
    RETURN false;
  END IF;
  
  -- Criar notificação para o cliente
  INSERT INTO notifications (
    user_id,
    title,
    message,
    type,
    data
  ) VALUES (
    job_record.client_id,
    'Trabalho Concluído - Aprovação Necessária',
    'O prestador marcou o trabalho "' || job_record.title || '" como concluído. Você tem 5 dias para revisar e liberar o pagamento, ou ele será liberado automaticamente.',
    'job_completed',
    jsonb_build_object(
      'job_id', job_uuid,
      'job_title', job_record.title,
      'provider_id', provider_user_id
    )
  );
  
  RETURN true;
END;
$$;