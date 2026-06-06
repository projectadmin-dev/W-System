-- ============================================================
-- Tax Withholding (Fase A · 1/3): COA + tarif reference
-- See docs/TAX-WITHHOLDING-PLAN.md
-- Additive & idempotent — safe to re-run.
-- ============================================================

-- ─── 1. New COA: PPh 23 Dibayar Dimuka (AR-side creditable asset) ───
-- Mirrors sibling 1-10400-2 (PPh 25 Dibayar Dimuka) under parent
-- 1-10400 "Pajak Dibayar Dimuka".
INSERT INTO public.coa (
    tenant_id, account_code, account_name, account_type, parent_account_id,
    level, normal_balance, cash_flow_category, coa_layer, sort_order,
    enum_laporan_keuangan, enum_laporan_keuangan_category,
    is_active, is_trial_balance, is_taxation_report, coa_full_code, segment_code
)
SELECT
    '00000000-0000-0000-0000-000000000001',
    '1-10400-3', 'PPh 23 Dibayar Dimuka', 'asset',
    (SELECT id FROM public.coa WHERE account_code = '1-10400'
       AND tenant_id = '00000000-0000-0000-0000-000000000001' LIMIT 1),
    4, 'debit', 'operating', 'general_ledger', 3,
    'BALANCE_SHEET', 'ASSET', true, true, false, '1-10400-3', '3'
WHERE NOT EXISTS (
    SELECT 1 FROM public.coa
    WHERE account_code = '1-10400-3'
      AND tenant_id = '00000000-0000-0000-0000-000000000001'
);

-- ─── 2. PPh tarif default reference (data-driven, not hard-coded) ───
-- Engine/module reads default rate from (pph_jenis, ber_npwp); a
-- transaction may override per-document. Adding a new tax type/rate is a
-- data change here, not a code change.
CREATE TABLE IF NOT EXISTS public.pph_tarif_default (
    id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id   UUID         NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
    pph_jenis   VARCHAR(12)  NOT NULL,            -- pph23 | pph42 | pph21 | ...
    ber_npwp    BOOLEAN      NOT NULL,            -- true = counterparty has NPWP
    tarif       NUMERIC(5,2) NOT NULL,            -- percent, e.g. 2.00
    keterangan  TEXT,
    is_aktif    BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ,
    CONSTRAINT uq_pph_tarif UNIQUE (tenant_id, pph_jenis, ber_npwp)
);

ALTER TABLE public.pph_tarif_default ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "pph_tarif_default_read"  ON public.pph_tarif_default;
DROP POLICY IF EXISTS "pph_tarif_default_write" ON public.pph_tarif_default;
CREATE POLICY "pph_tarif_default_read"  ON public.pph_tarif_default FOR SELECT USING (true);
CREATE POLICY "pph_tarif_default_write" ON public.pph_tarif_default FOR ALL USING (true) WITH CHECK (true);

-- Seed PPh 23: 2% with NPWP, 4% (2x) without NPWP.
INSERT INTO public.pph_tarif_default (tenant_id, pph_jenis, ber_npwp, tarif, keterangan)
VALUES
    ('00000000-0000-0000-0000-000000000001', 'pph23', true,  2.00, 'PPh 23 jasa — ber-NPWP'),
    ('00000000-0000-0000-0000-000000000001', 'pph23', false, 4.00, 'PPh 23 jasa — tanpa NPWP (tarif 2x)')
ON CONFLICT (tenant_id, pph_jenis, ber_npwp) DO NOTHING;
