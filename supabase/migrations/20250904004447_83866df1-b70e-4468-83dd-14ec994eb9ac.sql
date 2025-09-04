-- Simple audit log entries for testing

DO $$
DECLARE
    admin_user_id uuid;
BEGIN
    -- Get current admin user
    SELECT user_id INTO admin_user_id FROM user_roles WHERE role = 'admin' LIMIT 1;
    
    -- If no admin found, exit
    IF admin_user_id IS NULL THEN
        RETURN;
    END IF;

    -- Create simple audit logs with proper UUID types
    INSERT INTO audit_logs (user_id, action, entity_type, entity_id, metadata, created_at)
    VALUES 
    (admin_user_id, 'profile_updated', 'profile', admin_user_id, '{"field": "name"}', now() - interval '1 hour'),
    (admin_user_id, 'admin_login', 'user', admin_user_id, '{}', now() - interval '2 hours'),
    (admin_user_id, 'dashboard_view', 'dashboard', gen_random_uuid(), '{}', now() - interval '30 minutes')
    ON CONFLICT DO NOTHING;

    -- Create a simple KYC document for testing
    INSERT INTO kyc_documents (user_id, document_type, file_url, file_name, is_verified, created_at)
    VALUES 
    (admin_user_id, 'rg', 'https://example.com/doc.pdf', 'documento.pdf', false, now() - interval '1 day')
    ON CONFLICT DO NOTHING;

END $$;