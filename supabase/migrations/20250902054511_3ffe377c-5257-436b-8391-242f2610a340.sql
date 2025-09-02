-- Corrigir constraint unique na tabela user_roles para suportar ON CONFLICT
-- A tabela já existe mas precisa de constraint unique para user_id

-- Primeiro, verificar se já existe a constraint e adicioná-la se necessário
DO $$
BEGIN
    -- Tentar adicionar constraint unique se não existir
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'user_roles_user_id_unique') THEN
        ALTER TABLE public.user_roles ADD CONSTRAINT user_roles_user_id_unique UNIQUE (user_id);
    END IF;
END $$;

-- Agora podemos tentar inserir o admin novamente com UPSERT seguro
-- Inserir ou atualizar role de admin
INSERT INTO public.user_roles (user_id, role)
SELECT 
  auth.users.id,
  'admin'::user_role
FROM auth.users 
WHERE email = 'admin@jobfast.com'
ON CONFLICT (user_id) 
DO UPDATE SET role = 'admin'::user_role;

-- Inserir ou atualizar perfil para admin
INSERT INTO public.profiles (user_id, full_name, is_verified, kyc_status)
SELECT 
  auth.users.id,
  'Administrador do Sistema',
  true,
  'verified'::kyc_status
FROM auth.users 
WHERE email = 'admin@jobfast.com'
ON CONFLICT (user_id) 
DO UPDATE SET
  full_name = 'Administrador do Sistema',
  is_verified = true,
  kyc_status = 'verified'::kyc_status;