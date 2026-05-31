-- =====================================================
-- Migration: COA — true segment codes + Detail Ledger / Sub-DL columns
-- Supports the Chart of Account workspace revamp (Phase 0/1+).
-- Decision OQ-1: COA codes are stored as true segments.
--   • account_code stays the canonical FULL code (e.g. '1-1-01-1-2000')
--   • coa_full_code mirrors it (indexed for search/sort)
--   • segment_code holds the per-layer chip code (e.g. '2000')
-- All additive (IF NOT EXISTS) — safe to re-run.
-- =====================================================

-- 1. Display / code columns
ALTER TABLE public.coa
  ADD COLUMN IF NOT EXISTS coa_full_code text,
  ADD COLUMN IF NOT EXISTS segment_code  text,
  ADD COLUMN IF NOT EXISTS name_en       text;

-- 2. Detail Ledger flags
ALTER TABLE public.coa
  ADD COLUMN IF NOT EXISTS required_sub_gl        boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_washed_out_account  boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS required_child         boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS child_upstream_id      uuid,
  ADD COLUMN IF NOT EXISTS child_source_master_data text;

-- Self-referencing Sub-DL parent (separate from the layer parent_account_id).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'coa_child_upstream_id_fkey'
  ) THEN
    ALTER TABLE public.coa
      ADD CONSTRAINT coa_child_upstream_id_fkey
      FOREIGN KEY (child_upstream_id) REFERENCES public.coa(id);
  END IF;
END $$;

-- 3. Backfill from existing account_code (which already holds the full code).
UPDATE public.coa
SET coa_full_code = account_code
WHERE coa_full_code IS NULL;

UPDATE public.coa
SET segment_code = (string_to_array(account_code, '-'))[array_length(string_to_array(account_code, '-'), 1)]
WHERE segment_code IS NULL;

-- 4. Indexes
CREATE INDEX IF NOT EXISTS idx_coa_full_code
  ON public.coa(tenant_id, coa_full_code) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_coa_child_upstream
  ON public.coa(child_upstream_id) WHERE deleted_at IS NULL;

COMMENT ON COLUMN public.coa.coa_full_code IS
  'Full hierarchical code (e.g. 1-1-01-1-2000). Mirrors account_code; indexed for search/sort.';
COMMENT ON COLUMN public.coa.segment_code IS
  'Per-layer segment shown as the code chip in the explorer (e.g. 01, 2000).';
COMMENT ON COLUMN public.coa.required_sub_gl IS
  'Detail Ledger: requires a Sub GL value when posting a journal.';
COMMENT ON COLUMN public.coa.is_washed_out_account IS
  'Detail Ledger: balance auto-zeroed at period end (clearing/temporary).';
COMMENT ON COLUMN public.coa.required_child IS
  'Detail Ledger: must have a Sub-DL child before it can be posted to.';
COMMENT ON COLUMN public.coa.child_upstream_id IS
  'Detail Ledger: parent DL when this row is a Sub-DL (max 2 levels deep).';
