-- Create simplified automatic trigger for user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  -- Create user role (default to client)
  INSERT INTO public.user_roles (user_id, role)
  VALUES (
    NEW.id, 
    COALESCE((NEW.raw_user_meta_data ->> 'role')::user_role, 'client'::user_role)
  );
  
  -- Create user profile
  INSERT INTO public.profiles (user_id, full_name, phone)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data ->> 'full_name',
    NEW.raw_user_meta_data ->> 'phone'
  );
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't block user creation
    RAISE WARNING 'Error in handle_new_user: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger on auth.users if it doesn't exist
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Allow system to create initial user_roles and profiles during signup
DROP POLICY IF EXISTS "Allow system to create user roles" ON public.user_roles;
CREATE POLICY "Allow system to create user roles" ON public.user_roles
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow system to create profiles" ON public.profiles;
CREATE POLICY "Allow system to create profiles" ON public.profiles  
  FOR INSERT WITH CHECK (true);