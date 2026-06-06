-- ============================================================
-- Tax Withholding (Fase A.2): dynamic DPP (dasar pengenaan pajak)
-- See docs/TAX-WITHHOLDING-PLAN.md §3.2
-- DPP is no longer hard-coded to subtotal: a data-driven category
-- table + per-transaction category/manual override. Default category
-- PENUH (faktor 1.00) reproduces Fase A behavior exactly.
-- Additive & idempotent.
-- ============================================================

-- ─── 1. DPP category reference (data-driven) ───
CREATE TABLE IF NOT EXISTS public.dpp_kategori (
    id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id   UUID         NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
    kode        VARCHAR(20)  NOT NULL,            -- PENUH | NL-10 | MANUAL | ...
    nama        VARCHAR(120) NOT NULL,
    jenis_pajak VARCHAR(8)   NOT NULL DEFAULT 'both'  -- ppn | pph | both
                CHECK (jenis_pajak IN ('ppn','pph','both')),
    metode      VARCHAR(12)  NOT NULL                  -- nilai_penuh | persentase | manual
                CHECK (metode IN ('nilai_penuh','persentase','manual')),
    faktor      NUMERIC(6,4),                          -- for persentase, e.g. 0.1000 = 10%
    keterangan  TEXT,
    is_aktif    BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ,
    CONSTRAINT uq_dpp_kategori_kode UNIQUE (tenant_id, kode),
    -- persentase requires a faktor; the other methods don't use one.
    CONSTRAINT chk_dpp_faktor CHECK (
        (metode = 'persentase' AND faktor IS NOT NULL AND faktor > 0) OR
        (metode <> 'persentase')
    )
);

ALTER TABLE public.dpp_kategori ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "dpp_kategori_read"  ON public.dpp_kategori;
DROP POLICY IF EXISTS "dpp_kategori_write" ON public.dpp_kategori;
CREATE POLICY "dpp_kategori_read"  ON public.dpp_kategori FOR SELECT USING (true);
CREATE POLICY "dpp_kategori_write" ON public.dpp_kategori FOR ALL USING (true) WITH CHECK (true);

-- Seed the baseline categories.
INSERT INTO public.dpp_kategori (tenant_id, kode, nama, jenis_pajak, metode, faktor, keterangan)
VALUES
    ('00000000-0000-0000-0000-000000000001', 'PENUH',  'DPP Penuh (100% subtotal)',       'both', 'nilai_penuh', NULL,   'Default — DPP = subtotal (exclude PPN)'),
    ('00000000-0000-0000-0000-000000000001', 'NL-10',  'DPP Nilai Lain 10%',              'both', 'persentase',  0.1000, 'Jasa biro perjalanan/pariwisata, pengiriman paket, freight forwarding'),
    ('00000000-0000-0000-0000-000000000001', 'MANUAL', 'DPP Manual (diisi finance)',      'both', 'manual',      NULL,   'Finance memasukkan nilai DPP langsung saat input')
ON CONFLICT (tenant_id, kode) DO NOTHING;

-- ─── 2. Per-transaction DPP category reference (PPh) ───
-- The resolved DPP value lives in the existing pph_dpp column (Fase A);
-- this adds the chosen category so the basis is auditable & re-derivable.
ALTER TABLE public.ar_invoices
    ADD COLUMN IF NOT EXISTS pph_dpp_kategori_id UUID REFERENCES public.dpp_kategori(id);
ALTER TABLE public.ap_invoices
    ADD COLUMN IF NOT EXISTS pph_dpp_kategori_id UUID REFERENCES public.dpp_kategori(id);
ALTER TABLE public.pembayaran
    ADD COLUMN IF NOT EXISTS pph_dpp_kategori_id UUID REFERENCES public.dpp_kategori(id),
    ADD COLUMN IF NOT EXISTS pph_dpp             NUMERIC(20,2);

CREATE INDEX IF NOT EXISTS idx_ar_inv_dpp_kat ON public.ar_invoices(pph_dpp_kategori_id);
CREATE INDEX IF NOT EXISTS idx_ap_inv_dpp_kat ON public.ap_invoices(pph_dpp_kategori_id);
