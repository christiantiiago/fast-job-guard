-- Transformar um usuário existente em admin
-- Substitua o email abaixo pelo seu email de preferência

INSERT INTO user_roles (user_id, role)
SELECT id, 'admin'::user_role
FROM auth.users 
WHERE email = 'christiantiiago@outlook.com'
ON CONFLICT (user_id) DO UPDATE SET role = 'admin'::user_role;

-- Ou se preferir outro email, mude na query acima