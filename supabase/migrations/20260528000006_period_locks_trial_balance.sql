-- =====================================================
-- Migration: Period Journal Locks + Trial Balance Snapshots
-- These two tables are the backbone of accurate period reporting
-- =====================================================

-- 1. FISCAL PERIOD JOURNAL LOCKS
-- When a period is APPROVED, all posted journals in that period
-- are locked to it. This prevents double-counting in future periods.
CREATE TABLE IF NOT EXISTS public.fiscal_period_journal_locks (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        uuid        NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  journal_entry_id uuid        NOT NULL REFERENCES public.journal_entries(id),
  fiscal_period_id uuid        NOT NULL REFERENCES public.fiscal_periods(id),
  locked_at        timestamptz NOT NULL DEFAULT now(),
  locked_by        uuid        REFERENCES public.user_profiles(id),
  UNIQUE (journal_entry_id, fiscal_period_id)
);

CREATE INDEX IF NOT EXISTS idx_fpjl_journal
  ON public.fiscal_period_journal_locks(journal_entry_id);

CREATE INDEX IF NOT EXISTS idx_fpjl_period
  ON public.fiscal_period_journal_locks(fiscal_period_id);

CREATE INDEX IF NOT EXISTS idx_fpjl_tenant_period
  ON public.fiscal_period_journal_locks(tenant_id, fiscal_period_id);

ALTER TABLE public.fiscal_period_journal_locks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "finance_manage_locks"
  ON public.fiscal_period_journal_locks FOR ALL TO authenticated
  USING (tenant_id = (auth.jwt()->>'tenant_id')::uuid AND EXISTS (
    SELECT 1 FROM public.user_profiles up JOIN public.roles r ON up.role_id = r.id
    WHERE up.id = auth.uid() AND r.name IN ('finance','cfo','admin','super_admin')
  ));

-- 2. TRIAL BALANCE SNAPSHOTS
-- Created automatically when a period's approval_status → APPROVED.
-- Stores saldo akhir (closing balance) per COA account per period.
-- These snapshots become saldo awal for the NEXT period's reports.
CREATE TABLE IF NOT EXISTS public.trial_balance_snapshots (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        uuid        NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  fiscal_period_id uuid        NOT NULL REFERENCES public.fiscal_periods(id),
  coa_id           uuid        NOT NULL REFERENCES public.coa(id),
  saldo_akhir      numeric(20,4) NOT NULL DEFAULT 0,  -- signed amount (after sign multiplier)
  saldo_akhir_base numeric(20,4) NOT NULL DEFAULT 0,  -- base currency (IDR)
  created_at       timestamptz NOT NULL DEFAULT now(),
  created_by       uuid        REFERENCES public.user_profiles(id),
  UNIQUE (fiscal_period_id, coa_id)
);

CREATE INDEX IF NOT EXISTS idx_tbs_period_coa
  ON public.trial_balance_snapshots(fiscal_period_id, coa_id);

CREATE INDEX IF NOT EXISTS idx_tbs_tenant
  ON public.trial_balance_snapshots(tenant_id);

ALTER TABLE public.trial_balance_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "finance_manage_trial_balance"
  ON public.trial_balance_snapshots FOR ALL TO authenticated
  USING (tenant_id = (auth.jwt()->>'tenant_id')::uuid AND EXISTS (
    SELECT 1 FROM public.user_profiles up JOIN public.roles r ON up.role_id = r.id
    WHERE up.id = auth.uid() AND r.name IN ('finance','cfo','admin','super_admin')
  ));

CREATE POLICY "all_read_trial_balance"
  ON public.trial_balance_snapshots FOR SELECT TO authenticated
  USING (tenant_id = (auth.jwt()->>'tenant_id')::uuid);

COMMENT ON TABLE public.fiscal_period_journal_locks IS
  'Records which journals are "consumed" by a specific period (populated when period approval_status = APPROVED). Report queries use NOT EXISTS on this table to exclude journals locked to prior periods.';

COMMENT ON TABLE public.trial_balance_snapshots IS
  'Period-end saldo akhir per COA account per closed period. These are the saldo awal source for subsequent period reports. Created atomically when a period is APPROVED.';
