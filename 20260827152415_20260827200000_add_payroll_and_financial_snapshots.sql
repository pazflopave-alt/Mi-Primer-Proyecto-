
-- Payroll records (liquidaciones de sueldo)
CREATE TABLE IF NOT EXISTS payroll_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  accountant_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  employee_name text NOT NULL,
  rut text,
  period_month date NOT NULL,
  base_salary integer NOT NULL DEFAULT 0,
  non_imponible integer NOT NULL DEFAULT 0,
  afp_rate real NOT NULL DEFAULT 0.1144,
  afp_amount integer NOT NULL DEFAULT 0,
  health_rate real NOT NULL DEFAULT 0.07,
  health_amount integer NOT NULL DEFAULT 0,
  unemployment_rate real NOT NULL DEFAULT 0.006,
  unemployment_amount integer NOT NULL DEFAULT 0,
  taxable_base integer NOT NULL DEFAULT 0,
  total_deductions integer NOT NULL DEFAULT 0,
  net_salary integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE payroll_records ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_payroll" ON payroll_records;
CREATE POLICY "select_own_payroll" ON payroll_records FOR SELECT
  TO authenticated USING (auth.uid() = accountant_id);

DROP POLICY IF EXISTS "insert_own_payroll" ON payroll_records;
CREATE POLICY "insert_own_payroll" ON payroll_records FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = accountant_id);

DROP POLICY IF EXISTS "update_own_payroll" ON payroll_records;
CREATE POLICY "update_own_payroll" ON payroll_records FOR UPDATE
  TO authenticated USING (auth.uid() = accountant_id) WITH CHECK (auth.uid() = accountant_id);

DROP POLICY IF EXISTS "delete_own_payroll" ON payroll_records;
CREATE POLICY "delete_own_payroll" ON payroll_records FOR DELETE
  TO authenticated USING (auth.uid() = accountant_id);

CREATE INDEX IF NOT EXISTS idx_payroll_accountant ON payroll_records(accountant_id);
CREATE INDEX IF NOT EXISTS idx_payroll_client ON payroll_records(client_id);

-- Financial health snapshots (for PYME executive report)
CREATE TABLE IF NOT EXISTS financial_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  period_month date NOT NULL,
  sales integer NOT NULL DEFAULT 0,
  expenses integer NOT NULL DEFAULT 0,
  taxes_paid integer NOT NULL DEFAULT 0,
  payroll_total integer NOT NULL DEFAULT 0,
  net_result integer NOT NULL DEFAULT 0,
  notes text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE financial_snapshots ENABLE ROW LEVEL SECURITY;

-- Accountant can CRUD for their clients
DROP POLICY IF EXISTS "select_own_snapshots" ON financial_snapshots;
CREATE POLICY "select_own_snapshots" ON financial_snapshots FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM clients c WHERE c.id = client_id AND c.accountant_id = auth.uid())
  );

DROP POLICY IF EXISTS "insert_own_snapshots" ON financial_snapshots;
CREATE POLICY "insert_own_snapshots" ON financial_snapshots FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM clients c WHERE c.id = client_id AND c.accountant_id = auth.uid())
  );

DROP POLICY IF EXISTS "update_own_snapshots" ON financial_snapshots;
CREATE POLICY "update_own_snapshots" ON financial_snapshots FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM clients c WHERE c.id = client_id AND c.accountant_id = auth.uid())
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM clients c WHERE c.id = client_id AND c.accountant_id = auth.uid())
  );

DROP POLICY IF EXISTS "delete_own_snapshots" ON financial_snapshots;
CREATE POLICY "delete_own_snapshots" ON financial_snapshots FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM clients c WHERE c.id = client_id AND c.accountant_id = auth.uid())
  );

CREATE INDEX IF NOT EXISTS idx_snapshots_client ON financial_snapshots(client_id);
