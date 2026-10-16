-- Add new roles to profiles check constraint
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('contador', 'pyme', 'empresa', 'cliente', 'admin'));

-- Empresa subscriptions (reuses subscriptions table, keyed by user_id instead of accountant_id)
-- We add a nullable user_type column to distinguish contador vs empresa subscriptions
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS user_type text DEFAULT 'contador' CHECK (user_type IN ('contador', 'empresa'));

-- Link cliente to an accountant (so cliente can see their documents/reports)
CREATE TABLE IF NOT EXISTS client_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  accountant_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  client_record_id uuid REFERENCES clients(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(cliente_id, accountant_id)
);

ALTER TABLE client_links ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_links" ON client_links;
CREATE POLICY "select_own_links" ON client_links FOR SELECT
  TO authenticated USING (auth.uid() = cliente_id OR auth.uid() = accountant_id);

DROP POLICY IF EXISTS "insert_own_links" ON client_links;
CREATE POLICY "insert_own_links" ON client_links FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = accountant_id);

DROP POLICY IF EXISTS "delete_own_links" ON client_links;
CREATE POLICY "delete_own_links" ON client_links FOR DELETE
  TO authenticated USING (auth.uid() = accountant_id);

-- Allow empresa users to manage their own documents (they are their own "client")
-- Add empresa_user_id to clients so an empresa can be linked as their own client
ALTER TABLE clients ADD COLUMN IF NOT EXISTS empresa_user_id uuid REFERENCES profiles(id) ON DELETE SET NULL;

-- RLS: empresa can insert documents for their own client record
-- (documents table already has policies, but empresa needs to act as uploaded_by)
-- The existing document policies use client_id -> clients -> accountant_id chain
-- For empresa, we need to allow if the client record has empresa_user_id = auth.uid()
CREATE OR REPLACE FUNCTION can_empresa_manage_docs(p_client_id uuid, p_user_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM clients c
    WHERE c.id = p_client_id AND c.empresa_user_id = p_user_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
