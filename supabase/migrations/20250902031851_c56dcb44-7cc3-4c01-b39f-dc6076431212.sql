-- Fix remaining security warnings

-- Fix search path for functions
DROP FUNCTION IF EXISTS public.is_admin();
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql 
SECURITY DEFINER 
STABLE
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  );
END;
$$;

DROP FUNCTION IF EXISTS public.get_user_role();
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS user_role
LANGUAGE plpgsql 
SECURITY DEFINER 
STABLE
SET search_path = public
AS $$
BEGIN
  RETURN (
    SELECT role FROM public.user_roles 
    WHERE user_id = auth.uid() 
    LIMIT 1
  );
END;
$$;

DROP FUNCTION IF EXISTS public.is_provider();
CREATE OR REPLACE FUNCTION public.is_provider()
RETURNS BOOLEAN
LANGUAGE plpgsql 
SECURITY DEFINER 
STABLE
SET search_path = public
AS $$
BEGIN
  RETURN public.get_user_role() = 'provider';
END;
$$;

-- Add function to calculate fees dynamically
CREATE OR REPLACE FUNCTION public.calculate_job_fees(job_uuid UUID)
RETURNS TABLE (
  client_fee DECIMAL(10,2),
  provider_fee DECIMAL(10,2),
  total_fee DECIMAL(10,2)
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  client_has_subscription BOOLEAN := FALSE;
  provider_has_subscription BOOLEAN := FALSE;
  job_client_id UUID;
  job_provider_id UUID;
  fee_rule_row RECORD;
BEGIN
  -- Get job client and provider IDs
  SELECT client_id, provider_id INTO job_client_id, job_provider_id
  FROM public.jobs WHERE id = job_uuid;
  
  -- Check if client has active subscription
  IF job_client_id IS NOT NULL THEN
    SELECT EXISTS(
      SELECT 1 FROM public.subscriptions 
      WHERE user_id = job_client_id 
      AND status = 'active' 
      AND (current_period_end IS NULL OR current_period_end > NOW())
    ) INTO client_has_subscription;
  END IF;
  
  -- Check if provider has active subscription
  IF job_provider_id IS NOT NULL THEN
    SELECT EXISTS(
      SELECT 1 FROM public.subscriptions 
      WHERE user_id = job_provider_id 
      AND status = 'active' 
      AND (current_period_end IS NULL OR current_period_end > NOW())
    ) INTO provider_has_subscription;
  END IF;
  
  -- Get active fee rule
  SELECT * INTO fee_rule_row FROM public.fee_rules WHERE is_active = TRUE ORDER BY created_at DESC LIMIT 1;
  
  -- Return calculated fees
  RETURN QUERY SELECT
    CASE 
      WHEN client_has_subscription THEN fee_rule_row.client_fee_premium
      ELSE fee_rule_row.client_fee_standard
    END as client_fee,
    CASE 
      WHEN provider_has_subscription THEN fee_rule_row.provider_fee_premium
      ELSE fee_rule_row.provider_fee_standard
    END as provider_fee,
    CASE 
      WHEN client_has_subscription THEN fee_rule_row.client_fee_premium
      ELSE fee_rule_row.client_fee_standard
    END +
    CASE 
      WHEN provider_has_subscription THEN fee_rule_row.provider_fee_premium
      ELSE fee_rule_row.provider_fee_standard
    END as total_fee;
END;
$$;