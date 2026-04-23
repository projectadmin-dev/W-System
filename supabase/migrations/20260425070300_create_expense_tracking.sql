-- =============================================
-- Migration: Create Expense Tracking Tables
-- Module: Finance - Expense Tracking
-- Author: Reddie
-- Date: 2026-04-25
-- =============================================

-- 1. Expense Kinds (8 categories + budgets)
CREATE TABLE IF NOT EXISTS expense_kinds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kind_code TEXT NOT NULL UNIQUE,          -- operating, cogs, payroll, marketing, etc
  label TEXT NOT NULL,                      -- Human-readable label (Indonesian)
  monthly_budget NUMERIC(15,2) DEFAULT 0,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Expense Categories (20 sub-categories mapped to kinds)
CREATE TABLE IF NOT EXISTS expense_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_code TEXT NOT NULL UNIQUE,
  category_name TEXT NOT NULL,
  kind_code TEXT NOT NULL REFERENCES expense_kinds(kind_code) ON DELETE CASCADE,
  description TEXT,
  budget NUMERIC(15,2) DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Expenses (core transaction table)
CREATE TABLE IF NOT EXISTS expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  expense_number TEXT UNIQUE,               -- e.g. EXP-202605-0001 (optional)
  kind_code TEXT NOT NULL REFERENCES expense_kinds(kind_code),
  category_id UUID NOT NULL REFERENCES expense_categories(id),
  category_name TEXT NOT NULL,              -- Cached for fast query
  description TEXT NOT NULL,
  amount NUMERIC(15,2) NOT NULL DEFAULT 0,
  expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
  vendor TEXT,                              -- Optional vendor name
  payment_method TEXT NOT NULL DEFAULT 'transfer' CHECK (payment_method IN ('cash', 'transfer', 'corporate_card', 'reimbursement')),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'approved', 'rejected', 'paid', 'cancelled')),
  approved_by TEXT,
  rejection_reason TEXT,
  receipt_url TEXT,
  notes TEXT,
  entity_id UUID,                          -- FK to entities if exists
  created_by TEXT NOT NULL DEFAULT 'system',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(expense_date);
CREATE INDEX IF NOT EXISTS idx_expenses_kind ON expenses(kind_code);
CREATE INDEX IF NOT EXISTS idx_expenses_category ON expenses(category_id);
CREATE INDEX IF NOT EXISTS idx_expenses_status ON expenses(status);
CREATE INDEX IF NOT EXISTS idx_expenses_deleted ON expenses(deleted_at) WHERE deleted_at IS NULL;

-- 4. Seed expense kinds (Indonesian)
INSERT INTO expense_kinds (kind_code, label, monthly_budget, description) VALUES
('operating', 'Pengeluaran Operasional', 17500000, 'Biaya operasional harian perusahaan'),
('cogs', 'Harga Pokok Penjualan', 128000000, 'Biaya bahan baku dan produksi'),
('payroll', 'Gaji & Tunjangan', 242500000, 'Gaji, BPJS, THR, dan bonus'),
('marketing', 'Pemasaran', 43000000, 'Iklan, event, dan promosi'),
('development', 'Pengembangan Produk', 25500000, 'Server, cloud, dan lisensi software'),
('office', 'Kantor & Fasilitas', 46500000, 'Sewa, listrik, ATK, dan internet'),
('travel', 'Perjalanan Dinas', 23000000, 'Transportasi dan akomodasi bisnis'),
('other', 'Lain-lain', 8000000, 'Pengeluaran tidak terduga')
ON CONFLICT (kind_code) DO NOTHING;

-- 5. Seed expense categories
INSERT INTO expense_categories (category_code, category_name, kind_code, description, budget) VALUES
('CAT-001', 'Listrik & Air Kantor', 'office', 'Tagihan listrik, air, dan internet kantor', 8500000),
('CAT-002', 'Sewa Kantor', 'office', 'Sewa ruangan kantor bulanan', 35000000),
('CAT-003', 'ATK & Perlengkapan', 'office', 'Alat tulis kantor dan perlengkapan', 3000000),
('CAT-004', 'Gaji Karyawan', 'payroll', 'Gaji pokok dan tunjangan karyawan', 185000000),
('CAT-005', 'THR & Bonus', 'payroll', 'Tunjangan Hari Raya dan bonus kinerja', 45000000),
('CAT-006', 'BPJS Kesehatan', 'payroll', 'Iuran BPJS Kesehatan perusahaan', 12500000),
('CAT-007', 'Iklan Digital', 'marketing', 'Google Ads, Meta Ads, LinkedIn Ads', 28000000),
('CAT-008', 'Event & Promosi', 'marketing', 'Event, seminar, dan promosi produk', 15000000),
('CAT-009', 'Bahan Baku', 'cogs', 'Pembelian bahan baku produksi', 120000000),
('CAT-010', 'Packaging', 'cogs', 'Kemasan dan label produk', 8000000),
('CAT-011', 'Server & Cloud', 'development', 'AWS, Vercel, Supabase, hosting', 18000000),
('CAT-012', 'Lisensi Software', 'development', 'Lisensi GitHub, Figma, Slack, dll', 7500000),
('CAT-013', 'Transportasi Dinas', 'travel', 'Tiket pesawat, kereta, taksi', 12000000),
('CAT-014', 'Akomodasi', 'travel', 'Hotel dan penginapan dinas', 6500000),
('CAT-015', 'Entertainment Client', 'travel', 'Makan client dan entertainment', 4500000),
('CAT-016', 'Konsultan Pajak', 'operating', 'Jasa konsultan pajak dan akuntan', 5000000),
('CAT-017', 'Izin & Legal', 'operating', 'Perizinan, legal, dan notaris', 3500000),
('CAT-018', 'Asuransi', 'operating', 'Asuransi perusahaan dan kendaraan', 9000000),
('CAT-019', 'Maintenance IT', 'other', 'Perbaikan dan maintenance perangkat IT', 5000000),
('CAT-020', 'Lain-lain', 'other', 'Pengeluaran tidak terduga', 3000000)
ON CONFLICT (category_code) DO NOTHING;

-- 6. Enable RLS
ALTER TABLE expense_kinds ENABLE ROW LEVEL SECURITY;
ALTER TABLE expense_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

-- 7. RLS Policies
CREATE POLICY ek_select ON expense_kinds FOR SELECT USING (is_active = true);
CREATE POLICY ek_insert ON expense_kinds FOR INSERT WITH CHECK (true);
CREATE POLICY ek_update ON expense_kinds FOR UPDATE USING (true);
CREATE POLICY ek_delete ON expense_kinds FOR DELETE USING (true);

CREATE POLICY ec_select ON expense_categories FOR SELECT USING (is_active = true);
CREATE POLICY ec_insert ON expense_categories FOR INSERT WITH CHECK (true);
CREATE POLICY ec_update ON expense_categories FOR UPDATE USING (true);
CREATE POLICY ec_delete ON expense_categories FOR DELETE USING (true);

CREATE POLICY ex_select ON expenses FOR SELECT USING (deleted_at IS NULL);
CREATE POLICY ex_insert ON expenses FOR INSERT WITH CHECK (true);
CREATE POLICY ex_update ON expenses FOR UPDATE USING (deleted_at IS NULL);
CREATE POLICY ex_delete ON expenses FOR DELETE USING (true);

-- 8. Auto-generate expense number
CREATE OR REPLACE FUNCTION generate_expense_number()
RETURNS TRIGGER AS $$
DECLARE
  v_prefix TEXT;
  v_last_number TEXT;
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

  NEW.expense_number := v_prefix || LPAD(
    COALESCE(NULLIF(SUBSTRING(v_last_number FROM LENGTH(v_prefix) + 1), ''), '0')::int + 1,
    4, '0'
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_generate_expense_number ON expenses;
CREATE TRIGGER trigger_generate_expense_number
  BEFORE INSERT ON expenses
  FOR EACH ROW
  WHEN (NEW.expense_number IS NULL OR NEW.expense_number = '')
  EXECUTE FUNCTION generate_expense_number();
