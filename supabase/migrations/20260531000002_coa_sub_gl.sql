-- =====================================================
-- Migration: COA Sub GL (Sub General Ledger) configuration
-- Sub GL is an extra tracking dimension on the DEEPEST Detail Ledger.
-- Config is an ordered list of attribute levels, stored as JSONB on the coa
-- row (read/written via the existing /api/finance/coa PUT). Resolved values
-- live in a dedicated table (lazy get-or-create at posting; empty for now).
-- All additive / idempotent.
-- =====================================================

-- Ordered attribute levels for the deepest detail ledger:
--   [{ attributeLevel, isPullMasterData, sourceMasterData, sourceColumn, keyInRows:[{kode,nama}] }]
ALTER TABLE public.coa
  ADD COLUMN IF NOT EXISTS sub_gl_config jsonb;

COMMENT ON COLUMN public.coa.sub_gl_config IS
  'Sub GL attribute-level config (deepest detail ledger only). Array of levels: '
  '{attributeLevel,isPullMasterData,sourceMasterData,sourceColumn,keyInRows}.';

-- Resolved Sub GL values (composite kode/nama). Lazily created at first posting.
CREATE TABLE IF NOT EXISTS public.coa_sub_gl_value (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id      uuid NOT NULL,
  coa_id         uuid NOT NULL REFERENCES public.coa(id),
  composite_kode text NOT NULL,           -- e.g. '01-001'
  composite_nama text NOT NULL,           -- e.g. 'KENDARAAN > KENDARAAN LISTRIK'
  source_type    text NOT NULL CHECK (source_type IN ('MASTER_DATA', 'KEY_IN')),
  usage_count    integer NOT NULL DEFAULT 0,
  created_at     timestamptz NOT NULL DEFAULT now(),
  created_by     uuid,
  UNIQUE (coa_id, composite_kode)
);

CREATE INDEX IF NOT EXISTS idx_coa_sub_gl_value_coa ON public.coa_sub_gl_value(coa_id);
