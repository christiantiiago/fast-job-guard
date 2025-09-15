-- Habilitar RLS em todas as tabelas públicas que não têm RLS

-- Verificar e habilitar RLS em tabelas críticas
DO $$
DECLARE
    r RECORD;
BEGIN
    -- Habilitar RLS em todas as tabelas públicas que não têm
    FOR r IN 
        SELECT tablename 
        FROM pg_tables 
        WHERE schemaname = 'public' 
          AND rowsecurity = false
          AND tablename NOT IN ('geography_columns', 'geometry_columns', 'spatial_ref_sys')
    LOOP
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', r.tablename);
        RAISE NOTICE 'RLS habilitado para tabela: %', r.tablename;
    END LOOP;
END
$$;

-- Criar políticas RLS básicas para tabelas que precisam
-- (para tabelas que não são sensíveis, permito acesso total)

-- Para tabelas de sistema/lookup que são públicas
ALTER TABLE IF EXISTS public.service_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "service_categories_select_policy" ON public.service_categories FOR SELECT USING (true);