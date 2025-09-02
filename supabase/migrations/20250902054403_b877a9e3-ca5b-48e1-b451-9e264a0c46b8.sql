-- Criar usuário admin padrão para acesso administrativo
-- Este usuário será criado com email específico para identificação como admin

-- Primeiro, inserir o usuário admin diretamente na tabela auth.users
-- NOTA: Isso só deve ser executado uma vez e o admin deve alterar a senha no primeiro login

-- Inserir role de admin se não existir
INSERT INTO public.user_roles (user_id, role) 
SELECT 
  id,
  'admin'
FROM auth.users 
WHERE email = 'admin@jobfast.com'
ON CONFLICT (user_id, role) DO NOTHING;

-- Inserir perfil para admin se não existir
INSERT INTO public.profiles (user_id, full_name, is_verified, kyc_status)
SELECT 
  id,
  'Administrador do Sistema',
  true,
  'verified'
FROM auth.users 
WHERE email = 'admin@jobfast.com'
ON CONFLICT (user_id) DO UPDATE SET
  full_name = 'Administrador do Sistema',
  is_verified = true,
  kyc_status = 'verified';