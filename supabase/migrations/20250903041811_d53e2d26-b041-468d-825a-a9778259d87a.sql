-- Create tables for advanced admin system with AI and monitoring

-- Create activity events table for real-time tracking
CREATE TABLE IF NOT EXISTS public.activity_events (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    event_type text NOT NULL,
    entity_type text NOT NULL,
    entity_id uuid,
    metadata jsonb DEFAULT '{}',
    ip_address inet,
    user_agent text,
    location text,
    risk_score integer DEFAULT 0,
    is_suspicious boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now()
);

-- Create fraud analysis logs table
CREATE TABLE IF NOT EXISTS public.fraud_analysis_logs (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    type text NOT NULL CHECK (type IN ('kyc_document', 'job_posting', 'user_behavior')),
    entity_id uuid,
    risk_level text NOT NULL CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),
    risk_score integer NOT NULL CHECK (risk_score BETWEEN 0 AND 100),
    fraud_indicators jsonb DEFAULT '[]',
    recommendations jsonb DEFAULT '[]',
    ai_analysis text,
    requires_review boolean DEFAULT false,
    metadata jsonb DEFAULT '{}',
    created_at timestamp with time zone DEFAULT now()
);

-- Create admin alerts table
CREATE TABLE IF NOT EXISTS public.admin_alerts (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    type text NOT NULL CHECK (type IN ('security', 'fraud', 'system', 'compliance', 'performance')),
    severity text NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    title text NOT NULL,
    message text NOT NULL,
    entity_type text,
    entity_id uuid,
    metadata jsonb DEFAULT '{}',
    status text DEFAULT 'active' CHECK (status IN ('active', 'acknowledged', 'resolved', 'dismissed')),
    created_at timestamp with time zone DEFAULT now(),
    acknowledged_at timestamp with time zone,
    acknowledged_by uuid REFERENCES auth.users(id),
    resolved_at timestamp with time zone,
    resolved_by uuid REFERENCES auth.users(id),
    auto_dismiss_at timestamp with time zone
);

-- Create system configuration table
CREATE TABLE IF NOT EXISTS public.system_configs (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    category text NOT NULL,
    key text NOT NULL,
    value jsonb NOT NULL,
    description text,
    is_public boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    UNIQUE(category, key)
);

-- Enable RLS on all tables
ALTER TABLE public.activity_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fraud_analysis_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_configs ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for activity_events
CREATE POLICY "Admins can manage all activity events" ON public.activity_events
    FOR ALL USING (is_admin());

CREATE POLICY "Users can create their own activity events" ON public.activity_events
    FOR INSERT WITH CHECK (user_id = auth.uid());

-- Create RLS policies for fraud_analysis_logs  
CREATE POLICY "Admins can manage all fraud analysis logs" ON public.fraud_analysis_logs
    FOR ALL USING (is_admin());

-- Create RLS policies for admin_alerts
CREATE POLICY "Admins can manage all alerts" ON public.admin_alerts
    FOR ALL USING (is_admin());

-- Create RLS policies for system_configs
CREATE POLICY "Admins can manage all system configs" ON public.system_configs
    FOR ALL USING (is_admin());

CREATE POLICY "Anyone can view public system configs" ON public.system_configs
    FOR SELECT USING (is_public = true);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_activity_events_user_id ON public.activity_events(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_events_event_type ON public.activity_events(event_type);
CREATE INDEX IF NOT EXISTS idx_activity_events_created_at ON public.activity_events(created_at);
CREATE INDEX IF NOT EXISTS idx_activity_events_is_suspicious ON public.activity_events(is_suspicious);

CREATE INDEX IF NOT EXISTS idx_fraud_analysis_logs_type ON public.fraud_analysis_logs(type);
CREATE INDEX IF NOT EXISTS idx_fraud_analysis_logs_risk_level ON public.fraud_analysis_logs(risk_level);
CREATE INDEX IF NOT EXISTS idx_fraud_analysis_logs_created_at ON public.fraud_analysis_logs(created_at);

CREATE INDEX IF NOT EXISTS idx_admin_alerts_type ON public.admin_alerts(type);
CREATE INDEX IF NOT EXISTS idx_admin_alerts_severity ON public.admin_alerts(severity);
CREATE INDEX IF NOT EXISTS idx_admin_alerts_status ON public.admin_alerts(status);
CREATE INDEX IF NOT EXISTS idx_admin_alerts_created_at ON public.admin_alerts(created_at);

CREATE INDEX IF NOT EXISTS idx_system_configs_category ON public.system_configs(category);
CREATE INDEX IF NOT EXISTS idx_system_configs_key ON public.system_configs(key);

-- Insert default system configurations
INSERT INTO public.system_configs (category, key, value, description, is_public) VALUES
    ('security', 'facial_auth_required', 'true', 'Require facial authentication for admin actions', false),
    ('security', 'session_timeout', '3600', 'Session timeout in seconds', false),
    ('security', 'max_login_attempts', '5', 'Maximum login attempts before lockout', false),
    ('security', 'lockout_duration', '1800', 'Account lockout duration in seconds', false),
    ('fraud_detection', 'auto_flag_threshold', '70', 'Auto-flag jobs above this risk score', false),
    ('fraud_detection', 'auto_review_threshold', '40', 'Auto-review jobs above this risk score', false),
    ('fraud_detection', 'ai_analysis_enabled', 'true', 'Enable AI-powered fraud analysis', false),
    ('alerts', 'email_notifications', 'true', 'Send email notifications for alerts', false),
    ('alerts', 'sms_notifications', 'false', 'Send SMS notifications for critical alerts', false),
    ('performance', 'analytics_retention_days', '90', 'Days to retain analytics data', false)
ON CONFLICT (category, key) DO NOTHING;

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for system_configs
CREATE TRIGGER update_system_configs_updated_at
    BEFORE UPDATE ON public.system_configs
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Enable real-time subscriptions
ALTER PUBLICATION supabase_realtime ADD TABLE public.activity_events;
ALTER PUBLICATION supabase_realtime ADD TABLE public.fraud_analysis_logs;
ALTER PUBLICATION supabase_realtime ADD TABLE public.admin_alerts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.system_configs;