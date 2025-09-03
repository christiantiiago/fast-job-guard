-- Atualizar enum de status KYC para ser mais granular (apenas se não existir)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'em_analise' AND enumtypid = 'kyc_status'::regtype) THEN
        ALTER TYPE kyc_status ADD VALUE 'em_analise';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'bloqueado' AND enumtypid = 'kyc_status'::regtype) THEN
        ALTER TYPE kyc_status ADD VALUE 'bloqueado';    
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'suspeito' AND enumtypid = 'kyc_status'::regtype) THEN
        ALTER TYPE kyc_status ADD VALUE 'suspeito';
    END IF;
END $$;

-- Criar tabela de auditoria para ações dos admins no KYC
CREATE TABLE IF NOT EXISTS public.kyc_admin_actions (
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

-- Enable RLS e índices se não existir
ALTER TABLE public.kyc_admin_actions ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_kyc_admin_actions_document_id') THEN
        CREATE INDEX idx_kyc_admin_actions_document_id ON public.kyc_admin_actions(document_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_kyc_admin_actions_admin_id') THEN
        CREATE INDEX idx_kyc_admin_actions_admin_id ON public.kyc_admin_actions(admin_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_kyc_admin_actions_created_at') THEN
        CREATE INDEX idx_kyc_admin_actions_created_at ON public.kyc_admin_actions(created_at);
    END IF;
END $$;

-- Políticas RLS para auditoria
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins can manage audit logs' AND tablename = 'kyc_admin_actions') THEN
        CREATE POLICY "Admins can manage audit logs"
        ON public.kyc_admin_actions  
        FOR ALL
        TO authenticated
        USING (is_admin());
    END IF;
END $$;

-- Adicionar campos para detectar duplicação de documentos se não existir
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'kyc_documents' AND column_name = 'file_hash') THEN
        ALTER TABLE public.kyc_documents ADD COLUMN file_hash TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'kyc_documents' AND column_name = 'duplicate_count') THEN
        ALTER TABLE public.kyc_documents ADD COLUMN duplicate_count INTEGER DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'kyc_documents' AND column_name = 'is_duplicate') THEN
        ALTER TABLE public.kyc_documents ADD COLUMN is_duplicate BOOLEAN DEFAULT false;
    END IF;
END $$;

-- Criar índice para detecção de duplicatas se não existir  
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_kyc_documents_file_hash') THEN
        CREATE INDEX idx_kyc_documents_file_hash ON public.kyc_documents(file_hash) WHERE file_hash IS NOT NULL;
    END IF;
END $$;