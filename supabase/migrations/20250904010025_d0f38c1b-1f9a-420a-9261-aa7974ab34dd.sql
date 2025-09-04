-- Criar buckets de storage para KYC e autenticação facial

-- Bucket para documentos KYC
INSERT INTO storage.buckets (id, name, public) 
VALUES ('kyc-documents', 'kyc-documents', false)
ON CONFLICT (id) DO NOTHING;

-- Bucket para autenticação facial  
INSERT INTO storage.buckets (id, name, public)
VALUES ('facial-auth', 'facial-auth', false)
ON CONFLICT (id) DO NOTHING;

-- Políticas RLS para bucket kyc-documents
CREATE POLICY "Users can upload their own KYC documents" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'kyc-documents' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can view their own KYC documents" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'kyc-documents' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Admins can view all KYC documents" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'kyc-documents' AND 
    is_admin()
  );

-- Políticas RLS para bucket facial-auth
CREATE POLICY "Users can upload their own facial auth photos" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'facial-auth' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can view their own facial auth photos" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'facial-auth' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Admins can view all facial auth photos" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'facial-auth' AND 
    is_admin()
  );