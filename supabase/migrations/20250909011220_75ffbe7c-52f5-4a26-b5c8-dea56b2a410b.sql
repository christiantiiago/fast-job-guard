-- Add verified_at column to profiles table to track when KYC was completed
ALTER TABLE public.profiles 
ADD COLUMN verified_at TIMESTAMP WITH TIME ZONE;

-- Create function to update verified_at when all KYC documents are approved
CREATE OR REPLACE FUNCTION public.update_kyc_verification_status()
RETURNS TRIGGER AS $$
DECLARE
  user_role TEXT;
  required_docs TEXT[];
  approved_docs_count INTEGER;
  total_required INTEGER;
BEGIN
  -- Get user role from user_roles table
  SELECT role INTO user_role 
  FROM public.user_roles 
  WHERE user_id = NEW.user_id;
  
  -- Define required documents based on role
  IF user_role = 'provider' THEN
    required_docs := ARRAY['rg', 'selfie', 'address_proof', 'criminal_background'];
  ELSE
    required_docs := ARRAY['rg', 'selfie', 'address_proof'];
  END IF;
  
  -- Count approved documents for this user
  SELECT COUNT(*) INTO approved_docs_count
  FROM public.kyc_documents
  WHERE user_id = NEW.user_id 
    AND is_verified = true 
    AND document_type = ANY(required_docs);
    
  total_required := array_length(required_docs, 1);
  
  -- If all required documents are approved, update profile
  IF approved_docs_count = total_required THEN
    UPDATE public.profiles 
    SET 
      kyc_status = 'approved',
      verified_at = COALESCE(verified_at, NOW())
    WHERE user_id = NEW.user_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to run after KYC document updates
DROP TRIGGER IF EXISTS kyc_verification_update ON public.kyc_documents;
CREATE TRIGGER kyc_verification_update
  AFTER UPDATE ON public.kyc_documents
  FOR EACH ROW
  WHEN (OLD.is_verified IS DISTINCT FROM NEW.is_verified AND NEW.is_verified = true)
  EXECUTE FUNCTION public.update_kyc_verification_status();