-- ============================================
-- CORREÇÕES DE SEGURANÇA FOCADAS
-- Corrigir apenas o que podemos modificar sem conflitos de ownership
-- ============================================

-- 1. HABILITAR RLS NAS TABELAS QUE ESTÃO EXPOSTAS (SE EXISTIREM)
DO $$ 
BEGIN
  -- Verificar se spatial_ref_sys existe e não tem RLS
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'spatial_ref_sys'
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_class c
    JOIN pg_namespace n ON c.relnamespace = n.oid
    WHERE n.nspname = 'public' AND c.relname = 'spatial_ref_sys' AND c.relrowsecurity = true
  ) THEN
    EXECUTE 'ALTER TABLE public.spatial_ref_sys ENABLE ROW LEVEL SECURITY';
    EXECUTE 'CREATE POLICY IF NOT EXISTS "spatial_ref_sys_public_read"
    ON public.spatial_ref_sys FOR SELECT TO public USING (true)';
  END IF;

  -- Verificar geometry_columns
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'geometry_columns'
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_class c
    JOIN pg_namespace n ON c.relnamespace = n.oid
    WHERE n.nspname = 'public' AND c.relname = 'geometry_columns' AND c.relrowsecurity = true
  ) THEN
    EXECUTE 'ALTER TABLE public.geometry_columns ENABLE ROW LEVEL SECURITY';
    EXECUTE 'CREATE POLICY IF NOT EXISTS "geometry_columns_public_read"
    ON public.geometry_columns FOR SELECT TO public USING (true)';
  END IF;
  
  -- Verificar geography_columns
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'geography_columns'
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_class c
    JOIN pg_namespace n ON c.relnamespace = n.oid
    WHERE n.nspname = 'public' AND c.relname = 'geography_columns' AND c.relrowsecurity = true
  ) THEN
    EXECUTE 'ALTER TABLE public.geography_columns ENABLE ROW LEVEL SECURITY';
    EXECUTE 'CREATE POLICY IF NOT EXISTS "geography_columns_public_read"
    ON public.geography_columns FOR SELECT TO public USING (true)';
  END IF;
END $$;

-- 2. MELHORAR FUNÇÃO DE VERIFICAÇÃO DE ADMIN
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT role = 'admin' FROM user_roles WHERE user_id = auth.uid()),
    false
  );
$$;

-- 3. ADICIONAR FUNÇÃO DE VERIFICAÇÃO DE USUÁRIO AUTENTICADO
CREATE OR REPLACE FUNCTION public.is_authenticated()
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT auth.uid() IS NOT NULL;
$$;

-- 4. FUNÇÃO DE AUDITORIA PARA AÇÕES SENSÍVEIS
CREATE OR REPLACE FUNCTION public.log_security_event(
  event_type text,
  event_data jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  log_id uuid;
BEGIN
  INSERT INTO audit_logs (
    user_id,
    action,
    entity_type,
    entity_id,
    metadata
  ) VALUES (
    auth.uid(),
    event_type,
    'security_event',
    gen_random_uuid(),
    event_data
  ) RETURNING id INTO log_id;
  
  RETURN log_id;
END;
$$;

-- 5. LOG DA APLICAÇÃO DAS CORREÇÕES
SELECT public.log_security_event(
  'SECURITY_FIXES_APPLIED',
  jsonb_build_object(
    'description', 'Applied available security fixes',
    'fixes', jsonb_build_array(
      'rls_enabled_on_spatial_tables',
      'admin_function_enhanced', 
      'security_audit_functions_added'
    ),
    'remaining_issues', jsonb_build_array(
      'postgis_c_functions_require_superuser',
      'leaked_password_protection_needs_manual_enable',
      'postgres_version_needs_manual_update'
    ),
    'security_level', 'improved'
  )
);