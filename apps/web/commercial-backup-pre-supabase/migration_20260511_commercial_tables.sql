-- =============================================================
-- MIGRATION: Commercial Module Tables
-- File: 20260511_001_commercial_tables.sql
-- Description: Create 3 tables + 1 view + RLS for Commercial Calculator
-- Author: Reddie (AI Developer)
-- Date: 2026-05-11
--
-- ANSWERS FROM BUSINESS (Prasetyo Dwi):
--   1. PIC = text (soft link, later connect to HR master data)
--   2. ID = UUID internal + display_id for UI
--   3. Rate change = SNAPSHOT (Option A) - history preserved
--   4. tenant_id = WAJIB (Option A) - isolation enforced
--   5. Summary = CALCULATED ON-THE-FLY (Option B) - no denormalization
--   6. Unique = 1 active per combination (tenant_id, type, group_name, role_name)
-- =============================================================

-- =============================================================
-- TABLE 1: commercial_rate_cards
-- =============================================================
CREATE TABLE IF NOT EXISTS public.commercial_rate_cards (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  type              text NOT NULL,
  group_name        text NOT NULL,
  role_name         text NOT NULL,
  hpp               numeric(15,2) NOT NULL DEFAULT 0,
  special_rate      numeric(15,2) NOT NULL DEFAULT 0,
  publish_rate      numeric(15,2) NOT NULL DEFAULT 0,
  is_active         boolean DEFAULT true,
  notes             text,
  display_id        text,                          -- UI-friendly: 'c-1', 'n-2'
  created_at        timestamptz DEFAULT now(),
  updated_at        timestamptz DEFAULT now(),
  created_by        uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Partial unique index: hanya 1 active per kombinasi type+group+role per tenant
CREATE UNIQUE INDEX IF NOT EXISTS idx_rate_cards_unique_active
  ON public.commercial_rate_cards (tenant_id, type, group_name, role_name)
  WHERE is_active = true;

-- Regular indexes
CREATE INDEX IF NOT EXISTS idx_rate_cards_tenant ON public.commercial_rate_cards(tenant_id);
CREATE INDEX IF NOT EXISTS idx_rate_cards_type ON public.commercial_rate_cards(type);
CREATE INDEX IF NOT EXISTS idx_rate_cards_display ON public.commercial_rate_cards(display_id);

-- Auto-update updated_at trigger
DROP TRIGGER IF EXISTS trg_rate_cards_updated_at ON public.commercial_rate_cards;
CREATE TRIGGER trg_rate_cards_updated_at
  BEFORE UPDATE ON public.commercial_rate_cards
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================================
-- TABLE 2: commercial_projects
-- =============================================================
CREATE TABLE IF NOT EXISTS public.commercial_projects (
  id                        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                 uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  project_name              text NOT NULL,
  pic                       text,                          -- text name, later FK to HR employees
  status                    text NOT NULL DEFAULT 'Draft'
                            CHECK (status IN ('Draft', 'Submitted', 'Negotiation', 'Won', 'Lost', 'On Hold')),
  project_type              text NOT NULL,

  -- Pricing Inputs
  quotation_publish         numeric(15,2) DEFAULT 0,
  actual_deal               numeric(15,2) DEFAULT 0,

  -- Deductions (%)
  deduction_pajak           numeric(5,2) DEFAULT 11,
  deduction_founder_fee     numeric(5,2) DEFAULT 3,
  deduction_management_fee  numeric(5,2) DEFAULT 2,
  deduction_se_fee        numeric(5,2) DEFAULT 0,

  -- TOPP Allocation
  topp_cogs_pct             numeric(5,2) DEFAULT 25,
  topp_opex_pct             numeric(5,2) DEFAULT 75,

  -- 🔗 Future Linkages (all nullable, filled manually or by automation)
  quotation_id              uuid,                          -- → quotations.id
  project_id                uuid,                          -- → projects.id
  invoice_id                uuid,                          -- → finance invoices

  created_at                timestamptz DEFAULT now(),
  updated_at                timestamptz DEFAULT now(),
  created_by                uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_commercial_projects_tenant ON public.commercial_projects(tenant_id);
CREATE INDEX IF NOT EXISTS idx_commercial_projects_status ON public.commercial_projects(status);
CREATE INDEX IF NOT EXISTS idx_commercial_projects_type ON public.commercial_projects(project_type);
CREATE INDEX IF NOT EXISTS idx_commercial_projects_quotation ON public.commercial_projects(quotation_id) WHERE quotation_id IS NOT NULL;

-- Auto-update trigger
DROP TRIGGER IF EXISTS trg_commercial_projects_updated_at ON public.commercial_projects;
CREATE TRIGGER trg_commercial_projects_updated_at
  BEFORE UPDATE ON public.commercial_projects
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================================
-- TABLE 3: commercial_project_manpower
-- SNAPSHOT RATES — preserved when master rate changes
-- =============================================================
CREATE TABLE IF NOT EXISTS public.commercial_project_manpower (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  commercial_project_id   uuid NOT NULL REFERENCES public.commercial_projects(id) ON DELETE CASCADE,
  rate_card_id            uuid REFERENCES public.commercial_rate_cards(id) ON DELETE SET NULL,
  group_name              text NOT NULL,
  role_name               text NOT NULL,
  employee_name           text,                          -- soft link, later FK to HR
  qty                     integer NOT NULL DEFAULT 1 CHECK (qty > 0),
  months                  integer NOT NULL DEFAULT 1 CHECK (months > 0),

  -- SNAPSHOT: rates at the time project was created
  -- These do NOT change even if commercial_rate_cards.* update later
  hpp_rate                numeric(15,2) NOT NULL DEFAULT 0,
  special_rate            numeric(15,2) NOT NULL DEFAULT 0,
  publish_rate            numeric(15,2) NOT NULL DEFAULT 0,

  created_at              timestamptz DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_manpower_project ON public.commercial_project_manpower(commercial_project_id);
CREATE INDEX IF NOT EXISTS idx_manpower_rate_card ON public.commercial_project_manpower(rate_card_id) WHERE rate_card_id IS NOT NULL;

-- =============================================================
-- VIEW: v_commercial_project_summary
-- Calculated on-the-fly (Option B) — no denormalization
-- =============================================================
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
  p.project_name,
  p.status,
  p.project_type,
  p.quotation_publish,
  p.actual_deal,

  -- Manpower totals
  COALESCE(mc.total_hpp_snapshot, 0) AS total_hpp,
  COALESCE(mc.total_publish_snapshot, 0) AS total_publish,
  COALESCE(mc.total_special_snapshot, 0) AS total_special,
  COALESCE(mc.max_months, 0) AS max_months,

  -- Deductions (applied to total_publish)
  COALESCE(mc.total_publish_snapshot, 0)
    * (p.deduction_pajak + p.deduction_founder_fee + p.deduction_management_fee + p.deduction_se_fee) / 100
    AS total_deductions,

  -- Net sales
  COALESCE(mc.total_publish_snapshot, 0)
    - (COALESCE(mc.total_publish_snapshot, 0)
       * (p.deduction_pajak + p.deduction_founder_fee + p.deduction_management_fee + p.deduction_se_fee) / 100)
    AS sales_project,

  -- Profit & Margin (Publish rate)
  COALESCE(mc.total_publish_snapshot, 0) - COALESCE(mc.total_hpp_snapshot, 0) AS profit_publish,
  CASE WHEN COALESCE(mc.total_publish_snapshot, 0) > 0
       THEN ((COALESCE(mc.total_publish_snapshot, 0) - COALESCE(mc.total_hpp_snapshot, 0)) / COALESCE(mc.total_publish_snapshot, 0)) * 100
       ELSE 0 END AS margin_publish_pct,

  -- Profit & Margin (Actual deal)
  p.actual_deal - COALESCE(mc.total_hpp_snapshot, 0) AS profit_actual,
  CASE WHEN p.actual_deal > 0
       THEN ((p.actual_deal - COALESCE(mc.total_hpp_snapshot, 0)) / p.actual_deal) * 100
       ELSE 0 END AS margin_actual_pct,

  -- Variance
  p.quotation_publish - p.actual_deal AS variance,
  CASE WHEN p.quotation_publish > 0
       THEN ((p.quotation_publish - p.actual_deal) / p.quotation_publish) * 100
       ELSE 0 END AS variance_pct,

  -- TOPP
  COALESCE(mc.total_publish_snapshot, 0)
    * (100 - (p.deduction_pajak + p.deduction_founder_fee + p.deduction_management_fee + p.deduction_se_fee)) / 100
    * p.topp_cogs_pct / 100 AS cogs_amount,
  COALESCE(mc.total_publish_snapshot, 0)
    * (100 - (p.deduction_pajak + p.deduction_founder_fee + p.deduction_management_fee + p.deduction_se_fee)) / 100
    * p.topp_opex_pct / 100 AS opex_amount

FROM public.commercial_projects p
LEFT JOIN manpower_calc mc ON mc.commercial_project_id = p.id;

-- =============================================================
-- RLS POLICIES
-- =============================================================

-- Enable RLS on all tables
ALTER TABLE public.commercial_rate_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commercial_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commercial_project_manpower ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any (idempotent)
DROP POLICY IF EXISTS "tenant_rate_cards_select" ON public.commercial_rate_cards;
DROP POLICY IF EXISTS "tenant_rate_cards_insert" ON public.commercial_rate_cards;
DROP POLICY IF EXISTS "tenant_rate_cards_update" ON public.commercial_rate_cards;
DROP POLICY IF EXISTS "tenant_rate_cards_delete" ON public.commercial_rate_cards;

DROP POLICY IF EXISTS "tenant_projects_select" ON public.commercial_projects;
DROP POLICY IF EXISTS "tenant_projects_insert" ON public.commercial_projects;
DROP POLICY IF EXISTS "tenant_projects_update" ON public.commercial_projects;
DROP POLICY IF EXISTS "tenant_projects_delete" ON public.commercial_projects;

DROP POLICY IF EXISTS "tenant_manpower_select" ON public.commercial_project_manpower;
DROP POLICY IF EXISTS "tenant_manpower_insert" ON public.commercial_project_manpower;
DROP POLICY IF EXISTS "tenant_manpower_update" ON public.commercial_project_manpower;
DROP POLICY IF EXISTS "tenant_manpower_delete" ON public.commercial_project_manpower;

-- --- commercial_rate_cards RLS ---
CREATE POLICY "tenant_rate_cards_select"
  ON public.commercial_rate_cards FOR SELECT
  USING (tenant_id IN (
    SELECT tenant_id FROM public.user_profiles WHERE id = auth.uid()
  ));

CREATE POLICY "tenant_rate_cards_insert"
  ON public.commercial_rate_cards FOR INSERT
  WITH CHECK (tenant_id IN (
    SELECT tenant_id FROM public.user_profiles WHERE id = auth.uid()
  ));

CREATE POLICY "tenant_rate_cards_update"
  ON public.commercial_rate_cards FOR UPDATE
  USING (tenant_id IN (
    SELECT tenant_id FROM public.user_profiles WHERE id = auth.uid()
  ));

CREATE POLICY "tenant_rate_cards_delete"
  ON public.commercial_rate_cards FOR DELETE
  USING (tenant_id IN (
    SELECT tenant_id FROM public.user_profiles WHERE id = auth.uid()
  ));

-- --- commercial_projects RLS ---
CREATE POLICY "tenant_projects_select"
  ON public.commercial_projects FOR SELECT
  USING (tenant_id IN (
    SELECT tenant_id FROM public.user_profiles WHERE id = auth.uid()
  ));

CREATE POLICY "tenant_projects_insert"
  ON public.commercial_projects FOR INSERT
  WITH CHECK (tenant_id IN (
    SELECT tenant_id FROM public.user_profiles WHERE id = auth.uid()
  ));

CREATE POLICY "tenant_projects_update"
  ON public.commercial_projects FOR UPDATE
  USING (tenant_id IN (
    SELECT tenant_id FROM public.user_profiles WHERE id = auth.uid()
  ));

CREATE POLICY "tenant_projects_delete"
  ON public.commercial_projects FOR DELETE
  USING (tenant_id IN (
    SELECT tenant_id FROM public.user_profiles WHERE id = auth.uid()
  ));

-- --- commercial_project_manpower RLS (via project tenant) ---
CREATE POLICY "tenant_manpower_select"
  ON public.commercial_project_manpower FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.commercial_projects p
    WHERE p.id = commercial_project_manpower.commercial_project_id
    AND p.tenant_id IN (
      SELECT tenant_id FROM public.user_profiles WHERE id = auth.uid()
    )
  ));

CREATE POLICY "tenant_manpower_insert"
  ON public.commercial_project_manpower FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.commercial_projects p
    WHERE p.id = commercial_project_manpower.commercial_project_id
    AND p.tenant_id IN (
      SELECT tenant_id FROM public.user_profiles WHERE id = auth.uid()
    )
  ));

CREATE POLICY "tenant_manpower_update"
  ON public.commercial_project_manpower FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.commercial_projects p
    WHERE p.id = commercial_project_manpower.commercial_project_id
    AND p.tenant_id IN (
      SELECT tenant_id FROM public.user_profiles WHERE id = auth.uid()
    )
  ));

CREATE POLICY "tenant_manpower_delete"
  ON public.commercial_project_manpower FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.commercial_projects p
    WHERE p.id = commercial_project_manpower.commercial_project_id
    AND p.tenant_id IN (
      SELECT tenant_id FROM public.user_profiles WHERE id = auth.uid()
    )
  ));

-- =============================================================
-- DONE
-- =============================================================
