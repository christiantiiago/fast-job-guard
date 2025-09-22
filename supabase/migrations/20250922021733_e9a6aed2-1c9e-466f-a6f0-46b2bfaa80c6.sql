-- Habilitar RLS na tabela job_boosts se não estiver habilitado
ALTER TABLE public.job_boosts ENABLE ROW LEVEL SECURITY;

-- Política para permitir que usuários insiram seus próprios job boosts
CREATE POLICY "Users can create their own job boosts" 
ON public.job_boosts 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Política para permitir que usuários vejam seus próprios job boosts
CREATE POLICY "Users can view their own job boosts" 
ON public.job_boosts 
FOR SELECT 
USING (auth.uid() = user_id);

-- Política para permitir que usuários atualizem seus próprios job boosts
CREATE POLICY "Users can update their own job boosts" 
ON public.job_boosts 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Política para permitir que admins vejam todos os job boosts
CREATE POLICY "Admins can view all job boosts" 
ON public.job_boosts 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'
  )
);

-- Política para permitir que admins atualizem todos os job boosts
CREATE POLICY "Admins can update all job boosts" 
ON public.job_boosts 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'
  )
);