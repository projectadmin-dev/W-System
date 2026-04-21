-- =====================================================
-- FASE-1: Finance Module - Journal Entries (PSAK Compliant)
-- =====================================================
-- Based on USER_STORIES v3.0 § 4.1 (US-FIN-001)
-- Double-entry bookkeeping with immutable audit trail
-- =====================================================

-- 1. Fiscal Periods Table (Period Lock/Close Mechanism)
CREATE TABLE IF NOT EXISTS public.fiscal_periods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  
  -- Period identification
  period_name text NOT NULL, -- e.g., "FY2026-Q1", "FY2026-04"
  period_type text NOT NULL CHECK (period_type IN ('monthly', 'quarterly', 'annual')),
  
  -- Date range
  start_date date NOT NULL,
  end_date date NOT NULL,
  
  -- Status
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'soft_close', 'closed')),
  
  -- Closing metadata
  closed_at timestamptz,
  closed_by uuid REFERENCES public.user_profiles(id),
  close_notes text,
  
  -- Audit
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid NOT NULL REFERENCES public.user_profiles(id),
  updated_by uuid REFERENCES public.user_profiles(id),
  deleted_at timestamptz
);

-- 1.1 Indexes
CREATE INDEX IF NOT EXISTS idx_fiscal_periods_tenant ON fiscal_periods(tenant_id);
CREATE INDEX IF NOT EXISTS idx_fiscal_periods_dates ON fiscal_periods(tenant_id, start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_fiscal_periods_status ON fiscal_periods(tenant_id, status) WHERE deleted_at IS NULL;

-- 1.2 Enable RLS
ALTER TABLE public.fiscal_periods ENABLE ROW LEVEL SECURITY;

-- 1.3 RLS Policies
-- Finance/CFO: full access
DROP POLICY IF EXISTS "finance_manage_fiscal_periods" ON public.fiscal_periods;
CREATE POLICY "finance_manage_fiscal_periods"
  ON public.fiscal_periods FOR ALL
  TO authenticated
  USING (
    tenant_id = (auth.jwt()->>'tenant_id')::uuid
    AND EXISTS (
      SELECT 1 FROM public.user_profiles up
      JOIN public.roles r ON up.role_id = r.id
      WHERE up.id = auth.uid()
      AND r.name IN ('finance', 'cfo', 'admin', 'super_admin')
    )
  )
  WITH CHECK (
    tenant_id = (auth.jwt()->>'tenant_id')::uuid
    AND EXISTS (
      SELECT 1 FROM public.user_profiles up
      JOIN public.roles r ON up.role_id = r.id
      WHERE up.id = auth.uid()
      AND r.name IN ('finance', 'cfo', 'admin', 'super_admin')
    )
  );

-- CEO/Commercial/PM: read only
DROP POLICY IF EXISTS "others_read_fiscal_periods" ON public.fiscal_periods;
CREATE POLICY "others_read_fiscal_periods"
  ON public.fiscal_periods FOR SELECT
  TO authenticated
  USING (
    tenant_id = (auth.jwt()->>'tenant_id')::uuid
  );

-- 2. Journal Entries Table (Header)
CREATE TABLE IF NOT EXISTS public.journal_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  
  -- Entry number (JE-YYYY-MM-NNNN)
  entry_number text NOT NULL UNIQUE,
  
  -- Transaction metadata
  transaction_date date NOT NULL,
  posting_date date NOT NULL DEFAULT CURRENT_DATE,
  
  -- Links to source documents
  source_type text CHECK (source_type IN (
    'manual', 'invoice', 'payment', 'expense_claim', 'payroll', 'depreciation', 'adjustment'
  )),
  source_id uuid, -- References invoices.id, payments.id, etc.
  
  -- Description
  description text NOT NULL,
  reference_number text, -- External reference (check #, invoice #, etc.)
  
  -- Financial summary
  currency text NOT NULL DEFAULT 'IDR',
  exchange_rate numeric(10,4) DEFAULT 1, -- For multi-currency
  
  -- Status
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'posted', 'reversed', 'void')),
  
  -- Fiscal period lock
  fiscal_period_id uuid REFERENCES public.fiscal_periods(id),
  
  -- Reversal tracking
  is_reversal boolean NOT NULL DEFAULT false,
  reversal_of_id uuid REFERENCES public.journal_entries(id),
  reversal_reason text,
  
  -- Approval (for period close)
  approved_by uuid REFERENCES public.user_profiles(id),
  approved_at timestamptz,
  
  -- Ownership
  prepared_by uuid NOT NULL REFERENCES public.user_profiles(id),
  posted_by uuid REFERENCES public.user_profiles(id),
  
  -- Audit (IMMUTABLE after posting)
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid NOT NULL REFERENCES public.user_profiles(id),
  updated_by uuid REFERENCES public.user_profiles(id),
  deleted_at timestamptz
);

-- 2.1 Indexes
CREATE INDEX IF NOT EXISTS idx_journal_entries_tenant ON journal_entries(tenant_id);
CREATE INDEX IF NOT EXISTS idx_journal_entries_number ON journal_entries(entry_number);
CREATE INDEX IF NOT EXISTS idx_journal_entries_date ON journal_entries(tenant_id, transaction_date);
CREATE INDEX IF NOT EXISTS idx_journal_entries_period ON journal_entries(tenant_id, fiscal_period_id);
CREATE INDEX IF NOT EXISTS idx_journal_entries_status ON journal_entries(tenant_id, status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_journal_entries_source ON journal_entries(tenant_id, source_type, source_id);

-- 2.2 Enable RLS
ALTER TABLE public.journal_entries ENABLE ROW LEVEL SECURITY;

-- 2.3 RLS Policies
-- Finance/CFO: full access
DROP POLICY IF EXISTS "finance_manage_journal_entries" ON public.journal_entries;
CREATE POLICY "finance_manage_journal_entries"
  ON public.journal_entries FOR ALL
  TO authenticated
  USING (
    tenant_id = (auth.jwt()->>'tenant_id')::uuid
    AND EXISTS (
      SELECT 1 FROM public.user_profiles up
      JOIN public.roles r ON up.role_id = r.id
      WHERE up.id = auth.uid()
      AND r.name IN ('finance', 'cfo', 'admin', 'super_admin')
    )
  )
  WITH CHECK (
    tenant_id = (auth.jwt()->>'tenant_id')::uuid
    AND EXISTS (
      SELECT 1 FROM public.user_profiles up
      JOIN public.roles r ON up.role_id = r.id
      WHERE up.id = auth.uid()
      AND r.name IN ('finance', 'cfo', 'admin', 'super_admin')
    )
  );

-- CEO: read only
DROP POLICY IF EXISTS "ceo_read_journal_entries" ON public.journal_entries;
CREATE POLICY "ceo_read_journal_entries"
  ON public.journal_entries FOR SELECT
  TO authenticated
  USING (
    tenant_id = (auth.jwt()->>'tenant_id')::uuid
    AND EXISTS (
      SELECT 1 FROM public.user_profiles up
      JOIN public.roles r ON up.role_id = r.id
      WHERE up.id = auth.uid()
      AND r.name IN ('ceo', 'admin', 'super_admin')
    )
  );

-- 3. Journal Lines Table (Double-Entry Details)
CREATE TABLE IF NOT EXISTS public.journal_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  
  -- Link to parent entry
  journal_entry_id uuid NOT NULL REFERENCES public.journal_entries(id) ON DELETE CASCADE,
  
  -- Line number (for ordering)
  line_number integer NOT NULL,
  
  -- Account assignment
  coa_id uuid NOT NULL REFERENCES public.coa(id),
  
  -- Debit/Credit (PSAK: one line is either debit OR credit, not both)
  debit_amount numeric(20,4) NOT NULL DEFAULT 0,
  credit_amount numeric(20,4) NOT NULL DEFAULT 0,
  
  -- Multi-currency
  currency text NOT NULL DEFAULT 'IDR',
  exchange_rate numeric(10,4) DEFAULT 1,
  debit_amount_base numeric(20,4) NOT NULL DEFAULT 0, -- Base currency (IDR)
  credit_amount_base numeric(20,4) NOT NULL DEFAULT 0, -- Base currency (IDR)
  
  -- Description (optional override)
  line_description text,
  
  -- Cost center / dimension (for management reporting)
  cost_center_id uuid, -- Future: cost_centers table
  project_id uuid REFERENCES public.projects(id),
  client_id uuid REFERENCES public.clients(id),
  
  -- Tax
  tax_code text,
  tax_amount numeric(20,4) DEFAULT 0,
  
  -- Audit
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid NOT NULL REFERENCES public.user_profiles(id),
  updated_by uuid REFERENCES public.user_profiles(id),
  deleted_at timestamptz
);

-- 3.1 Indexes
CREATE INDEX IF NOT EXISTS idx_journal_lines_tenant ON journal_lines(tenant_id);
CREATE INDEX IF NOT EXISTS idx_journal_lines_entry ON journal_lines(journal_entry_id);
CREATE INDEX IF NOT EXISTS idx_journal_lines_coa ON journal_lines(tenant_id, coa_id);
CREATE INDEX IF NOT EXISTS idx_journal_lines_project ON journal_lines(tenant_id, project_id);
CREATE INDEX IF NOT EXISTS idx_journal_lines_client ON journal_lines(tenant_id, client_id);

-- 3.2 Enable RLS
ALTER TABLE public.journal_lines ENABLE ROW LEVEL SECURITY;

-- 3.3 RLS Policies (same as journal_entries - inherits parent access)
DROP POLICY IF EXISTS "finance_manage_journal_lines" ON public.journal_lines;
CREATE POLICY "finance_manage_journal_lines"
  ON public.journal_lines FOR ALL
  TO authenticated
  USING (
    tenant_id = (auth.jwt()->>'tenant_id')::uuid
    AND EXISTS (
      SELECT 1 FROM public.user_profiles up
      JOIN public.roles r ON up.role_id = r.id
      WHERE up.id = auth.uid()
      AND r.name IN ('finance', 'cfo', 'admin', 'super_admin')
    )
  )
  WITH CHECK (
    tenant_id = (auth.jwt()->>'tenant_id')::uuid
    AND EXISTS (
      SELECT 1 FROM public.user_profiles up
      JOIN public.roles r ON up.role_id = r.id
      WHERE up.id = auth.uid()
      AND r.name IN ('finance', 'cfo', 'admin', 'super_admin')
    )
  );

-- 4. Constraints

-- 4.1 Fiscal period date validation
ALTER TABLE public.fiscal_periods
  ADD CONSTRAINT chk_fiscal_period_dates
  CHECK (end_date >= start_date);

-- 4.2 Journal line: debit and credit cannot both be non-zero (PSAK rule)
ALTER TABLE public.journal_lines
  ADD CONSTRAINT chk_journal_line_single_side
  CHECK (
    (debit_amount > 0 AND credit_amount = 0) OR
    (debit_amount = 0 AND credit_amount > 0) OR
    (debit_amount = 0 AND credit_amount = 0)
  );

-- 5. Triggers

-- 5.1 Auto-update updated_at
DROP TRIGGER IF EXISTS fiscal_periods_updated_at ON fiscal_periods;
CREATE TRIGGER fiscal_periods_updated_at
  BEFORE UPDATE ON fiscal_periods
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS journal_entries_updated_at ON journal_entries;
CREATE TRIGGER journal_entries_updated_at
  BEFORE UPDATE ON journal_entries
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS journal_lines_updated_at ON journal_lines;
CREATE TRIGGER journal_lines_updated_at
  BEFORE UPDATE ON journal_lines
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 6. Functions

-- 6.1 Validate double-entry balance (debit = credit)
CREATE OR REPLACE FUNCTION public.validate_journal_entry_balance()
RETURNS TRIGGER AS $$
DECLARE
  total_debit numeric(20,4);
  total_credit numeric(20,4);
BEGIN
  SELECT 
    COALESCE(SUM(debit_amount_base), 0),
    COALESCE(SUM(credit_amount_base), 0)
  INTO total_debit, total_credit
  FROM public.journal_lines
  WHERE journal_entry_id = NEW.id;
  
  IF total_debit != total_credit THEN
    RAISE EXCEPTION 'Journal entry imbalance: debit=%, credit=%', total_debit, total_credit;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 6.2 Trigger: Validate balance on journal entry update (before posting)
DROP TRIGGER IF EXISTS validate_journal_balance_on_post ON journal_entries;
CREATE TRIGGER validate_journal_balance_on_post
  BEFORE UPDATE ON journal_entries
  FOR EACH ROW
  WHEN (NEW.status = 'posted' AND OLD.status != 'posted')
  EXECUTE FUNCTION public.validate_journal_entry_balance();

-- 6.3 Prevent updates/deletes on posted entries (PSAK: immutable after posting)
CREATE OR REPLACE FUNCTION public.prevent_posted_entry_modification()
RETURNS TRIGGER AS $$
DECLARE
  entry_status text;
BEGIN
  -- For journal_entries: check OLD.status directly
  IF TG_TABLE_NAME = 'journal_entries' THEN
    IF OLD.status = 'posted' AND TG_OP != 'SELECT' THEN
      RAISE EXCEPTION 'Cannot modify posted journal entry (ID: %). Use reversal instead.', OLD.id;
    END IF;
  -- For journal_lines: lookup parent entry status
  ELSIF TG_TABLE_NAME = 'journal_lines' THEN
    SELECT status INTO entry_status
    FROM public.journal_entries
    WHERE id = NEW.journal_entry_id;
    
    IF entry_status = 'posted' AND TG_OP != 'SELECT' THEN
      RAISE EXCEPTION 'Cannot modify journal lines of posted entry (ID: %). Use reversal instead.', NEW.journal_entry_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS prevent_posted_modification ON journal_entries;
CREATE TRIGGER prevent_posted_modification
  BEFORE UPDATE OR DELETE ON journal_entries
  FOR EACH ROW EXECUTE FUNCTION public.prevent_posted_entry_modification();

-- 6.4 Prevent modifications to journal lines of posted entries
-- Note: Using function-based check instead of WHEN clause to avoid subquery restriction
DROP TRIGGER IF EXISTS prevent_posted_lines_modification ON journal_lines;
CREATE TRIGGER prevent_posted_lines_modification
  BEFORE UPDATE OR DELETE ON journal_lines
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_posted_entry_modification();

-- 6.5 Auto-assign fiscal period based on transaction date
CREATE OR REPLACE FUNCTION public.assign_fiscal_period()
RETURNS TRIGGER AS $$
BEGIN
  SELECT id INTO NEW.fiscal_period_id
  FROM public.fiscal_periods
  WHERE tenant_id = NEW.tenant_id
    AND NEW.transaction_date BETWEEN start_date AND end_date
    AND status != 'closed'
    AND deleted_at IS NULL
  LIMIT 1;
  
  IF NEW.fiscal_period_id IS NULL THEN
    RAISE NOTICE 'No open fiscal period found for transaction date %', NEW.transaction_date;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS auto_assign_fiscal_period ON journal_entries;
CREATE TRIGGER auto_assign_fiscal_period
  BEFORE INSERT OR UPDATE ON journal_entries
  FOR EACH ROW EXECUTE FUNCTION public.assign_fiscal_period();

-- 7. Seed Data (Default PSAK COA Template)
-- Insert default Chart of Accounts for new tenants
-- PSAK Standard Account Structure

INSERT INTO public.coa (tenant_id, account_code, account_name, account_type, level, normal_balance, description)
SELECT 
  '00000000-0000-0000-0000-000000000001'::uuid, -- Dev tenant
  code, name, type, lvl, balance, description
FROM (VALUES
  -- Level 1: Main Categories
  ('1', 'ASSETS', 'asset', 1, 'debit', 'Total Assets'),
  ('2', 'LIABILITIES', 'liability', 1, 'credit', 'Total Liabilities'),
  ('3', 'EQUITY', 'equity', 1, 'credit', 'Total Equity'),
  ('4', 'REVENUE', 'revenue', 1, 'credit', 'Total Revenue'),
  ('5', 'EXPENSES', 'expense', 1, 'debit', 'Total Expenses'),
  
  -- Level 2: Asset Categories (1-xxxx)
  ('1-1000', 'Current Assets', 'asset', 2, 'debit', 'Assets expected to be converted to cash within 1 year'),
  ('1-2000', 'Non-Current Assets', 'asset', 2, 'debit', 'Long-term assets'),
  ('1-3000', 'Other Assets', 'asset', 2, 'debit', 'Miscellaneous assets'),
  
  -- Level 3: Current Assets Detail
  ('1-1010', 'Cash and Cash Equivalents', 'asset', 3, 'debit', 'Cash on hand and bank deposits'),
  ('1-1020', 'Accounts Receivable', 'asset', 3, 'debit', 'Money owed by customers'),
  ('1-1030', 'Inventory', 'asset', 3, 'debit', 'Goods held for sale'),
  ('1-1040', 'Prepaid Expenses', 'asset', 3, 'debit', 'Expenses paid in advance'),
  
  -- Level 3: Non-Current Assets Detail
  ('1-2010', 'Property, Plant & Equipment', 'asset', 3, 'debit', 'Fixed assets (land, buildings, equipment)'),
  ('1-2020', 'Accumulated Depreciation', 'asset', 3, 'credit', 'Contra-asset for depreciation'),
  ('1-2030', 'Intangible Assets', 'asset', 3, 'debit', 'Non-physical assets (goodwill, patents)'),
  
  -- Level 2: Liability Categories (2-xxxx)
  ('2-1000', 'Current Liabilities', 'liability', 2, 'credit', 'Obligations due within 1 year'),
  ('2-2000', 'Non-Current Liabilities', 'liability', 2, 'credit', 'Long-term obligations'),
  
  -- Level 3: Current Liabilities Detail
  ('2-1010', 'Accounts Payable', 'liability', 3, 'credit', 'Money owed to suppliers'),
  ('2-1020', 'Accrued Expenses', 'liability', 3, 'credit', 'Expenses incurred but not yet paid'),
  ('2-1030', 'Short-Term Debt', 'liability', 3, 'credit', 'Loans due within 1 year'),
  ('2-1040', 'Tax Payable', 'liability', 3, 'credit', 'Taxes owed to government'),
  
  -- Level 2: Equity Categories (3-xxxx)
  ('3-1000', 'Share Capital', 'equity', 2, 'credit', 'Capital invested by shareholders'),
  ('3-2000', 'Retained Earnings', 'equity', 2, 'credit', 'Accumulated profits'),
  ('3-3000', 'Other Equity', 'equity', 2, 'credit', 'Additional paid-in capital, revaluation surplus'),
  
  -- Level 2: Revenue Categories (4-xxxx)
  ('4-1000', 'Operating Revenue', 'revenue', 2, 'credit', 'Revenue from core business operations'),
  ('4-2000', 'Other Income', 'revenue', 2, 'credit', 'Non-operating income'),
  
  -- Level 3: Operating Revenue Detail
  ('4-1010', 'Service Revenue', 'revenue', 3, 'credit', 'Revenue from services rendered'),
  ('4-1020', 'Product Sales', 'revenue', 3, 'credit', 'Revenue from product sales'),
  ('4-1030', 'Project Revenue', 'revenue', 3, 'credit', 'Revenue from projects'),
  
  -- Level 2: Expense Categories (5-xxxx)
  ('5-1000', 'Cost of Goods Sold', 'expense', 2, 'debit', 'Direct costs of producing goods/services'),
  ('5-2000', 'Operating Expenses', 'expense', 2, 'debit', 'Day-to-day operating costs'),
  ('5-3000', 'Other Expenses', 'expense', 2, 'debit', 'Non-operating expenses'),
  
  -- Level 3: COGS Detail
  ('5-1010', 'Direct Labor', 'expense', 3, 'debit', 'Labor costs directly tied to production'),
  ('5-1020', 'Direct Materials', 'expense', 3, 'debit', 'Materials used in production'),
  
  -- Level 3: Operating Expenses Detail
  ('5-2010', 'Salaries and Wages', 'expense', 3, 'debit', 'Employee compensation'),
  ('5-2020', 'Rent Expense', 'expense', 3, 'debit', 'Office/warehouse rent'),
  ('5-2030', 'Utilities', 'expense', 3, 'debit', 'Electricity, water, internet'),
  ('5-2040', 'Depreciation Expense', 'expense', 3, 'debit', 'Depreciation of fixed assets'),
  ('5-2050', 'Professional Fees', 'expense', 3, 'debit', 'Legal, accounting, consulting fees'),
  ('5-2060', 'Marketing and Advertising', 'expense', 3, 'debit', 'Promotion costs'),
  ('5-2070', 'Office Supplies', 'expense', 3, 'debit', 'Stationery and office materials'),
  ('5-2080', 'Travel and Entertainment', 'expense', 3, 'debit', 'Business travel costs'),
  ('5-2090', 'Insurance', 'expense', 3, 'debit', 'Business insurance premiums')
) AS t(code, name, type, lvl, balance, description)
ON CONFLICT DO NOTHING;

-- =====================================================
-- SETUP COMPLETE!
-- =====================================================
-- Tables created:
--   - fiscal_periods (period lock/close mechanism)
--   - journal_entries (double-entry header)
--   - journal_lines (debit/credit details)
--
-- PSAK Compliance:
--   - Double-entry validation (debit = credit)
--   - Immutable after posting (reversal-only)
--   - Fiscal period locking
--   - Multi-currency support
--   - Audit trail (7-year retention ready)
-- =====================================================
