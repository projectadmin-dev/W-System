-- ============================================================
-- W. System -- AR Monitoring Module
-- Migration: AR Schema (isolated from finance.*)
-- Revision: R0
-- ============================================================

-- Ensure doc_sequences exists for AR auto-numbering
CREATE TABLE IF NOT EXISTS public.doc_sequences (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id   UUID NOT NULL,
    prefix      VARCHAR(10) NOT NULL,
    year_month  VARCHAR(8) NOT NULL,
    last_seq    INT NOT NULL DEFAULT 0,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ,
    CONSTRAINT uq_doc_seq UNIQUE (tenant_id, prefix, year_month)
);

CREATE SCHEMA IF NOT EXISTS ar;

-- Bank Accounts (AR-local, isolated from COA Finance)
CREATE TABLE ar.bank_accounts (
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

-- Invoices
CREATE TABLE ar.invoices (
    id                  UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id           UUID            NOT NULL,
    project_id          UUID            NOT NULL REFERENCES public.projects(id),
    project_name        VARCHAR(300)    NOT NULL,
    client_name         VARCHAR(300)    NOT NULL,
    nilai_kontrak       NUMERIC(24,6)   NOT NULL DEFAULT 0,
    no_invoice          VARCHAR(30)     NOT NULL,
    tgl_invoice         DATE            NOT NULL,
    tipe_invoice        VARCHAR(20)     NOT NULL CHECK (tipe_invoice IN ('one_time','recurring')),
    description         TEXT,
    qty                 NUMERIC(24,6)   NOT NULL DEFAULT 1,
    harga_satuan        NUMERIC(24,6)   NOT NULL DEFAULT 0,
    ppn_11_persen       BOOLEAN         NOT NULL DEFAULT FALSE,
    subtotal            NUMERIC(24,6)   GENERATED ALWAYS AS (qty * harga_satuan) STORED,
    ppn_amount          NUMERIC(24,6)   GENERATED ALWAYS AS (
                            CASE WHEN ppn_11_persen THEN qty * harga_satuan * 0.11 ELSE 0 END
                        ) STORED,
    total_piutang       NUMERIC(24,6)   GENERATED ALWAYS AS (
                            qty * harga_satuan +
                            CASE WHEN ppn_11_persen THEN qty * harga_satuan * 0.11 ELSE 0 END
                        ) STORED,
    recurring_start_date    DATE,
    recurring_end_date      DATE,
    recurring_interval      VARCHAR(20) CHECK (
                                recurring_interval IN ('monthly','quarterly','biannual','annual') OR
                                recurring_interval IS NULL
                            ),
    recurring_parent_id     UUID        REFERENCES ar.invoices(id) ON DELETE CASCADE,
    recurring_sequence      SMALLINT,
    sudah_dibayar       NUMERIC(24,6)   NOT NULL DEFAULT 0,
    sisa_piutang        NUMERIC(24,6)   GENERATED ALWAYS AS (
                            qty * harga_satuan +
                            CASE WHEN ppn_11_persen THEN qty * harga_satuan * 0.11 ELSE 0 END
                            - sudah_dibayar
                        ) STORED,
    note_termin         TEXT,
    payment_method      VARCHAR(20),
    bank_id             UUID            REFERENCES ar.bank_accounts(id),
    bank_label          VARCHAR(100),
    deadline_bayar      DATE,
    status_bayar        VARCHAR(20)     NOT NULL DEFAULT 'belum'
                            CHECK (status_bayar IN ('belum','sebagian','lunas','jatuh_tempo')),
    status_kirim        VARCHAR(20)     NOT NULL DEFAULT 'reminder'
                            CHECK (status_kirim IN ('reminder','sent')),
    is_archived         BOOLEAN         NOT NULL DEFAULT FALSE,
    archived_at         TIMESTAMPTZ,
    archived_by         UUID            REFERENCES public.user_profiles(id),
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ,
    created_by          UUID            REFERENCES public.user_profiles(id),
    updated_by          UUID            REFERENCES public.user_profiles(id),
    deleted_at          TIMESTAMPTZ,
    CONSTRAINT uq_ar_no_invoice UNIQUE (tenant_id, no_invoice)
);

CREATE INDEX idx_ar_inv_tenant       ON ar.invoices(tenant_id);
CREATE INDEX idx_ar_inv_project      ON ar.invoices(project_id, tenant_id);
CREATE INDEX idx_ar_inv_status_bayar ON ar.invoices(tenant_id, status_bayar)
    WHERE deleted_at IS NULL AND is_archived = FALSE;
CREATE INDEX idx_ar_inv_deadline     ON ar.invoices(tenant_id, deadline_bayar)
    WHERE is_archived = FALSE AND deleted_at IS NULL;
CREATE INDEX idx_ar_inv_recurring    ON ar.invoices(recurring_parent_id)
    WHERE recurring_parent_id IS NOT NULL;
CREATE INDEX idx_ar_inv_kirim        ON ar.invoices(tenant_id, status_kirim)
    WHERE tipe_invoice = 'recurring' AND is_archived = FALSE;

-- Payment History
CREATE TABLE ar.payment_history (
    id                  UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id           UUID            NOT NULL,
    invoice_id          UUID            NOT NULL REFERENCES ar.invoices(id) ON DELETE CASCADE,
    sudah_dibayar_lama  NUMERIC(24,6)   NOT NULL DEFAULT 0,
    sisa_piutang_lama   NUMERIC(24,6)   NOT NULL DEFAULT 0,
    bayar_sekarang      NUMERIC(24,6)   NOT NULL,
    status_baru         VARCHAR(20)     NOT NULL,
    bank_id             UUID            REFERENCES ar.bank_accounts(id),
    bank_label          VARCHAR(100),
    deadline_baru       DATE,
    catatan_pembayaran  TEXT,
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    created_by          UUID            REFERENCES public.user_profiles(id),
    actor_name          VARCHAR(200)
);

CREATE INDEX idx_ar_pay_hist_invoice ON ar.payment_history(invoice_id);
CREATE INDEX idx_ar_pay_hist_tenant  ON ar.payment_history(tenant_id, created_at DESC);

-- Seed sample bank accounts
INSERT INTO ar.bank_accounts (id, tenant_id, kode, nama_bank, nama_akun, no_rekening, is_active, created_at)
SELECT gen_random_uuid(), id, 'B001', 'BCA', 'IRFAN ARSANDI', '1234567890', true, NOW()
FROM public.tenants
WHERE NOT EXISTS (SELECT 1 FROM ar.bank_accounts WHERE kode = 'B001' LIMIT 1);

INSERT INTO ar.bank_accounts (id, tenant_id, kode, nama_bank, nama_akun, no_rekening, is_active, created_at)
SELECT gen_random_uuid(), id, 'B002', 'Mandiri', 'WAHANA INFORMASI TEKNOLOGI', '0987654321', true, NOW()
FROM public.tenants
WHERE NOT EXISTS (SELECT 1 FROM ar.bank_accounts WHERE kode = 'B002' LIMIT 1);
