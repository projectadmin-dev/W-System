-- =====================================================
-- Migration: journal_line_cost_centers mapping table
-- Enables cost center tagging per journal line (nullable)
-- Supports split allocation (sum of allocated_pct must = 100)
-- =====================================================

CREATE TABLE IF NOT EXISTS public.journal_line_cost_centers (
  id                    uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id             uuid        NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  journal_line_id       uuid        NOT NULL REFERENCES public.journal_lines(id) ON DELETE CASCADE,
  cost_center_config_id uuid        NOT NULL REFERENCES public.cost_center_configs(id),
  cost_center_value_id  uuid        NOT NULL REFERENCES public.cost_center_values(id),
  level_number          integer     NOT NULL,  -- denormalized from value for fast rollup filter
  allocated_pct         numeric(10,6) NOT NULL DEFAULT 100
    CHECK (allocated_pct > 0 AND allocated_pct <= 100),
  created_at            timestamptz NOT NULL DEFAULT now(),
  created_by            uuid        REFERENCES public.user_profiles(id)
);

-- Also add a simple single-CC shortcut on journal_lines for quick tagging
ALTER TABLE public.journal_lines
  ADD COLUMN IF NOT EXISTS cost_center_value_id uuid
    REFERENCES public.cost_center_values(id);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_jlcc_journal_line
  ON public.journal_line_cost_centers(journal_line_id);

CREATE INDEX IF NOT EXISTS idx_jlcc_cc_value
  ON public.journal_line_cost_centers(cost_center_value_id);

CREATE INDEX IF NOT EXISTS idx_jlcc_config_level
  ON public.journal_line_cost_centers(cost_center_config_id, level_number);

CREATE INDEX IF NOT EXISTS idx_journal_lines_cc
  ON public.journal_lines(cost_center_value_id)
  WHERE cost_center_value_id IS NOT NULL;

-- RLS
ALTER TABLE public.journal_line_cost_centers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "finance_manage_jlcc"
  ON public.journal_line_cost_centers FOR ALL TO authenticated
  USING (tenant_id = (auth.jwt()->>'tenant_id')::uuid AND EXISTS (
    SELECT 1 FROM public.user_profiles up JOIN public.roles r ON up.role_id = r.id
    WHERE up.id = auth.uid() AND r.name IN ('finance','cfo','admin','super_admin')
  ));

COMMENT ON TABLE public.journal_line_cost_centers IS
  'Maps journal lines to cost center values. Supports split allocation (e.g., 60% Divisi Produksi / 40% Divisi Sales). FK to journal_lines is CASCADE so records are cleaned up automatically.';

COMMENT ON COLUMN public.journal_line_cost_centers.allocated_pct IS
  'Percentage allocation for this cost center. All allocations for one journal_line_id must sum to 100.';
