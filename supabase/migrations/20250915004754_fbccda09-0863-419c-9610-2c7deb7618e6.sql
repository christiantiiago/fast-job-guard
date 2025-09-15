-- Corrigir políticas RLS para service_categories
DROP POLICY IF EXISTS "service_categories_select_policy" ON public.service_categories;
CREATE POLICY "service_categories_select_policy" ON public.service_categories FOR SELECT USING (true);

-- Verificar se spatial_ref_sys precisa de RLS (tabela do PostGIS, geralmente não precisa)
-- Não aplicamos RLS na spatial_ref_sys por ser uma tabela de sistema do PostGIS