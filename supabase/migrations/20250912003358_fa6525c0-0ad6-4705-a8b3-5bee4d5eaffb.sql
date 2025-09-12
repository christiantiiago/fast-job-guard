-- Dropar funções existentes e recriar com melhorias
DROP FUNCTION IF EXISTS approve_kyc_document_manual(uuid,uuid,text);
DROP FUNCTION IF EXISTS reject_kyc_document_manual(uuid,uuid,text);

-- Função para atualizar automaticamente o status do perfil baseado nos documentos
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
                ELSE kyc_status
            END,
            updated_at = NOW()
        WHERE user_id = NEW.user_id
        AND kyc_status NOT IN ('rejected', 'bloqueado', 'suspeito');
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para atualizar status quando documento for aprovado
DROP TRIGGER IF EXISTS trigger_update_profile_kyc_status ON kyc_documents;
CREATE TRIGGER trigger_update_profile_kyc_status
    AFTER UPDATE ON kyc_documents
    FOR EACH ROW
    WHEN (NEW.is_verified = true AND OLD.is_verified = false)
    EXECUTE FUNCTION update_profile_kyc_status();

-- Função para aprovar documento manualmente com auditoria completa
CREATE OR REPLACE FUNCTION approve_kyc_document_manual(
    document_id UUID,
    admin_user_id UUID,
    approval_notes TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
    doc_record RECORD;
    old_status BOOLEAN;
BEGIN
    -- Buscar documento
    SELECT * INTO doc_record FROM kyc_documents WHERE id = document_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Documento não encontrado';
    END IF;
    
    old_status := doc_record.is_verified;
    
    -- Aprovar documento
    UPDATE kyc_documents 
    SET 
        is_verified = true,
        verified_at = NOW(),
        verified_by = admin_user_id,
        notes = approval_notes
    WHERE id = document_id;
    
    -- Log da ação
    INSERT INTO audit_logs (
        user_id,
        action,
        entity_type,
        entity_id,
        old_values,
        new_values,
        metadata
    ) VALUES (
        admin_user_id,
        'APPROVE_KYC_DOCUMENT',
        'kyc_document',
        document_id,
        jsonb_build_object('is_verified', old_status),
        jsonb_build_object('is_verified', true),
        jsonb_build_object(
            'document_user_id', doc_record.user_id,
            'document_type', doc_record.document_type,
            'notes', approval_notes
        )
    );
    
    -- Log específico para KYC
    INSERT INTO kyc_admin_actions (
        document_id,
        admin_id,
        action,
        previous_status,
        new_status,
        notes
    ) VALUES (
        document_id,
        admin_user_id,
        'approve',
        CASE WHEN old_status THEN 'approved' ELSE 'pending' END,
        'approved',
        approval_notes
    );
    
    RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para rejeitar documento manualmente com auditoria completa
CREATE OR REPLACE FUNCTION reject_kyc_document_manual(
    document_id UUID,
    admin_user_id UUID,
    rejection_reason TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
    doc_record RECORD;
    old_status BOOLEAN;
BEGIN
    -- Buscar documento
    SELECT * INTO doc_record FROM kyc_documents WHERE id = document_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Documento não encontrado';
    END IF;
    
    old_status := doc_record.is_verified;
    
    -- Rejeitar documento
    UPDATE kyc_documents 
    SET 
        is_verified = false,
        verified_at = NULL,
        verified_by = admin_user_id,
        notes = rejection_reason
    WHERE id = document_id;
    
    -- Atualizar status do perfil para em_analise (permitindo reenvio)
    UPDATE profiles 
    SET 
        kyc_status = 'em_analise',
        updated_at = NOW()
    WHERE user_id = doc_record.user_id;
    
    -- Log da ação
    INSERT INTO audit_logs (
        user_id,
        action,
        entity_type,
        entity_id,
        old_values,
        new_values,
        metadata
    ) VALUES (
        admin_user_id,
        'REJECT_KYC_DOCUMENT',
        'kyc_document',
        document_id,
        jsonb_build_object('is_verified', old_status),
        jsonb_build_object('is_verified', false),
        jsonb_build_object(
            'document_user_id', doc_record.user_id,
            'document_type', doc_record.document_type,
            'rejection_reason', rejection_reason
        )
    );
    
    -- Log específico para KYC
    INSERT INTO kyc_admin_actions (
        document_id,
        admin_id,
        action,
        previous_status,
        new_status,
        notes
    ) VALUES (
        document_id,
        admin_user_id,
        'reject',
        CASE WHEN old_status THEN 'approved' ELSE 'pending' END,
        'rejected',
        rejection_reason
    );
    
    RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;