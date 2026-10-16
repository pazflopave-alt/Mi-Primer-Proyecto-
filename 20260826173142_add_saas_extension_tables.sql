/*
# ContaChile — Full SaaS Schema Extension

## New Tables
1. chat_messages — realtime messaging between accountant and PYME
2. document_requests — accountant requests specific documents from PYME
3. notifications — internal notification system
4. accountant_public_profiles — public marketplace directory profiles

## Modified Tables
1. profiles — add trial_ends_at (timestamptz) for 30-day trial tracking
2. subscriptions — allow admin to read all subscriptions (for admin panel)
*/

-- ===== ADD trial_ends_at TO profiles =====
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS trial_ends_at timestamptz;

-- ===== CHAT MESSAGES =====
CREATE TABLE IF NOT EXISTS chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  message text NOT NULL,
  read_at timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_chat_messages" ON chat_messages;
CREATE POLICY "select_chat_messages" ON chat_messages FOR SELECT
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM clients c
      WHERE c.id = chat_messages.client_id
      AND (c.accountant_id = auth.uid() OR c.pyme_user_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "insert_chat_messages" ON chat_messages;
CREATE POLICY "insert_chat_messages" ON chat_messages FOR INSERT
  TO authenticated WITH CHECK (
    auth.uid() = sender_id AND
    EXISTS (
      SELECT 1 FROM clients c
      WHERE c.id = chat_messages.client_id
      AND (c.accountant_id = auth.uid() OR c.pyme_user_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "update_chat_messages" ON chat_messages;
CREATE POLICY "update_chat_messages" ON chat_messages FOR UPDATE
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM clients c
      WHERE c.id = chat_messages.client_id
      AND (c.accountant_id = auth.uid() OR c.pyme_user_id = auth.uid())
    )
  );

CREATE INDEX IF NOT EXISTS idx_chat_messages_client ON chat_messages(client_id, created_at);

-- ===== DOCUMENT REQUESTS =====
CREATE TABLE IF NOT EXISTS document_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  accountant_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  due_date date,
  status text NOT NULL DEFAULT 'pendiente' CHECK (status IN ('pendiente', 'completada', 'cancelada')),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE document_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_document_requests" ON document_requests;
CREATE POLICY "select_document_requests" ON document_requests FOR SELECT
  TO authenticated USING (
    auth.uid() = accountant_id
    OR EXISTS (
      SELECT 1 FROM clients c
      WHERE c.id = document_requests.client_id AND c.pyme_user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "insert_document_requests" ON document_requests;
CREATE POLICY "insert_document_requests" ON document_requests FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = accountant_id);

DROP POLICY IF EXISTS "update_document_requests" ON document_requests;
CREATE POLICY "update_document_requests" ON document_requests FOR UPDATE
  TO authenticated USING (
    auth.uid() = accountant_id
    OR EXISTS (
      SELECT 1 FROM clients c
      WHERE c.id = document_requests.client_id AND c.pyme_user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "delete_document_requests" ON document_requests;
CREATE POLICY "delete_document_requests" ON document_requests FOR DELETE
  TO authenticated USING (auth.uid() = accountant_id);

CREATE INDEX IF NOT EXISTS idx_doc_requests_accountant ON document_requests(accountant_id);
CREATE INDEX IF NOT EXISTS idx_doc_requests_client ON document_requests(client_id);

-- ===== NOTIFICATIONS =====
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  body text,
  type text NOT NULL DEFAULT 'info' CHECK (type IN ('info', 'warning', 'success', 'danger')),
  link text,
  read boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_notifications" ON notifications;
CREATE POLICY "select_own_notifications" ON notifications FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_notifications" ON notifications;
CREATE POLICY "insert_own_notifications" ON notifications FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_notifications" ON notifications;
CREATE POLICY "update_own_notifications" ON notifications FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_notifications" ON notifications;
CREATE POLICY "delete_own_notifications" ON notifications FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, created_at);

-- ===== ACCOUNTANT PUBLIC PROFILES =====
CREATE TABLE IF NOT EXISTS accountant_public_profiles (
  accountant_id uuid PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  city text,
  specialties text[] NOT NULL DEFAULT '{}',
  services text[] NOT NULL DEFAULT '{}',
  bio text,
  rating numeric(2,1) NOT NULL DEFAULT 0.0,
  review_count integer NOT NULL DEFAULT 0,
  is_published boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE accountant_public_profiles ENABLE ROW LEVEL SECURITY;

-- Public can read published profiles (anon + authenticated)
DROP POLICY IF EXISTS "read_public_profiles" ON accountant_public_profiles;
CREATE POLICY "read_public_profiles" ON accountant_public_profiles FOR SELECT
  TO anon, authenticated USING (is_published = true);

-- Accountant can read/update/create own profile
DROP POLICY IF EXISTS "select_own_public_profile" ON accountant_public_profiles;
CREATE POLICY "select_own_public_profile" ON accountant_public_profiles FOR SELECT
  TO authenticated USING (auth.uid() = accountant_id);

DROP POLICY IF EXISTS "insert_own_public_profile" ON accountant_public_profiles;
CREATE POLICY "insert_own_public_profile" ON accountant_public_profiles FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = accountant_id);

DROP POLICY IF EXISTS "update_own_public_profile" ON accountant_public_profiles;
CREATE POLICY "update_own_public_profile" ON accountant_public_profiles FOR UPDATE
  TO authenticated USING (auth.uid() = accountant_id) WITH CHECK (auth.uid() = accountant_id);

DROP POLICY IF EXISTS "delete_own_public_profile" ON accountant_public_profiles;
CREATE POLICY "delete_own_public_profile" ON accountant_public_profiles FOR DELETE
  TO authenticated USING (auth.uid() = accountant_id);

-- ===== ADMIN CAN READ ALL SUBSCRIPTIONS =====
DROP POLICY IF EXISTS "select_own_subscriptions" ON subscriptions;
CREATE POLICY "select_own_subscriptions" ON subscriptions FOR SELECT
  TO authenticated USING (
    auth.uid() = accountant_id
    OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

-- Enable realtime for chat_messages
ALTER PUBLICATION supabase_realtime ADD TABLE chat_messages;
