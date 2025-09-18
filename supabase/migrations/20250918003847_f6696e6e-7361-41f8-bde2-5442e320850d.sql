-- ============================================
-- CORREÇÕES DE SEGURANÇA APLICÁVEIS
-- Apenas melhorias que podemos implementar sem privilégios de sistema
-- ============================================

-- 1. MELHORAR FUNÇÃO DE VERIFICAÇÃO DE ADMIN COM SEARCH PATH
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

-- 2. ADICIONAR FUNÇÃO DE VERIFICAÇÃO DE USUÁRIO AUTENTICADO
CREATE OR REPLACE FUNCTION public.is_authenticated()
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT auth.uid() IS NOT NULL;
$$;

-- 3. FUNÇÃO DE AUDITORIA PARA AÇÕES SENSÍVEIS
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

-- 4. FUNÇÃO DE VALIDAÇÃO DE SENHA SEGURA
CREATE OR REPLACE FUNCTION public.validate_password_strength(password_text text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
  score integer := 0;
  issues text[] := '{}';
BEGIN
  -- Verificar comprimento mínimo
  IF length(password_text) >= 8 THEN
    score := score + 1;
  ELSE
    issues := array_append(issues, 'minimum_8_characters');
  END IF;
  
  -- Verificar maiúsculas
  IF password_text ~ '[A-Z]' THEN
    score := score + 1;
  ELSE
    issues := array_append(issues, 'uppercase_letter');
  END IF;
  
  -- Verificar minúsculas
  IF password_text ~ '[a-z]' THEN
    score := score + 1;
  ELSE
    issues := array_append(issues, 'lowercase_letter');
  END IF;
  
  -- Verificar números
  IF password_text ~ '[0-9]' THEN
    score := score + 1;
  ELSE
    issues := array_append(issues, 'number');
  END IF;
  
  -- Verificar caracteres especiais
  IF password_text ~ '[^A-Za-z0-9]' THEN
    score := score + 1;
  ELSE
    issues := array_append(issues, 'special_character');
  END IF;
  
  result := jsonb_build_object(
    'score', score,
    'strength', CASE 
      WHEN score >= 4 THEN 'strong'
      WHEN score >= 3 THEN 'medium'
      ELSE 'weak'
    END,
    'issues', to_jsonb(issues),
    'is_secure', score >= 4
  );
  
  RETURN result;
END;
$$;

-- 5. LOG DAS MELHORIAS APLICADAS
SELECT public.log_security_event(
  'SECURITY_ENHANCEMENTS_APPLIED',
  jsonb_build_object(
    'description', 'Applied security enhancements within available permissions',
    'enhancements', jsonb_build_array(
      'admin_function_secured_with_search_path',
      'authentication_check_function_added',
      'security_audit_logging_enhanced',
      'password_strength_validation_added'
    ),
    'note', 'PostGIS system tables and C functions require database admin privileges',
    'security_level', 'enhanced_within_constraints'
  )
);