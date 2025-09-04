-- Create sample data for admin dashboard using existing user or admin account

DO $$
DECLARE
    admin_user_id uuid;
    current_user_id uuid;
    test_category_id uuid;
    test_job_id uuid;
BEGIN
    -- Get current admin user
    SELECT user_id INTO admin_user_id FROM user_roles WHERE role = 'admin' LIMIT 1;
    
    -- If no admin found, use any existing user
    IF admin_user_id IS NULL THEN
        SELECT user_id INTO admin_user_id FROM profiles LIMIT 1;
    END IF;
    
    -- If still no user, exit
    IF admin_user_id IS NULL THEN
        RETURN;
    END IF;

    -- Update admin profile with complete info
    UPDATE profiles SET 
        full_name = COALESCE(full_name, 'Admin User'),
        phone = COALESCE(phone, '(11) 99999-0000'),
        document_number = COALESCE(document_number, '000.000.000-00'),
        kyc_status = 'approved',
        is_verified = true
    WHERE user_id = admin_user_id;

    -- Create a service category if not exists
    INSERT INTO service_categories (name, description, slug, icon_name, color, is_active)
    VALUES ('Limpeza Residencial', 'Serviços de limpeza para residências', 'limpeza-residencial', 'Home', '#3B82F6', true)
    ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name
    RETURNING id INTO test_category_id;

    -- If category already exists, get its ID
    IF test_category_id IS NULL THEN
        SELECT id INTO test_category_id FROM service_categories WHERE slug = 'limpeza-residencial' LIMIT 1;
    END IF;

    -- Create sample jobs using admin as both client and provider for testing
    INSERT INTO jobs (client_id, provider_id, category_id, title, description, status, budget_min, budget_max, final_price, created_at, updated_at)
    VALUES 
    (admin_user_id, admin_user_id, test_category_id, 'Limpeza Completa Casa', 'Preciso de limpeza completa da casa, incluindo cozinha, banheiros e quartos', 'completed', 150.00, 250.00, 200.00, now() - interval '20 days', now() - interval '18 days'),
    (admin_user_id, NULL, test_category_id, 'Limpeza Pós Obra', 'Limpeza após reforma da sala', 'open', 300.00, 500.00, NULL, now() - interval '5 days', now() - interval '5 days'),
    (admin_user_id, admin_user_id, test_category_id, 'Limpeza Escritório', 'Limpeza semanal do escritório', 'in_progress', 100.00, 180.00, 150.00, now() - interval '10 days', now() - interval '8 days')
    ON CONFLICT DO NOTHING;

    -- Get one of the created jobs
    SELECT id INTO test_job_id FROM jobs WHERE client_id = admin_user_id LIMIT 1;

    -- Create sample payments
    INSERT INTO payments (job_id, client_id, provider_id, amount, status, provider, method, client_fee, provider_fee, platform_fee, net_amount, created_at)
    VALUES 
    (test_job_id, admin_user_id, admin_user_id, 200.00, 'released', 'stripe', 'credit_card', 10.00, 10.00, 20.00, 180.00, now() - interval '15 days'),
    (test_job_id, admin_user_id, admin_user_id, 150.00, 'held', 'stripe', 'credit_card', 7.50, 7.50, 15.00, 135.00, now() - interval '7 days')
    ON CONFLICT DO NOTHING;

    -- Create sample KYC documents
    INSERT INTO kyc_documents (user_id, document_type, file_url, file_name, is_verified, created_at, verified_at, verified_by, notes)
    VALUES 
    (admin_user_id, 'rg', 'https://example.com/doc1.pdf', 'rg_admin.pdf', true, now() - interval '25 days', now() - interval '20 days', admin_user_id, 'Documento aprovado'),
    (admin_user_id, 'selfie', 'https://example.com/doc2.jpg', 'selfie_admin.jpg', false, now() - interval '12 days', NULL, NULL, NULL)
    ON CONFLICT DO NOTHING;

    -- Create sample audit logs for activity tracking
    INSERT INTO audit_logs (user_id, action, entity_type, entity_id, metadata, created_at, ip_address)
    VALUES 
    (admin_user_id, 'profile_updated', 'profile', admin_user_id::text, '{"field": "phone"}', now() - interval '2 hours', '192.168.1.1'),
    (admin_user_id, 'job_created', 'job', test_job_id::text, '{"title": "Limpeza Pós Obra"}', now() - interval '5 days', '192.168.1.2'),
    (admin_user_id, 'payment_processed', 'payment', gen_random_uuid()::text, '{"amount": 200}', now() - interval '15 days', '192.168.1.1'),
    (admin_user_id, 'kyc_uploaded', 'kyc_document', (SELECT id FROM kyc_documents WHERE user_id = admin_user_id LIMIT 1)::text, '{"document_type": "rg"}', now() - interval '12 days', '192.168.1.2'),
    (admin_user_id, 'kyc_approve', 'kyc_document', (SELECT id FROM kyc_documents WHERE user_id = admin_user_id LIMIT 1)::text, '{"notes": "Documento aprovado"}', now() - interval '20 days', '192.168.1.100')
    ON CONFLICT DO NOTHING;

    -- Create sample disputes
    INSERT INTO disputes (job_id, opened_by_user_id, reason, description, status, created_at)
    VALUES 
    (test_job_id, admin_user_id, 'quality_issue', 'O serviço não foi executado conforme combinado', 'open', now() - interval '3 days')
    ON CONFLICT DO NOTHING;

    -- Create sample notifications
    INSERT INTO notifications (user_id, type, title, message, created_at, is_read)
    VALUES 
    (admin_user_id, 'job_completed', 'Trabalho Concluído', 'Seu trabalho foi marcado como concluído', now() - interval '15 days', true),
    (admin_user_id, 'kyc_pending', 'KYC Pendente', 'Seus documentos estão em análise', now() - interval '12 days', false),
    (admin_user_id, 'payment_received', 'Pagamento Recebido', 'Você recebeu um novo pagamento', now() - interval '7 days', true)
    ON CONFLICT DO NOTHING;

END $$;