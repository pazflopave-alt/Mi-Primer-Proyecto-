
-- 1. Update password for the existing pazflopave@gmail.com user
UPDATE auth.users
SET encrypted_password = crypt('26362636Flo', gen_salt('bf')),
    email_confirmed_at = now(),
    updated_at = now()
WHERE email = 'pazflopave@gmail.com';

-- 2. Ensure the profile is correct
UPDATE profiles
SET role = 'admin',
    is_active = true,
    full_name = 'Florencia Paredes'
WHERE email = 'pazflopave@gmail.com';

-- 3. Demote the old admin@contachile.cl to pyme role (don't delete to preserve references)
UPDATE profiles
SET role = 'pyme'
WHERE email = 'admin@contachile.cl';

-- 4. Create trigger function to enforce admin email restriction
CREATE OR REPLACE FUNCTION public.enforce_admin_email_restriction()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.role = 'admin' AND NEW.email != 'pazflopave@gmail.com' THEN
    RAISE EXCEPTION 'No autorizado: el rol de administrador está restringido.';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_admin_email ON profiles;
CREATE TRIGGER enforce_admin_email
  BEFORE INSERT OR UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_admin_email_restriction();

GRANT EXECUTE ON FUNCTION public.enforce_admin_email_restriction() TO authenticated;
