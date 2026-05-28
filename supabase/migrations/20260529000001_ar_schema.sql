-- ============================================================
-- W. System — AR Monitoring Module
-- Migration: AR Schema (public schema, ar_ prefix)
-- ============================================================

-- ─── Bank Accounts (AR-local, isolated from COA Finance) ───

CREATE TABLE IF NOT EXISTS public.ar_bank_accounts (
    id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id   UUID         NOT NULL,
    kode        VARCHAR(20)  NOT NULL,
    nama_bank   VARCHAR(50)  NOT NULL,
    nama_akun   VARCHAR(200) NOT NULL,
    no_rekening VARCHAR(50),
    is_active   BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_ar_bank_kode UNIQUE (tenant_id, kode)
);

ALTER TABLE public.ar_bank_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ar_bank_accounts_tenant_read" ON public.ar_bank_accounts
    FOR SELECT USING (true);

CREATE POLICY "ar_bank_accounts_tenant_write" ON public.ar_bank_accounts
    FOR ALL USING (true) WITH CHECK (true);

-- ─── Invoices ───────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.ar_invoices (
    id                      UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id               UUID            NOT NULL,

    -- Project snapshot (denormalized for display)
    project_id              UUID            NOT NULL REFERENCES public.projects(id),
    project_name            VARCHAR(300)    NOT NULL,
    client_name             VARCHAR(300)    NOT NULL,
    nilai_kontrak           NUMERIC(24,6)   NOT NULL DEFAULT 0,

    -- Invoice identity
    no_invoice              VARCHAR(30)     NOT NULL,
    tgl_invoice             DATE            NOT NULL,
    tipe_invoice            VARCHAR(20)     NOT NULL CHECK (tipe_invoice IN ('one_time','recurring')),
    description             TEXT,

    -- Line item
    qty                     NUMERIC(24,6)   NOT NULL DEFAULT 1,
    harga_satuan            NUMERIC(24,6)   NOT NULL DEFAULT 0,
    ppn_11_persen           BOOLEAN         NOT NULL DEFAULT FALSE,

    -- Calculated (stored generated columns)
    subtotal                NUMERIC(24,6)   GENERATED ALWAYS AS (qty * harga_satuan) STORED,
    ppn_amount              NUMERIC(24,6)   GENERATED ALWAYS AS (
                                CASE WHEN ppn_11_persen
                                     THEN qty * harga_satuan * 0.11
                                     ELSE 0 END
                            ) STORED,
    total_piutang           NUMERIC(24,6)   GENERATED ALWAYS AS (
                                qty * harga_satuan +
                                CASE WHEN ppn_11_persen
                                     THEN qty * harga_satuan * 0.11
                                     ELSE 0 END
                            ) STORED,

    -- Recurring metadata
    recurring_start_date    DATE,
    recurring_end_date      DATE,
    recurring_interval      VARCHAR(20)     CHECK (
                                recurring_interval IN ('monthly','quarterly','biannual','annual') OR
                                recurring_interval IS NULL
                            ),
    recurring_parent_id     UUID            REFERENCES public.ar_invoices(id) ON DELETE CASCADE,
    recurring_sequence      SMALLINT,

    -- Payment
    sudah_dibayar           NUMERIC(24,6)   NOT NULL DEFAULT 0,
    sisa_piutang            NUMERIC(24,6)   GENERATED ALWAYS AS (
                                qty * harga_satuan +
                                CASE WHEN ppn_11_persen
                                     THEN qty * harga_satuan * 0.11
                                     ELSE 0 END
                                - sudah_dibayar
                            ) STORED,
    note_termin             TEXT,
    payment_method          VARCHAR(20),
    bank_id                 UUID            REFERENCES public.ar_bank_accounts(id),
    bank_label              VARCHAR(100),
    deadline_bayar          DATE,

    -- Status
    status_bayar            VARCHAR(20)     NOT NULL DEFAULT 'belum'
                                CHECK (status_bayar IN ('belum','sebagian','lunas','jatuh_tempo')),
    status_kirim            VARCHAR(20)     NOT NULL DEFAULT 'reminder'
                                CHECK (status_kirim IN ('reminder','sent')),

    -- Archive
    is_archived             BOOLEAN         NOT NULL DEFAULT FALSE,
    archived_at             TIMESTAMPTZ,
    archived_by             UUID            REFERENCES public.user_profiles(id),

    -- Timestamps
    created_at              TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ,
    created_by              UUID            REFERENCES public.user_profiles(id),
    updated_by              UUID            REFERENCES public.user_profiles(id),
    deleted_at              TIMESTAMPTZ,

    CONSTRAINT uq_ar_no_invoice UNIQUE (tenant_id, no_invoice)
);

CREATE INDEX idx_ar_inv_tenant       ON public.ar_invoices(tenant_id);
CREATE INDEX idx_ar_inv_project      ON public.ar_invoices(project_id, tenant_id);
CREATE INDEX idx_ar_inv_status_bayar ON public.ar_invoices(tenant_id, status_bayar)
    WHERE deleted_at IS NULL AND is_archived = FALSE;
CREATE INDEX idx_ar_inv_deadline     ON public.ar_invoices(tenant_id, deadline_bayar)
    WHERE is_archived = FALSE AND deleted_at IS NULL;
CREATE INDEX idx_ar_inv_recurring    ON public.ar_invoices(recurring_parent_id)
    WHERE recurring_parent_id IS NOT NULL;
CREATE INDEX idx_ar_inv_kirim        ON public.ar_invoices(tenant_id, status_kirim)
    WHERE tipe_invoice = 'recurring' AND is_archived = FALSE;

ALTER TABLE public.ar_invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ar_invoices_tenant_read" ON public.ar_invoices
    FOR SELECT USING (true);

CREATE POLICY "ar_invoices_tenant_write" ON public.ar_invoices
    FOR ALL USING (true) WITH CHECK (true);

-- ─── Payment History ────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.ar_payment_history (
    id                  UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id           UUID            NOT NULL,
    invoice_id          UUID            NOT NULL REFERENCES public.ar_invoices(id) ON DELETE CASCADE,

    sudah_dibayar_lama  NUMERIC(24,6)   NOT NULL DEFAULT 0,
    sisa_piutang_lama   NUMERIC(24,6)   NOT NULL DEFAULT 0,

    bayar_sekarang      NUMERIC(24,6)   NOT NULL,
    status_baru         VARCHAR(20)     NOT NULL,
    bank_id             UUID            REFERENCES public.ar_bank_accounts(id),
    bank_label          VARCHAR(100),
    deadline_baru       DATE,
    catatan_pembayaran  TEXT,

    created_at          TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    created_by          UUID            REFERENCES public.user_profiles(id),
    actor_name          VARCHAR(200)
);

CREATE INDEX idx_ar_pay_hist_invoice ON public.ar_payment_history(invoice_id);
CREATE INDEX idx_ar_pay_hist_tenant  ON public.ar_payment_history(tenant_id, created_at DESC);

ALTER TABLE public.ar_payment_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ar_payment_history_tenant_read" ON public.ar_payment_history
    FOR SELECT USING (true);

CREATE POLICY "ar_payment_history_tenant_write" ON public.ar_payment_history
    FOR ALL USING (true) WITH CHECK (true);

-- ─── Seed default bank accounts for dev tenant ──────────────

INSERT INTO public.ar_bank_accounts (id, tenant_id, kode, nama_bank, nama_akun, no_rekening, is_active)
VALUES
    (gen_random_uuid(), '00000000-0000-0000-0000-000000000001', 'B001', 'BCA',     'IRFAN ARSANDI',             '1234567890', TRUE),
    (gen_random_uuid(), '00000000-0000-0000-0000-000000000001', 'B002', 'Mandiri', 'WAHANA INFORMASI TEKNOLOGI', '0987654321', TRUE),
    (gen_random_uuid(), '00000000-0000-0000-0000-000000000001', 'B003', 'BRI',     'WAHANA INFORMASI TEKNOLOGI', '1112223334', TRUE),
    (gen_random_uuid(), '00000000-0000-0000-0000-000000000001', 'B004', 'Cash',    'Kas Operasional',            NULL,         TRUE)
ON CONFLICT (tenant_id, kode) DO NOTHING;
