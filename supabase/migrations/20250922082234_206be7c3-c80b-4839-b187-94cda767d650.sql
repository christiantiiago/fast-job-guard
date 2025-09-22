-- Enable realtime for escrow_payments table and create indexes
-- (Skip cron setup for now since cron extension is not available)

-- Enable realtime for escrow_payments table
ALTER TABLE escrow_payments REPLICA IDENTITY FULL;

-- Add escrow_payments to realtime publication if not already added
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND tablename = 'escrow_payments'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE escrow_payments;
  END IF;
END $$;

-- Enable realtime for job_boosts table if not already enabled
ALTER TABLE job_boosts REPLICA IDENTITY FULL;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND tablename = 'job_boosts'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE job_boosts;
  END IF;
END $$;

-- Create index for better performance on escrow release queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_escrow_payments_release_check 
ON escrow_payments (status, release_date) 
WHERE status = 'held';