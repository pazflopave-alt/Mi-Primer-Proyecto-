/*
# ContaChile — B2B Accounting SaaS Schema

## Overview
Creates the full data model for a Chilean B2B accounting management SaaS.
Two roles: **Contador** (accountant, paid subscriber) and **PYME** (SME client, free invited user).

## New Tables
1. profiles — extends auth.users with role + display info
2. access_codes — monthly access codes redeemed by accountants
3. subscriptions — accountant subscription state
4. clients — SME clients associated with an accountant
5. tasks — pending tasks linked to an accountant/client
6. tax_events — shared Chilean tax calendar
7. documents — PDF/XML uploads

## Security
- RLS enabled on every table.
- profiles: users read/update own row.
- access_codes: any authenticated can read (to validate/redeem); update restricted.
- subscriptions: accountants read/update own.
- clients: accountants CRUD own; PYME reads row they're linked to.
- tasks: accountants CRUD own; PYME reads tasks for their client.
- tax_events: public read for all authenticated.
- documents: accountant reads docs for their clients; PYME reads/uploads for own client.
*/

-- ===== PROFILES =====
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text UNIQUE NOT NULL,
  full_name text NOT NULL DEFAULT '',
  role text NOT NULL DEFAULT 'pyme' CHECK (role IN ('contador', 'pyme')),
  phone text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_profile" ON profiles;
CREATE POLICY "select_own_profile" ON profiles FOR SELECT
  TO authenticated USING (auth.uid() = id);

DROP POLICY IF EXISTS "update_own_profile" ON profiles;
CREATE POLICY "update_own_profile" ON profiles FOR UPDATE
  TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "insert_own_profile" ON profiles;
CREATE POLICY "insert_own_profile" ON profiles FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = id);

-- ===== ACCESS CODES =====
CREATE TABLE IF NOT EXISTS access_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  month date NOT NULL,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'used', 'expired')),
  activated_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  activated_at timestamptz,
  expires_at timestamptz NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE access_codes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "read_access_codes" ON access_codes;
CREATE POLICY "read_access_codes" ON access_codes FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "update_access_codes" ON access_codes;
CREATE POLICY "update_access_codes" ON access_codes FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "insert_access_codes" ON access_codes;
CREATE POLICY "insert_access_codes" ON access_codes FOR INSERT
  TO authenticated WITH CHECK (true);

-- ===== SUBSCRIPTIONS =====
CREATE TABLE IF NOT EXISTS subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  accountant_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('active', 'expired', 'pending')),
  current_period_start date NOT NULL DEFAULT CURRENT_DATE,
  current_period_end date NOT NULL,
  amount_clp integer NOT NULL DEFAULT 29990,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_subscriptions" ON subscriptions;
CREATE POLICY "select_own_subscriptions" ON subscriptions FOR SELECT
  TO authenticated USING (auth.uid() = accountant_id);

DROP POLICY IF EXISTS "insert_own_subscriptions" ON subscriptions;
CREATE POLICY "insert_own_subscriptions" ON subscriptions FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = accountant_id);

DROP POLICY IF EXISTS "update_own_subscriptions" ON subscriptions;
CREATE POLICY "update_own_subscriptions" ON subscriptions FOR UPDATE
  TO authenticated USING (auth.uid() = accountant_id) WITH CHECK (auth.uid() = accountant_id);

-- ===== CLIENTS (PYMEs) =====
CREATE TABLE IF NOT EXISTS clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  accountant_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  pyme_user_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  business_name text NOT NULL,
  rut text NOT NULL,
  email text NOT NULL,
  phone text,
  status text NOT NULL DEFAULT 'pendiente' CHECK (status IN ('al_dia', 'pendiente')),
  invite_token text UNIQUE,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE clients ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_clients" ON clients;
CREATE POLICY "select_own_clients" ON clients FOR SELECT
  TO authenticated USING (
    auth.uid() = accountant_id OR auth.uid() = pyme_user_id
  );

DROP POLICY IF EXISTS "insert_own_clients" ON clients;
CREATE POLICY "insert_own_clients" ON clients FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = accountant_id);

DROP POLICY IF EXISTS "update_own_clients" ON clients;
CREATE POLICY "update_own_clients" ON clients FOR UPDATE
  TO authenticated USING (auth.uid() = accountant_id OR auth.uid() = pyme_user_id)
  WITH CHECK (auth.uid() = accountant_id OR auth.uid() = pyme_user_id);

DROP POLICY IF EXISTS "delete_own_clients" ON clients;
CREATE POLICY "delete_own_clients" ON clients FOR DELETE
  TO authenticated USING (auth.uid() = accountant_id);

-- ===== TASKS =====
CREATE TABLE IF NOT EXISTS tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  accountant_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  client_id uuid REFERENCES clients(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  due_date date,
  status text NOT NULL DEFAULT 'pendiente' CHECK (status IN ('pendiente', 'en_progreso', 'completada')),
  category text NOT NULL DEFAULT 'otro' CHECK (category IN ('f29', 'iva', 'remuneraciones', 'otro')),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_tasks" ON tasks;
CREATE POLICY "select_tasks" ON tasks FOR SELECT
  TO authenticated USING (
    auth.uid() = accountant_id
    OR EXISTS (
      SELECT 1 FROM clients c
      WHERE c.id = tasks.client_id AND c.pyme_user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "insert_own_tasks" ON tasks;
CREATE POLICY "insert_own_tasks" ON tasks FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = accountant_id);

DROP POLICY IF EXISTS "update_own_tasks" ON tasks;
CREATE POLICY "update_own_tasks" ON tasks FOR UPDATE
  TO authenticated USING (auth.uid() = accountant_id) WITH CHECK (auth.uid() = accountant_id);

DROP POLICY IF EXISTS "delete_own_tasks" ON tasks;
CREATE POLICY "delete_own_tasks" ON tasks FOR DELETE
  TO authenticated USING (auth.uid() = accountant_id);

-- ===== TAX EVENTS (shared calendar) =====
CREATE TABLE IF NOT EXISTS tax_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  event_date date NOT NULL,
  category text NOT NULL DEFAULT 'otro' CHECK (category IN ('f29', 'iva', 'remuneraciones', 'otro')),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE tax_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "read_tax_events" ON tax_events;
CREATE POLICY "read_tax_events" ON tax_events FOR SELECT
  TO authenticated USING (true);

-- ===== DOCUMENTS =====
CREATE TABLE IF NOT EXISTS documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  uploaded_by uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  file_name text NOT NULL,
  file_path text NOT NULL,
  file_type text NOT NULL DEFAULT 'otro' CHECK (file_type IN ('factura', 'cartola_bancaria', 'boleta', 'otro')),
  status text NOT NULL DEFAULT 'pendiente' CHECK (status IN ('pendiente', 'revisado', 'rechazado')),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_documents" ON documents;
CREATE POLICY "select_documents" ON documents FOR SELECT
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM clients c
      WHERE c.id = documents.client_id
      AND (c.accountant_id = auth.uid() OR c.pyme_user_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "insert_documents" ON documents;
CREATE POLICY "insert_documents" ON documents FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (
      SELECT 1 FROM clients c
      WHERE c.id = documents.client_id
      AND (c.accountant_id = auth.uid() OR c.pyme_user_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "update_documents" ON documents;
CREATE POLICY "update_documents" ON documents FOR UPDATE
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM clients c
      WHERE c.id = documents.client_id AND c.accountant_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM clients c
      WHERE c.id = documents.client_id AND c.accountant_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "delete_documents" ON documents;
CREATE POLICY "delete_documents" ON documents FOR DELETE
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM clients c
      WHERE c.id = documents.client_id
      AND (c.accountant_id = auth.uid() OR c.pyme_user_id = auth.uid())
    )
  );

-- ===== INDEXES =====
CREATE INDEX IF NOT EXISTS idx_clients_accountant ON clients(accountant_id);
CREATE INDEX IF NOT EXISTS idx_clients_pyme_user ON clients(pyme_user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_accountant ON tasks(accountant_id);
CREATE INDEX IF NOT EXISTS idx_tasks_client ON tasks(client_id);
CREATE INDEX IF NOT EXISTS idx_documents_client ON documents(client_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_accountant ON subscriptions(accountant_id);
CREATE INDEX IF NOT EXISTS idx_access_codes_code ON access_codes(code);

-- ===== SEED TAX EVENTS (Chilean tax calendar — 2026) =====
INSERT INTO tax_events (title, description, event_date, category) VALUES
  ('Declaración F29 — Enero', 'Declaración y pago mensual del IVA (Formulario 29)', '2026-02-12', 'f29'),
  ('Declaración F29 — Febrero', 'Declaración y pago mensual del IVA (Formulario 29)', '2026-03-12', 'f29'),
  ('Declaración F29 — Marzo', 'Declaración y pago mensual del IVA (Formulario 29)', '2026-04-12', 'f29'),
  ('Declaración F29 — Abril', 'Declaración y pago mensual del IVA (Formulario 29)', '2026-05-12', 'f29'),
  ('Declaración F29 — Mayo', 'Declaración y pago mensual del IVA (Formulario 29)', '2026-06-12', 'f29'),
  ('Declaración F29 — Junio', 'Declaración y pago mensual del IVA (Formulario 29)', '2026-07-12', 'f29'),
  ('Declaración F29 — Julio', 'Declaración y pago mensual del IVA (Formulario 29)', '2026-08-12', 'f29'),
  ('Declaración F29 — Agosto', 'Declaración y pago mensual del IVA (Formulario 29)', '2026-09-12', 'f29'),
  ('Declaración IVA — Libros Compra/Venta Q1', 'Presentación de libros de compras y ventas del primer trimestre', '2026-04-30', 'iva'),
  ('Declaración IVA — Libros Compra/Venta Q2', 'Presentación de libros de compras y ventas del segundo trimestre', '2026-07-30', 'iva'),
  ('Declaración IVA — Libros Compra/Venta Q3', 'Presentación de libros de compras y ventas del tercer trimestre', '2026-10-30', 'iva'),
  ('Pago de Remuneraciones — Febrero', 'Pago de remuneraciones del personal y cotizaciones previsionales', '2026-02-10', 'remuneraciones'),
  ('Pago de Remuneraciones — Marzo', 'Pago de remuneraciones del personal y cotizaciones previsionales', '2026-03-10', 'remuneraciones'),
  ('Pago de Remuneraciones — Abril', 'Pago de remuneraciones del personal y cotizaciones previsionales', '2026-04-10', 'remuneraciones'),
  ('Pago de Remuneraciones — Mayo', 'Pago de remuneraciones del personal y cotizaciones previsionales', '2026-05-10', 'remuneraciones'),
  ('Pago de Remuneraciones — Junio', 'Pago de remuneraciones del personal y cotizaciones previsionales', '2026-06-10', 'remuneraciones'),
  ('Pago de Remuneraciones — Julio', 'Pago de remuneraciones del personal y cotizaciones previsionales', '2026-07-10', 'remuneraciones'),
  ('Pago de Remuneraciones — Agosto', 'Pago de remuneraciones del personal y cotizaciones previsionales', '2026-08-10', 'remuneraciones'),
  ('Operación Renta 2026', 'Declaración anual de impuestos (Operación Renta)', '2026-04-30', 'otro')
ON CONFLICT DO NOTHING;

-- ===== SEED SAMPLE ACCESS CODES =====
INSERT INTO access_codes (code, month, status, expires_at) VALUES
  ('CONTA-2026-01', '2026-01-01', 'active', '2026-02-15'),
  ('CONTA-2026-02', '2026-02-01', 'active', '2026-03-15'),
  ('CONTA-2026-03', '2026-03-01', 'active', '2026-04-15'),
  ('CONTA-2026-08', '2026-08-01', 'active', '2026-09-15')
ON CONFLICT (code) DO NOTHING;