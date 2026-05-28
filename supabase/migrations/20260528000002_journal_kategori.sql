-- =====================================================
-- Migration: Add kategori_jurnal to journal_entries
-- Enables reporting (opening balance source) + audit trail clarity
-- =====================================================

ALTER TABLE public.journal_entries
  ADD COLUMN IF NOT EXISTS kategori_jurnal text NOT NULL DEFAULT 'REGULAR'
    CHECK (kategori_jurnal IN (
      'REGULAR',           -- Normal business transaction
      'BEGINNING_BALANCE', -- Opening balance entry (saldo awal fallback)
      'CLOSING',           -- Period-closing entries (transfer P&L to retained earnings)
      'ADJUSTMENT'         -- Period-end adjusting entries
    ));

-- Index: report queries filter by BEGINNING_BALANCE to find opening saldo
CREATE INDEX IF NOT EXISTS idx_journal_entries_kategori
  ON public.journal_entries(tenant_id, kategori_jurnal)
  WHERE deleted_at IS NULL;

COMMENT ON COLUMN public.journal_entries.kategori_jurnal IS
  'Journal category for reporting and audit trail.
   REGULAR: standard business transactions.
   BEGINNING_BALANCE: opening balance source (used when no trial_balance_snapshot exists).
   CLOSING: end-of-period entries transferring P&L to retained earnings.
   ADJUSTMENT: period-end adjusting/accrual entries.';
