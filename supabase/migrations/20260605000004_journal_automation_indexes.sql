-- ============================================================
-- Journal Automation (Phase 7): performance hygiene.
-- Index the new foreign-key columns added by the journal-automation work.
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_ap_payhist_bank_coa     ON public.ap_payment_history(bank_coa_id);
CREATE INDEX IF NOT EXISTS idx_ap_payhist_journal      ON public.ap_payment_history(journal_entry_id);
CREATE INDEX IF NOT EXISTS idx_ar_invoices_revenue_coa ON public.ar_invoices(revenue_coa_id);
CREATE INDEX IF NOT EXISTS idx_ar_invoices_journal     ON public.ar_invoices(journal_entry_id);
CREATE INDEX IF NOT EXISTS idx_ar_payhist_journal      ON public.ar_payment_history(journal_entry_id);
CREATE INDEX IF NOT EXISTS idx_permintaan_expense_coa  ON public.permintaan_uang(expense_coa_id);
CREATE INDEX IF NOT EXISTS idx_pembayaran_journal      ON public.pembayaran(journal_entry_id);
CREATE INDEX IF NOT EXISTS idx_ar_bank_coa             ON public.ar_bank_accounts(coa_id);

-- Reversal lookups by original entry.
CREATE INDEX IF NOT EXISTS idx_je_reversal_of          ON public.journal_entries(reversal_of_id);
