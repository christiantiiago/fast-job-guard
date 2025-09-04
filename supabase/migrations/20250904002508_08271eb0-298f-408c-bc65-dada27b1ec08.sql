-- Create admin user for testing
-- This will allow you to access admin features
-- Make sure to replace the user_id with your actual user ID from auth.users

-- First, let's create an admin role for the current user
INSERT INTO public.user_roles (user_id, role)
SELECT 'd0d553a2-7565-4767-96e9-b65ff98b2af7', 'admin'::user_role
WHERE NOT EXISTS (
  SELECT 1 FROM public.user_roles 
  WHERE user_id = 'd0d553a2-7565-4767-96e9-b65ff98b2af7'
);

-- Update existing role if it exists
UPDATE public.user_roles 
SET role = 'admin'::user_role, updated_at = now()
WHERE user_id = 'd0d553a2-7565-4767-96e9-b65ff98b2af7';