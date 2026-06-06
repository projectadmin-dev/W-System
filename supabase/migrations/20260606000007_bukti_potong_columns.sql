-- ============================================================
-- Tax Withholding (Fase F): bukti potong (withholding slip) fields
-- See docs/TAX-WITHHOLDING-PLAN.md §10 (Fase F).
-- The PPh amounts already live on ap/ar_payment_history (Fase B/C). This adds
-- the slip number/date so the withholding register is SPT-ready:
--   - AP (PPh keluaran): the slip WE issue to the vendor.
--   - AR (PPh masukan):  the slip we RECEIVE from the customer.
-- Additive & idempotent; nullable (finance fills them in).
-- ============================================================

ALTER TABLE public.ap_payment_history
    ADD COLUMN IF NOT EXISTS nomor_bukti_potong   VARCHAR(60),
    ADD COLUMN IF NOT EXISTS tanggal_bukti_potong DATE;

ALTER TABLE public.ar_payment_history
    ADD COLUMN IF NOT EXISTS nomor_bukti_potong   VARCHAR(60),
    ADD COLUMN IF NOT EXISTS tanggal_bukti_potong DATE;

-- Speed up the period registers (filter pph_amount > 0 by month).
CREATE INDEX IF NOT EXISTS idx_ap_payhist_pph ON public.ap_payment_history(created_at) WHERE pph_amount > 0;
CREATE INDEX IF NOT EXISTS idx_ar_payhist_pph ON public.ar_payment_history(created_at) WHERE pph_amount > 0;
