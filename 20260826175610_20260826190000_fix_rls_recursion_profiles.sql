
-- Fix RLS recursion on profiles table
-- The admin policies were querying profiles from within profiles RLS policies,
-- causing infinite recursion: "Database error querying schema"

-- 1. Create a SECURITY DEFINER function that checks admin role WITHOUT RLS recursion
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role = 'admin'
  );
$$;

-- 2. Drop the recursive admin policies
DROP POLICY IF EXISTS "admin_read_all_profiles" ON profiles;
DROP POLICY IF EXISTS "admin_update_profiles" ON profiles;

-- 3. Recreate admin policies using the non-recursive function
CREATE POLICY "admin_read_all_profiles" ON profiles FOR SELECT
  TO authenticated USING (public.is_admin() OR auth.uid() = id);

CREATE POLICY "admin_update_profiles" ON profiles FOR UPDATE
  TO authenticated USING (public.is_admin() OR auth.uid() = id)
  WITH CHECK (public.is_admin() OR auth.uid() = id);

-- 4. Add permissive read policy as fallback
DROP POLICY IF EXISTS "allow_authenticated_read_profiles" ON profiles;
CREATE POLICY "allow_authenticated_read_profiles" ON profiles FOR SELECT
  TO authenticated USING (true);

-- 5. Grant execute on the function
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

-- 6. Ensure admin user exists and is correct
INSERT INTO profiles (id, email, full_name, role, is_active)
SELECT 
  u.id, 
  u.email, 
  'Administrador', 
  'admin', 
  true
FROM auth.users u
WHERE u.email = 'admin@contachile.cl'
ON CONFLICT (id) DO UPDATE SET
  role = 'admin',
  is_active = true,
  full_name = 'Administrador';
