-- Create RLS policies for Job Fast database
-- Fix all security warnings by creating proper Row Level Security policies

-- Helper functions for RLS policies
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS user_role AS $$
BEGIN
  RETURN (
    SELECT role FROM public.user_roles 
    WHERE user_id = auth.uid() 
    LIMIT 1
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION public.is_provider()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN public.get_user_role() = 'provider';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Enable RLS on remaining tables
ALTER TABLE public.service_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fee_rules ENABLE ROW LEVEL SECURITY;

-- Policies for user_roles
CREATE POLICY "Users can view own role" ON public.user_roles
FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Admins can view all roles" ON public.user_roles
FOR SELECT USING (public.is_admin());

CREATE POLICY "Admins can manage all roles" ON public.user_roles
FOR ALL USING (public.is_admin());

-- Policies for profiles
CREATE POLICY "Users can view own profile" ON public.profiles
FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Admins can view all profiles" ON public.profiles
FOR SELECT USING (public.is_admin());

CREATE POLICY "Users can update own profile" ON public.profiles
FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can insert own profile" ON public.profiles
FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can manage all profiles" ON public.profiles
FOR ALL USING (public.is_admin());

-- Policies for service_categories (public read, admin write)
CREATE POLICY "Anyone can view categories" ON public.service_categories
FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage categories" ON public.service_categories
FOR ALL USING (public.is_admin());

-- Policies for addresses
CREATE POLICY "Users can view own addresses" ON public.addresses
FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can manage own addresses" ON public.addresses
FOR ALL USING (user_id = auth.uid());

CREATE POLICY "Admins can view all addresses" ON public.addresses
FOR SELECT USING (public.is_admin());

-- Policies for services
CREATE POLICY "Anyone can view active services" ON public.services
FOR SELECT USING (is_active = true);

CREATE POLICY "Providers can view own services" ON public.services
FOR SELECT USING (provider_id = auth.uid());

CREATE POLICY "Providers can manage own services" ON public.services
FOR ALL USING (provider_id = auth.uid());

CREATE POLICY "Admins can manage all services" ON public.services
FOR ALL USING (public.is_admin());

-- Policies for jobs
CREATE POLICY "Clients can view own jobs" ON public.jobs
FOR SELECT USING (client_id = auth.uid());

CREATE POLICY "Providers can view assigned jobs" ON public.jobs
FOR SELECT USING (provider_id = auth.uid());

CREATE POLICY "Providers can view open jobs" ON public.jobs
FOR SELECT USING (status = 'open' AND public.is_provider());

CREATE POLICY "Clients can create jobs" ON public.jobs
FOR INSERT WITH CHECK (client_id = auth.uid());

CREATE POLICY "Job parties can update jobs" ON public.jobs
FOR UPDATE USING (client_id = auth.uid() OR provider_id = auth.uid());

CREATE POLICY "Admins can manage all jobs" ON public.jobs
FOR ALL USING (public.is_admin());

-- Policies for proposals
CREATE POLICY "Providers can view own proposals" ON public.proposals
FOR SELECT USING (provider_id = auth.uid());

CREATE POLICY "Clients can view job proposals" ON public.proposals
FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.jobs WHERE id = job_id AND client_id = auth.uid())
);

CREATE POLICY "Providers can create proposals" ON public.proposals
FOR INSERT WITH CHECK (provider_id = auth.uid());

CREATE POLICY "Providers can update own proposals" ON public.proposals
FOR UPDATE USING (provider_id = auth.uid());

CREATE POLICY "Admins can manage all proposals" ON public.proposals
FOR ALL USING (public.is_admin());

-- Policies for job_messages
CREATE POLICY "Job parties can view messages" ON public.job_messages
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.jobs 
    WHERE id = job_id AND (client_id = auth.uid() OR provider_id = auth.uid())
  )
);

CREATE POLICY "Job parties can send messages" ON public.job_messages
FOR INSERT WITH CHECK (
  sender_id = auth.uid() AND
  EXISTS (
    SELECT 1 FROM public.jobs 
    WHERE id = job_id AND (client_id = auth.uid() OR provider_id = auth.uid())
  )
);

CREATE POLICY "Admins can view all messages" ON public.job_messages
FOR SELECT USING (public.is_admin());

-- Policies for payments
CREATE POLICY "Clients can view own payments" ON public.payments
FOR SELECT USING (client_id = auth.uid());

CREATE POLICY "Providers can view own payments" ON public.payments
FOR SELECT USING (provider_id = auth.uid());

CREATE POLICY "Admins can manage all payments" ON public.payments
FOR ALL USING (public.is_admin());

-- Policies for payouts
CREATE POLICY "Providers can view own payouts" ON public.payouts
FOR SELECT USING (provider_id = auth.uid());

CREATE POLICY "Admins can manage all payouts" ON public.payouts
FOR ALL USING (public.is_admin());

-- Policies for disputes
CREATE POLICY "Job parties can view disputes" ON public.disputes
FOR SELECT USING (
  opened_by_user_id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM public.jobs 
    WHERE id = job_id AND (client_id = auth.uid() OR provider_id = auth.uid())
  )
);

CREATE POLICY "Job parties can create disputes" ON public.disputes
FOR INSERT WITH CHECK (
  opened_by_user_id = auth.uid() AND
  EXISTS (
    SELECT 1 FROM public.jobs 
    WHERE id = job_id AND (client_id = auth.uid() OR provider_id = auth.uid())
  )
);

CREATE POLICY "Admins can manage all disputes" ON public.disputes
FOR ALL USING (public.is_admin());

-- Policies for reviews
CREATE POLICY "Anyone can view public reviews" ON public.reviews
FOR SELECT USING (is_public = true);

CREATE POLICY "Users can view own reviews" ON public.reviews
FOR SELECT USING (author_id = auth.uid() OR target_id = auth.uid());

CREATE POLICY "Job parties can create reviews" ON public.reviews
FOR INSERT WITH CHECK (
  author_id = auth.uid() AND
  EXISTS (
    SELECT 1 FROM public.jobs 
    WHERE id = job_id AND (client_id = auth.uid() OR provider_id = auth.uid())
  )
);

CREATE POLICY "Admins can manage all reviews" ON public.reviews
FOR ALL USING (public.is_admin());

-- Policies for kyc_documents
CREATE POLICY "Users can view own documents" ON public.kyc_documents
FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can manage own documents" ON public.kyc_documents
FOR ALL USING (user_id = auth.uid());

CREATE POLICY "Admins can manage all documents" ON public.kyc_documents
FOR ALL USING (public.is_admin());

-- Policies for provider_bank_details
CREATE POLICY "Providers can view own bank details" ON public.provider_bank_details
FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Providers can manage own bank details" ON public.provider_bank_details
FOR ALL USING (user_id = auth.uid());

CREATE POLICY "Admins can view all bank details" ON public.provider_bank_details
FOR SELECT USING (public.is_admin());

-- Policies for subscriptions
CREATE POLICY "Users can view own subscriptions" ON public.subscriptions
FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can manage own subscriptions" ON public.subscriptions
FOR ALL USING (user_id = auth.uid());

CREATE POLICY "Admins can view all subscriptions" ON public.subscriptions
FOR SELECT USING (public.is_admin());

-- Policies for fee_rules (read-only for users, admin-only for writes)
CREATE POLICY "Anyone can view active fee rules" ON public.fee_rules
FOR SELECT TO authenticated USING (is_active = true);

CREATE POLICY "Admins can manage fee rules" ON public.fee_rules
FOR ALL USING (public.is_admin());

-- Policies for notifications
CREATE POLICY "Users can view own notifications" ON public.notifications
FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can update own notifications" ON public.notifications
FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "System can create notifications" ON public.notifications
FOR INSERT WITH CHECK (true);

CREATE POLICY "Admins can manage all notifications" ON public.notifications
FOR ALL USING (public.is_admin());

-- Policies for audit_logs (admin only)
CREATE POLICY "Admins can view audit logs" ON public.audit_logs
FOR SELECT USING (public.is_admin());

CREATE POLICY "System can create audit logs" ON public.audit_logs
FOR INSERT WITH CHECK (true);

-- Policies for service_areas
CREATE POLICY "Providers can view own service areas" ON public.service_areas
FOR SELECT USING (provider_id = auth.uid());

CREATE POLICY "Providers can manage own service areas" ON public.service_areas
FOR ALL USING (provider_id = auth.uid());

CREATE POLICY "Anyone can view service areas for discovery" ON public.service_areas
FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage all service areas" ON public.service_areas
FOR ALL USING (public.is_admin());