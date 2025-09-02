-- Criar política para permitir visualização pública de todos os jobs em status público
-- Esta política permite que qualquer usuário autenticado veja jobs com status open, in_progress ou completed

CREATE POLICY "Anyone can view public jobs" 
ON public.jobs 
FOR SELECT 
TO authenticated
USING (status IN ('open', 'in_progress', 'completed'));

-- Garantir que service_categories estão visíveis para todos
DROP POLICY IF EXISTS "Anyone can view categories" ON public.service_categories;
CREATE POLICY "Anyone can view categories" 
ON public.service_categories 
FOR SELECT 
TO authenticated
USING (true);

-- Garantir que addresses relacionados aos jobs públicos estão visíveis
DROP POLICY IF EXISTS "Anyone can view public job addresses" ON public.addresses;
CREATE POLICY "Anyone can view public job addresses" 
ON public.addresses 
FOR SELECT 
TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.jobs 
  WHERE jobs.address_id = addresses.id 
  AND jobs.status IN ('open', 'in_progress', 'completed')
));

-- Garantir que propostas de jobs públicos são visíveis para contexto
DROP POLICY IF EXISTS "Anyone can view public job proposals count" ON public.proposals;
CREATE POLICY "Anyone can view public job proposals count" 
ON public.proposals 
FOR SELECT 
TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.jobs 
  WHERE jobs.id = proposals.job_id 
  AND jobs.status IN ('open', 'in_progress', 'completed')
));

-- Garantir que profiles de clientes de jobs públicos são visíveis
DROP POLICY IF EXISTS "Anyone can view public job client profiles" ON public.profiles;
CREATE POLICY "Anyone can view public job client profiles" 
ON public.profiles 
FOR SELECT 
TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.jobs 
  WHERE jobs.client_id = profiles.user_id 
  AND jobs.status IN ('open', 'in_progress', 'completed')
));