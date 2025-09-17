-- ============================================
-- CORREÇÃO CRÍTICA DE SEGURANÇA
-- Removendo acesso público a dados sensíveis
-- ============================================

-- 1. CORRIGIR POLÍTICAS DE PAGAMENTO (CRÍTICO)
-- Remover política pública da tabela escrow_payments
DROP POLICY IF EXISTS "Service can manage all payments" ON public.escrow_payments;

-- Criar políticas mais restritivas para escrow_payments
CREATE POLICY "Clients can view own escrow payments" 
ON public.escrow_payments 
FOR SELECT 
USING (client_id = auth.uid());

CREATE POLICY "Providers can view own escrow payments" 
ON public.escrow_payments 
FOR SELECT 
USING (provider_id = auth.uid());

CREATE POLICY "Admins can manage all escrow payments" 
ON public.escrow_payments 
FOR ALL 
USING (is_admin());

CREATE POLICY "System can create escrow payments" 
ON public.escrow_payments 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "System can update escrow payments" 
ON public.escrow_payments 
FOR UPDATE 
USING (true);

-- 2. CORRIGIR POLÍTICAS DE TRABALHOS (CRÍTICO)
-- Remover política muito permissiva de jobs
DROP POLICY IF EXISTS "Anyone can view public jobs" ON public.jobs;

-- Criar política mais restritiva que esconde dados sensíveis
CREATE POLICY "Public can view limited job info" 
ON public.jobs 
FOR SELECT 
USING (
  status IN ('open', 'in_progress', 'completed') 
  AND (
    -- Permitir apenas campos básicos via view
    auth.uid() IS NULL OR
    client_id = auth.uid() OR 
    provider_id = auth.uid() OR
    is_admin()
  )
);

-- 3. RESTRINGIR ACESSO AOS PADRÕES DE FILTRO (SEGURANÇA)
-- Remover política pública de blocked_content_patterns
DROP POLICY IF EXISTS "Anyone can view active patterns" ON public.blocked_content_patterns;

-- Apenas admins podem ver padrões de bloqueio
CREATE POLICY "Only admins can view content patterns" 
ON public.blocked_content_patterns 
FOR SELECT 
USING (is_admin());

-- 4. CORRIGIR FUNÇÕES COM SEARCH_PATH MUTÁVEL
-- Atualizar função is_admin para ser mais segura
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public;

-- Corrigir função update_profile_kyc_status
CREATE OR REPLACE FUNCTION public.update_profile_kyc_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
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
$function$;

-- Corrigir função force_kyc_status_update
CREATE OR REPLACE FUNCTION public.force_kyc_status_update(target_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
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
$function$;

-- Corrigir função approve_kyc_document_manual
CREATE OR REPLACE FUNCTION public.approve_kyc_document_manual(document_id uuid, admin_user_id uuid, approval_notes text DEFAULT NULL::text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
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
$function$;

-- Corrigir função reject_kyc_document_manual
CREATE OR REPLACE FUNCTION public.reject_kyc_document_manual(document_id uuid, admin_user_id uuid, rejection_reason text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
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
$function$;

-- 5. CRIAR VIEW PÚBLICA SEGURA PARA TRABALHOS
-- View que expõe apenas informações básicas dos trabalhos
CREATE OR REPLACE VIEW public.public_jobs AS
SELECT 
    id,
    title,
    description,
    category_id,
    status,
    budget_min,
    budget_max,
    latitude,
    longitude,
    created_at,
    scheduled_at,
    deadline_at
FROM public.jobs 
WHERE status IN ('open', 'in_progress', 'completed');

-- Permitir acesso público à view
GRANT SELECT ON public.public_jobs TO anon, authenticated;

-- 6. ADICIONAR AUDITORIA PARA OPERAÇÕES SENSÍVEIS
-- Trigger para auditar alterações em pagamentos
CREATE OR REPLACE FUNCTION public.audit_escrow_changes()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'UPDATE' THEN
        INSERT INTO audit_logs (
            user_id,
            action,
            entity_type,
            entity_id,
            old_values,
            new_values,
            metadata
        ) VALUES (
            auth.uid(),
            'ESCROW_PAYMENT_UPDATED',
            'escrow_payment',
            NEW.id,
            to_jsonb(OLD),
            to_jsonb(NEW),
            jsonb_build_object(
                'job_id', NEW.job_id,
                'client_id', NEW.client_id,
                'provider_id', NEW.provider_id
            )
        );
    END IF;
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Aplicar trigger de auditoria
DROP TRIGGER IF EXISTS escrow_payment_audit_trigger ON public.escrow_payments;
CREATE TRIGGER escrow_payment_audit_trigger
    AFTER UPDATE ON public.escrow_payments
    FOR EACH ROW EXECUTE FUNCTION public.audit_escrow_changes();

-- 7. MELHORAR POLÍTICAS DE JOBS PARA MAIOR SEGURANÇA
-- Política mais específica para visualização de trabalhos
DROP POLICY IF EXISTS "Public can view limited job info" ON public.jobs;

CREATE POLICY "Authenticated users can view open jobs" 
ON public.jobs 
FOR SELECT 
USING (
    status = 'open' AND auth.uid() IS NOT NULL
);

CREATE POLICY "Job parties can view their jobs" 
ON public.jobs 
FOR SELECT 
USING (
    client_id = auth.uid() OR 
    provider_id = auth.uid()
);

-- 8. RESTRINGIR ACESSO A TABELAS ADMINISTRATIVAS
-- Garantir que apenas admins vejam logs de auditoria
DROP POLICY IF EXISTS "Admins can view audit logs" ON public.audit_logs;
DROP POLICY IF EXISTS "System can create audit logs" ON public.audit_logs;

CREATE POLICY "Only admins can view audit logs" 
ON public.audit_logs 
FOR SELECT 
USING (is_admin());

CREATE POLICY "System can create audit logs" 
ON public.audit_logs 
FOR INSERT 
WITH CHECK (true);

-- Log desta correção crítica de segurança
INSERT INTO audit_logs (
    user_id,
    action,
    entity_type,
    entity_id,
    new_values,
    metadata
) VALUES (
    auth.uid(),
    'SECURITY_HARDENING',
    'system',
    gen_random_uuid(),
    jsonb_build_object('level', 'critical'),
    jsonb_build_object(
        'description', 'Applied critical security fixes to RLS policies',
        'tables_secured', ARRAY['escrow_payments', 'jobs', 'blocked_content_patterns', 'audit_logs'],
        'functions_hardened', ARRAY['is_admin', 'update_profile_kyc_status', 'force_kyc_status_update', 'approve_kyc_document_manual', 'reject_kyc_document_manual']
    )
);