-- =====================================================
-- Migration: Extend fiscal_periods with approval workflow
-- Adds approval_status (separate from status for audit trail)
-- Adds grace_days for late-entry tolerance
-- =====================================================

-- Approval workflow column (separate from operational status for audit trail)
ALTER TABLE public.fiscal_periods
  ADD COLUMN IF NOT EXISTS approval_status text NOT NULL DEFAULT 'DRAFT'
    CHECK (approval_status IN ('DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'LOCKED'));

-- Grace period: allows late journal entries N days after period_to
ALTER TABLE public.fiscal_periods
  ADD COLUMN IF NOT EXISTS grace_days integer NOT NULL DEFAULT 0
    CHECK (grace_days >= 0);

ALTER TABLE public.fiscal_periods
  ADD COLUMN IF NOT EXISTS is_grace_allowed boolean NOT NULL DEFAULT false;

-- Approval trail
ALTER TABLE public.fiscal_periods
  ADD COLUMN IF NOT EXISTS submitted_by  uuid REFERENCES public.user_profiles(id);
ALTER TABLE public.fiscal_periods
  ADD COLUMN IF NOT EXISTS submitted_at  timestamptz;
ALTER TABLE public.fiscal_periods
  ADD COLUMN IF NOT EXISTS approved_by   uuid REFERENCES public.user_profiles(id);
ALTER TABLE public.fiscal_periods
  ADD COLUMN IF NOT EXISTS approved_at   timestamptz;
ALTER TABLE public.fiscal_periods
  ADD COLUMN IF NOT EXISTS locked_by     uuid REFERENCES public.user_profiles(id);
ALTER TABLE public.fiscal_periods
  ADD COLUMN IF NOT EXISTS locked_at     timestamptz;
ALTER TABLE public.fiscal_periods
  ADD COLUMN IF NOT EXISTS approval_notes text;

-- Index for approval workflow queries
CREATE INDEX IF NOT EXISTS idx_fiscal_periods_approval
  ON public.fiscal_periods(tenant_id, approval_status)
  WHERE deleted_at IS NULL;

COMMENT ON COLUMN public.fiscal_periods.approval_status IS
  'Approval workflow status (independent from operational status):
   DRAFT: period created, open for journal entry.
   PENDING_APPROVAL: submitted to Finance Controller / CFO for sign-off.
   APPROVED: approved — system creates trial_balance_snapshots and populates fiscal_period_journal_locks.
   LOCKED: fully locked, no journal entries allowed (typically after tax filing).';

COMMENT ON COLUMN public.fiscal_periods.grace_days IS
  'Number of days after period end_date during which late journal entries are still accepted. Effective only when is_grace_allowed = true.';
