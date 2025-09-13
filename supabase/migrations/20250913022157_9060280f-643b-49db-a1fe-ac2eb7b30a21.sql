-- Verificar e corrigir triggers e funções do KYC
-- Primeiro, garantir que o trigger existe e está configurado corretamente
DROP TRIGGER IF EXISTS kyc_status_update_trigger ON kyc_documents;

-- Recriar a função com melhor lógica
CREATE OR REPLACE FUNCTION update_profile_kyc_status()
RETURNS TRIGGER AS $$
DECLARE
    profile_record RECORD;
    required_docs TEXT[];
    completed_docs TEXT[];
    user_role TEXT;
    all_docs_verified BOOLEAN := false;
BEGIN
    -- Buscar informações do perfil
    SELECT * INTO profile_record 
    FROM profiles 
    WHERE user_id = NEW.user_id;
    
    -- Se perfil não existe, sair
    IF NOT FOUND THEN
        RETURN NEW;
    END IF;
    
    -- Determinar role do usuário
    SELECT role INTO user_role 
    FROM user_roles 
    WHERE user_id = NEW.user_id;
    
    -- Definir documentos necessários baseado no role
    IF user_role = 'provider' THEN
        required_docs := ARRAY['rg', 'selfie', 'address_proof', 'criminal_background'];
    ELSE
        required_docs := ARRAY['rg', 'selfie', 'address_proof'];
    END IF;
    
    -- Verificar quais documentos estão aprovados
    SELECT ARRAY_AGG(DISTINCT document_type::TEXT) INTO completed_docs
    FROM kyc_documents 
    WHERE user_id = NEW.user_id 
    AND is_verified = true;
    
    -- Verificar se todos os documentos necessários estão aprovados
    all_docs_verified := (required_docs <@ COALESCE(completed_docs, ARRAY[]::TEXT[]));
    
    -- Atualizar status do perfil
    IF all_docs_verified THEN
        UPDATE profiles 
        SET 
            kyc_status = 'approved',
            verified_at = CASE 
                WHEN verified_at IS NULL THEN NOW() 
                ELSE verified_at 
            END,
            updated_at = NOW()
        WHERE user_id = NEW.user_id;
        
        -- Log da aprovação automática
        INSERT INTO audit_logs (
            user_id,
            action,
            entity_type,
            entity_id,
            new_values,
            metadata
        ) VALUES (
            NEW.user_id,
            'AUTO_KYC_APPROVED',
            'profile',
            profile_record.id,
            jsonb_build_object('kyc_status', 'approved'),
            jsonb_build_object(
                'completed_docs', completed_docs,
                'required_docs', required_docs,
                'trigger_document', NEW.document_type
            )
        );
    ELSE
        -- Se nem todos os documentos estão aprovados, manter como em análise
        UPDATE profiles 
        SET 
            kyc_status = CASE 
                WHEN kyc_status = 'incomplete' THEN 'em_analise'
                WHEN kyc_status = 'approved' THEN 'em_analise' -- Reverter se perder aprovação
                ELSE kyc_status
            END,
            updated_at = NOW()
        WHERE user_id = NEW.user_id
        AND kyc_status NOT IN ('rejected', 'bloqueado', 'suspeito');
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Recriar o trigger
CREATE TRIGGER kyc_status_update_trigger
    AFTER UPDATE ON kyc_documents
    FOR EACH ROW
    WHEN (OLD.is_verified IS DISTINCT FROM NEW.is_verified)
    EXECUTE FUNCTION update_profile_kyc_status();

-- Função para forçar atualização manual do status KYC (para correção)
CREATE OR REPLACE FUNCTION force_kyc_status_update(target_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    profile_record RECORD;
    required_docs TEXT[];
    completed_docs TEXT[];
    user_role TEXT;
    all_docs_verified BOOLEAN := false;
BEGIN
    -- Buscar informações do perfil
    SELECT * INTO profile_record 
    FROM profiles 
    WHERE user_id = target_user_id;
    
    IF NOT FOUND THEN
        RETURN false;
    END IF;
    
    -- Determinar role do usuário
    SELECT role INTO user_role 
    FROM user_roles 
    WHERE user_id = target_user_id;
    
    -- Definir documentos necessários baseado no role
    IF user_role = 'provider' THEN
        required_docs := ARRAY['rg', 'selfie', 'address_proof', 'criminal_background'];
    ELSE
        required_docs := ARRAY['rg', 'selfie', 'address_proof'];
    END IF;
    
    -- Verificar quais documentos estão aprovados
    SELECT ARRAY_AGG(DISTINCT document_type::TEXT) INTO completed_docs
    FROM kyc_documents 
    WHERE user_id = target_user_id 
    AND is_verified = true;
    
    -- Verificar se todos os documentos necessários estão aprovados
    all_docs_verified := (required_docs <@ COALESCE(completed_docs, ARRAY[]::TEXT[]));
    
    -- Atualizar status do perfil
    IF all_docs_verified THEN
        UPDATE profiles 
        SET 
            kyc_status = 'approved',
            verified_at = CASE 
                WHEN verified_at IS NULL THEN NOW() 
                ELSE verified_at 
            END,
            updated_at = NOW()
        WHERE user_id = target_user_id;
    ELSE
        UPDATE profiles 
        SET 
            kyc_status = CASE 
                WHEN kyc_status = 'incomplete' THEN 'em_analise'
                WHEN kyc_status = 'approved' THEN 'em_analise'
                ELSE kyc_status
            END,
            updated_at = NOW()
        WHERE user_id = target_user_id
        AND kyc_status NOT IN ('rejected', 'bloqueado', 'suspeito');
    END IF;
    
    RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;