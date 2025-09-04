-- Populate database with sample data for admin dashboard testing

-- First, ensure we have some test users with profiles
DO $$
DECLARE
    test_user_1 uuid := 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
    test_user_2 uuid := 'b2c3d4e5-f6a7-8901-bcde-f23456789012';
    test_user_3 uuid := 'c3d4e5f6-a7b8-9012-cdef-345678901234';
    test_user_4 uuid := 'd4e5f6a7-b8c9-0123-def4-456789012345';
    test_category_id uuid;
    test_job_id uuid;
BEGIN
    -- Create test profiles if they don't exist
    INSERT INTO profiles (user_id, full_name, phone, document_number, kyc_status, is_verified, created_at, birth_date)
    VALUES 
    (test_user_1, 'João Silva', '(11) 99999-1111', '123.456.789-01', 'approved', true, now() - interval '30 days', '1990-05-15'),
    (test_user_2, 'Maria Santos', '(11) 99999-2222', '987.654.321-02', 'pending', false, now() - interval '15 days', '1985-08-22'),
    (test_user_3, 'Pedro Costa', '(11) 99999-3333', '456.789.123-03', 'incomplete', false, now() - interval '7 days', '1992-11-10'),
    (test_user_4, 'Ana Oliveira', '(11) 99999-4444', '789.123.456-04', 'approved', true, now() - interval '45 days', '1988-03-18')
    ON CONFLICT (user_id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    phone = EXCLUDED.phone,
    document_number = EXCLUDED.document_number;

    -- Create user roles
    INSERT INTO user_roles (user_id, role)
    VALUES 
    (test_user_1, 'provider'),
    (test_user_2, 'client'),
    (test_user_3, 'client'),
    (test_user_4, 'provider')
    ON CONFLICT (user_id, role) DO NOTHING;

    -- Create a service category
    INSERT INTO service_categories (name, description, slug, icon_name, color, is_active)
    VALUES ('Limpeza Residencial', 'Serviços de limpeza para residências', 'limpeza-residencial', 'Home', '#3B82F6', true)
    ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name
    RETURNING id INTO test_category_id;

    -- If category already exists, get its ID
    IF test_category_id IS NULL THEN
        SELECT id INTO test_category_id FROM service_categories WHERE slug = 'limpeza-residencial' LIMIT 1;
    END IF;

    -- Create test jobs
    INSERT INTO jobs (client_id, provider_id, category_id, title, description, status, budget_min, budget_max, final_price, created_at, updated_at)
    VALUES 
    (test_user_2, test_user_1, test_category_id, 'Limpeza Completa Casa', 'Preciso de limpeza completa da casa, incluindo cozinha, banheiros e quartos', 'completed', 150.00, 250.00, 200.00, now() - interval '20 days', now() - interval '18 days'),
    (test_user_3, NULL, test_category_id, 'Limpeza Pós Obra', 'Limpeza após reforma da sala', 'open', 300.00, 500.00, NULL, now() - interval '5 days', now() - interval '5 days'),
    (test_user_2, test_user_4, test_category_id, 'Limpeza Escritório', 'Limpeza semanal do escritório', 'in_progress', 100.00, 180.00, 150.00, now() - interval '10 days', now() - interval '8 days')
    RETURNING id INTO test_job_id;

    -- Create test payments
    INSERT INTO payments (job_id, client_id, provider_id, amount, status, provider, method, client_fee, provider_fee, platform_fee, net_amount, created_at)
    VALUES 
    ((SELECT id FROM jobs WHERE title = 'Limpeza Completa Casa' LIMIT 1), test_user_2, test_user_1, 200.00, 'released', 'stripe', 'credit_card', 10.00, 10.00, 20.00, 180.00, now() - interval '15 days'),
    ((SELECT id FROM jobs WHERE title = 'Limpeza Escritório' LIMIT 1), test_user_2, test_user_4, 150.00, 'held', 'stripe', 'credit_card', 7.50, 7.50, 15.00, 135.00, now() - interval '7 days');

    -- Create test KYC documents
    INSERT INTO kyc_documents (user_id, document_type, file_url, file_name, is_verified, created_at, verified_at, verified_by, notes)
    VALUES 
    (test_user_1, 'rg', 'https://example.com/doc1.pdf', 'rg_joao.pdf', true, now() - interval '25 days', now() - interval '20 days', (SELECT user_id FROM user_roles WHERE role = 'admin' LIMIT 1), 'Documento aprovado'),
    (test_user_1, 'selfie', 'https://example.com/doc2.jpg', 'selfie_joao.jpg', true, now() - interval '25 days', now() - interval '20 days', (SELECT user_id FROM user_roles WHERE role = 'admin' LIMIT 1), 'Selfie aprovada'),
    (test_user_2, 'rg', 'https://example.com/doc3.pdf', 'rg_maria.pdf', false, now() - interval '12 days', NULL, NULL, NULL),
    (test_user_2, 'selfie', 'https://example.com/doc4.jpg', 'selfie_maria.jpg', false, now() - interval '12 days', NULL, NULL, NULL),
    (test_user_4, 'rg', 'https://example.com/doc5.pdf', 'rg_ana.pdf', true, now() - interval '40 days', now() - interval '35 days', (SELECT user_id FROM user_roles WHERE role = 'admin' LIMIT 1), 'Documento aprovado'),
    (test_user_4, 'selfie', 'https://example.com/doc6.jpg', 'selfie_ana.jpg', true, now() - interval '40 days', now() - interval '35 days', (SELECT user_id FROM user_roles WHERE role = 'admin' LIMIT 1), 'Selfie aprovada');

    -- Create test audit logs for activity tracking
    INSERT INTO audit_logs (user_id, action, entity_type, entity_id, metadata, created_at, ip_address)
    VALUES 
    (test_user_1, 'profile_updated', 'profile', test_user_1::text, '{"field": "phone"}', now() - interval '2 hours', '192.168.1.1'),
    (test_user_2, 'job_created', 'job', (SELECT id FROM jobs WHERE title = 'Limpeza Pós Obra' LIMIT 1)::text, '{"title": "Limpeza Pós Obra"}', now() - interval '5 days', '192.168.1.2'),
    (test_user_3, 'proposal_sent', 'proposal', gen_random_uuid()::text, '{"amount": 350}', now() - interval '4 days', '192.168.1.3'),
    (test_user_1, 'payment_processed', 'payment', gen_random_uuid()::text, '{"amount": 200}', now() - interval '15 days', '192.168.1.1'),
    (test_user_2, 'kyc_uploaded', 'kyc_document', (SELECT id FROM kyc_documents WHERE user_id = test_user_2 LIMIT 1)::text, '{"document_type": "rg"}', now() - interval '12 days', '192.168.1.2'),
    ((SELECT user_id FROM user_roles WHERE role = 'admin' LIMIT 1), 'kyc_approve', 'kyc_document', (SELECT id FROM kyc_documents WHERE user_id = test_user_1 LIMIT 1)::text, '{"notes": "Documento aprovado"}', now() - interval '20 days', '192.168.1.100');

    -- Create test disputes
    INSERT INTO disputes (job_id, opened_by_user_id, reason, description, status, created_at)
    VALUES 
    ((SELECT id FROM jobs WHERE title = 'Limpeza Escritório' LIMIT 1), test_user_2, 'quality_issue', 'O serviço não foi executado conforme combinado', 'open', now() - interval '3 days');

    -- Create test notifications
    INSERT INTO notifications (user_id, type, title, message, created_at, is_read)
    VALUES 
    (test_user_1, 'job_completed', 'Trabalho Concluído', 'Seu trabalho foi marcado como concluído', now() - interval '15 days', true),
    (test_user_2, 'kyc_pending', 'KYC Pendente', 'Seus documentos estão em análise', now() - interval '12 days', false),
    (test_user_4, 'payment_received', 'Pagamento Recebido', 'Você recebeu um novo pagamento', now() - interval '7 days', true);

END $$;