-- Criar tabela para controlar os boosts dos trabalhos
CREATE TABLE public.job_boosts (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  job_id uuid NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  boost_type text NOT NULL, -- express, turbo, premium, platinum, diamond, ultimate
  amount numeric NOT NULL,
  duration_hours integer NOT NULL,
  stripe_session_id text,
  stripe_payment_intent_id text,
  status text NOT NULL DEFAULT 'pending', -- pending, active, completed, cancelled
  started_at timestamp with time zone,
  expires_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  metadata jsonb DEFAULT '{}'::jsonb
);

-- RLS policies
ALTER TABLE public.job_boosts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own boosts" ON public.job_boosts
FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can create their own boosts" ON public.job_boosts  
FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "System can update boosts" ON public.job_boosts
FOR UPDATE USING (true);

CREATE POLICY "Admins can manage all boosts" ON public.job_boosts
FOR ALL USING (is_admin());

-- Trigger para updated_at
CREATE TRIGGER update_job_boosts_updated_at
BEFORE UPDATE ON public.job_boosts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column('job_boosts');

-- Índices para performance
CREATE INDEX idx_job_boosts_user_id ON public.job_boosts(user_id);
CREATE INDEX idx_job_boosts_job_id ON public.job_boosts(job_id);
CREATE INDEX idx_job_boosts_status ON public.job_boosts(status);
CREATE INDEX idx_job_boosts_expires_at ON public.job_boosts(expires_at);