-- Create provider_status table for online/offline tracking
CREATE TABLE IF NOT EXISTS public.provider_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  is_online BOOLEAN NOT NULL DEFAULT false,
  last_seen TIMESTAMPTZ DEFAULT now(),
  location_lat DOUBLE PRECISION,
  location_lng DOUBLE PRECISION,
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.provider_status ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Anyone can view provider status" ON public.provider_status FOR SELECT USING (true);
CREATE POLICY "Providers can update their own status" ON public.provider_status FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Providers can insert their own status" ON public.provider_status FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create escrow_payments table for payment holding
CREATE TABLE IF NOT EXISTS public.escrow_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  provider_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  job_id UUID,
  amount DECIMAL(10,2) NOT NULL,
  platform_fee DECIMAL(10,2) NOT NULL,
  total_amount DECIMAL(10,2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'held', 'released', 'refunded')),
  stripe_payment_intent_id TEXT,
  release_date TIMESTAMPTZ DEFAULT (now() + INTERVAL '7 days'),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.escrow_payments ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own payments" ON public.escrow_payments 
FOR SELECT USING (auth.uid() IN (client_id, provider_id));

CREATE POLICY "Service can manage all payments" ON public.escrow_payments 
FOR ALL USING (true);

-- Create direct_proposals table
CREATE TABLE IF NOT EXISTS public.direct_proposals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  provider_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  proposed_price DECIMAL(10,2) NOT NULL,
  estimated_hours INTEGER,
  deadline DATE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'cancelled')),
  client_message TEXT,
  provider_response TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.direct_proposals ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own proposals" ON public.direct_proposals 
FOR SELECT USING (auth.uid() IN (client_id, provider_id));

CREATE POLICY "Clients can create proposals" ON public.direct_proposals 
FOR INSERT WITH CHECK (auth.uid() = client_id);

CREATE POLICY "Users can update their own proposals" ON public.direct_proposals 
FOR UPDATE USING (auth.uid() IN (client_id, provider_id));

-- Create function to update provider status timestamp
CREATE OR REPLACE FUNCTION update_provider_last_seen()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  NEW.last_seen = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for provider status updates
DROP TRIGGER IF EXISTS update_provider_status_timestamp ON public.provider_status;
CREATE TRIGGER update_provider_status_timestamp
  BEFORE UPDATE ON public.provider_status
  FOR EACH ROW
  EXECUTE FUNCTION update_provider_last_seen();

-- Create function to auto-release escrow payments after 7 days
CREATE OR REPLACE FUNCTION auto_release_escrow()
RETURNS void AS $$
BEGIN
  UPDATE public.escrow_payments 
  SET status = 'released', updated_at = now()
  WHERE status = 'held' 
    AND release_date <= now()
    AND completed_at IS NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;