-- Função para criar perfil e role automaticamente quando usuário se registra
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Inserir perfil do usuário
  INSERT INTO public.profiles (user_id, full_name, phone)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'phone'
  );
  
  -- Inserir role do usuário (default: client)
  INSERT INTO public.user_roles (user_id, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'role', 'client')::user_role
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Criar trigger para executar a função quando um usuário é criado
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Criar role para o usuário já existente que se registrou
INSERT INTO public.user_roles (user_id, role)
VALUES ('76ed592e-0c1f-424d-b40b-6462b9734f31', 'provider')
ON CONFLICT (user_id) DO UPDATE SET role = 'provider'::user_role;

-- Criar perfil para o usuário já existente
INSERT INTO public.profiles (user_id, full_name, phone)
SELECT 
  id,
  raw_user_meta_data->>'full_name',
  raw_user_meta_data->>'phone'
FROM auth.users 
WHERE id = '76ed592e-0c1f-424d-b40b-6462b9734f31'
ON CONFLICT (user_id) DO UPDATE SET
  full_name = EXCLUDED.full_name,
  phone = EXCLUDED.phone;