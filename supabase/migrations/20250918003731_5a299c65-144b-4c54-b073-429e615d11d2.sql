-- ============================================
-- CORREÇÕES CRÍTICAS DE SEGURANÇA (VERSÃO COMPATÍVEL)
-- Corrigir apenas as vulnerabilidades que podem ser corrigidas sem privilégios de superusuário
-- ============================================

-- 1. CORREÇÃO DAS FUNÇÕES PLPGSQL SEM SET search_path = public
-- Focar apenas nas funções que podemos modificar

-- Corrigir função st_findextent (primeira versão)
CREATE OR REPLACE FUNCTION public.st_findextent(text, text, text)
RETURNS box2d
LANGUAGE plpgsql
STABLE PARALLEL SAFE STRICT
SET search_path = public
AS $function$
DECLARE
	schemaname alias for $1;
	tablename alias for $2;
	columnname alias for $3;
	myrec RECORD;
BEGIN
	FOR myrec IN EXECUTE 'SELECT public.ST_Extent("' || columnname || '") As extent FROM "' || schemaname || '"."' || tablename || '"' LOOP
		return myrec.extent;
	END LOOP;
END;
$function$;

-- Corrigir função st_findextent (segunda versão)
CREATE OR REPLACE FUNCTION public.st_findextent(text, text)
RETURNS box2d
LANGUAGE plpgsql
STABLE PARALLEL SAFE STRICT
SET search_path = public
AS $function$
DECLARE
	tablename alias for $1;
	columnname alias for $2;
	myrec RECORD;
BEGIN
	FOR myrec IN EXECUTE 'SELECT public.ST_Extent("' || columnname || '") As extent FROM "' || tablename || '"' LOOP
		return myrec.extent;
	END LOOP;
END;
$function$;

-- Corrigir função _postgis_deprecate
CREATE OR REPLACE FUNCTION public._postgis_deprecate(oldname text, newname text, version text)
RETURNS void
LANGUAGE plpgsql
IMMUTABLE STRICT COST 500
SET search_path = public
AS $function$
DECLARE
  curver_text text;
BEGIN
  --
  -- Raises a NOTICE if it was deprecated in this version,
  -- a WARNING if in a previous version (only up to minor version checked)
  --
	curver_text := '3.3.7';
	IF pg_catalog.split_part(curver_text,'.',1)::int > pg_catalog.split_part(version,'.',1)::int OR
	   ( pg_catalog.split_part(curver_text,'.',1) = pg_catalog.split_part(version,'.',1) AND
		 pg_catalog.split_part(curver_text,'.',2) != split_part(version,'.',2) )
	THEN
	  RAISE WARNING '% signature was deprecated in %. Please use %', oldname, version, newname;
	ELSE
	  RAISE DEBUG '% signature was deprecated in %. Please use %', oldname, version, newname;
	END IF;
END;
$function$;

-- 2. HABILITAR RLS NAS TABELAS GEOESPACIAIS (SE EXISTIREM)
-- Esta é a correção mais importante para o erro "RLS Disabled in Public"

DO $$ 
BEGIN
  -- spatial_ref_sys
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'spatial_ref_sys') THEN
    EXECUTE 'ALTER TABLE public.spatial_ref_sys ENABLE ROW LEVEL SECURITY';
    
    -- Política para permitir leitura pública (dados de referência espacial são públicos)
    EXECUTE 'CREATE POLICY IF NOT EXISTS "Allow public read access to spatial reference systems"
    ON public.spatial_ref_sys
    FOR SELECT
    TO public
    USING (true)';
  END IF;

  -- geometry_columns
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'geometry_columns') THEN
    EXECUTE 'ALTER TABLE public.geometry_columns ENABLE ROW LEVEL SECURITY';
    EXECUTE 'CREATE POLICY IF NOT EXISTS "Allow public read access to geometry columns"
    ON public.geometry_columns
    FOR SELECT
    TO public
    USING (true)';
  END IF;
  
  -- geography_columns  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'geography_columns') THEN
    EXECUTE 'ALTER TABLE public.geography_columns ENABLE ROW LEVEL SECURITY';
    EXECUTE 'CREATE POLICY IF NOT EXISTS "Allow public read access to geography columns"
    ON public.geography_columns
    FOR SELECT
    TO public
    USING (true)';
  END IF;
END $$;

-- 3. ADICIONAR FUNÇÃO DE SEGURANÇA PARA VERIFICAÇÃO DE ADMIN MAIS ROBUSTA
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

-- 4. LOG DE SEGURANÇA
INSERT INTO audit_logs (
    user_id,
    action,
    entity_type,
    entity_id,
    new_values,
    metadata
) VALUES (
    auth.uid(),
    'CRITICAL_SECURITY_FIXES_APPLIED',
    'system',
    gen_random_uuid(),
    jsonb_build_object(
        'level', 'critical',
        'fixes_applied', jsonb_build_array(
            'plpgsql_functions_secured',
            'rls_enabled_spatial_tables',
            'admin_function_enhanced'
        )
    ),
    jsonb_build_object(
        'description', 'Applied critical security fixes for database functions and RLS',
        'functions_fixed', 3,
        'tables_secured_with_rls', 'spatial_tables',
        'security_level', 'enhanced',
        'note', 'PostGIS C functions require manual review in production'
    )
);