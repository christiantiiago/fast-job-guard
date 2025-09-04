-- Create counter_offers table for proposal negotiations
CREATE TABLE public.counter_offers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  proposal_id UUID NOT NULL,
  offered_by TEXT NOT NULL CHECK (offered_by IN ('client', 'provider')),
  price NUMERIC NOT NULL CHECK (price > 0),
  message TEXT NOT NULL,
  estimated_hours INTEGER,
  delivery_date TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.counter_offers ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Job parties can view counter offers"
ON public.counter_offers
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM proposals 
    JOIN jobs ON proposals.job_id = jobs.id
    WHERE proposals.id = counter_offers.proposal_id 
    AND (jobs.client_id = auth.uid() OR proposals.provider_id = auth.uid())
  )
);

CREATE POLICY "Job parties can create counter offers"
ON public.counter_offers
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM proposals 
    JOIN jobs ON proposals.job_id = jobs.id
    WHERE proposals.id = counter_offers.proposal_id 
    AND (
      (offered_by = 'client' AND jobs.client_id = auth.uid()) OR
      (offered_by = 'provider' AND proposals.provider_id = auth.uid())
    )
  )
);

CREATE POLICY "Job parties can update counter offers"
ON public.counter_offers
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM proposals 
    JOIN jobs ON proposals.job_id = jobs.id
    WHERE proposals.id = counter_offers.proposal_id 
    AND (jobs.client_id = auth.uid() OR proposals.provider_id = auth.uid())
  )
);

-- Admins can manage all counter offers
CREATE POLICY "Admins can manage all counter offers"
ON public.counter_offers
FOR ALL
USING (is_admin());

-- Create trigger for updated_at
CREATE TRIGGER update_counter_offers_updated_at
  BEFORE UPDATE ON public.counter_offers
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add index for better performance
CREATE INDEX idx_counter_offers_proposal_id ON public.counter_offers(proposal_id);
CREATE INDEX idx_counter_offers_status ON public.counter_offers(status);