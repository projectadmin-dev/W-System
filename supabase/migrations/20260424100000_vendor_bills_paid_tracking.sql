-- Migration: Add paid_at and paid_days to vendor_bills for AP payment tracking
-- For Vendor Bills & AP Aging Module

ALTER TABLE vendor_bills
  ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS paid_days INTEGER;

-- Update existing rows: calculate paid_days from bill_date if bill is paid
UPDATE vendor_bills
SET paid_at = COALESCE(paid_at, updated_at),
    paid_days = CASE 
      WHEN status = 'paid' THEN COALESCE(paid_days, GREATEST(0, EXTRACT(DAY FROM COALESCE(paid_at, updated_at) - bill_date)::INTEGER))
      ELSE NULL
    END
WHERE status = 'paid' AND paid_at IS NULL;

-- Create index for paid_at
CREATE INDEX IF NOT EXISTS idx_vendor_bills_paid_at ON vendor_bills(paid_at) WHERE paid_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_vendor_bills_paid_days ON vendor_bills(paid_days);

-- ============================================
-- CREATE AP AGING FUNCTION (if not exists)
-- ============================================
CREATE OR REPLACE FUNCTION get_ap_aging()
RETURNS TABLE (
  vendor_id UUID,
  vendor_name TEXT,
  current NUMERIC,
  days_1_30 NUMERIC,
  days_31_60 NUMERIC,
  days_61_90 NUMERIC,
  over_90 NUMERIC,
  total NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    v.id AS vendor_id,
    v.vendor_name,
    COALESCE(SUM(
      CASE WHEN vb.status NOT IN ('paid','cancelled') AND vb.due_date >= CURRENT_DATE 
           THEN LEAST(vb.amount_due, vb.total_amount - vb.amount_paid) ELSE 0 
      END), 0) AS current,
    COALESCE(SUM(
      CASE WHEN vb.status NOT IN ('paid','cancelled') 
                AND vb.due_date < CURRENT_DATE 
                AND vb.due_date >= CURRENT_DATE - INTERVAL '30 days'
           THEN LEAST(vb.amount_due, vb.total_amount - vb.amount_paid) ELSE 0 
      END), 0) AS days_1_30,
    COALESCE(SUM(
      CASE WHEN vb.status NOT IN ('paid','cancelled') 
                AND vb.due_date < CURRENT_DATE - INTERVAL '30 days'
                AND vb.due_date >= CURRENT_DATE - INTERVAL '60 days'
           THEN LEAST(vb.amount_due, vb.total_amount - vb.amount_paid) ELSE 0 
      END), 0) AS days_31_60,
    COALESCE(SUM(
      CASE WHEN vb.status NOT IN ('paid','cancelled') 
                AND vb.due_date < CURRENT_DATE - INTERVAL '60 days'
                AND vb.due_date >= CURRENT_DATE - INTERVAL '90 days'
           THEN LEAST(vb.amount_due, vb.total_amount - vb.amount_paid) ELSE 0 
      END), 0) AS days_61_90,
    COALESCE(SUM(
      CASE WHEN vb.status NOT IN ('paid','cancelled') 
                AND vb.due_date < CURRENT_DATE - INTERVAL '90 days'
           THEN LEAST(vb.amount_due, vb.total_amount - vb.amount_paid) ELSE 0 
      END), 0) AS over_90,
    COALESCE(SUM(
      CASE WHEN vb.status NOT IN ('paid','cancelled') 
           THEN LEAST(vb.amount_due, vb.total_amount - vb.amount_paid) ELSE 0 
      END), 0) AS total
  FROM vendors v
  LEFT JOIN vendor_bills vb ON vb.vendor_id = v.id AND vb.deleted_at IS NULL
  WHERE v.deleted_at IS NULL
  GROUP BY v.id, v.vendor_name
  HAVING COALESCE(SUM(
    CASE WHEN vb.status NOT IN ('paid','cancelled') 
         THEN LEAST(vb.amount_due, vb.total_amount - vb.amount_paid) ELSE 0 
    END), 0) > 0;
END;
$$ LANGUAGE plpgsql;
