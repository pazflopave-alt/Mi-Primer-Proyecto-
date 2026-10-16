
-- 1. Expand document types
ALTER TABLE documents DROP CONSTRAINT IF EXISTS documents_file_type_check;
ALTER TABLE documents ADD CONSTRAINT documents_file_type_check 
  CHECK (file_type IN ('factura', 'boleta', 'cartola_bancaria', 'remuneraciones', 'documentos_tributarios', 'contratos', 'otro'));

-- 2. Add falta_documento status
ALTER TABLE documents DROP CONSTRAINT IF EXISTS documents_status_check;
ALTER TABLE documents ADD CONSTRAINT documents_status_check
  CHECK (status IN ('pendiente', 'revisado', 'rechazado', 'falta_documento'));

-- 3. Client fees table for billing
CREATE TABLE IF NOT EXISTS client_fees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  accountant_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  description text NOT NULL DEFAULT 'Honorarios contables',
  amount_clp integer NOT NULL,
  status text NOT NULL DEFAULT 'pendiente' CHECK (status IN ('pagado', 'pendiente', 'vencido')),
  due_date date,
  paid_date date,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE client_fees ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_fees" ON client_fees;
CREATE POLICY "select_own_fees" ON client_fees FOR SELECT
  TO authenticated USING (auth.uid() = accountant_id);

DROP POLICY IF EXISTS "insert_own_fees" ON client_fees;
CREATE POLICY "insert_own_fees" ON client_fees FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = accountant_id);

DROP POLICY IF EXISTS "update_own_fees" ON client_fees;
CREATE POLICY "update_own_fees" ON client_fees FOR UPDATE
  TO authenticated USING (auth.uid() = accountant_id) WITH CHECK (auth.uid() = accountant_id);

DROP POLICY IF EXISTS "delete_own_fees" ON client_fees;
CREATE POLICY "delete_own_fees" ON client_fees FOR DELETE
  TO authenticated USING (auth.uid() = accountant_id);

CREATE INDEX IF NOT EXISTS idx_client_fees_accountant ON client_fees(accountant_id);
CREATE INDEX IF NOT EXISTS idx_client_fees_client ON client_fees(client_id);
