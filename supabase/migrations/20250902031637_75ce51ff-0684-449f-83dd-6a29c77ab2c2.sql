-- Job Fast Database Schema
-- Complete marketplace structure with KYC, payments, and admin features

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";

-- User roles enum
CREATE TYPE user_role AS ENUM ('client', 'provider', 'admin');
CREATE TYPE kyc_status AS ENUM ('pending', 'approved', 'rejected', 'incomplete');
CREATE TYPE job_status AS ENUM ('draft', 'open', 'in_proposal', 'in_progress', 'delivered', 'completed', 'cancelled', 'disputed');
CREATE TYPE proposal_status AS ENUM ('sent', 'accepted', 'rejected', 'withdrawn');
CREATE TYPE payment_status AS ENUM ('pending', 'held', 'captured', 'released', 'refunded', 'failed');
CREATE TYPE payment_provider AS ENUM ('stripe', 'mercadopago');
CREATE TYPE payment_method AS ENUM ('card', 'pix', 'boleto');
CREATE TYPE dispute_status AS ENUM ('open', 'in_review', 'resolved_refund', 'resolved_release');
CREATE TYPE payout_status AS ENUM ('pending', 'paid', 'failed');
CREATE TYPE subscription_status AS ENUM ('active', 'past_due', 'canceled', 'incomplete');
CREATE TYPE document_type AS ENUM ('rg', 'cpf', 'selfie', 'address_proof', 'bank_info');

-- User roles table
CREATE TABLE public.user_roles (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role user_role NOT NULL DEFAULT 'client',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id)
);

-- User profiles
CREATE TABLE public.profiles (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    full_name TEXT,
    avatar_url TEXT,
    phone TEXT,
    document_number TEXT,
    birth_date DATE,
    kyc_status kyc_status DEFAULT 'incomplete',
    kyc_notes TEXT,
    rating_avg DECIMAL(3,2) DEFAULT 0,
    rating_count INTEGER DEFAULT 0,
    is_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id)
);

-- Service categories
CREATE TABLE public.service_categories (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    description TEXT,
    icon_name TEXT,
    color TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Addresses
CREATE TABLE public.addresses (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    label TEXT,
    street TEXT NOT NULL,
    number TEXT,
    complement TEXT,
    neighborhood TEXT,
    city TEXT NOT NULL,
    state TEXT NOT NULL,
    country TEXT DEFAULT 'Brasil',
    zipcode TEXT,
    latitude DECIMAL(10,8),
    longitude DECIMAL(11,8),
    is_primary BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Services offered by providers
CREATE TABLE public.services (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    provider_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    category_id UUID REFERENCES public.service_categories(id) NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    base_price DECIMAL(10,2),
    is_active BOOLEAN DEFAULT TRUE,
    service_area_radius INTEGER DEFAULT 10, -- km
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Jobs posted by clients
CREATE TABLE public.jobs (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    client_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    provider_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    category_id UUID REFERENCES public.service_categories(id) NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    status job_status DEFAULT 'draft',
    budget_min DECIMAL(10,2),
    budget_max DECIMAL(10,2),
    final_price DECIMAL(10,2),
    address_id UUID REFERENCES public.addresses(id),
    latitude DECIMAL(10,8),
    longitude DECIMAL(11,8),
    scheduled_at TIMESTAMPTZ,
    images TEXT[], -- array of image URLs
    requirements TEXT,
    deadline_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Proposals from providers
CREATE TABLE public.proposals (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    job_id UUID REFERENCES public.jobs(id) ON DELETE CASCADE NOT NULL,
    provider_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    message TEXT,
    price DECIMAL(10,2) NOT NULL,
    estimated_hours INTEGER,
    delivery_date TIMESTAMPTZ,
    status proposal_status DEFAULT 'sent',
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(job_id, provider_id)
);

-- Job messages/chat
CREATE TABLE public.job_messages (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    job_id UUID REFERENCES public.jobs(id) ON DELETE CASCADE NOT NULL,
    sender_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    content TEXT,
    attachment_url TEXT,
    attachment_type TEXT,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Payments and escrow
CREATE TABLE public.payments (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    job_id UUID REFERENCES public.jobs(id) ON DELETE CASCADE NOT NULL,
    client_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    provider_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    platform_fee DECIMAL(10,2) NOT NULL,
    client_fee DECIMAL(10,2) NOT NULL,
    provider_fee DECIMAL(10,2) NOT NULL,
    net_amount DECIMAL(10,2) NOT NULL, -- amount - platform_fee
    currency TEXT DEFAULT 'BRL',
    provider payment_provider NOT NULL,
    method payment_method,
    external_payment_id TEXT,
    status payment_status DEFAULT 'pending',
    held_until TIMESTAMPTZ,
    processed_at TIMESTAMPTZ,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Provider payouts
CREATE TABLE public.payouts (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    provider_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    payment_id UUID REFERENCES public.payments(id) ON DELETE CASCADE,
    amount DECIMAL(10,2) NOT NULL,
    currency TEXT DEFAULT 'BRL',
    provider payment_provider NOT NULL,
    external_payout_id TEXT,
    status payout_status DEFAULT 'pending',
    bank_details JSONB,
    processed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Disputes
CREATE TABLE public.disputes (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    job_id UUID REFERENCES public.jobs(id) ON DELETE CASCADE NOT NULL,
    opened_by_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    reason TEXT NOT NULL,
    description TEXT NOT NULL,
    evidence_urls TEXT[],
    status dispute_status DEFAULT 'open',
    admin_notes TEXT,
    resolution_notes TEXT,
    resolved_by UUID REFERENCES auth.users(id),
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Reviews
CREATE TABLE public.reviews (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    job_id UUID REFERENCES public.jobs(id) ON DELETE CASCADE NOT NULL,
    author_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    target_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5) NOT NULL,
    comment TEXT,
    is_public BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(job_id, author_id, target_id)
);

-- KYC Documents
CREATE TABLE public.kyc_documents (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    document_type document_type NOT NULL,
    file_url TEXT NOT NULL,
    file_name TEXT,
    mime_type TEXT,
    file_size INTEGER,
    is_verified BOOLEAN DEFAULT FALSE,
    verified_by UUID REFERENCES auth.users(id),
    verified_at TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, document_type)
);

-- Provider bank details
CREATE TABLE public.provider_bank_details (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    bank_name TEXT,
    account_type TEXT,
    account_number TEXT,
    agency TEXT,
    pix_key TEXT,
    pix_key_type TEXT,
    holder_name TEXT,
    holder_document TEXT,
    is_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id)
);

-- Subscriptions for reduced fees
CREATE TABLE public.subscriptions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    provider payment_provider NOT NULL,
    external_subscription_id TEXT NOT NULL,
    status subscription_status DEFAULT 'incomplete',
    plan_name TEXT NOT NULL,
    plan_price DECIMAL(10,2) NOT NULL,
    current_period_start TIMESTAMPTZ,
    current_period_end TIMESTAMPTZ,
    cancel_at_period_end BOOLEAN DEFAULT FALSE,
    canceled_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, provider)
);

-- Fee rules configuration
CREATE TABLE public.fee_rules (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL,
    client_fee_standard DECIMAL(5,2) DEFAULT 5.00,
    provider_fee_standard DECIMAL(5,2) DEFAULT 5.00,
    client_fee_premium DECIMAL(5,2) DEFAULT 3.50,
    provider_fee_premium DECIMAL(5,2) DEFAULT 3.50,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Notifications
CREATE TABLE public.notifications (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT NOT NULL, -- job_update, payment, message, etc.
    data JSONB,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Audit logs
CREATE TABLE public.audit_logs (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id),
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id UUID,
    old_values JSONB,
    new_values JSONB,
    metadata JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Service areas for providers
CREATE TABLE public.service_areas (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    provider_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    center_latitude DECIMAL(10,8) NOT NULL,
    center_longitude DECIMAL(11,8) NOT NULL,
    radius_km INTEGER NOT NULL DEFAULT 10,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(provider_id)
);

-- Insert default categories
INSERT INTO public.service_categories (name, slug, description, icon_name, color) VALUES
('Eletricista', 'eletricista', 'Serviços elétricos residenciais e comerciais', 'zap', '#F59E0B'),
('Encanador', 'encanador', 'Serviços hidráulicos e encanamento', 'droplets', '#3B82F6'),
('Pintor', 'pintor', 'Pintura residencial e comercial', 'brush', '#EF4444'),
('Jardineiro', 'jardineiro', 'Jardinagem e paisagismo', 'leaf', '#10B981'),
('Limpeza', 'limpeza', 'Serviços de limpeza residencial e comercial', 'sparkles', '#8B5CF6'),
('Marceneiro', 'marceneiro', 'Móveis sob medida e carpintaria', 'hammer', '#92400E'),
('Pedreiro', 'pedreiro', 'Construção e reforma', 'hard-hat', '#6B7280'),
('Técnico em TI', 'tecnico-ti', 'Suporte técnico e informática', 'monitor', '#059669');

-- Insert default fee rule
INSERT INTO public.fee_rules (name, client_fee_standard, provider_fee_standard, client_fee_premium, provider_fee_premium) VALUES
('Taxa Padrão Job Fast', 5.00, 5.00, 3.50, 3.50);

-- Create indexes for better performance
CREATE INDEX idx_jobs_status ON public.jobs(status);
CREATE INDEX idx_jobs_category ON public.jobs(category_id);
CREATE INDEX idx_jobs_client ON public.jobs(client_id);
CREATE INDEX idx_jobs_provider ON public.jobs(provider_id);
CREATE INDEX idx_jobs_location ON public.jobs(latitude, longitude);
CREATE INDEX idx_proposals_job ON public.proposals(job_id);
CREATE INDEX idx_proposals_provider ON public.proposals(provider_id);
CREATE INDEX idx_messages_job ON public.job_messages(job_id);
CREATE INDEX idx_payments_job ON public.payments(job_id);
CREATE INDEX idx_payments_status ON public.payments(status);
CREATE INDEX idx_notifications_user ON public.notifications(user_id, is_read);
CREATE INDEX idx_reviews_target ON public.reviews(target_id);
CREATE INDEX idx_kyc_documents_user ON public.kyc_documents(user_id);

-- Enable Row Level Security
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.disputes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kyc_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.provider_bank_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_areas ENABLE ROW LEVEL SECURITY;