-- Enable realtime for escrow_payments and job_boosts tables (without CONCURRENTLY)
-- This allows real-time updates for wallet/finance dashboards

-- Enable realtime for escrow_payments table
ALTER TABLE escrow_payments REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE escrow_payments;

-- Also enable realtime for job_boosts table if not already enabled  
ALTER TABLE job_boosts REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE job_boosts;

-- Create index for better performance on escrow release queries
CREATE INDEX IF NOT EXISTS idx_escrow_payments_release_check 
ON escrow_payments (status, release_date) 
WHERE status = 'held';