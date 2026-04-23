-- =============================================
-- Migration: Create Expense Tracking + Budget vs Actual
-- Module: Finance - Expense Tracking
-- Author: Reddie
-- Date: 2025-04-25
-- =============================================

-- 1. Expense Categories
CREATE TABLE IF NOT EXISTS expense_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_code TEXT NOT NULL,
  category_name TEXT NOT NULL,
  description TEXT,
  parent_category_id UUID REFERENCES expense_categories(id) ON DELETE SET NULL,
  budget_monthly NUMERIC(15,2) DEFAULT 0,
  budget_yearly NUMERIC(15,2) DEFAULT 0,
  coa_id UUID REFERENCES coa(id) ON DELETE SET NULL,
  entity_id UUID REFERENCES entities(id) ON DELETE SET NULL,
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES user_profiles(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_expense_categories_code ON expense_categories(category_code);
CREATE INDEX IF NOT EXISTS idx_expense_categories_active ON expense_categories(is_active) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_expense_categories_entity ON expense_categories(entity_id) WHERE entity_id IS NOT NULL;

-- Seed default expense categories
INSERT INTO expense_categories (category_code, category_name, description, budget_monthly, budget_yearly) VALUES
('EXP-001', 'Office Rent', 'Monthly office rental payments', 15000000, 180000000),
('EXP-002', 'Utilities', 'Electricity, water, internet, phone', 3000000, 36000000),
('EXP-003', 'Salaries', 'Employee salaries and wages', 50000000, 600000000),
('EXP-004', 'Marketing', 'Advertising, promotions, events', 10000000, 120000000),
('EXP-005', 'Professional Fees', 'Legal, accounting, consulting', 2500000, 30000000),
('EXP-006', 'Office Supplies', 'Stationery, equipment, stationery', 1500000, 18000000),
('EXP-007', 'Travel & Entertainment', 'Business trips, meals, accommodation', 3000000, 36000000),
('EXP-008', 'Insurance', 'Business insurance premiums', 2000000, 24000000),
('EXP-009', 'Maintenance', 'Office equipment and facility maintenance', 1500000, 18000000),
('EXP-010', 'Transportation', 'Company vehicle, fuel, parking', 2500000, 30000000),
('EXP-011', 'Taxes', 'Tax payments and compliance fees', 5000000, 60000000),
('EXP-012', 'Software & Licenses', 'IT subscriptions, software licenses', 2000000, 24000000),
('EXP-013', 'Other', 'Miscellaneous expenses', 1000000, 12000000)
ON CONFLICT (category_code) DO NOTHING;

-- 2. Expenses Table
CREATE TABLE IF NOT EXISTS expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  expense_number TEXT NOT NULL UNIQUE,
  expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
  category_id UUID NOT NULL REFERENCES expense_categories(id),
  vendor_id UUID REFERENCES vendors(id) ON DELETE SET NULL,
  amount NUMERIC(15,2) NOT NULL DEFAULT 0,
  tax_amount NUMERIC(15,2) DEFAULT 0,
  total_amount NUMERIC(15,2) GENERATED ALWAYS AS (COALESCE(amount, 0) + COALESCE(tax_amount, 0)) STORED,
  description TEXT,
  payment_method TEXT DEFAULT 'bank_transfer',
  reference_number TEXT,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'approved', 'paid', 'cancelled')),
  approved_by UUID REFERENCES user_profiles(id),
  approved_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  paid_by UUID REFERENCES user_profiles(id),
  receipt_url TEXT,
  notes TEXT,
  entity_id UUID REFERENCES entities(id) ON DELETE SET NULL,
  created_by UUID REFERENCES user_profiles(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_expenses_number ON expenses(expense_number);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(expense_date);
CREATE INDEX IF NOT EXISTS idx_expenses_category ON expenses(category_id);
CREATE INDEX IF NOT EXISTS idx_expenses_status ON expenses(status);
CREATE INDEX IF NOT EXISTS idx_expenses_deleted ON expenses(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_expenses_entity ON expenses(entity_id) WHERE entity_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_expenses_vendor ON expenses(vendor_id) WHERE vendor_id IS NOT NULL;

-- 3. Monthly Budget Execution Summary (Materialized View for Performance)
CREATE OR REPLACE VIEW expense_budget_summary AS
SELECT
  ec.id AS category_id,
  ec.category_code,
  ec.category_name,
  ec.budget_monthly,
  ec.budget_yearly,
  COALESCE(SUM(CASE WHEN date_trunc('month', e.expense_date) = date_trunc('month', CURRENT_DATE) THEN e.total_amount ELSE 0 END), 0) AS actual_monthly,
  COALESCE(SUM(CASE WHEN date_trunc('year', e.expense_date) = date_trunc('year', CURRENT_DATE) THEN e.total_amount ELSE 0 END), 0) AS actual_yearly,
  ec.budget_monthly - COALESCE(SUM(CASE WHEN date_trunc('month', e.expense_date) = date_trunc('month', CURRENT_DATE) THEN e.total_amount ELSE 0 END), 0) AS variance_monthly,
  ec.budget_yearly - COALESCE(SUM(CASE WHEN date_trunc('year', e.expense_date) = date_trunc('year', CURRENT_DATE) THEN e.total_amount ELSE 0 END), 0) AS variance_yearly
FROM expense_categories ec
LEFT JOIN expenses e ON e.category_id = ec.id AND e.deleted_at IS NULL AND e.status IN ('approved', 'paid')
WHERE ec.deleted_at IS NULL AND ec.is_active = true
GROUP BY ec.id, ec.category_code, ec.category_name, ec.budget_monthly, ec.budget_yearly
ORDER BY ec.category_code;

-- 4. Monthly Expense Trend (for chart data)
CREATE OR REPLACE VIEW expense_monthly_trend AS
SELECT
  date_trunc('month', expense_date)::DATE AS month,
  SUM(total_amount) AS total_amount,
  COUNT(*) AS transaction_count
FROM expenses
WHERE deleted_at IS NULL AND status IN ('approved', 'paid')
GROUP BY date_trunc('month', expense_date)::DATE
ORDER BY month DESC
LIMIT 12;

-- 5. Enable RLS
ALTER TABLE expense_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

-- 6. RLS Policies
CREATE POLICY expense_categories_select ON expense_categories FOR SELECT USING (deleted_at IS NULL);
CREATE POLICY expense_categories_insert ON expense_categories FOR INSERT WITH CHECK (true);
CREATE POLICY expense_categories_update ON expense_categories FOR UPDATE USING (deleted_at IS NULL);
CREATE POLICY expense_categories_delete ON expense_categories FOR DELETE USING (true);

CREATE POLICY expenses_select ON expenses FOR SELECT USING (deleted_at IS NULL);
CREATE POLICY expenses_insert ON expenses FOR INSERT WITH CHECK (true);
CREATE POLICY expenses_update ON expenses FOR UPDATE USING (deleted_at IS NULL);
CREATE POLICY expenses_delete ON expenses FOR DELETE USING (true);

-- 7. Auto-generate expense number trigger
CREATE OR REPLACE FUNCTION generate_expense_number()
RETURNS TRIGGER AS $$
DECLARE
  v_prefix TEXT;
  v_last_number TEXT;
  v_seq INTEGER;
  v_year TEXT;
  v_month TEXT;
BEGIN
  v_year := TO_CHAR(NEW.expense_date, 'YYYY');
  v_month := TO_CHAR(NEW.expense_date, 'MM');
  v_prefix := 'EXP-' || v_year || v_month || '-';

  SELECT expense_number INTO v_last_number
  FROM expenses
  WHERE expense_number LIKE v_prefix || '%'
  ORDER BY expense_number DESC
  LIMIT 1;

  IF v_last_number IS NOT NULL THEN
    v_seq := CAST(SUBSTRING(v_last_number FROM LENGTH(v_prefix) + 1) AS INTEGER) + 1;
  ELSE
    v_seq := 1;
  END IF;

  NEW.expense_number := v_prefix || LPAD(v_seq::TEXT, 4, '0');

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_generate_expense_number ON expenses;
CREATE TRIGGER trigger_generate_expense_number
 BEFORE INSERT ON expenses
 FOR EACH ROW
 WHEN (NEW.expense_number IS NULL OR NEW.expense_number = '')
 EXECUTE FUNCTION generate_expense_number();

-- 8. Seed sample expenses
INSERT INTO expenses (expense_date, category_id, amount, tax_amount, description, payment_method, status, reference_number)
SELECT
  CURRENT_DATE - (random() * 30)::int,
  ec.id,
  (random() * 5000000 + 100000)::numeric(15,2),
  (random() * 500000)::numeric(15,2),
  'Sample expense for ' || ec.category_name,
  (ARRAY['bank_transfer', 'cash', 'check', 'credit_card'])[floor(random() * 4) + 1],
  (ARRAY['draft', 'approved', 'paid'])[floor(random() * 3) + 1],
  'REF-' || floor(random() * 9999)::int::text
FROM expense_categories ec
WHERE ec.category_code IN ('EXP-001', 'EXP-002', 'EXP-004', 'EXP-006', 'EXP-007')
LIMIT 5;
