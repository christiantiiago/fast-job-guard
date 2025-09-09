-- Create database function to check if provider can propose
CREATE OR REPLACE FUNCTION can_provider_propose(provider_user_id UUID, job_uuid UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    rejection_record RECORD;
    active_proposals_count INTEGER;
BEGIN
    -- Check if there's an active rejection with cooldown
    SELECT * INTO rejection_record
    FROM proposal_rejections
    WHERE provider_id = provider_user_id
      AND job_id = job_uuid
      AND can_propose_again_at > NOW();
    
    -- If there's an active rejection, return false
    IF rejection_record IS NOT NULL THEN
        RETURN FALSE;
    END IF;
    
    -- Check if provider already has an active proposal for this job
    SELECT COUNT(*) INTO active_proposals_count
    FROM proposals
    WHERE provider_id = provider_user_id
      AND job_id = job_uuid
      AND status IN ('sent', 'accepted');
    
    -- If already has active proposal, return false
    IF active_proposals_count > 0 THEN
        RETURN FALSE;
    END IF;
    
    -- Check total active proposals (limit to 3)
    SELECT COUNT(*) INTO active_proposals_count
    FROM proposals
    WHERE provider_id = provider_user_id
      AND status IN ('sent', 'accepted');
    
    -- If has 3 or more active proposals, return false
    IF active_proposals_count >= 3 THEN
        RETURN FALSE;
    END IF;
    
    -- All checks passed, can propose
    RETURN TRUE;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION can_provider_propose(UUID, UUID) TO authenticated;