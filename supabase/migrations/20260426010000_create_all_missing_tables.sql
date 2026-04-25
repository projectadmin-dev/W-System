-- Isolated migration: Create all missing finance tables
-- Safe to run even if some tables partially exist (uses CREATE TABLE IF NOT EXISTS)

-- ============================================
-- 1. BANK_ACCOUNTS (referenced by petty_cash, payment_vouchers)
-- ============================================
CREATE TABLE IF NOT EXISTS bank_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  bank_name TEXT NOT NULL,
  account_name TEXT NOT NULL,
  account_number TEXT NOT NULL,
  account_type TEXT DEFAULT 'saving',
  currency TEXT DEFAULT 'IDR',
  current_balance DECIMAL(15,2) DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_ba_tenant ON bank_accounts(tenant_id);

-- ============================================
-- 2. FIN_VENDORS (referenced by payment_vouchers)
-- ============================================
CREATE TABLE IF NOT EXISTS fin_vendors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  vendor_code TEXT UNIQUE,
  vendor_name TEXT NOT NULL,
  vendor_type TEXT DEFAULT 'supplier',
  email TEXT,
  phone TEXT,
  address TEXT,
  bank_name TEXT,
  bank_account_name TEXT,
  bank_account_number TEXT,
  npwp TEXT,
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_fv_tenant ON fin_vendors(tenant_id);

-- ============================================
-- 3. PETTY CASH CUSTODIANS
-- ============================================
CREATE TABLE IF NOT EXISTS petty_cash_custodians (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID,
  custodian_name TEXT NOT NULL,
  department TEXT NOT NULL DEFAULT 'Finance',
  account_name TEXT NOT NULL DEFAULT 'Kas Kecil',
  opening_balance DECIMAL(15,2) DEFAULT 0,
  current_balance DECIMAL(15,2) DEFAULT 0,
  max_limit DECIMAL(15,2) DEFAULT 2000000,
  currency TEXT DEFAULT 'IDR',
  is_active BOOLEAN DEFAULT true,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID,
  updated_by UUID,
  deleted_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_pcc_tenant ON petty_cash_custodians(tenant_id);
CREATE INDEX IF NOT EXISTS idx_pcc_user ON petty_cash_custodians(user_id);

-- ============================================
-- 4. PETTY CASH ENTRIES
-- ============================================
CREATE TABLE IF NOT EXISTS petty_cash_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  custodian_id UUID REFERENCES petty_cash_custodians(id) ON DELETE CASCADE,
  entry_date DATE DEFAULT CURRENT_DATE,
  entry_type TEXT NOT NULL CHECK (entry_type IN ('topup', 'expense', 'settlement', 'return', 'adjustment')),
  amount DECIMAL(15,2) DEFAULT 0,
  description TEXT NOT NULL,
  category TEXT DEFAULT 'other',
  reference_number TEXT,
  receipt_url TEXT,
  running_balance DECIMAL(15,2) DEFAULT 0,
  money_request_id UUID,
  bank_account_id UUID,
  recipient_name TEXT,
  recipient_department TEXT,
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID,
  updated_by UUID,
  deleted_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_pce_custodian ON petty_cash_entries(custodian_id);
CREATE INDEX IF NOT EXISTS idx_pce_date ON petty_cash_entries(entry_date);
CREATE INDEX IF NOT EXISTS idx_pce_mr ON petty_cash_entries(money_request_id);

-- ============================================
-- 5. MONEY REQUEST ITEMS
-- ============================================
CREATE TABLE IF NOT EXISTS money_request_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  money_request_id UUID REFERENCES money_requests(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  quantity DECIMAL(15,2) DEFAULT 1,
  unit_price DECIMAL(15,2) DEFAULT 0,
  total_price DECIMAL(15,2) DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_mri_mr ON money_request_items(money_request_id);

-- ============================================
-- 6. PAYMENT VOUCHERS (BKK/BBK)
-- ============================================
CREATE TABLE IF NOT EXISTS payment_vouchers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  voucher_type TEXT NOT NULL CHECK (voucher_type IN ('BKK', 'BBK')),
  voucher_number TEXT UNIQUE,
  voucher_date DATE DEFAULT CURRENT_DATE,
  sender_account_id UUID,
  sender_type TEXT CHECK (sender_type IN ('bank', 'petty_cash')),
  receiver_name TEXT NOT NULL,
  receiver_account_no TEXT,
  receiver_bank TEXT,
  vendor_id UUID,
  main_coa_id UUID,
  main_amount DECIMAL(15,2) DEFAULT 0,
  currency TEXT DEFAULT 'IDR',
  exchange_rate DECIMAL(10,4) DEFAULT 1,
  total_amount DECIMAL(15,2) DEFAULT 0,
  notes TEXT,
  description TEXT,
  reference_number TEXT,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'issued', 'paid', 'cancelled', 'voided')),
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  prepared_by UUID,
  journal_entry_id UUID,
  attachment_url TEXT,
  printed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_pv_tenant ON payment_vouchers(tenant_id);
CREATE INDEX IF NOT EXISTS idx_pv_number ON payment_vouchers(voucher_number);
CREATE INDEX IF NOT EXISTS idx_pv_status ON payment_vouchers(status);

-- ============================================
-- 7. PAYMENT VOUCHER ITEMS
-- ============================================
CREATE TABLE IF NOT EXISTS payment_voucher_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_voucher_id UUID REFERENCES payment_vouchers(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  coa_id UUID,
  amount DECIMAL(15,2) DEFAULT 0,
  notes TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_pvi_voucher ON payment_voucher_items(payment_voucher_id);

-- ============================================
-- 8. RECEIPTS + RECEIPT ALLOCATIONS
-- ============================================
CREATE TABLE IF NOT EXISTS receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  receipt_number TEXT UNIQUE,
  receipt_date DATE DEFAULT CURRENT_DATE,
  customer_id UUID,
  payment_method TEXT,
  amount DECIMAL(15,2) DEFAULT 0,
  notes TEXT,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'deposited', 'reconciled', 'cancelled')),
  reconciled BOOLEAN DEFAULT false,
  reconciled_at TIMESTAMPTZ,
  reconciled_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_receipt_tenant ON receipts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_receipt_number ON receipts(receipt_number);
CREATE INDEX IF NOT EXISTS idx_receipt_reconciled ON receipts(reconciled);

CREATE TABLE IF NOT EXISTS receipt_allocations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  receipt_id UUID REFERENCES receipts(id) ON DELETE CASCADE,
  invoice_id UUID,
  amount DECIMAL(15,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ra_receipt ON receipt_allocations(receipt_id);

-- ============================================
-- 9. PAYMENT ALLOCATIONS
-- ============================================
CREATE TABLE IF NOT EXISTS payment_allocations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id UUID,
  invoice_id UUID,
  bill_id UUID,
  amount DECIMAL(15,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_pa_payment ON payment_allocations(payment_id);
CREATE INDEX IF NOT EXISTS idx_pa_invoice ON payment_allocations(invoice_id);

-- ============================================
-- RLS for all new tables
-- ============================================
ALTER TABLE bank_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ba_all" ON bank_accounts FOR ALL TO authenticated USING (true) WITH CHECK (true);

ALTER TABLE fin_vendors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "fv_all" ON fin_vendors FOR ALL TO authenticated USING (true) WITH CHECK (true);

ALTER TABLE petty_cash_custodians ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pcc_all" ON petty_cash_custodians FOR ALL TO authenticated USING (true) WITH CHECK (true);

ALTER TABLE petty_cash_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pce_all" ON petty_cash_entries FOR ALL TO authenticated USING (true) WITH CHECK (true);

ALTER TABLE money_request_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "mri_all" ON money_request_items FOR ALL TO authenticated USING (true) WITH CHECK (true);

ALTER TABLE payment_vouchers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pv_all" ON payment_vouchers FOR ALL TO authenticated USING (true) WITH CHECK (true);

ALTER TABLE payment_voucher_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pvi_all" ON payment_voucher_items FOR ALL TO authenticated USING (true) WITH CHECK (true);

ALTER TABLE receipts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "r_all" ON receipts FOR ALL TO authenticated USING (true) WITH CHECK (true);

ALTER TABLE receipt_allocations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ra_all" ON receipt_allocations FOR ALL TO authenticated USING (true) WITH CHECK (true);

ALTER TABLE payment_allocations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pa_all" ON payment_allocations FOR ALL TO authenticated USING (true) WITH CHECK (true);
