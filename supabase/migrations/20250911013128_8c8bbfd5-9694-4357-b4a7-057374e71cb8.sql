-- Corrigir o trigger de atualização do KYC que estava causando erro SQL
-- Recriar a função com cast adequado para o enum document_type

CREATE OR REPLACE FUNCTION public.update_kyc_verification_status()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
DECLARE
  user_role TEXT;
  required_docs TEXT[];
  approved_docs_count INTEGER;
  total_required INTEGER;
BEGIN
  -- Get user role from user_roles table
  SELECT role INTO user_role 
  FROM public.user_roles 
  WHERE user_id = NEW.user_id;
  
  -- Define required documents based on role
  IF user_role = 'provider' THEN
    required_docs := ARRAY['rg', 'selfie', 'address_proof', 'criminal_background'];
  ELSE
    required_docs := ARRAY['rg', 'selfie', 'address_proof'];
  END IF;
  
  -- Count approved documents for this user with proper cast
  SELECT COUNT(*) INTO approved_docs_count
  FROM public.kyc_documents
  WHERE user_id = NEW.user_id 
    AND is_verified = true 
    AND document_type::text = ANY(required_docs);
    
  total_required := array_length(required_docs, 1);
  
  -- If all required documents are approved, update profile
  IF approved_docs_count = total_required THEN
    UPDATE public.profiles 
    SET 
      kyc_status = 'approved',
      verified_at = COALESCE(verified_at, NOW())
    WHERE user_id = NEW.user_id;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Criar função simples para aprovação manual sem IA
CREATE OR REPLACE FUNCTION public.approve_kyc_document_manual(
  doc_id UUID,
  admin_id UUID,
  approval_notes TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  -- Atualizar o documento
  UPDATE public.kyc_documents
  SET 
    is_verified = true,
    notes = COALESCE(approval_notes, 'Aprovado pelo administrador'),
    verified_at = NOW(),
    verified_by = admin_id
  WHERE id = doc_id;
  
  -- Criar log de auditoria
  INSERT INTO public.kyc_admin_actions (
    document_id,
    admin_id, 
    action,
    previous_status,
    new_status,
    notes
  ) VALUES (
    doc_id,
    admin_id,
    'approved',
    'pending', 
    'approved',
    COALESCE(approval_notes, 'Documento aprovado manualmente')
  );
  
  RETURN TRUE;
END;
$function$;

-- Criar função para rejeitar documento
CREATE OR REPLACE FUNCTION public.reject_kyc_document_manual(
  doc_id UUID,
  admin_id UUID,
  rejection_reason TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  -- Atualizar o documento
  UPDATE public.kyc_documents
  SET 
    is_verified = false,
    notes = 'REJEITADO: ' || rejection_reason,
    verified_at = NOW(),
    verified_by = admin_id
  WHERE id = doc_id;
  
  -- Criar log de auditoria
  INSERT INTO public.kyc_admin_actions (
    document_id,
    admin_id,
    action,
    previous_status,
    new_status,
    notes
  ) VALUES (
    doc_id,
    admin_id,
    'rejected',
    'pending',
    'rejected', 
    rejection_reason
  );
  
  RETURN TRUE;
END;
$function$;