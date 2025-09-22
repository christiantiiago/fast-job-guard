-- Clean up duplicate escrow payments and add constraints

-- First, let's identify and clean up duplicates, keeping only the most recent one per job
WITH duplicates AS (
  SELECT 
    id,
    job_id,
    ROW_NUMBER() OVER (PARTITION BY job_id ORDER BY created_at DESC) as rn
  FROM escrow_payments 
  WHERE status = 'pending'
)
DELETE FROM escrow_payments 
WHERE id IN (
  SELECT id FROM duplicates WHERE rn > 1
);

-- Add unique constraint to prevent multiple pending payments per job
ALTER TABLE escrow_payments 
ADD CONSTRAINT unique_pending_payment_per_job 
EXCLUDE (job_id WITH =) 
WHERE (status IN ('pending', 'held'));

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_escrow_payments_job_status 
ON escrow_payments(job_id, status);

-- Update jobs that have confirmed escrow payments but wrong status
UPDATE jobs 
SET 
  status = 'in_progress',
  provider_id = ep.provider_id,
  final_price = ep.amount,
  updated_at = now()
FROM escrow_payments ep
WHERE jobs.id = ep.job_id 
  AND ep.status = 'held'
  AND jobs.status != 'in_progress'
  AND jobs.provider_id IS NULL;

-- Create function to prevent duplicate escrow payments
CREATE OR REPLACE FUNCTION prevent_duplicate_escrow_payments()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if there's already a pending or held payment for this job
  IF EXISTS (
    SELECT 1 FROM escrow_payments 
    WHERE job_id = NEW.job_id 
    AND status IN ('pending', 'held')
    AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
  ) THEN
    RAISE EXCEPTION 'Job already has a pending or held escrow payment';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to prevent duplicates
DROP TRIGGER IF EXISTS trigger_prevent_duplicate_escrow_payments ON escrow_payments;
CREATE TRIGGER trigger_prevent_duplicate_escrow_payments
  BEFORE INSERT OR UPDATE ON escrow_payments
  FOR EACH ROW
  EXECUTE FUNCTION prevent_duplicate_escrow_payments();