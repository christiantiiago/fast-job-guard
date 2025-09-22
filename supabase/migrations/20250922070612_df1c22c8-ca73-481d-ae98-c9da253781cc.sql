-- Corrigir questões críticas de segurança detectadas pelo linter

-- Habilitar RLS em todas as tabelas públicas que não têm
ALTER TABLE public.service_areas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;  
ALTER TABLE public.service_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.real_time_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proposal_rejections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_config ENABLE ROW LEVEL SECURITY;

-- Criar políticas básicas para tabelas que não têm RLS
-- Service categories (público para leitura)
CREATE POLICY "Service categories são públicas" ON public.service_categories
FOR SELECT TO public USING (true);

-- System config (apenas admins)
CREATE POLICY "Apenas admins podem ver config do sistema" ON public.system_config
FOR ALL TO public USING (is_admin());

-- User roles (usuários podem ver seu próprio role)
CREATE POLICY "Usuários podem ver seu próprio role" ON public.user_roles
FOR SELECT TO public USING (user_id = auth.uid());

CREATE POLICY "Admins podem gerenciar roles" ON public.user_roles
FOR ALL TO public USING (is_admin());

-- Subscriptions (usuários podem ver suas próprias assinaturas)
CREATE POLICY "Usuários podem ver suas próprias assinaturas" ON public.subscriptions
FOR SELECT TO public USING (user_id = auth.uid());

CREATE POLICY "Sistema pode gerenciar assinaturas" ON public.subscriptions
FOR ALL TO public USING (true);