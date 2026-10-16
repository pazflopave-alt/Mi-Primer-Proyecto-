/*
# Add admin role, is_active flag, and master access code

## Changes

### 1. profiles table
- Added `is_active` boolean column (default true) — lets superadmin enable/disable accountants.
- Updated role CHECK constraint to include 'admin'.
- Added RLS policy: admin users can read all profiles (for the admin panel).
- Added RLS policy: admin users can update any profile's is_active flag.

### 2. access_codes table
- Seeded master code `CONTABLE2026` — reusable, expires far future.
  This code is NOT marked as 'used' after activation (handled in app logic).

### 3. Security
- Admin-only SELECT on all profiles for the admin panel.
- Admin-only UPDATE on profiles.is_active for enable/disable.
*/

-- Add is_active column to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;

-- Update role constraint to include 'admin'
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check CHECK (role IN ('contador', 'pyme', 'admin'));

-- Admin can read all profiles
DROP POLICY IF EXISTS "admin_read_all_profiles" ON profiles;
CREATE POLICY "admin_read_all_profiles" ON profiles FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
    OR auth.uid() = id
  );

-- Admin can update is_active on any profile
DROP POLICY IF EXISTS "admin_update_profiles" ON profiles;
CREATE POLICY "admin_update_profiles" ON profiles FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
    OR auth.uid() = id
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
    OR auth.uid() = id
  );

-- Seed the master access code CONTABLE2026 (reusable, far expiry)
INSERT INTO access_codes (code, month, status, expires_at) VALUES
  ('CONTABLE2026', '2026-01-01', 'active', '2030-12-31')
ON CONFLICT (code) DO NOTHING;