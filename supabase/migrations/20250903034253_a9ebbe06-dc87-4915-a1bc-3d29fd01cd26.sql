-- Create storage buckets for facial auth and documents
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types) 
VALUES 
  ('documents', 'documents', false, 52428800, '{"image/*","application/pdf"}'),
  ('facial-auth', 'facial-auth', false, 10485760, '{"image/jpeg","image/png","image/webp"}')
ON CONFLICT (id) DO NOTHING;

-- Create storage policies for facial auth
CREATE POLICY "Authenticated users can upload facial auth images" 
ON storage.objects 
FOR INSERT 
TO authenticated
WITH CHECK (bucket_id = 'facial-auth' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view their own facial auth images" 
ON storage.objects 
FOR SELECT 
TO authenticated
USING (bucket_id = 'facial-auth' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Admins can view all facial auth images" 
ON storage.objects 
FOR SELECT 
TO authenticated
USING (bucket_id = 'facial-auth' AND is_admin());

-- Create storage policies for documents
CREATE POLICY "Authenticated users can upload documents" 
ON storage.objects 
FOR INSERT 
TO authenticated
WITH CHECK (bucket_id = 'documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view their own documents" 
ON storage.objects 
FOR SELECT 
TO authenticated
USING (bucket_id = 'documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Admins can view all documents" 
ON storage.objects 
FOR SELECT 
TO authenticated
USING (bucket_id = 'documents' AND is_admin());