-- Create facial enrollment table
CREATE TABLE public.facial_enrollment (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  reference_photo_url TEXT NOT NULL,
  face_embedding JSONB NOT NULL,
  quality_score NUMERIC NOT NULL CHECK (quality_score >= 0 AND quality_score <= 100),
  enrollment_completed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  is_active BOOLEAN NOT NULL DEFAULT true,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create facial verification logs table
CREATE TABLE public.facial_verification_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  verification_photo_url TEXT,
  confidence_score NUMERIC CHECK (confidence_score >= 0 AND confidence_score <= 100),
  verification_result BOOLEAN NOT NULL,
  failure_reason TEXT,
  ip_address INET,
  user_agent TEXT,
  action_requested TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.facial_enrollment ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.facial_verification_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for facial_enrollment
CREATE POLICY "Admins can manage all facial enrollments" 
ON public.facial_enrollment 
FOR ALL 
USING (is_admin());

CREATE POLICY "Users can view their own facial enrollment" 
ON public.facial_enrollment 
FOR SELECT 
USING (user_id = auth.uid());

CREATE POLICY "Users can create their own facial enrollment" 
ON public.facial_enrollment 
FOR INSERT 
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own facial enrollment" 
ON public.facial_enrollment 
FOR UPDATE 
USING (user_id = auth.uid());

-- RLS Policies for facial_verification_logs
CREATE POLICY "Admins can manage all verification logs" 
ON public.facial_verification_logs 
FOR ALL 
USING (is_admin());

CREATE POLICY "Users can view their own verification logs" 
ON public.facial_verification_logs 
FOR SELECT 
USING (user_id = auth.uid());

CREATE POLICY "System can create verification logs" 
ON public.facial_verification_logs 
FOR INSERT 
WITH CHECK (true);

-- Add facial enrollment status to profiles
ALTER TABLE public.profiles 
ADD COLUMN facial_enrollment_status TEXT DEFAULT 'pending' CHECK (facial_enrollment_status IN ('pending', 'completed', 'failed', 'blocked')),
ADD COLUMN facial_enrollment_completed_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN last_facial_verification_at TIMESTAMP WITH TIME ZONE;

-- Create function to update updated_at timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger for facial_enrollment
CREATE TRIGGER update_facial_enrollment_updated_at
BEFORE UPDATE ON public.facial_enrollment
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX idx_facial_enrollment_user_id ON public.facial_enrollment(user_id);
CREATE INDEX idx_facial_enrollment_active ON public.facial_enrollment(user_id, is_active) WHERE is_active = true;
CREATE INDEX idx_facial_verification_logs_user_id ON public.facial_verification_logs(user_id);
CREATE INDEX idx_facial_verification_logs_created_at ON public.facial_verification_logs(created_at DESC);
CREATE INDEX idx_profiles_facial_status ON public.profiles(facial_enrollment_status);