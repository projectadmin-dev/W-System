-- =============================================================
-- MIGRATION: Add project_code to commercial_projects
-- File: 20260512_003_commercial_project_code.sql
-- Description: Add human-readable project_code CMP-YYYY-NNNN
-- =============================================================

-- 1. Add column
ALTER TABLE public.commercial_projects
  ADD COLUMN IF NOT EXISTS project_code TEXT NULL;

-- 2. Unique per tenant (partial, NULLs excluded)
CREATE UNIQUE INDEX IF NOT EXISTS idx_commercial_projects_code 
  ON public.commercial_projects(tenant_id, project_code)
  WHERE project_code IS NOT NULL;

-- 3. Recreate view WITH project_code
DROP VIEW IF EXISTS public.v_commercial_project_summary CASCADE;

CREATE OR REPLACE VIEW public.v_commercial_project_summary AS
WITH manpower_calc AS (
  SELECT
    m.commercial_project_id,
    SUM(m.publish_rate * m.qty * m.months) AS total_publish_snapshot,
    SUM(m.hpp_rate * m.qty * m.months) AS total_hpp_snapshot,
    SUM(m.special_rate * m.qty * m.months) AS total_special_snapshot,
    MAX(m.months) AS max_months
  FROM public.commercial_project_manpower m
  GROUP BY m.commercial_project_id
)
SELECT
  p.id,
  p.tenant_id,
  p.project_code,
  p.project_name,
  p.pic,
  p.status,
  p.project_type AS type,
  p.quotation_publish,
  p.actual_deal,

  COALESCE(mc.total_hpp_snapshot, 0) AS total_hpp,
  COALESCE(mc.total_publish_snapshot, 0) AS total_publish,
  COALESCE(mc.total_special_snapshot, 0) AS total_special,
  COALESCE(mc.max_months, 0) AS max_months,

  COALESCE(mc.total_publish_snapshot, 0)
    * (p.deduction_pajak + p.deduction_founder_fee + p.deduction_management_fee + p.deduction_se_fee) / 100
    AS total_deductions,

  COALESCE(mc.total_publish_snapshot, 0)
    - (COALESCE(mc.total_publish_snapshot, 0)
       * (p.deduction_pajak + p.deduction_founder_fee + p.deduction_management_fee + p.deduction_se_fee) / 100)
    AS sales_project,

  COALESCE(mc.total_publish_snapshot, 0) - COALESCE(mc.total_hpp_snapshot, 0) AS profit_publish,
  CASE WHEN COALESCE(mc.total_publish_snapshot, 0) > 0
       THEN ((COALESCE(mc.total_publish_snapshot, 0) - COALESCE(mc.total_hpp_snapshot, 0)) / COALESCE(mc.total_publish_snapshot, 0)) * 100
       ELSE 0 END AS margin_publish_pct,

  p.actual_deal - COALESCE(mc.total_hpp_snapshot, 0) AS profit_actual,
  CASE WHEN p.actual_deal > 0
       THEN ((p.actual_deal - COALESCE(mc.total_hpp_snapshot, 0)) / p.actual_deal) * 100
       ELSE 0 END AS margin_actual_pct,

  p.quotation_publish - p.actual_deal AS variance,
  CASE WHEN p.quotation_publish > 0
       THEN ((p.quotation_publish - p.actual_deal) / p.quotation_publish) * 100
       ELSE 0 END AS variance_pct,

  COALESCE(mc.total_publish_snapshot, 0)
    * (100 - (p.deduction_pajak + p.deduction_founder_fee + p.deduction_management_fee + p.deduction_se_fee)) / 100
    * p.topp_cogs_pct / 100 AS cogs_amount,
  COALESCE(mc.total_publish_snapshot, 0)
    * (100 - (p.deduction_pajak + p.deduction_founder_fee + p.deduction_management_fee + p.deduction_se_fee)) / 100
    * p.topp_opex_pct / 100 AS opex_amount,

  p.created_at,
  p.updated_at

FROM public.commercial_projects p
LEFT JOIN manpower_calc mc ON mc.commercial_project_id = p.id;

-- =============================================================
-- DONE
-- =============================================================
