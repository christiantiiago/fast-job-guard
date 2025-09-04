-- Criar apenas os buckets de storage necessários
-- Ignorar se os buckets já existem

INSERT INTO storage.buckets (id, name, public) 
VALUES ('kyc-documents', 'kyc-documents', false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('facial-auth', 'facial-auth', false)
ON CONFLICT (id) DO NOTHING;