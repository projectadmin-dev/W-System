-- Enhance fin_vendors with fields required for IT & Business Consulting

ALTER TABLE fin_vendors
  ADD COLUMN IF NOT EXISTS payment_terms_days  INTEGER     DEFAULT 30,
  ADD COLUMN IF NOT EXISTS coa_id              UUID        REFERENCES coa(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS pic_name            TEXT,
  ADD COLUMN IF NOT EXISTS pic_email           TEXT,
  ADD COLUMN IF NOT EXISTS pic_phone           TEXT,
  ADD COLUMN IF NOT EXISTS website             TEXT,
  ADD COLUMN IF NOT EXISTS vendor_category     TEXT        DEFAULT 'supplier',
  ADD COLUMN IF NOT EXISTS tax_type            TEXT        DEFAULT 'non_pkp',
  ADD COLUMN IF NOT EXISTS currency            TEXT        DEFAULT 'IDR',
  ADD COLUMN IF NOT EXISTS payment_method      TEXT        DEFAULT 'transfer',
  ADD COLUMN IF NOT EXISTS credit_limit        NUMERIC(18,2),
  ADD COLUMN IF NOT EXISTS created_by          UUID;

CREATE INDEX IF NOT EXISTS idx_fin_vendors_category ON fin_vendors(vendor_category);
CREATE INDEX IF NOT EXISTS idx_fin_vendors_active   ON fin_vendors(is_active);
CREATE INDEX IF NOT EXISTS idx_fin_vendors_tenant   ON fin_vendors(tenant_id);
