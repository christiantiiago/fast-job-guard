-- Add policy to allow viewing provider profiles who submitted proposals
CREATE POLICY "Anyone can view provider profiles with proposals" 
ON public.profiles 
FOR SELECT 
TO authenticated
USING (
  EXISTS (
    SELECT 1 
    FROM proposals 
    JOIN jobs ON proposals.job_id = jobs.id
    WHERE proposals.provider_id = profiles.user_id
    AND (
      jobs.client_id = auth.uid() -- Client can see provider profiles who proposed to their jobs
      OR jobs.status IN ('open', 'in_progress', 'completed') -- Anyone can see providers on public jobs
    )
  )
);