-- Habilitar RLS apenas em tabelas que existem
ALTER TABLE IF EXISTS public.service_areas ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.services ENABLE ROW LEVEL SECURITY;  
ALTER TABLE IF EXISTS public.service_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.real_time_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.proposal_rejections ENABLE ROW LEVEL SECURITY;

-- Service categories (público para leitura)
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'service_categories') THEN
        CREATE POLICY "Service categories são públicas" ON public.service_categories
        FOR SELECT TO public USING (true);
    END IF;
END
$$;

-- User roles (usuários podem ver seu próprio role)  
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'user_roles') THEN
        CREATE POLICY "Usuários podem ver seu próprio role" ON public.user_roles
        FOR SELECT TO public USING (user_id = auth.uid());
        
        CREATE POLICY "Admins podem gerenciar roles" ON public.user_roles
        FOR ALL TO public USING (is_admin());
    END IF;
END
$$;