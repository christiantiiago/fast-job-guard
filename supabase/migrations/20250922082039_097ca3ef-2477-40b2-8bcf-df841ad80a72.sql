-- Add automatic escrow release trigger and setup cron job
-- First, add a trigger to check for escrow releases that need processing

-- Create a function to handle escrow release notifications
CREATE OR REPLACE FUNCTION public.schedule_escrow_release_check()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- This function will be called by cron to trigger the release check
  -- The actual processing happens in the Edge Function
  PERFORM pg_notify('escrow_release_check', 'check_needed');
END;
$$;

-- Setup cron job to run every hour to check for escrow releases
SELECT cron.schedule(
  'auto-release-escrow-hourly',
  '0 * * * *', -- Every hour at minute 0
  $$
  SELECT net.http_post(
    url := 'https://yelytezcifyrykxvlbok.supabase.co/functions/v1/auto-release-escrow-cron',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InllbHl0ZXpjaWZ5cnlreHZsYm9rIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY3ODEwMTEsImV4cCI6MjA3MjM1NzAxMX0.GoB7I_naVGsVIhZgAaQoQBjTJijJZ-sbEATYZlbAw-k"}'::jsonb,
    body := '{"triggered_by": "cron"}'::jsonb
  );
  $$
);

-- Create index for better performance on escrow release queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_escrow_payments_release_check 
ON escrow_payments (status, release_date) 
WHERE status = 'held';

-- Enable realtime for escrow_payments table
ALTER TABLE escrow_payments REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE escrow_payments;

-- Also enable realtime for job_boosts table if not already enabled
ALTER TABLE job_boosts REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE job_boosts;