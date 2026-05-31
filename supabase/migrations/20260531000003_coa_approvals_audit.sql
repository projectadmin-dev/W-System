-- =====================================================
-- Migration: COA Audit Trail (ISO 27001 / SOX 404) + Pending Approvals
-- Audit log is append-only (every CoA mutation writes one row).
-- Pending approvals queue master-data-driven Detail-Ledger generation.
-- All additive / idempotent.
-- =====================================================

-- ── Immutable audit log ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.coa_audit_log (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id      uuid NOT NULL,
  action         text NOT NULL CHECK (action IN ('CREATE','EDIT','DELETE','CONFIG','STATUS','APPROVAL','IMPORT')),
  severity       text NOT NULL CHECK (severity IN ('low','medium','high')),
  actor_nik      text,
  actor_nama     text,
  target_coa_id  uuid,
  target_coa_code text,
  target_name    text,
  target_layer   text,
  field          text,
  before_data    jsonb,
  after_data     jsonb,
  note           text,
  session_ip     text,
  created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_coa_audit_tenant_date ON public.coa_audit_log(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_coa_audit_action ON public.coa_audit_log(tenant_id, action);

COMMENT ON TABLE public.coa_audit_log IS
  'Append-only audit trail for Chart of Account mutations (ISO 27001 / SOX 404; retain 7y).';

-- ── Pending approvals (master data → Detail Ledger generation) ───────────────
CREATE TABLE IF NOT EXISTS public.coa_pending_approval (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           uuid NOT NULL,
  source_type         text NOT NULL,                -- 'New Currency' | 'New Supplier' | ...
  name                text NOT NULL,
  code                text,
  requested_by        text,
  requested_at        timestamptz NOT NULL DEFAULT now(),
  target_parent       text,
  generates_count     integer NOT NULL DEFAULT 0,
  estimated_dls       jsonb,                         -- [{coaFullCode,name}]
  master_data_payload jsonb,
  risk_level          text CHECK (risk_level IN ('low','medium','high')),
  risk_note           text,
  status              text NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING','APPROVED','REJECTED')),
  resolved_at         timestamptz,
  resolved_by         text,
  note                text
);

CREATE INDEX IF NOT EXISTS idx_coa_approval_status ON public.coa_pending_approval(tenant_id, status);
