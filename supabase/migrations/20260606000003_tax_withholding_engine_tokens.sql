-- ============================================================
-- Tax Withholding (Fase A · 3/3): engine nominal vocabulary
-- See docs/TAX-WITHHOLDING-PLAN.md §4.3
-- Extend konfigurasi_jurnal_detail.sumber_nominal with the two
-- withholding tokens so config rows can reference them:
--   pph_amount : the PPh withheld (dpp × tarif)
--   kas_neto   : net cash moved = gross − pph (− ppn_wapu later)
-- Additive only — existing config rows unaffected.
-- ============================================================

ALTER TABLE public.konfigurasi_jurnal_detail
    DROP CONSTRAINT IF EXISTS chk_sumber_nominal;

ALTER TABLE public.konfigurasi_jurnal_detail
    ADD CONSTRAINT chk_sumber_nominal CHECK (
        sumber_nominal IN (
            'grand_total','subtotal','pajak','total_piutang','bayar_sekarang',
            'nominal_bayar','line_amount','line_tax','biaya_lain_amount',
            'pph_amount','kas_neto'
        )
    );
