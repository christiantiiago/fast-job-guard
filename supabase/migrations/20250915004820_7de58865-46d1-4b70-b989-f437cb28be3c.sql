-- Habilitar RLS na tabela spatial_ref_sys para resolver o warning de segurança
-- Esta é uma tabela do PostGIS que contém dados de referência espacial
ALTER TABLE spatial_ref_sys ENABLE ROW LEVEL SECURITY;

-- Criar política para permitir leitura pública da tabela spatial_ref_sys
-- pois ela contém dados de referência que devem ser acessíveis
DROP POLICY IF EXISTS "spatial_ref_sys_select_policy" ON spatial_ref_sys;
CREATE POLICY "spatial_ref_sys_select_policy" ON spatial_ref_sys FOR SELECT USING (true);