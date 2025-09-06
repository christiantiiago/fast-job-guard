-- Phase 2: Database Security Hardening

-- 1. Enable RLS on spatial_ref_sys table (if it exists and doesn't have RLS)
-- Check if spatial_ref_sys exists and enable RLS if needed
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'spatial_ref_sys') THEN
        -- Enable RLS on spatial_ref_sys to restrict access
        ALTER TABLE public.spatial_ref_sys ENABLE ROW LEVEL SECURITY;
        
        -- Only allow authenticated users to read spatial reference data
        CREATE POLICY "Authenticated users can view spatial_ref_sys" ON public.spatial_ref_sys
        FOR SELECT TO authenticated
        USING (true);
        
        RAISE NOTICE 'RLS enabled on spatial_ref_sys table';
    END IF;
END $$;

-- 2. Create secure helper functions with proper search_path
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public;

CREATE OR REPLACE FUNCTION public.is_provider()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'provider'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public;

-- 3. Add security constraints to user_roles table
-- Prevent users from assigning admin roles to themselves
DROP POLICY IF EXISTS "Users can view own role" ON public.user_roles;
CREATE POLICY "Users can view own role" ON public.user_roles
FOR SELECT USING (user_id = auth.uid());

-- Only admins can insert/update roles
DROP POLICY IF EXISTS "Allow system to create user roles" ON public.user_roles;
CREATE POLICY "System and admins can create user roles" ON public.user_roles
FOR INSERT 
WITH CHECK (
  -- Allow system/trigger creation OR admin assignment
  auth.uid() IS NULL OR public.is_admin()
);

-- Add policy to prevent role escalation
CREATE POLICY "Only admins can update roles" ON public.user_roles
FOR UPDATE 
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- 4. Add audit logging for critical security events
CREATE OR REPLACE FUNCTION public.log_role_changes()
RETURNS TRIGGER AS $$
BEGIN
  -- Log role changes to audit_logs
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.audit_logs (
      entity_type,
      entity_id,
      action,
      user_id,
      new_values,
      ip_address,
      user_agent
    ) VALUES (
      'user_roles',
      NEW.id,
      'role_assigned',
      auth.uid(),
      jsonb_build_object('user_id', NEW.user_id, 'role', NEW.role),
      inet_client_addr(),
      current_setting('request.headers', true)::jsonb->>'user-agent'
    );
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO public.audit_logs (
      entity_type,
      entity_id,
      action,
      user_id,
      old_values,
      new_values,
      ip_address,
      user_agent
    ) VALUES (
      'user_roles',
      NEW.id,
      'role_changed',
      auth.uid(),
      jsonb_build_object('role', OLD.role),
      jsonb_build_object('role', NEW.role),
      inet_client_addr(),
      current_setting('request.headers', true)::jsonb->>'user-agent'
    );
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.audit_logs (
      entity_type,
      entity_id,
      action,
      user_id,
      old_values,
      ip_address,
      user_agent
    ) VALUES (
      'user_roles',
      OLD.id,
      'role_removed',
      auth.uid(),
      jsonb_build_object('user_id', OLD.user_id, 'role', OLD.role),
      inet_client_addr(),
      current_setting('request.headers', true)::jsonb->>'user-agent'
    );
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for role change logging
DROP TRIGGER IF EXISTS role_changes_audit_trigger ON public.user_roles;
CREATE TRIGGER role_changes_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.user_roles
  FOR EACH ROW EXECUTE FUNCTION public.log_role_changes();

-- 5. Add security alerts for admin role assignments
CREATE OR REPLACE FUNCTION public.create_admin_role_alert()
RETURNS TRIGGER AS $$
BEGIN
  -- Create alert when admin role is assigned
  IF NEW.role = 'admin' THEN
    INSERT INTO public.admin_alerts (
      type,
      severity,
      title,
      message,
      entity_type,
      entity_id,
      metadata
    ) VALUES (
      'security',
      'high',
      'Admin Role Assigned',
      'Admin role was assigned to user ' || NEW.user_id::text,
      'user_roles',
      NEW.id,
      jsonb_build_object(
        'assigned_by', auth.uid(),
        'assigned_to', NEW.user_id,
        'timestamp', now()
      )
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for admin role alerts
DROP TRIGGER IF EXISTS admin_role_alert_trigger ON public.user_roles;
CREATE TRIGGER admin_role_alert_trigger
  AFTER INSERT ON public.user_roles
  FOR EACH ROW 
  WHEN (NEW.role = 'admin')
  EXECUTE FUNCTION public.create_admin_role_alert();