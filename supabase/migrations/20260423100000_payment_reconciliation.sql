-- Migration: Payment reconciliation & AR aging support
-- User Story: Finance Module Enhancement (Option D)
-- Date: 2026-04-23

-- 1. Add payment tracking fields to customer_invoices
ALTER TABLE customer_invoices
ADD COLUMN IF NOT EXISTS paid_amount numeric(20,4) DEFAULT 0,
ADD COLUMN IF NOT EXISTS balance_due numeric(20,4) DEFAULT 0,
ADD COLUMN IF NOT EXISTS paid_at timestamptz,
ADD COLUMN IF NOT EXISTS paid_days integer; -- how many days to payment

-- Compute initial balance
UPDATE customer_invoices SET balance_due = total_amount - COALESCE(paid_amount, 0) WHERE balance_due = 0;

-- 2. Add index for AR aging queries
CREATE INDEX IF NOT EXISTS idx_customer_invoices_due_date ON customer_invoices(due_date)
WHERE deleted_at IS NULL AND status IN ('sent','overdue','partial');

-- 3. Comment
COMMENT ON COLUMN customer_invoices.paid_amount IS 'Total payments received against this invoice';
COMMENT ON COLUMN customer_invoices.balance_due IS 'Remaining balance = total_amount - paid_amount';
