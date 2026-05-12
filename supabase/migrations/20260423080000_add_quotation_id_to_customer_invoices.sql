-- Migration: Add quotation_id to customer_invoices table
-- Purpose: Link Finance Invoice back to Q2C Commercial Quotation
-- Date: 2026-04-23
-- User Story: US-Q2C-004
-- NOTE: Apply via Supabase Dashboard SQL Editor

-- 1. Add column
ALTER TABLE customer_invoices
ADD COLUMN IF NOT EXISTS quotation_id UUID REFERENCES quotations(id) ON DELETE SET NULL;

-- 2. Index for fast lookup
CREATE INDEX IF NOT EXISTS idx_customer_invoices_quotation_id
ON customer_invoices(quotation_id)
WHERE quotation_id IS NOT NULL;

-- 3. Add comment for documentation
COMMENT ON COLUMN customer_invoices.quotation_id IS 'Links to quotations table (Q2C bridge: accepted quotation → generated invoice)';
