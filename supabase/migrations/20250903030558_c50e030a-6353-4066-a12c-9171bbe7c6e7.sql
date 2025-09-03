-- Atualizar enum de status KYC para ser mais granular
ALTER TYPE kyc_status ADD VALUE IF NOT EXISTS 'em_analise';
ALTER TYPE kyc_status ADD VALUE IF NOT EXISTS 'bloqueado';
ALTER TYPE kyc_status ADD VALUE IF NOT EXISTS 'suspeito';

-- Criar tabela para análises de IA dos documentos
CREATE TABLE public.kyc_ai_analysis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES public.kyc_documents(id) ON DELETE CASCADE,
  analysis_result JSONB NOT NULL,
  confidence_score NUMERIC(3,2) CHECK (confidence_score >= 0 AND confidence_score <= 1),
  fraud_indicators JSONB DEFAULT '[]'::jsonb,
  recommendations TEXT,
  processed_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  ai_model_version TEXT DEFAULT 'gpt-4o',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Criar índices para performance
CREATE INDEX idx_kyc_ai_analysis_document_id ON public.kyc_ai_analysis(document_id);
CREATE INDEX idx_kyc_ai_analysis_confidence ON public.kyc_ai_analysis(confidence_score);
CREATE INDEX idx_kyc_ai_analysis_processed_at ON public.kyc_ai_analysis(processed_at);

-- Enable RLS
ALTER TABLE public.kyc_ai_analysis ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para análises de IA
CREATE POLICY "Admins can manage all AI analyses"
ON public.kyc_ai_analysis
FOR ALL
TO authenticated
USING (is_admin());

CREATE POLICY "Users can view AI analysis of their own documents"
ON public.kyc_ai_analysis
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.kyc_documents 
    WHERE kyc_documents.id = kyc_ai_analysis.document_id 
    AND kyc_documents.user_id = auth.uid()
  )
);

-- Criar tabela de auditoria para ações dos admins no KYC
CREATE TABLE public.kyc_admin_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES public.kyc_documents(id) ON DELETE CASCADE,
  admin_id UUID NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('approved', 'rejected', 'flagged', 'reviewed', 'blocked')),
  previous_status TEXT,
  new_status TEXT,
  notes TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS e índices
ALTER TABLE public.kyc_admin_actions ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_kyc_admin_actions_document_id ON public.kyc_admin_actions(document_id);
CREATE INDEX idx_kyc_admin_actions_admin_id ON public.kyc_admin_actions(admin_id);
CREATE INDEX idx_kyc_admin_actions_created_at ON public.kyc_admin_actions(created_at);

-- Políticas RLS para auditoria
CREATE POLICY "Admins can manage audit logs"
ON public.kyc_admin_actions
FOR ALL
TO authenticated
USING (is_admin());

-- Adicionar campos para detectar duplicação de documentos
ALTER TABLE public.kyc_documents 
ADD COLUMN IF NOT EXISTS file_hash TEXT,
ADD COLUMN IF NOT EXISTS duplicate_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS is_duplicate BOOLEAN DEFAULT false;

-- Criar índice para detecção de duplicatas
CREATE INDEX IF NOT EXISTS idx_kyc_documents_file_hash ON public.kyc_documents(file_hash) WHERE file_hash IS NOT NULL;

-- Função para atualizar o status KYC do usuário baseado nos documentos
CREATE OR REPLACE FUNCTION public.update_user_kyc_status()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para atualizar status automaticamente
DROP TRIGGER IF EXISTS update_user_kyc_status_trigger ON public.kyc_documents;
CREATE TRIGGER update_user_kyc_status_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.kyc_documents
  FOR EACH ROW EXECUTE FUNCTION public.update_user_kyc_status();