-- Adicionar campo criminal_background ao enum document_type
ALTER TYPE document_type ADD VALUE IF NOT EXISTS 'criminal_background';

-- Adicionar campos necessários à tabela profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS stripe_account_id TEXT,
ADD COLUMN IF NOT EXISTS kyc_external_id TEXT,
ADD COLUMN IF NOT EXISTS criminal_background_expires_at TIMESTAMPTZ;

-- Criar função para verificar se KYC está completo
CREATE OR REPLACE FUNCTION public.is_kyc_complete(user_id_input UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_role_val user_role;
  required_docs document_type[];
  doc_count INTEGER;
BEGIN
  -- Buscar o role do usuário
  SELECT role INTO user_role_val 
  FROM user_roles 
  WHERE user_id = user_id_input;
  
  -- Definir documentos obrigatórios baseado no role
  IF user_role_val = 'provider' THEN
    required_docs := ARRAY['identity_document', 'selfie', 'address_proof', 'criminal_background']::document_type[];
  ELSE
    required_docs := ARRAY['identity_document', 'selfie', 'address_proof']::document_type[];
  END IF;
  
  -- Contar documentos aprovados
  SELECT COUNT(*) INTO doc_count
  FROM kyc_documents 
  WHERE user_id = user_id_input 
    AND is_verified = true 
    AND document_type = ANY(required_docs);
  
  -- Verificar se tem todos os documentos obrigatórios
  RETURN doc_count = array_length(required_docs, 1);
END;
$$;

-- Criar função para verificar se pode usar a plataforma
CREATE OR REPLACE FUNCTION public.can_use_platform(user_id_input UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER  
SET search_path = public
AS $$
DECLARE
  user_role_val user_role;
  kyc_complete BOOLEAN;
  criminal_bg_valid BOOLEAN := true;
BEGIN
  -- Buscar o role do usuário
  SELECT role INTO user_role_val 
  FROM user_roles 
  WHERE user_id = user_id_input;
  
  -- Verificar se KYC básico está completo
  SELECT public.is_kyc_complete(user_id_input) INTO kyc_complete;
  
  -- Para prestadores, verificar se certidão criminal está válida
  IF user_role_val = 'provider' THEN
    SELECT CASE 
      WHEN criminal_background_expires_at IS NULL THEN false
      WHEN criminal_background_expires_at < NOW() THEN false
      ELSE true
    END INTO criminal_bg_valid
    FROM profiles 
    WHERE user_id = user_id_input;
  END IF;
  
  RETURN kyc_complete AND criminal_bg_valid;
END;
$$;

-- Criar função de helper para admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  );
END;
$$;

-- Criar função para atualizar expiração da certidão criminal
CREATE OR REPLACE FUNCTION public.update_criminal_background_expiry()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Se documento de antecedentes criminais foi aprovado, definir expiração para 90 dias
  IF NEW.document_type = 'criminal_background' AND NEW.is_verified = true AND OLD.is_verified = false THEN
    UPDATE profiles 
    SET criminal_background_expires_at = NOW() + INTERVAL '90 days'
    WHERE user_id = NEW.user_id;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Criar trigger para atualizar expiração automaticamente
DROP TRIGGER IF EXISTS update_criminal_background_expiry_trigger ON kyc_documents;
CREATE TRIGGER update_criminal_background_expiry_trigger
  AFTER UPDATE ON kyc_documents
  FOR EACH ROW
  EXECUTE FUNCTION update_criminal_background_expiry();