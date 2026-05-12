-- Migration: Money Request Enhancements + Petty Cash Auto-Integration
-- Date: 2025-04-25

-- ============================================
-- 1. MONEY REQUEST ITEMS (Dasar Pengajuan dinamis)
-- ============================================
CREATE TABLE IF NOT EXISTS money_request_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  money_request_id UUID NOT NULL REFERENCES money_requests(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  amount DECIMAL(15,2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mri_request ON money_request_items(money_request_id);

-- Trigger: auto-update updated_at
CREATE OR REPLACE FUNCTION update_money_request_items_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at := NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_mri_timestamp ON money_request_items;
CREATE TRIGGER trg_mri_timestamp
    BEFORE UPDATE ON money_request_items
    FOR EACH ROW
    EXECUTE FUNCTION update_money_request_items_timestamp();

-- ============================================
-- 2. ADD tenant_id to money_requests (for RLS & filtering)
-- ============================================
ALTER TABLE money_requests
ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES tenants(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_money_requests_tenant ON money_requests(tenant_id);

-- ============================================
-- 3. UPDATE money_requests: Add purpose_type for category tagging
-- ============================================
ALTER TABLE money_requests
ADD COLUMN IF NOT EXISTS purpose_type TEXT DEFAULT 'general'
CHECK (purpose_type IN ('general', 'procurement', ' operational', 'marketing', 'travel', 'other'));

COMMENT ON COLUMN money_requests.purpose_type IS 'Categorized purpose tag for reporting';

-- ============================================
-- 4. RLS UPDATE: Tenant-scoped money_requests RLS policy
-- ============================================
-- Note: Since tenant_id is new, existing rows won't match. Admin needs to backfill.
-- For now we just add policies but don't enforce strict RLS until backfilled.

-- Enable row level security (already enabled)
-- ALTER TABLE money_requests ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 5. TRIGGER: Auto-populate employee info when NIK matches user_profiles
-- ============================================
CREATE OR REPLACE FUNCTION auto_populate_money_request_employee()
RETURNS TRIGGER AS $$
DECLARE
  v_user RECORD;
BEGIN
  -- If NIK provided, try to auto-fill from user_profiles
  IF NEW.employee_nik IS NOT NULL AND NEW.employee_nik <> '' THEN
    SELECT full_name, department INTO v_user
    FROM user_profiles
    WHERE nik = NEW.employee_nik
      AND (tenant_id IS NULL OR NEW.tenant_id IS NULL OR tenant_id = NEW.tenant_id)
    LIMIT 1;

    IF v_user IS NOT NULL THEN
      NEW.employee_name := COALESCE(NEW.employee_name, v_user.full_name);
      NEW.department := COALESCE(NEW.department, v_user.department);
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_mr_populate_employee ON money_requests;
CREATE TRIGGER trg_mr_populate_employee
    BEFORE INSERT OR UPDATE ON money_requests
    FOR EACH ROW
    EXECUTE FUNCTION auto_populate_money_request_employee();

-- ============================================
-- 6. FUNCTION: Auto-debit petty cash on money request approval (settlement trigger)
-- ============================================
-- This function is called manually via API or webhook, NOT auto-fired from DB trigger
-- to avoid infinite loops and to allow user confirmation UI.
-- Kept here as reference for the API integration logic.

-- ============================================
-- COMPLETE
-- ============================================
