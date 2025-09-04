-- Simple data creation for admin dashboard

DO $$
DECLARE
    admin_user_id uuid;
    test_category_id uuid;
BEGIN
    -- Get current admin user
    SELECT user_id INTO admin_user_id FROM user_roles WHERE role = 'admin' LIMIT 1;
    
    -- If no admin found, exit
    IF admin_user_id IS NULL THEN
        RETURN;
    END IF;

    -- Create a service category
    INSERT INTO service_categories (name, description, slug, icon_name, color, is_active)
    VALUES ('Limpeza', 'Serviços de limpeza', 'limpeza', 'Home', '#3B82F6', true)
    ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name
    RETURNING id INTO test_category_id;

    -- If category already exists, get its ID
    IF test_category_id IS NULL THEN
        SELECT id INTO test_category_id FROM service_categories WHERE slug = 'limpeza' LIMIT 1;
    END IF;

    -- Create sample jobs
    INSERT INTO jobs (client_id, category_id, title, description, status, budget_min, budget_max, created_at)
    VALUES 
    (admin_user_id, test_category_id, 'Limpeza Casa', 'Limpeza completa da casa', 'completed', 100.00, 200.00, now() - interval '10 days'),
    (admin_user_id, test_category_id, 'Limpeza Escritório', 'Limpeza do escritório', 'open', 150.00, 300.00, now() - interval '5 days')
    ON CONFLICT DO NOTHING;

    -- Create sample KYC documents
    INSERT INTO kyc_documents (user_id, document_type, file_url, file_name, is_verified, verified_at, verified_by, notes, created_at)
    VALUES 
    (admin_user_id, 'rg', 'https://example.com/doc1.pdf', 'documento_rg.pdf', true, now() - interval '5 days', admin_user_id, 'Aprovado', now() - interval '10 days'),
    (admin_user_id, 'selfie', 'https://example.com/selfie.jpg', 'selfie.jpg', false, NULL, NULL, NULL, now() - interval '3 days')
    ON CONFLICT DO NOTHING;

    -- Create sample audit logs
    INSERT INTO audit_logs (user_id, action, entity_type, entity_id, metadata, created_at)
    VALUES 
    (admin_user_id, 'profile_updated', 'profile', admin_user_id::text, '{"field": "name"}', now() - interval '1 hour'),
    (admin_user_id, 'job_created', 'job', (SELECT id FROM jobs WHERE client_id = admin_user_id LIMIT 1)::text, '{"title": "Limpeza Casa"}', now() - interval '10 days'),
    (admin_user_id, 'kyc_uploaded', 'kyc_document', (SELECT id FROM kyc_documents WHERE user_id = admin_user_id LIMIT 1)::text, '{"document_type": "rg"}', now() - interval '10 days')
    ON CONFLICT DO NOTHING;

    -- Update profile to ensure it has data
    UPDATE profiles SET 
        full_name = COALESCE(full_name, 'Admin Usuário'),
        phone = COALESCE(phone, '(11) 99999-9999'),
        kyc_status = 'approved'
    WHERE user_id = admin_user_id;

END $$;