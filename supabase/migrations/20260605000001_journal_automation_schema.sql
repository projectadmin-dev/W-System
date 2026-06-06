-- ============================================================
-- W. System — Journal Automation (Phase 1: Schema)
-- Config-driven auto-journal engine foundation.
-- Covers 5 use cases: AR invoice issue, AR payment receipt,
-- AP bill receipt, AP payment, internal money-request payout.
-- ============================================================

-- ─── 1. Journal automation configuration (header) ───────────
CREATE TABLE IF NOT EXISTS public.konfigurasi_jurnal (
    id                UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id         UUID         NOT NULL,
    kode_konfigurasi  VARCHAR(40)  NOT NULL,   -- e.g. AR-INV-ISSUE
    nama_fitur        VARCHAR(150) NOT NULL,
    modul_referensi   VARCHAR(30)  NOT NULL
        CHECK (modul_referensi IN ('penjualan','pembelian','pembayaran_internal')),
    tipe_jurnal       VARCHAR(50)  NOT NULL,
    is_aktif          BOOLEAN      NOT NULL DEFAULT TRUE,
    keterangan        TEXT,
    created_by        UUID,
    updated_by        UUID,
    created_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ,
    deleted_at        TIMESTAMPTZ,
    CONSTRAINT uq_konfig_kode UNIQUE (tenant_id, kode_konfigurasi)
);

ALTER TABLE public.konfigurasi_jurnal ENABLE ROW LEVEL SECURITY;
CREATE POLICY "konfigurasi_jurnal_tenant_read"  ON public.konfigurasi_jurnal
    FOR SELECT USING (true);
CREATE POLICY "konfigurasi_jurnal_tenant_write" ON public.konfigurasi_jurnal
    FOR ALL USING (true) WITH CHECK (true);

-- ─── 2. Journal automation configuration (detail lines) ─────
-- Each line resolves to EITHER a fixed coa_id OR a dynamic_source
-- token read from the source document at runtime.
CREATE TABLE IF NOT EXISTS public.konfigurasi_jurnal_detail (
    id                UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id         UUID         NOT NULL,
    konfigurasi_id    UUID         NOT NULL
        REFERENCES public.konfigurasi_jurnal(id) ON DELETE CASCADE,
    coa_id            UUID         REFERENCES public.coa(id),   -- fixed account
    dynamic_source    VARCHAR(40),                             -- dynamic account token
    posisi            VARCHAR(6)   NOT NULL CHECK (posisi IN ('debit','credit')),
    sumber_nominal    VARCHAR(40)  NOT NULL,
    urutan            SMALLINT     NOT NULL DEFAULT 1,
    keterangan_baris  VARCHAR(150),
    is_optional       BOOLEAN      NOT NULL DEFAULT FALSE,      -- skip silently if nominal=0
    created_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

    CONSTRAINT chk_account_source CHECK (
        (coa_id IS NOT NULL AND dynamic_source IS NULL) OR
        (coa_id IS NULL AND dynamic_source IS NOT NULL)
    ),
    CONSTRAINT chk_dynamic_source CHECK (
        dynamic_source IS NULL OR dynamic_source IN (
            'invoice_revenue_coa',   -- ar_invoices.revenue_coa_id
            'ar_bank_coa',           -- ar_bank_accounts.coa_id (via payment)
            'ap_line_coa',           -- ap_invoice_items.coa_id (per line)
            'ap_bank_coa',           -- ap_payment_history.bank_coa_id
            'pmb_expense_coa',       -- permintaan_uang.expense_coa_id
            'pmb_bank_coa',          -- pembayaran.bank_dari_coa_id
            'pmb_biaya_lain_coa'     -- pembayaran_biaya_lain.coa_id (per line)
        )
    ),
    CONSTRAINT chk_sumber_nominal CHECK (
        sumber_nominal IN (
            'grand_total','subtotal','pajak','total_piutang','bayar_sekarang',
            'nominal_bayar','line_amount','line_tax','biaya_lain_amount'
        )
    )
);
CREATE INDEX idx_konfig_detail_konfig ON public.konfigurasi_jurnal_detail(konfigurasi_id);

ALTER TABLE public.konfigurasi_jurnal_detail ENABLE ROW LEVEL SECURITY;
CREATE POLICY "konfigurasi_jurnal_detail_tenant_read"  ON public.konfigurasi_jurnal_detail
    FOR SELECT USING (true);
CREATE POLICY "konfigurasi_jurnal_detail_tenant_write" ON public.konfigurasi_jurnal_detail
    FOR ALL USING (true) WITH CHECK (true);

-- ─── 3. Error log (non-blocking failures, NFR-02) ───────────
CREATE TABLE IF NOT EXISTS public.jurnal_error_log (
    id               UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id        UUID         NOT NULL,
    kode_konfigurasi VARCHAR(40),
    source_type      VARCHAR(50)  NOT NULL,
    source_id        UUID         NOT NULL,
    error_code       VARCHAR(40),
    pesan_error      TEXT         NOT NULL,
    payload_json     JSONB,
    created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_jurnal_err_source ON public.jurnal_error_log(source_type, source_id);

ALTER TABLE public.jurnal_error_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "jurnal_error_log_tenant_read"  ON public.jurnal_error_log
    FOR SELECT USING (true);
CREATE POLICY "jurnal_error_log_tenant_write" ON public.jurnal_error_log
    FOR ALL USING (true) WITH CHECK (true);

-- ─── 4. AP payment history (mirrors ar_payment_history) ─────
-- Each payment row carries the bank/cash COA it was paid from,
-- and becomes the journal source for UC#4 (supports partial pay).
CREATE TABLE IF NOT EXISTS public.ap_payment_history (
    id                  UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id           UUID          NOT NULL,
    ap_invoice_id       UUID          NOT NULL
        REFERENCES public.ap_invoices(id) ON DELETE CASCADE,
    amount_paid_lama    NUMERIC(24,6) NOT NULL DEFAULT 0,
    amount_due_lama     NUMERIC(24,6) NOT NULL DEFAULT 0,
    bayar_sekarang      NUMERIC(24,6) NOT NULL,
    status_baru         VARCHAR(20),
    bank_coa_id         UUID          REFERENCES public.coa(id),  -- cash/bank paid from
    bank_label          VARCHAR(150),
    journal_entry_id    UUID          REFERENCES public.journal_entries(id),
    catatan_pembayaran  TEXT,
    created_at          TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    created_by          UUID,
    actor_name          VARCHAR(150)
);
CREATE INDEX idx_ap_payhist_invoice ON public.ap_payment_history(ap_invoice_id);

ALTER TABLE public.ap_payment_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ap_payment_history_tenant_read"  ON public.ap_payment_history
    FOR SELECT USING (true);
CREATE POLICY "ap_payment_history_tenant_write" ON public.ap_payment_history
    FOR ALL USING (true) WITH CHECK (true);

-- ─── 5. Column additions on source documents ────────────────
-- AR bank account -> COA cash account (UC#2 debit resolution)
ALTER TABLE public.ar_bank_accounts
    ADD COLUMN IF NOT EXISTS coa_id UUID REFERENCES public.coa(id);

-- AR invoice -> chosen revenue account (UC#1 credit) + journal link
ALTER TABLE public.ar_invoices
    ADD COLUMN IF NOT EXISTS revenue_coa_id   UUID REFERENCES public.coa(id),
    ADD COLUMN IF NOT EXISTS journal_entry_id UUID REFERENCES public.journal_entries(id);

-- AR payment row -> journal link (idempotency for UC#2)
ALTER TABLE public.ar_payment_history
    ADD COLUMN IF NOT EXISTS journal_entry_id UUID REFERENCES public.journal_entries(id);

-- Internal money request -> expense account (UC#5 debit)
ALTER TABLE public.permintaan_uang
    ADD COLUMN IF NOT EXISTS expense_coa_id UUID REFERENCES public.coa(id);

-- Disbursement -> journal link (idempotency for UC#5)
ALTER TABLE public.pembayaran
    ADD COLUMN IF NOT EXISTS journal_entry_id UUID REFERENCES public.journal_entries(id);

-- ─── 6. Extend journal_entries.source_type whitelist ────────
ALTER TABLE public.journal_entries
    DROP CONSTRAINT IF EXISTS journal_entries_source_type_check;
ALTER TABLE public.journal_entries
    ADD CONSTRAINT journal_entries_source_type_check CHECK (
        source_type = ANY (ARRAY[
            'manual','invoice','payment','expense_claim','payroll',
            'depreciation','adjustment',
            'ar_invoice','ar_payment','ap_invoice','ap_payment','pembayaran'
        ])
    );
