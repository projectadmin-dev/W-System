-- Migration: Create money_requests + cash_register_entries tables
CREATE TABLE IF NOT EXISTS money_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_number TEXT NOT NULL UNIQUE,
  employee_nik TEXT NOT NULL,
  employee_name TEXT NOT NULL,
  department TEXT NOT NULL,
  request_type TEXT NOT NULL CHECK (request_type IN ('procurement', 'reimbursement', 'cash_in_advance', 'other')),
  purpose TEXT NOT NULL,
  amount DECIMAL(15,2) NOT NULL,
  receipt_amount DECIMAL(15,2) DEFAULT 0,
  receipt_file_url TEXT,
  receipt_notes TEXT,
  approval_status TEXT NOT NULL DEFAULT 'pending' CHECK (approval_status IN ('pending', 'approved', 'rejected')),
  approved_by TEXT,
  approved_at TIMESTAMPTZ,
  approval_notes TEXT,
  paid_at TIMESTAMPTZ,
  paid_by TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'approved', 'paid', 'rejected', 'closed')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_mr_nik ON money_requests(employee_nik);
CREATE INDEX IF NOT EXISTS idx_mr_dept ON money_requests(department);
CREATE INDEX IF NOT EXISTS idx_mr_status ON money_requests(approval_status);
CREATE INDEX IF NOT EXISTS idx_mr_type ON money_requests(request_type);
CREATE INDEX IF NOT EXISTS idx_mr_created ON money_requests(created_at);
ALTER TABLE money_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "mr_all" ON money_requests FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS cash_register_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
  entry_type TEXT NOT NULL CHECK (entry_type IN ('in', 'out')),
  source_type TEXT NOT NULL CHECK (source_type IN ('money_request', 'customer_payment', 'vendor_payment', 'salary_payment', 'journal_entry', 'adjustment', 'opening_balance', 'other')),
  source_id UUID,
  coa_id UUID,
  account_name TEXT NOT NULL DEFAULT 'Kas Kecil',
  amount DECIMAL(15,2) NOT NULL,
  description TEXT NOT NULL,
  reference_number TEXT,
  running_balance DECIMAL(15,2) NOT NULL DEFAULT 0,
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_cre_date ON cash_register_entries(entry_date);
CREATE INDEX IF NOT EXISTS idx_cre_type ON cash_register_entries(entry_type);
CREATE INDEX IF NOT EXISTS idx_cre_source ON cash_register_entries(source_type, source_id);
ALTER TABLE cash_register_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cre_all" ON cash_register_entries FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE OR REPLACE FUNCTION update_money_request_timestamp() RETURNS TRIGGER AS $$
BEGIN NEW.updated_at := NOW(); RETURN NEW; END; $$ LANGUAGE plpgsql;
CREATE TRIGGER trg_money_req_timestamp BEFORE UPDATE ON money_requests FOR EACH ROW EXECUTE FUNCTION update_money_request_timestamp();
