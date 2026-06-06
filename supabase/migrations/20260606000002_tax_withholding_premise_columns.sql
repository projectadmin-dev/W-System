-- ============================================================
-- Tax Withholding (Fase A · 2/3): per-module premise columns
-- See docs/TAX-WITHHOLDING-PLAN.md §4.2
-- All columns nullable / defaulted → backward-compatible. Existing
-- rows behave exactly as before (pph_dipotong_oleh default 'tidak_ada'
-- => no PPh line; ppn_dipungut_oleh default 'kita' => current PPN
-- behavior). No journal already posted is affected.
-- ============================================================

-- Shared CHECK vocabularies (kept inline per column for portability).
--   *_dipungut/dipotong_oleh : kita | lawan_transaksi | tidak_ada
--   pph_jenis                : pph23 | pph42 | pph21 | pph26 | pph22 | pph25

-- ─── Invoice headers carry the tax-treatment intent ───
ALTER TABLE public.ar_invoices
    ADD COLUMN IF NOT EXISTS ppn_dipungut_oleh VARCHAR(16)  NOT NULL DEFAULT 'kita',
    ADD COLUMN IF NOT EXISTS pph_jenis         VARCHAR(12),
    ADD COLUMN IF NOT EXISTS lawan_punya_npwp  BOOLEAN      NOT NULL DEFAULT TRUE,
    ADD COLUMN IF NOT EXISTS pph_tarif         NUMERIC(5,2),
    ADD COLUMN IF NOT EXISTS pph_dipotong_oleh VARCHAR(16)  NOT NULL DEFAULT 'tidak_ada',
    ADD COLUMN IF NOT EXISTS pph_dpp           NUMERIC(20,2),
    ADD COLUMN IF NOT EXISTS pph_amount        NUMERIC(20,2) NOT NULL DEFAULT 0;

ALTER TABLE public.ap_invoices
    ADD COLUMN IF NOT EXISTS ppn_dipungut_oleh VARCHAR(16)  NOT NULL DEFAULT 'kita',
    ADD COLUMN IF NOT EXISTS pph_jenis         VARCHAR(12),
    ADD COLUMN IF NOT EXISTS lawan_punya_npwp  BOOLEAN      NOT NULL DEFAULT TRUE,
    ADD COLUMN IF NOT EXISTS pph_tarif         NUMERIC(5,2),
    ADD COLUMN IF NOT EXISTS pph_dipotong_oleh VARCHAR(16)  NOT NULL DEFAULT 'tidak_ada',
    ADD COLUMN IF NOT EXISTS pph_dpp           NUMERIC(20,2),
    ADD COLUMN IF NOT EXISTS pph_amount        NUMERIC(20,2) NOT NULL DEFAULT 0;

-- Internal disbursement (UC#5) — premise + realized amounts.
ALTER TABLE public.pembayaran
    ADD COLUMN IF NOT EXISTS pph_jenis         VARCHAR(12),
    ADD COLUMN IF NOT EXISTS lawan_punya_npwp  BOOLEAN      NOT NULL DEFAULT TRUE,
    ADD COLUMN IF NOT EXISTS pph_tarif         NUMERIC(5,2),
    ADD COLUMN IF NOT EXISTS pph_dipotong_oleh VARCHAR(16)  NOT NULL DEFAULT 'tidak_ada',
    ADD COLUMN IF NOT EXISTS pph_amount        NUMERIC(20,2) NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS kas_neto          NUMERIC(20,2);

-- ─── Payment records carry the *realized* withholding (drives journal) ───
-- Timing = at payment (PSAK). Partial payments each carry their own PPh.
ALTER TABLE public.ap_payment_history
    ADD COLUMN IF NOT EXISTS pph_amount NUMERIC(20,2) NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS kas_neto   NUMERIC(20,2);

ALTER TABLE public.ar_payment_history
    ADD COLUMN IF NOT EXISTS pph_amount NUMERIC(20,2) NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS kas_neto   NUMERIC(20,2);

-- ─── CHECK constraints for the enum-like columns (added separately so
--     ADD COLUMN IF NOT EXISTS stays simple and idempotent) ───
DO $$
BEGIN
    -- ppn_dipungut_oleh
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_ar_ppn_dipungut') THEN
        ALTER TABLE public.ar_invoices ADD CONSTRAINT chk_ar_ppn_dipungut
            CHECK (ppn_dipungut_oleh IN ('kita','lawan_transaksi','tidak_ada'));
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_ap_ppn_dipungut') THEN
        ALTER TABLE public.ap_invoices ADD CONSTRAINT chk_ap_ppn_dipungut
            CHECK (ppn_dipungut_oleh IN ('kita','lawan_transaksi','tidak_ada'));
    END IF;
    -- pph_dipotong_oleh
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_ar_pph_dipotong') THEN
        ALTER TABLE public.ar_invoices ADD CONSTRAINT chk_ar_pph_dipotong
            CHECK (pph_dipotong_oleh IN ('kita','lawan_transaksi','tidak_ada'));
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_ap_pph_dipotong') THEN
        ALTER TABLE public.ap_invoices ADD CONSTRAINT chk_ap_pph_dipotong
            CHECK (pph_dipotong_oleh IN ('kita','lawan_transaksi','tidak_ada'));
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_pmb_pph_dipotong') THEN
        ALTER TABLE public.pembayaran ADD CONSTRAINT chk_pmb_pph_dipotong
            CHECK (pph_dipotong_oleh IN ('kita','lawan_transaksi','tidak_ada'));
    END IF;
    -- pph_jenis (allow the known set; NULL = no PPh)
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_ar_pph_jenis') THEN
        ALTER TABLE public.ar_invoices ADD CONSTRAINT chk_ar_pph_jenis
            CHECK (pph_jenis IS NULL OR pph_jenis IN ('pph23','pph42','pph21','pph26','pph22','pph25'));
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_ap_pph_jenis') THEN
        ALTER TABLE public.ap_invoices ADD CONSTRAINT chk_ap_pph_jenis
            CHECK (pph_jenis IS NULL OR pph_jenis IN ('pph23','pph42','pph21','pph26','pph22','pph25'));
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_pmb_pph_jenis') THEN
        ALTER TABLE public.pembayaran ADD CONSTRAINT chk_pmb_pph_jenis
            CHECK (pph_jenis IS NULL OR pph_jenis IN ('pph23','pph42','pph21','pph26','pph22','pph25'));
    END IF;
END $$;
