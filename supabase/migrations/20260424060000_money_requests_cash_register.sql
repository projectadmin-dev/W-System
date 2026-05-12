-- Migration: Create money_requests + cash_register_entries tables
-- For Cash/Bank Register + Money Request module

-- ============================================
-- MONEY REQUESTS TABLE
-- Permintaan uang oleh departemen via NIK
-- Categories: procurement, reimbursement, cash_in_advance, other
-- ============================================
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

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_money_requests_nik ON money_requests(employee_nik);
CREATE INDEX IF NOT EXISTS idx_money_requests_dept ON money_requests(department);
CREATE INDEX IF NOT EXISTS idx_money_requests_status ON money_requests(approval_status);
CREATE INDEX IF NOT EXISTS idx_money_requests_type ON money_requests(request_type);
CREATE INDEX IF NOT EXISTS idx_money_requests_created_at ON money_requests(created_at);
CREATE INDEX IF NOT EXISTS idx_money_requests_deleted_at ON money_requests(deleted_at) WHERE deleted_at IS NULL;

-- Enable RLS
ALTER TABLE money_requests ENABLE ROW LEVEL SECURITY;

-- ============================================
-- CASH REGISTER ENTRIES TABLE
-- Tracking uang masuk & keluar harian
-- ============================================
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

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_cash_entries_date ON cash_register_entries(entry_date);
CREATE INDEX IF NOT EXISTS idx_cash_entries_type ON cash_register_entries(entry_type);
CREATE INDEX IF NOT EXISTS idx_cash_entries_source ON cash_register_entries(source_type, source_id);
CREATE INDEX IF NOT EXISTS idx_cash_entries_coa ON cash_register_entries(coa_id);
CREATE INDEX IF NOT EXISTS idx_cash_entries_deleted_at ON cash_register_entries(deleted_at) WHERE deleted_at IS NULL;

-- Enable RLS
ALTER TABLE cash_register_entries ENABLE ROW LEVEL SECURITY;

-- ============================================
-- TRIGGER: Auto-update running_balance after insert
-- ============================================
CREATE OR REPLACE FUNCTION update_cash_register_balance()
RETURNS TRIGGER AS $$
DECLARE
    v_latest_balance DECIMAL(15,2);
BEGIN
    -- Get latest running balance before this entry
    SELECT COALESCE(MAX(running_balance), 0)
    INTO v_latest_balance
    FROM cash_register_entries
    WHERE id != NEW.id
      AND deleted_at IS NULL
      AND entry_date <= NEW.entry_date;

    -- Calculate new running balance
    IF NEW.entry_type = 'in' THEN
        NEW.running_balance := v_latest_balance + NEW.amount;
    ELSE
        NEW.running_balance := v_latest_balance - NEW.amount;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_cash_balance ON cash_register_entries;

CREATE TRIGGER trg_update_cash_balance
    BEFORE INSERT ON cash_register_entries
    FOR EACH ROW
    EXECUTE FUNCTION update_cash_register_balance();

-- ============================================
-- TRIGGER: Auto-update running_balance on update
-- ============================================
CREATE OR REPLACE FUNCTION recalc_cash_register_balance()
RETURNS TRIGGER AS $$
DECLARE
    v_entry RECORD;
    v_balance DECIMAL(15,2) := 0;
BEGIN
    -- Recalculate all balances from the oldest entry forward
    FOR v_entry IN
        SELECT id, entry_type, amount
        FROM cash_register_entries
        WHERE deleted_at IS NULL
        ORDER BY entry_date, created_at
    LOOP
        IF v_entry.entry_type = 'in' THEN
            v_balance := v_balance + v_entry.amount;
        ELSE
            v_balance := v_balance - v_entry.amount;
        END IF;

        UPDATE cash_register_entries
        SET running_balance = v_balance
        WHERE id = v_entry.id;
    END LOOP;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_recalc_cash_balance ON cash_register_entries;

CREATE TRIGGER trg_recalc_cash_balance
    AFTER UPDATE OF amount, entry_type, deleted_at ON cash_register_entries
    FOR EACH ROW
    EXECUTE FUNCTION recalc_cash_register_balance();

-- ============================================
-- TRIGGER: Auto-update money_requests timestamps
-- ============================================
CREATE OR REPLACE FUNCTION update_money_request_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at := NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_money_req_timestamp ON money_requests;

CREATE TRIGGER trg_money_req_timestamp
    BEFORE UPDATE ON money_requests
    FOR EACH ROW
    EXECUTE FUNCTION update_money_request_timestamp();
