-- Fix RLS policies for jobs table to ensure proper access
-- Drop the existing policy that has wrong role assignment
DROP POLICY IF EXISTS "Anyone can view public jobs" ON public.jobs;

-- Create a new policy that allows all authenticated users to view public jobs
CREATE POLICY "Anyone can view public jobs" 
ON public.jobs 
FOR SELECT 
TO public
USING (status = ANY (ARRAY['open'::job_status, 'in_progress'::job_status, 'completed'::job_status]));

-- Also ensure clients can always see their own jobs regardless of status
-- This policy already exists but let's make sure it's correct
DROP POLICY IF EXISTS "Clients can view own jobs" ON public.jobs;
CREATE POLICY "Clients can view own jobs" 
ON public.jobs 
FOR SELECT 
TO public
USING (client_id = auth.uid());

-- Ensure providers can see jobs assigned to them
DROP POLICY IF EXISTS "Providers can view assigned jobs" ON public.jobs;
CREATE POLICY "Providers can view assigned jobs" 
ON public.jobs 
FOR SELECT 
TO public
USING (provider_id = auth.uid());

-- Allow providers to see open jobs (for discovery)
DROP POLICY IF EXISTS "Providers can view open jobs" ON public.jobs;
CREATE POLICY "Providers can view open jobs" 
ON public.jobs 
FOR SELECT 
TO public
USING (status = 'open'::job_status);