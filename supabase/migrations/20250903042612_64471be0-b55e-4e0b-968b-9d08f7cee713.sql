-- Create storage bucket for facial authentication
INSERT INTO storage.buckets (id, name, public) VALUES ('facial-auth', 'facial-auth', false);

-- Create policies for facial authentication storage
CREATE POLICY "Users can upload their own facial auth photos" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'facial-auth' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Admins can view all facial auth photos" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'facial-auth' AND is_admin());

CREATE POLICY "Users can view their own facial auth photos" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'facial-auth' AND auth.uid()::text = (storage.foldername(name))[1]);