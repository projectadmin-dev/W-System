-- ============================================================
-- W. System — Permintaan Uang & Pembayaran Schema
-- ============================================================

-- ─── PERMINTAAN UANG ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.permintaan_uang (
  id                  UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           UUID            NOT NULL,
  doc_number          VARCHAR(30)     NOT NULL,
  status              VARCHAR(30)     NOT NULL DEFAULT 'DRAFT'
    CHECK (status IN ('DRAFT','PENDING_APPROVAL','APPROVED','REJECTED','PAID','CANCELLED')),

  tanggal_permintaan  DATE            NOT NULL DEFAULT CURRENT_DATE,
  tanggal_kebutuhan   DATE            NOT NULL,
  nominal             NUMERIC(18,2)   NOT NULL CHECK (nominal > 0),
  mata_uang           CHAR(3)         NOT NULL DEFAULT 'IDR',
  catatan             TEXT,

  dasar_pengajuan     VARCHAR(20)     NOT NULL CHECK (dasar_pengajuan IN ('PROJECT','INTERNAL')),
  project_id          UUID            REFERENCES public.projects(id),

  requestor_id        UUID            REFERENCES public.user_profiles(id),
  requestor_nik       VARCHAR(20),
  requestor_name      VARCHAR(200),
  requestor_dept      VARCHAR(100),
  requestor_position  VARCHAR(150),
  requestor_grade     VARCHAR(30),

  submitted_at        TIMESTAMPTZ,
  approved_at         TIMESTAMPTZ,
  rejected_at         TIMESTAMPTZ,
  paid_at             TIMESTAMPTZ,

  created_at          TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ,
  deleted_at          TIMESTAMPTZ,
  created_by          UUID,

  CONSTRAINT uq_pu_doc_number UNIQUE (tenant_id, doc_number)
);

CREATE INDEX IF NOT EXISTS idx_pu_tenant   ON public.permintaan_uang(tenant_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_pu_status   ON public.permintaan_uang(tenant_id, status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_pu_requestor ON public.permintaan_uang(requestor_id);

-- ─── PERMINTAAN UANG ITEMS (Kebutuhan Internal) ───────────────
CREATE TABLE IF NOT EXISTS public.permintaan_uang_items (
  id                  UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
  permintaan_uang_id  UUID            NOT NULL REFERENCES public.permintaan_uang(id) ON DELETE CASCADE,
  urutan              SMALLINT        NOT NULL DEFAULT 1,
  deskripsi           TEXT            NOT NULL,
  nominal             NUMERIC(18,2),
  created_at          TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pu_items ON public.permintaan_uang_items(permintaan_uang_id);

-- ─── APPROVAL STEPS ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.pu_approval_steps (
  id                  UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           UUID            NOT NULL,
  permintaan_uang_id  UUID            REFERENCES public.permintaan_uang(id) ON DELETE CASCADE,
  level               SMALLINT        NOT NULL DEFAULT 1,
  approver_id         UUID            REFERENCES public.user_profiles(id),
  approver_name       VARCHAR(200),
  approver_dept       VARCHAR(100),
  status              VARCHAR(20)     NOT NULL DEFAULT 'PENDING'
    CHECK (status IN ('PENDING','APPROVED','REJECTED')),
  notes               TEXT,
  actioned_at         TIMESTAMPTZ,
  created_at          TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pu_approval ON public.pu_approval_steps(permintaan_uang_id);

-- ─── PEMBAYARAN ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.pembayaran (
  id                      UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id               UUID            NOT NULL,
  doc_number              VARCHAR(30)     NOT NULL,
  status                  VARCHAR(30)     NOT NULL DEFAULT 'DRAFT'
    CHECK (status IN ('DRAFT','PENDING_APPROVAL','APPROVED','PAID','CANCELLED')),

  permintaan_uang_id      UUID            NOT NULL REFERENCES public.permintaan_uang(id),

  tanggal_pembayaran      DATE            NOT NULL,
  nominal_bayar           NUMERIC(18,2)   NOT NULL CHECK (nominal_bayar > 0),
  mata_uang               CHAR(3)         NOT NULL DEFAULT 'IDR',

  bank_dari_coa_id        UUID            REFERENCES public.coa(id),
  bank_dari_nama          VARCHAR(200),
  bank_dari_kode          VARCHAR(50),

  bank_tujuan_nama        VARCHAR(200)    NOT NULL,
  bank_tujuan_nomor       VARCHAR(50)     NOT NULL,
  bank_tujuan_atas_nama   VARCHAR(200),

  requestor_id            UUID            REFERENCES public.user_profiles(id),
  requestor_name          VARCHAR(200),
  requestor_dept          VARCHAR(100),
  requestor_position      VARCHAR(150),
  requestor_grade         VARCHAR(30),

  approver_id             UUID            REFERENCES public.user_profiles(id),
  approver_name           VARCHAR(200),
  approver_dept           VARCHAR(100),
  approver_position       VARCHAR(150),
  approver_grade          VARCHAR(30),

  pic_finance_id          UUID            REFERENCES public.user_profiles(id),
  pic_finance_name        VARCHAR(200),
  pic_finance_dept        VARCHAR(100),
  pic_finance_position    VARCHAR(150),
  pic_finance_grade       VARCHAR(30),

  catatan                 TEXT,
  submitted_at            TIMESTAMPTZ,
  approved_at             TIMESTAMPTZ,
  paid_at                 TIMESTAMPTZ,
  created_at              TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ,
  deleted_at              TIMESTAMPTZ,
  created_by              UUID,

  CONSTRAINT uq_pay_doc_number UNIQUE (tenant_id, doc_number)
);

CREATE INDEX IF NOT EXISTS idx_pay_tenant  ON public.pembayaran(tenant_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_pay_status  ON public.pembayaran(tenant_id, status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_pay_pu      ON public.pembayaran(permintaan_uang_id);
CREATE INDEX IF NOT EXISTS idx_pay_tgl     ON public.pembayaran(tenant_id, tanggal_pembayaran);

-- ─── PEMBAYARAN BIAYA LAIN-LAIN ───────────────────────────────
CREATE TABLE IF NOT EXISTS public.pembayaran_biaya_lain (
  id              UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
  pembayaran_id   UUID            NOT NULL REFERENCES public.pembayaran(id) ON DELETE CASCADE,
  urutan          SMALLINT        NOT NULL DEFAULT 1,
  deskripsi       VARCHAR(300)    NOT NULL,
  nominal         NUMERIC(18,2)   NOT NULL DEFAULT 0,
  coa_id          UUID            REFERENCES public.coa(id),
  coa_kode        VARCHAR(50),
  coa_nama        VARCHAR(200),
  created_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pbl ON public.pembayaran_biaya_lain(pembayaran_id);
