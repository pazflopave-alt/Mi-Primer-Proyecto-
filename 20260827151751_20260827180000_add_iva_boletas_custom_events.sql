
-- 1. Expand tax_events to support custom events with client association, priority, time, notes
ALTER TABLE tax_events ADD COLUMN IF NOT EXISTS accountant_id uuid REFERENCES profiles(id) ON DELETE CASCADE;
ALTER TABLE tax_events ADD COLUMN IF NOT EXISTS client_id uuid REFERENCES clients(id) ON DELETE SET NULL;
ALTER TABLE tax_events ADD COLUMN IF NOT EXISTS event_time time;
ALTER TABLE tax_events ADD COLUMN IF NOT EXISTS priority text NOT NULL DEFAULT 'media' CHECK (priority IN ('alta', 'media', 'baja'));
ALTER TABLE tax_events ADD COLUMN IF NOT EXISTS notes text;
ALTER TABLE tax_events ADD COLUMN IF NOT EXISTS notify_pyme boolean NOT NULL DEFAULT false;

-- Expand category to include 'renta' and 'entrega_documentos'
ALTER TABLE tax_events DROP CONSTRAINT IF EXISTS tax_events_category_check;
ALTER TABLE tax_events ADD CONSTRAINT tax_events_category_check
  CHECK (category IN ('f29', 'iva', 'remuneraciones', 'renta', 'entrega_documentos', 'otro'));

-- RLS for custom tax events (accountant can CRUD their own; shared seed events readable by all)
DROP POLICY IF EXISTS "insert_own_tax_events" ON tax_events;
CREATE POLICY "insert_own_tax_events" ON tax_events FOR INSERT
  TO authenticated WITH CHECK (accountant_id IS NULL OR accountant_id = auth.uid());

DROP POLICY IF EXISTS "update_own_tax_events" ON tax_events;
CREATE POLICY "update_own_tax_events" ON tax_events FOR UPDATE
  TO authenticated USING (accountant_id IS NULL OR accountant_id = auth.uid())
  WITH CHECK (accountant_id IS NULL OR accountant_id = auth.uid());

DROP POLICY IF EXISTS "delete_own_tax_events" ON tax_events;
CREATE POLICY "delete_own_tax_events" ON tax_events FOR DELETE
  TO authenticated USING (accountant_id IS NULL OR accountant_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_tax_events_accountant ON tax_events(accountant_id);
CREATE INDEX IF NOT EXISTS idx_tax_events_client ON tax_events(client_id);

-- 2. IVA calculations table (F29)
CREATE TABLE IF NOT EXISTS iva_calculations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  accountant_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  client_id uuid REFERENCES clients(id) ON DELETE SET NULL,
  period_month date NOT NULL,
  sales_net integer NOT NULL DEFAULT 0,
  purchases_net integer NOT NULL DEFAULT 0,
  debit_fiscal integer NOT NULL DEFAULT 0,
  credit_fiscal integer NOT NULL DEFAULT 0,
  iva_to_pay integer NOT NULL DEFAULT 0,
  notes text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE iva_calculations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_iva" ON iva_calculations;
CREATE POLICY "select_own_iva" ON iva_calculations FOR SELECT
  TO authenticated USING (auth.uid() = accountant_id);

DROP POLICY IF EXISTS "insert_own_iva" ON iva_calculations;
CREATE POLICY "insert_own_iva" ON iva_calculations FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = accountant_id);

DROP POLICY IF EXISTS "update_own_iva" ON iva_calculations;
CREATE POLICY "update_own_iva" ON iva_calculations FOR UPDATE
  TO authenticated USING (auth.uid() = accountant_id) WITH CHECK (auth.uid() = accountant_id);

DROP POLICY IF EXISTS "delete_own_iva" ON iva_calculations;
CREATE POLICY "delete_own_iva" ON iva_calculations FOR DELETE
  TO authenticated USING (auth.uid() = accountant_id);

CREATE INDEX IF NOT EXISTS idx_iva_accountant ON iva_calculations(accountant_id);
CREATE INDEX IF NOT EXISTS idx_iva_client ON iva_calculations(client_id);

-- 3. Boletas registry table
CREATE TABLE IF NOT EXISTS boleta_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  accountant_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  period_month date NOT NULL,
  boleta_type text NOT NULL DEFAULT 'venta' CHECK (boleta_type IN ('venta', 'honorario', 'factura')),
  total_amount integer NOT NULL DEFAULT 0,
  count_docs integer NOT NULL DEFAULT 1,
  reception_status text NOT NULL DEFAULT 'pendiente' CHECK (reception_status IN ('ppd', 'aceptada', 'rechazada', 'pendiente')),
  notes text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE boleta_records ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_boletas" ON boleta_records;
CREATE POLICY "select_own_boletas" ON boleta_records FOR SELECT
  TO authenticated USING (auth.uid() = accountant_id);

DROP POLICY IF EXISTS "insert_own_boletas" ON boleta_records;
CREATE POLICY "insert_own_boletas" ON boleta_records FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = accountant_id);

DROP POLICY IF EXISTS "update_own_boletas" ON boleta_records;
CREATE POLICY "update_own_boletas" ON boleta_records FOR UPDATE
  TO authenticated USING (auth.uid() = accountant_id) WITH CHECK (auth.uid() = accountant_id);

DROP POLICY IF EXISTS "delete_own_boletas" ON boleta_records;
CREATE POLICY "delete_own_boletas" ON boleta_records FOR DELETE
  TO authenticated USING (auth.uid() = accountant_id);

CREATE INDEX IF NOT EXISTS idx_boletas_accountant ON boleta_records(accountant_id);
CREATE INDEX IF NOT EXISTS idx_boletas_client ON boleta_records(client_id);

-- 4. Add IVA support to client_fees (honorarios + IVA)
ALTER TABLE client_fees ADD COLUMN IF NOT EXISTS base_amount integer;
ALTER TABLE client_fees ADD COLUMN IF NOT EXISTS iva_amount integer;
ALTER TABLE client_fees ADD COLUMN IF NOT EXISTS includes_iva boolean NOT NULL DEFAULT false;
ALTER TABLE client_fees ADD COLUMN IF NOT EXISTS reminder_sent boolean NOT NULL DEFAULT false;
