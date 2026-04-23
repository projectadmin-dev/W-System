-- Migration: Petty Cash (Kas Kecil) Module
-- Scope: Custodian management + entries + settlement + integration with money_requests
-- Date: 2026-04-24

-- ============================================
-- 1. PETTY CASH CUSTODIANS (managers of petty cash)
-- ============================================
CREATE TABLE IF NOT EXISTS petty_cash_custodians (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID REFERENCES user_profiles(id), -- employee who manages this fund
  custodian_name TEXT NOT NULL,
  department TEXT NOT NULL,
  account_name TEXT NOT NULL DEFAULT 'Kas Kecil',
  opening_balance DECIMAL(15, 2) NOT NULL DEFAULT 0,
  current_balance DECIMAL(15, 2) NOT NULL DEFAULT 0,
  max_limit DECIMAL(15, 2) NOT NULL DEFAULT 2000000, -- default 2M IDR
  currency TEXT NOT NULL DEFAULT 'IDR',
  is_active BOOLEAN NOT NULL DEFAULT true,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES user_profiles(id),
  updated_by UUID REFERENCES user_profiles(id),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_pcc_tenant ON petty_cash_custodians(tenant_id);
CREATE INDEX IF NOT EXISTS idx_pcc_user ON petty_cash_custodians(user_id);
CREATE INDEX IF NOT EXISTS idx_pcc_active ON petty_cash_custodians(tenant_id, is_active) WHERE is_active = true;

ALTER TABLE petty_cash_custodians ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 2. PETTY CASH ENTRIES (in/out per transaction)
-- ============================================
CREATE TABLE IF NOT EXISTS petty_cash_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  custodian_id UUID NOT NULL REFERENCES petty_cash_custodians(id),
  entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
  entry_type TEXT NOT NULL CHECK (entry_type IN ('topup', 'expense', 'settlement', 'return', 'adjustment')),
  -- topup      = kirim uang dari bank ke kas kecil
  -- expense    = pengeluaran langsung dari kas kecil (ATK, parkir, makan, dll.)
  -- settlement = money request yang diselesaikan dari kas kecil
  -- return     = sisa uang dikembalikan ke bank/kustodian
  -- adjustment = koreksi saldo (lost, found, recount)

  amount DECIMAL(15, 2) NOT NULL DEFAULT 0,
  description TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'other',
    -- Categories: meal, parking, stationery, toll, transport, supplies, entertainment, other
  reference_number TEXT,
  receipt_url TEXT,
  running_balance DECIMAL(15, 2) NOT NULL DEFAULT 0,

  -- Link to money_request when entry_type = 'settlement'
  money_request_id UUID REFERENCES money_requests(id),

  -- Link to bank account when entry_type = 'topup'
  bank_account_id UUID REFERENCES bank_accounts(id),

  -- For expense entries: who was the recipient
  recipient_name TEXT,
  recipient_department TEXT,

  -- Approval for large expenses
  approved_by UUID REFERENCES user_profiles(id),
  approved_at TIMESTAMPTZ,

  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES user_profiles(id),
  updated_by UUID REFERENCES user_profiles(id),
  deleted_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_pce_tenant ON petty_cash_entries(tenant_id);
CREATE INDEX IF NOT EXISTS idx_pce_custodian ON petty_cash_entries(custodian_id);
CREATE INDEX IF NOT EXISTS idx_pce_date ON petty_cash_entries(entry_date);
CREATE INDEX IF NOT EXISTS idx_pce_type ON petty_cash_entries(entry_type);
CREATE INDEX IF NOT EXISTS idx_pce_mr ON petty_cash_entries(money_request_id);
CREATE INDEX IF NOT EXISTS idx_pce_created_at ON petty_cash_entries(created_at);
CREATE INDEX IF NOT EXISTS idx_pce_deleted ON petty_cash_entries(deleted_at) WHERE deleted_at IS NULL;

ALTER TABLE petty_cash_entries ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 3. RLS POLICIES (Finance role has full access)
-- ============================================

-- petty_cash_custodians
CREATE POLICY "finance_manage_custodians"
  ON petty_cash_custodians
  FOR ALL
  TO authenticated
  USING (
    tenant_id = (auth.jwt()->>'tenant_id')::uuid
    AND EXISTS (
      SELECT 1 FROM user_profiles up
      JOIN roles r ON up.role_id = r.id
      WHERE up.id = auth.uid()
      AND r.name IN ('finance', 'cfo', 'admin', 'super_admin')
    )
  );

CREATE POLICY "others_read_custodians"
  ON petty_cash_custodians
  FOR SELECT
  TO authenticated
  USING (
    tenant_id = (auth.jwt()->>'tenant_id')::uuid
  );

-- petty_cash_entries
CREATE POLICY "finance_manage_entries"
  ON petty_cash_entries
  FOR ALL
  TO authenticated
  USING (
    tenant_id = (auth.jwt()->>'tenant_id')::uuid
    AND EXISTS (
      SELECT 1 FROM user_profiles up
      JOIN roles r ON up.role_id = r.id
      WHERE up.id = auth.uid()
      AND r.name IN ('finance', 'cfo', 'admin', 'super_admin')
    )
  );

CREATE POLICY "others_read_entries"
  ON petty_cash_entries
  FOR SELECT
  TO authenticated
  USING (
    tenant_id = (auth.jwt()->>'tenant_id')::uuid
  );

-- ============================================
-- 4. TRIGGERS: Auto-update running_balance on petty_cash_custodians
-- ============================================

-- Function to recalculate current_balance
CREATE OR REPLACE FUNCTION recalculate_petty_cash_balance()
RETURNS TRIGGER AS $$
DECLARE
  v_custodian_id UUID;
  v_total_in DECIMAL(15,2) DEFAULT 0;
  v_total_out DECIMAL(15,2) DEFAULT 0;
  v_new_balance DECIMAL(15,2) DEFAULT 0;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_custodian_id := OLD.custodian_id;
  ELSE
    v_custodian_id := NEW.custodian_id;
  END IF;

  -- Sum all IN entries
  SELECT COALESCE(SUM(amount), 0)
    INTO v_total_in
  FROM petty_cash_entries
  WHERE custodian_id = v_custodian_id
    AND deleted_at IS NULL
    AND entry_type IN ('topup', 'settlement');

  -- Sum all OUT entries
  SELECT COALESCE(SUM(amount), 0)
    INTO v_total_out
  FROM petty_cash_entries
  WHERE custodian_id = v_custodian_id
    AND deleted_at IS NULL
    AND entry_type IN ('expense', 'return');

  v_new_balance := (
    SELECT opening_balance
    FROM petty_cash_custodians
    WHERE id = v_custodian_id
  ) + v_total_in - v_total_out;

  -- Update running_balance on all entries
  UPDATE petty_cash_entries
  SET running_balance = v_new_balance
  WHERE custodian_id = v_custodian_id
    AND deleted_at IS NULL;

  -- Update current_balance on custodian
  UPDATE petty_cash_custodians
  SET current_balance = v_new_balance
  WHERE id = v_custodian_id;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_pce_balance ON petty_cash_entries;
CREATE TRIGGER trg_pce_balance
  AFTER INSERT OR UPDATE OR DELETE ON petty_cash_entries
  FOR EACH ROW
  EXECUTE FUNCTION recalculate_petty_cash_balance();

-- ============================================
-- 5. UPDATE money_requests to link with petty cash
-- ============================================
ALTER TABLE money_requests
ADD COLUMN IF NOT EXISTS settled_from_petty_cash BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS petty_cash_entry_id UUID REFERENCES petty_cash_entries(id),
ADD COLUMN IF NOT EXISTS settled_at TIMESTAMPTZ;

-- ============================================
-- 6. SEED DATA: One default custodian
-- ============================================
INSERT INTO petty_cash_custodians (tenant_id, custodian_name, department, opening_balance, current_balance, max_limit, is_active)
SELECT t.id, 'Kas Kecil Kantor Pusat', 'Finance', 500000, 500000, 5000000, true
FROM tenants t
WHERE NOT EXISTS (
  SELECT 1 FROM petty_cash_custodians
  WHERE tenant_id = t.id AND deleted_at IS NULL
)
LIMIT 1;
