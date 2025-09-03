-- Fix search path security for all custom security definer functions
-- This prevents search path attacks by ensuring functions use the correct schema

-- Fix get_user_role function
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS user_role
LANGUAGE plpgsql
SECURITY DEFINER
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

-- Fix is_admin function
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  );
END;
$$;

-- Fix is_provider function
CREATE OR REPLACE FUNCTION public.is_provider()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN public.get_user_role() = 'provider';
END;
$$;

-- Fix handle_new_user trigger function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Inserir perfil do usuário
  INSERT INTO public.profiles (user_id, full_name, phone)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'phone'
  );
  
  -- Inserir role do usuário (default: client)
  INSERT INTO public.user_roles (user_id, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'role', 'client')::user_role
  );
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'Error in handle_new_user: %', SQLERRM;
    RETURN NEW; -- Continua o signup mesmo com erro
END;
$$;

-- Fix update_user_kyc_status trigger function
CREATE OR REPLACE FUNCTION public.update_user_kyc_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_kyc_status kyc_status;
  total_required INTEGER;
  verified_count INTEGER;
  pending_count INTEGER;
  rejected_count INTEGER;
  blocked_count INTEGER;
  user_role TEXT;
BEGIN
  -- Buscar role do usuário
  SELECT role INTO user_role 
  FROM public.user_roles 
  WHERE user_id = COALESCE(NEW.user_id, OLD.user_id);
  
  -- Contar documentos necessários baseado no role
  total_required := CASE 
    WHEN user_role = 'provider' THEN 4 -- rg, selfie, address_proof, criminal_background
    ELSE 3 -- rg, selfie, address_proof
  END;
  
  -- Contar documentos por status
  SELECT 
    COUNT(*) FILTER (WHERE is_verified = true) as verified,
    COUNT(*) FILTER (WHERE is_verified = false AND notes IS NULL) as pending,
    COUNT(*) FILTER (WHERE is_verified = false AND notes IS NOT NULL) as rejected,
    COUNT(*) FILTER (WHERE is_verified = false AND notes LIKE '%bloqueado%') as blocked
  INTO verified_count, pending_count, rejected_count, blocked_count
  FROM public.kyc_documents 
  WHERE user_id = COALESCE(NEW.user_id, OLD.user_id);
  
  -- Determinar novo status
  IF blocked_count > 0 THEN
    user_kyc_status := 'bloqueado';
  ELSIF rejected_count > 0 THEN
    user_kyc_status := 'rejected';
  ELSIF verified_count = total_required THEN
    user_kyc_status := 'approved';
  ELSIF pending_count > 0 OR verified_count > 0 THEN
    user_kyc_status := 'em_analise';
  ELSE
    user_kyc_status := 'incomplete';
  END IF;
  
  -- Atualizar status do usuário
  UPDATE public.profiles 
  SET kyc_status = user_kyc_status,
      updated_at = now()
  WHERE user_id = COALESCE(NEW.user_id, OLD.user_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$;