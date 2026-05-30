-- ============================================================================
-- Account Payable (Pengelolaan Tagihan) schema
-- Mirrors the ar_invoices pattern. public.* schema, admin client bypasses RLS.
-- Status flow: DRAFT -> SUBMITTED -> APPROVED -> PAID  (REJECTED branch)
-- ============================================================================

-- ── Header ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.ap_invoices (
  id                  UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           UUID            NOT NULL,

  -- Internal reference number (AP-YYYY-MM-NNNN)
  ap_number           VARCHAR(30)     NOT NULL,

  -- Third-party invoice identity
  no_invoice          VARCHAR(100)    NOT NULL,            -- nomor invoice dari pihak ketiga
  no_ref_dokumen      VARCHAR(100),                        -- PO / kontrak / dsb
  tgl_terima          DATE            NOT NULL,            -- tanggal terima tagihan
  tgl_jatuh_tempo     DATE            NOT NULL,            -- tanggal jatuh tempo

  -- Classification
  dasar_pengajuan     VARCHAR(40)     NOT NULL DEFAULT 'lain_lain',  -- purchase_order|ppn|infrastructure|overhead|server|lain_lain
  pihak_ketiga        VARCHAR(300)    NOT NULL,            -- vendor / DJP / Google / Biznet / dsb (free text)
  vendor_id           UUID,                                -- optional link to fin_vendors
  project_id          UUID            REFERENCES public.projects(id) ON DELETE SET NULL,
  project_name        VARCHAR(300),                        -- denormalized snapshot
  deskripsi           TEXT,

  -- Currency
  mata_uang           VARCHAR(10)     NOT NULL DEFAULT 'IDR',
  kurs                NUMERIC(18,6)   NOT NULL DEFAULT 1,

  -- Money (computed in API from line items)
  subtotal            NUMERIC(20,2)   NOT NULL DEFAULT 0,
  discount_amount     NUMERIC(20,2)   NOT NULL DEFAULT 0,
  tax_amount          NUMERIC(20,2)   NOT NULL DEFAULT 0,
  grand_total         NUMERIC(20,2)   NOT NULL DEFAULT 0,
  amount_paid         NUMERIC(20,2)   NOT NULL DEFAULT 0,
  amount_due          NUMERIC(20,2)   GENERATED ALWAYS AS (grand_total - amount_paid) STORED,

  -- Workflow
  status              VARCHAR(20)     NOT NULL DEFAULT 'DRAFT'
                          CHECK (status IN ('DRAFT','SUBMITTED','APPROVED','PAID','REJECTED')),

  -- GL integration
  journal_entry_id    UUID            REFERENCES public.journal_entries(id),
  attachment_url      TEXT,

  -- Approval audit
  submitted_at        TIMESTAMPTZ,
  approved_at         TIMESTAMPTZ,
  approved_by         UUID,
  approver_name       VARCHAR(200),
  rejected_at         TIMESTAMPTZ,
  reject_reason       TEXT,
  paid_at             TIMESTAMPTZ,

  -- Timestamps
  created_at          TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ,
  created_by          UUID,
  deleted_at          TIMESTAMPTZ,

  -- US-001 AC#1: prevent duplicate invoice (vendor + nomor invoice + tanggal terima)
  CONSTRAINT uq_ap_duplicate UNIQUE (tenant_id, pihak_ketiga, no_invoice, tgl_terima)
);

CREATE INDEX IF NOT EXISTS idx_ap_inv_tenant   ON public.ap_invoices(tenant_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_ap_inv_status   ON public.ap_invoices(tenant_id, status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_ap_inv_due      ON public.ap_invoices(tenant_id, tgl_jatuh_tempo) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_ap_inv_vendor   ON public.ap_invoices(vendor_id) WHERE vendor_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ap_inv_project  ON public.ap_invoices(project_id) WHERE project_id IS NOT NULL;

-- ── Line items ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.ap_invoice_items (
  id                  UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
  ap_invoice_id       UUID            NOT NULL REFERENCES public.ap_invoices(id) ON DELETE CASCADE,
  urutan              INTEGER         NOT NULL DEFAULT 1,
  deskripsi           TEXT            NOT NULL,
  qty                 NUMERIC(18,4)   NOT NULL DEFAULT 1,
  harga               NUMERIC(20,2)   NOT NULL DEFAULT 0,
  subtotal            NUMERIC(20,2)   GENERATED ALWAYS AS (qty * harga) STORED,
  diskon              NUMERIC(20,2)   NOT NULL DEFAULT 0,
  pajak               NUMERIC(20,2)   NOT NULL DEFAULT 0,

  -- GL account derived from category (US-001)
  coa_id              UUID            REFERENCES public.coa(id) ON DELETE SET NULL,
  coa_kode            VARCHAR(40),
  coa_nama            VARCHAR(200),

  created_at          TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ap_items_invoice ON public.ap_invoice_items(ap_invoice_id);
CREATE INDEX IF NOT EXISTS idx_ap_items_coa     ON public.ap_invoice_items(coa_id) WHERE coa_id IS NOT NULL;

-- ── Approval / audit trail ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.ap_approval_steps (
  id                  UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
  ap_invoice_id       UUID            NOT NULL REFERENCES public.ap_invoices(id) ON DELETE CASCADE,
  step                INTEGER         NOT NULL DEFAULT 1,
  action              VARCHAR(20)     NOT NULL CHECK (action IN ('SUBMIT','APPROVE','REJECT','PAY')),
  actor_id            UUID,
  actor_name          VARCHAR(200),
  notes               TEXT,
  created_at          TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ap_steps_invoice ON public.ap_approval_steps(ap_invoice_id);
