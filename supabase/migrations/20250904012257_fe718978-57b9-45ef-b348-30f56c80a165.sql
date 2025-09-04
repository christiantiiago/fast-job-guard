-- Fix RLS issues by enabling RLS on tables that might not have it
-- Check and enable RLS on spatial tables if they exist and are public
DO $$
BEGIN
  -- Enable RLS on spatial_ref_sys if it exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'spatial_ref_sys') THEN
    ALTER TABLE public.spatial_ref_sys ENABLE ROW LEVEL SECURITY;
    -- Create policy to allow read access
    CREATE POLICY "Allow read access to spatial_ref_sys" ON public.spatial_ref_sys FOR SELECT USING (true);
  END IF;

  -- Enable RLS on geometry_columns if it exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'geometry_columns') THEN
    ALTER TABLE public.geometry_columns ENABLE ROW LEVEL SECURITY;
    -- Create policy to allow read access
    CREATE POLICY "Allow read access to geometry_columns" ON public.geometry_columns FOR SELECT USING (true);
  END IF;

  -- Enable RLS on geography_columns if it exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'geography_columns') THEN
    ALTER TABLE public.geography_columns ENABLE ROW LEVEL SECURITY;
    -- Create policy to allow read access
    CREATE POLICY "Allow read access to geography_columns" ON public.geography_columns FOR SELECT USING (true);
  END IF;
END $$;

-- Fix function search path issues by updating existing functions
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public;