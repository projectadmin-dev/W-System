-- ============================================================
-- IFAS CHART OF ACCOUNTS — 5-Level Hierarchy Migration
-- Phase 1: Foundation — Create 5 hierarchy tables
-- Based on: IFAS COA STRUCTURE KNOWLEDGE R3
-- Date: 2026-05-28
-- ============================================================

-- ============================================================
-- 1. COA ACCOUNT CATEGORY — Level 1
-- ============================================================
CREATE TABLE IF NOT EXISTS public.coa_account_category (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  entity_id uuid REFERENCES public.entities(id) ON DELETE SET NULL,
  
  -- COA Code & Name
  coa_code text NOT NULL,        -- 1 digit: 1-9
  coa_full_code text NOT NULL,   -- same as coa_code at this level
  name text NOT NULL,
  
  -- Hierarchy
  level integer NOT NULL DEFAULT 1 CHECK (level = 1),
  
  -- Account Category Flags (R3: all editable via Attribute Import)
  normal_balance text NOT NULL CHECK (normal_balance IN ('debit', 'credit')) DEFAULT 'debit',
  enum_laporan_keuangan text CHECK (enum_laporan_keuangan IN ('INCOME_STATEMENT', 'BALANCE_SHEET')),
  enum_laporan_keuangan_category text CHECK (enum_laporan_keuangan_category IN ('ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE', 'COGS')),
  
  -- Status
  is_active boolean NOT NULL DEFAULT true,
  
  -- Audit
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES public.user_profiles(id),
  updated_by uuid REFERENCES public.user_profiles(id),
  deleted_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_coa_cat_tenant ON public.coa_account_category(tenant_id);
CREATE INDEX IF NOT EXISTS idx_coa_cat_code ON public.coa_account_category(tenant_id, coa_code);
CREATE INDEX IF NOT EXISTS idx_coa_cat_full ON public.coa_account_category(tenant_id, coa_full_code);
CREATE INDEX IF NOT EXISTS idx_coa_cat_active ON public.coa_account_category(tenant_id, is_active) WHERE deleted_at IS NULL;

COMMENT ON TABLE public.coa_account_category IS 'IFAS COA Level 1 — Account Category (e.g. AKTIVA, KEWAJIBAN)';
COMMENT ON COLUMN public.coa_account_category.coa_code IS '1-digit code: 1-9. Header=1-9 (no 00 at this level)';
COMMENT ON COLUMN public.coa_account_category.normal_balance IS 'Cascade ke seluruh hierarchy. Wajib input.';

ALTER TABLE public.coa_account_category ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "finance_manage_coa_cat" ON public.coa_account_category;
CREATE POLICY "finance_manage_coa_cat"
  ON public.coa_account_category FOR ALL
  TO authenticated
  USING (
    tenant_id = (auth.jwt()->>'tenant_id')::uuid
    AND EXISTS (
      SELECT 1 FROM public.user_profiles up
      JOIN public.roles r ON up.role_id = r.id
      WHERE up.id = auth.uid()
      AND r.name IN ('finance', 'cfo', 'admin', 'super_admin')
    )
  )
  WITH CHECK (tenant_id = (auth.jwt()->>'tenant_id')::uuid);

DROP POLICY IF EXISTS "others_read_coa_cat" ON public.coa_account_category;
CREATE POLICY "others_read_coa_cat"
  ON public.coa_account_category FOR SELECT
  TO authenticated
  USING (tenant_id = (auth.jwt()->>'tenant_id')::uuid);

-- ============================================================
-- 2. COA ACCOUNT TYPE — Level 2
-- ============================================================
CREATE TABLE IF NOT EXISTS public.coa_account_type (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  entity_id uuid REFERENCES public.entities(id) ON DELETE SET NULL,
  
  -- COA Code & Name
  coa_code text NOT NULL,        -- 1 digit: 1-9
  coa_full_code text NOT NULL,   -- "category-type" e.g. "1-1"
  name text NOT NULL,
  
  -- Hierarchy
  level integer NOT NULL DEFAULT 2 CHECK (level = 2),
  parent_id uuid NOT NULL REFERENCES public.coa_account_category(id) ON DELETE CASCADE,
  
  -- Account Type Flags
  contra_account boolean NOT NULL DEFAULT false,
  direct_indirect_cost text CHECK (direct_indirect_cost IN ('DIRECT', 'INDIRECT')),
  enum_cost_category text CHECK (enum_cost_category IN ('PERSONNEL', 'OPERATIONAL', 'MARKETING', 'OVERHEAD', 'PRODUCTION')),
  
  -- Status
  is_active boolean NOT NULL DEFAULT true,
  
  -- Audit
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES public.user_profiles(id),
  updated_by uuid REFERENCES public.user_profiles(id),
  deleted_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_coa_type_tenant ON public.coa_account_type(tenant_id);
CREATE INDEX IF NOT EXISTS idx_coa_type_code ON public.coa_account_type(tenant_id, coa_code);
CREATE INDEX IF NOT EXISTS idx_coa_type_full ON public.coa_account_type(tenant_id, coa_full_code);
CREATE INDEX IF NOT EXISTS idx_coa_type_parent ON public.coa_account_type(parent_id);
CREATE INDEX IF NOT EXISTS idx_coa_type_active ON public.coa_account_type(tenant_id, is_active) WHERE deleted_at IS NULL;

COMMENT ON TABLE public.coa_account_type IS 'IFAS COA Level 2 — Account Type (e.g. AKTIVA LANCAR, AKTIVA TETAP)';
COMMENT ON COLUMN public.coa_account_type.contra_account IS 'Flip Normal Balance dari Category parent (PSAK 16)';

ALTER TABLE public.coa_account_type ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "finance_manage_coa_type" ON public.coa_account_type;
CREATE POLICY "finance_manage_coa_type"
  ON public.coa_account_type FOR ALL
  TO authenticated
  USING (
    tenant_id = (auth.jwt()->>'tenant_id')::uuid
    AND EXISTS (
      SELECT 1 FROM public.user_profiles up
      JOIN public.roles r ON up.role_id = r.id
      WHERE up.id = auth.uid()
      AND r.name IN ('finance', 'cfo', 'admin', 'super_admin')
    )
  )
  WITH CHECK (tenant_id = (auth.jwt()->>'tenant_id')::uuid);

DROP POLICY IF EXISTS "others_read_coa_type" ON public.coa_account_type;
CREATE POLICY "others_read_coa_type"
  ON public.coa_account_type FOR SELECT
  TO authenticated
  USING (tenant_id = (auth.jwt()->>'tenant_id')::uuid);

-- ============================================================
-- 3. COA SUB ACCOUNT — Level 3
-- ============================================================
CREATE TABLE IF NOT EXISTS public.coa_sub_account (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  entity_id uuid REFERENCES public.entities(id) ON DELETE SET NULL,
  
  -- COA Code & Name
  coa_code text NOT NULL,        -- 2 digits: 00 (header) or 01-99 (children)
  coa_full_code text NOT NULL,   -- "category-type-sub" e.g. "1-1-01"
  name text NOT NULL,
  
  -- Hierarchy
  level integer NOT NULL DEFAULT 3 CHECK (level = 3),
  parent_id uuid NOT NULL REFERENCES public.coa_account_type(id) ON DELETE CASCADE,
  
  -- Sub Account Flags (R3)
  is_restricted boolean NOT NULL DEFAULT false,
  enum_cf_section text CHECK (enum_cf_section IN ('OPERATING', 'INVESTING', 'FINANCING', 'EXCLUDED')),
  enum_cf_line text,             -- Label baris di Laporan Arus Kas
  is_working_capital boolean DEFAULT false,
  is_non_cash_item boolean DEFAULT false,
  enum_cost_behavior text CHECK (enum_cost_behavior IN ('FIXED', 'VARIABLE', 'SEMI_VAR')),
  is_budgeted boolean DEFAULT false,
  is_tax_deductible boolean DEFAULT false,
  
  -- Status
  is_active boolean NOT NULL DEFAULT true,
  
  -- Audit
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES public.user_profiles(id),
  updated_by uuid REFERENCES public.user_profiles(id),
  deleted_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_coa_sub_tenant ON public.coa_sub_account(tenant_id);
CREATE INDEX IF NOT EXISTS idx_coa_sub_code ON public.coa_sub_account(tenant_id, coa_code);
CREATE INDEX IF NOT EXISTS idx_coa_sub_full ON public.coa_sub_account(tenant_id, coa_full_code);
CREATE INDEX IF NOT EXISTS idx_coa_sub_parent ON public.coa_sub_account(parent_id);
CREATE INDEX IF NOT EXISTS idx_coa_sub_active ON public.coa_sub_account(tenant_id, is_active) WHERE deleted_at IS NULL;

COMMENT ON TABLE public.coa_sub_account IS 'IFAS COA Level 3 — Sub Account (e.g. KAS DAN SETARA KAS, PIUTANG)';
COMMENT ON COLUMN public.coa_sub_account.coa_code IS '2-digit: 00=header, 01-99=children';

ALTER TABLE public.coa_sub_account ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "finance_manage_coa_sub" ON public.coa_sub_account;
CREATE POLICY "finance_manage_coa_sub"
  ON public.coa_sub_account FOR ALL
  TO authenticated
  USING (
    tenant_id = (auth.jwt()->>'tenant_id')::uuid
    AND EXISTS (
      SELECT 1 FROM public.user_profiles up
      JOIN public.roles r ON up.role_id = r.id
      WHERE up.id = auth.uid()
      AND r.name IN ('finance', 'cfo', 'admin', 'super_admin')
    )
  )
  WITH CHECK (tenant_id = (auth.jwt()->>'tenant_id')::uuid);

DROP POLICY IF EXISTS "others_read_coa_sub" ON public.coa_sub_account;
CREATE POLICY "others_read_coa_sub"
  ON public.coa_sub_account FOR SELECT
  TO authenticated
  USING (tenant_id = (auth.jwt()->>'tenant_id')::uuid);

-- ============================================================
-- 4. COA GENERAL LEDGER — Level 4
-- ============================================================
CREATE TABLE IF NOT EXISTS public.coa_general_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  entity_id uuid REFERENCES public.entities(id) ON DELETE SET NULL,
  
  -- COA Code & Name
  coa_code text NOT NULL,        -- 1 digit: 0 (header) or 1-9 (children)
  coa_full_code text NOT NULL,   -- "category-type-sub-gl" e.g. "1-1-01-1"
  name text NOT NULL,
  
  -- Hierarchy
  level integer NOT NULL DEFAULT 4 CHECK (level = 4),
  parent_id uuid NOT NULL REFERENCES public.coa_sub_account(id) ON DELETE CASCADE,
  
  -- General Ledger Flags (R3: IS_RESTRICTED unification)
  is_restricted boolean NOT NULL DEFAULT false,
  
  -- Status
  is_active boolean NOT NULL DEFAULT true,
  
  -- Audit
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES public.user_profiles(id),
  updated_by uuid REFERENCES public.user_profiles(id),
  deleted_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_coa_gl_tenant ON public.coa_general_ledger(tenant_id);
CREATE INDEX IF NOT EXISTS idx_coa_gl_code ON public.coa_general_ledger(tenant_id, coa_code);
CREATE INDEX IF NOT EXISTS idx_coa_gl_full ON public.coa_general_ledger(tenant_id, coa_full_code);
CREATE INDEX IF NOT EXISTS idx_coa_gl_parent ON public.coa_general_ledger(parent_id);
CREATE INDEX IF NOT EXISTS idx_coa_gl_active ON public.coa_general_ledger(tenant_id, is_active) WHERE deleted_at IS NULL;

COMMENT ON TABLE public.coa_general_ledger IS 'IFAS COA Level 4 — General Ledger (e.g. KAS IDR, PIUTANG DAGANG)';
COMMENT ON COLUMN public.coa_general_ledger.coa_code IS '1-digit: 0=header, 1-9=children';
COMMENT ON COLUMN public.coa_general_ledger.is_restricted IS 'R3: renamed from IS_RESTRICTION. Override from Sub Account parent.';

ALTER TABLE public.coa_general_ledger ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "finance_manage_coa_gl" ON public.coa_general_ledger;
CREATE POLICY "finance_manage_coa_gl"
  ON public.coa_general_ledger FOR ALL
  TO authenticated
  USING (
    tenant_id = (auth.jwt()->>'tenant_id')::uuid
    AND EXISTS (
      SELECT 1 FROM public.user_profiles up
      JOIN public.roles r ON up.role_id = r.id
      WHERE up.id = auth.uid()
      AND r.name IN ('finance', 'cfo', 'admin', 'super_admin')
    )
  )
  WITH CHECK (tenant_id = (auth.jwt()->>'tenant_id')::uuid);

DROP POLICY IF EXISTS "others_read_coa_gl" ON public.coa_general_ledger;
CREATE POLICY "others_read_coa_gl"
  ON public.coa_general_ledger FOR SELECT
  TO authenticated
  USING (tenant_id = (auth.jwt()->>'tenant_id')::uuid);

-- ============================================================
-- 5. COA DETAIL LEDGER — Level 5
-- ============================================================
CREATE TABLE IF NOT EXISTS public.coa_detail_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  entity_id uuid REFERENCES public.entities(id) ON DELETE SET NULL,
  
  -- COA Code & Name
  coa_code text NOT NULL,        -- 4 digits: 0001-9999
  coa_full_code text NOT NULL,   -- "category-type-sub-gl-detail" e.g. "1-1-01-1-2000"
  name text NOT NULL,
  
  -- Hierarchy
  level integer NOT NULL DEFAULT 5 CHECK (level = 5),
  parent_id uuid NOT NULL REFERENCES public.coa_general_ledger(id) ON DELETE CASCADE,
  
  -- Detail Ledger Flags
  required_sub_gl boolean NOT NULL DEFAULT false,
  is_washed_out_account boolean NOT NULL DEFAULT false,
  required_child boolean NOT NULL DEFAULT false,
  is_trial_balance boolean NOT NULL DEFAULT false,
  is_taxation_report boolean NOT NULL DEFAULT false,
  
  -- Sub-DL (Sub Detail Ledger) — system managed
  child_source_master_data text CHECK (child_source_master_data IN (
    'KEY_IN', 'MASTER_DATA_M_KARYAWAN', 'MASTER_DATA_M_SUPPLIER', 
    'MASTER_DATA_M_CUSTOMER', 'MASTER_DATA_M_BANK', 'MASTER_DATA_M_VALUTA',
    'MASTER_DATA_M_PEMILIK', 'MASTER_DATA_M_KELOMPOK_FA', 'MASTER_DATA_M_SUB_KELOMPOK_FA'
  )),
  child_upstream_guid uuid,      -- Parent DL (system-managed)
  is_child boolean NOT NULL DEFAULT false,
  is_child_from_master_data boolean NOT NULL DEFAULT false,
  account_level integer NOT NULL DEFAULT 0,  -- 0=root, 1=lv1, 2=lv2 (max 2)
  
  -- Status
  is_active boolean NOT NULL DEFAULT true,
  
  -- Audit
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES public.user_profiles(id),
  updated_by uuid REFERENCES public.user_profiles(id),
  deleted_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_coa_dl_tenant ON public.coa_detail_ledger(tenant_id);
CREATE INDEX IF NOT EXISTS idx_coa_dl_code ON public.coa_detail_ledger(tenant_id, coa_code);
CREATE INDEX IF NOT EXISTS idx_coa_dl_full ON public.coa_detail_ledger(tenant_id, coa_full_code);
CREATE INDEX IF NOT EXISTS idx_coa_dl_parent ON public.coa_detail_ledger(parent_id);
CREATE INDEX IF NOT EXISTS idx_coa_dl_child ON public.coa_detail_ledger(child_upstream_guid) WHERE is_child = true;
CREATE INDEX IF NOT EXISTS idx_coa_dl_active ON public.coa_detail_ledger(tenant_id, is_active) WHERE deleted_at IS NULL;

COMMENT ON TABLE public.coa_detail_ledger IS 'IFAS COA Level 5 — Detail Ledger (leaf node untuk posting jurnal)';
COMMENT ON COLUMN public.coa_detail_ledger.coa_code IS '4-digit: 0001-9999. New segment ditambah (bukan diganti).';
COMMENT ON COLUMN public.coa_detail_ledger.account_level IS 'Sub-DL level: 0=root DL, 1=Sub-DL level 1, 2=Sub-DL level 2 (MAX=2).';

ALTER TABLE public.coa_detail_ledger ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "finance_manage_coa_dl" ON public.coa_detail_ledger;
CREATE POLICY "finance_manage_coa_dl"
  ON public.coa_detail_ledger FOR ALL
  TO authenticated
  USING (
    tenant_id = (auth.jwt()->>'tenant_id')::uuid
    AND EXISTS (
      SELECT 1 FROM public.user_profiles up
      JOIN public.roles r ON up.role_id = r.id
      WHERE up.id = auth.uid()
      AND r.name IN ('finance', 'cfo', 'admin', 'super_admin')
    )
  )
  WITH CHECK (tenant_id = (auth.jwt()->>'tenant_id')::uuid);

DROP POLICY IF EXISTS "others_read_coa_dl" ON public.coa_detail_ledger;
CREATE POLICY "others_read_coa_dl"
  ON public.coa_detail_ledger FOR SELECT
  TO authenticated
  USING (tenant_id = (auth.jwt()->>'tenant_id')::uuid);

-- ============================================================
-- 6. UNIQUE CONSTRAINTS per tenant + coa_full_code
-- ============================================================
ALTER TABLE public.coa_account_category
  ADD CONSTRAINT uq_coa_cat_tenant_full UNIQUE (tenant_id, coa_full_code);

ALTER TABLE public.coa_account_type
  ADD CONSTRAINT uq_coa_type_tenant_full UNIQUE (tenant_id, coa_full_code);

ALTER TABLE public.coa_sub_account
  ADD CONSTRAINT uq_coa_sub_tenant_full UNIQUE (tenant_id, coa_full_code);

ALTER TABLE public.coa_general_ledger
  ADD CONSTRAINT uq_coa_gl_tenant_full UNIQUE (tenant_id, coa_full_code);

ALTER TABLE public.coa_detail_ledger
  ADD CONSTRAINT uq_coa_dl_tenant_full UNIQUE (tenant_id, coa_full_code);

-- ============================================================
-- 7. COA FULL CODE AUTO-GENERATION FUNCTION
-- ============================================================
CREATE OR REPLACE FUNCTION public.generate_coa_full_code(
  p_layer text,
  p_parent_full_code text,
  p_code text
) RETURNS text AS $$
BEGIN
  -- Layer 1: Category — no parent, code is full code
  IF p_layer = 'category' THEN
    RETURN p_code;
  
  -- Layer 2: Type — append to category
  ELSIF p_layer = 'type' THEN
    RETURN p_parent_full_code || '-' || p_code;
  
  -- Layer 3: Sub Account — append to type
  ELSIF p_layer = 'sub' THEN
    RETURN p_parent_full_code || '-' || p_code;
  
  -- Layer 4: GL — append to sub
  ELSIF p_layer = 'gl' THEN
    RETURN p_parent_full_code || '-' || p_code;
  
  -- Layer 5: Detail Ledger — append to GL
  ELSIF p_layer = 'detail' THEN
    RETURN p_parent_full_code || '-' || p_code;
  
  ELSE
    RAISE EXCEPTION 'Unknown layer: %', p_layer;
  END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION public.generate_coa_full_code IS 'Generate COA Full Code by concatenating parent full code + new code segment';

-- ============================================================
-- 8. TRIGGER: Auto-update coa_full_code on INSERT
-- ============================================================
CREATE OR REPLACE FUNCTION public.trg_coa_full_code() RETURNS trigger AS $$
DECLARE
  v_parent_full_code text;
BEGIN
  IF TG_TABLE_NAME = 'coa_account_category' THEN
    NEW.coa_full_code := NEW.coa_code;
  
  ELSIF TG_TABLE_NAME = 'coa_account_type' THEN
    SELECT coa_full_code INTO v_parent_full_code
    FROM public.coa_account_category WHERE id = NEW.parent_id;
    NEW.coa_full_code := public.generate_coa_full_code('type', v_parent_full_code, NEW.coa_code);
  
  ELSIF TG_TABLE_NAME = 'coa_sub_account' THEN
    SELECT coa_full_code INTO v_parent_full_code
    FROM public.coa_account_type WHERE id = NEW.parent_id;
    NEW.coa_full_code := public.generate_coa_full_code('sub', v_parent_full_code, NEW.coa_code);
  
  ELSIF TG_TABLE_NAME = 'coa_general_ledger' THEN
    SELECT coa_full_code INTO v_parent_full_code
    FROM public.coa_sub_account WHERE id = NEW.parent_id;
    NEW.coa_full_code := public.generate_coa_full_code('gl', v_parent_full_code, NEW.coa_code);
  
  ELSIF TG_TABLE_NAME = 'coa_detail_ledger' THEN
    SELECT coa_full_code INTO v_parent_full_code
    FROM public.coa_general_ledger WHERE id = NEW.parent_id;
    NEW.coa_full_code := public.generate_coa_full_code('detail', v_parent_full_code, NEW.coa_code);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_coa_type_full_code ON public.coa_account_type;
CREATE TRIGGER trg_coa_type_full_code
  BEFORE INSERT ON public.coa_account_type
  FOR EACH ROW EXECUTE FUNCTION public.trg_coa_full_code();

DROP TRIGGER IF EXISTS trg_coa_sub_full_code ON public.coa_sub_account;
CREATE TRIGGER trg_coa_sub_full_code
  BEFORE INSERT ON public.coa_sub_account
  FOR EACH ROW EXECUTE FUNCTION public.trg_coa_full_code();

DROP TRIGGER IF EXISTS trg_coa_gl_full_code ON public.coa_general_ledger;
CREATE TRIGGER trg_coa_gl_full_code
  BEFORE INSERT ON public.coa_general_ledger
  FOR EACH ROW EXECUTE FUNCTION public.trg_coa_full_code();

DROP TRIGGER IF EXISTS trg_coa_dl_full_code ON public.coa_detail_ledger;
CREATE TRIGGER trg_coa_dl_full_code
  BEFORE INSERT ON public.coa_detail_ledger
  FOR EACH ROW EXECUTE FUNCTION public.trg_coa_full_code();

-- ============================================================
-- 9. COA HIERARCHY FLAT VIEW (for backward compatibility)
-- ============================================================
CREATE OR REPLACE VIEW public.coa_hierarchy_flat AS
SELECT 
  dl.id,
  dl.tenant_id,
  dl.entity_id,
  dl.coa_full_code AS account_code,
  dl.name AS account_name,
  dl.is_active,
  dl.created_at,
  dl.updated_at,
  dl.deleted_at,
  -- Parent info
  cat.id AS category_id,
  cat.name AS category_name,
  cat.coa_full_code AS category_code,
  typ.id AS type_id,
  typ.name AS type_name,
  typ.coa_full_code AS type_code,
  sub.id AS sub_account_id,
  sub.name AS sub_account_name,
  sub.coa_full_code AS sub_account_code,
  gl.id AS gl_id,
  gl.name AS gl_name,
  gl.coa_full_code AS gl_code,
  -- Flags (cascade from highest level)
  COALESCE(cat.normal_balance, 'debit') AS normal_balance,
  cat.enum_laporan_keuangan,
  cat.enum_laporan_keuangan_category,
  COALESCE(sub.is_restricted, gl.is_restricted, false) AS is_restricted,
  sub.enum_cf_section,
  sub.enum_cf_line,
  sub.is_working_capital,
  sub.is_non_cash_item,
  dl.required_sub_gl,
  dl.is_washed_out_account,
  dl.is_trial_balance,
  dl.is_taxation_report,
  -- Level
  5 AS level
FROM public.coa_detail_ledger dl
JOIN public.coa_general_ledger gl ON dl.parent_id = gl.id
JOIN public.coa_sub_account sub ON gl.parent_id = sub.id
JOIN public.coa_account_type typ ON sub.parent_id = typ.id
JOIN public.coa_account_category cat ON typ.parent_id = cat.id
WHERE dl.deleted_at IS NULL

UNION ALL

SELECT 
  gl.id,
  gl.tenant_id,
  gl.entity_id,
  gl.coa_full_code AS account_code,
  gl.name AS account_name,
  gl.is_active,
  gl.created_at,
  gl.updated_at,
  gl.deleted_at,
  cat.id AS category_id,
  cat.name AS category_name,
  cat.coa_full_code AS category_code,
  typ.id AS type_id,
  typ.name AS type_name,
  typ.coa_full_code AS type_code,
  sub.id AS sub_account_id,
  sub.name AS sub_account_name,
  sub.coa_full_code AS sub_account_code,
  gl.id AS gl_id,
  gl.name AS gl_name,
  gl.coa_full_code AS gl_code,
  COALESCE(cat.normal_balance, 'debit') AS normal_balance,
  cat.enum_laporan_keuangan,
  cat.enum_laporan_keuangan_category,
  COALESCE(sub.is_restricted, gl.is_restricted, false) AS is_restricted,
  sub.enum_cf_section,
  sub.enum_cf_line,
  sub.is_working_capital,
  sub.is_non_cash_item,
  false AS required_sub_gl,
  false AS is_washed_out_account,
  false AS is_trial_balance,
  false AS is_taxation_report,
  4 AS level
FROM public.coa_general_ledger gl
JOIN public.coa_sub_account sub ON gl.parent_id = sub.id
JOIN public.coa_account_type typ ON sub.parent_id = typ.id
JOIN public.coa_account_category cat ON typ.parent_id = cat.id
WHERE gl.deleted_at IS NULL;

COMMENT ON VIEW public.coa_hierarchy_flat IS 'Flat view of 5-level COA hierarchy for backward compatibility and reporting queries';

-- ============================================================
-- 10. SEED DATA: PSAK-compliant starter COA (5-Level)
-- ============================================================
-- Sample for tenant_id = '00000000-0000-0000-0000-000000000001'

INSERT INTO public.coa_account_category (tenant_id, coa_code, coa_full_code, name, normal_balance, enum_laporan_keuangan, enum_laporan_keuangan_category, is_active)
VALUES 
  ('00000000-0000-0000-0000-000000000001', '1', '1', 'AKTIVA', 'debit', 'BALANCE_SHEET', 'ASSET', true),
  ('00000000-0000-0000-0000-000000000001', '2', '2', 'KEWAJIBAN', 'credit', 'BALANCE_SHEET', 'LIABILITY', true),
  ('00000000-0000-0000-0000-000000000001', '3', '3', 'EKUITAS', 'credit', 'BALANCE_SHEET', 'EQUITY', true),
  ('00000000-0000-0000-0000-000000000001', '4', '4', 'PENDAPATAN', 'credit', 'INCOME_STATEMENT', 'REVENUE', true),
  ('00000000-0000-0000-0000-000000000001', '5', '5', 'BEBAN', 'debit', 'INCOME_STATEMENT', 'EXPENSE', true)
ON CONFLICT (tenant_id, coa_full_code) DO NOTHING;

-- Level 2: Account Types
INSERT INTO public.coa_account_type (tenant_id, parent_id, coa_code, name, is_active)
SELECT 
  '00000000-0000-0000-0000-000000000001',
  cat.id,
  '1',
  'AKTIVA LANCAR',
  true
FROM public.coa_account_category cat
WHERE cat.tenant_id = '00000000-0000-0000-0000-000000000001' AND cat.coa_code = '1'
ON CONFLICT DO NOTHING;

INSERT INTO public.coa_account_type (tenant_id, parent_id, coa_code, name, is_active)
SELECT 
  '00000000-0000-0000-0000-000000000001',
  cat.id,
  '2',
  'AKTIVA TETAP',
  true
FROM public.coa_account_category cat
WHERE cat.tenant_id = '00000000-0000-0000-0000-000000000001' AND cat.coa_code = '1'
ON CONFLICT DO NOTHING;

-- Level 3: Sub Accounts
INSERT INTO public.coa_sub_account (tenant_id, parent_id, coa_code, name, is_active)
SELECT 
  '00000000-0000-0000-0000-000000000001',
  typ.id,
  '01',
  'KAS DAN SETARA KAS',
  true
FROM public.coa_account_type typ
WHERE typ.tenant_id = '00000000-0000-0000-0000-000000000001' AND typ.coa_code = '1'
ON CONFLICT DO NOTHING;

INSERT INTO public.coa_sub_account (tenant_id, parent_id, coa_code, name, is_active)
SELECT 
  '00000000-0000-0000-0000-000000000001',
  typ.id,
  '02',
  'PIUTANG',
  true
FROM public.coa_account_type typ
WHERE typ.tenant_id = '00000000-0000-0000-0000-000000000001' AND typ.coa_code = '1'
ON CONFLICT DO NOTHING;

-- Level 4: General Ledger
INSERT INTO public.coa_general_ledger (tenant_id, parent_id, coa_code, name, is_active)
SELECT 
  '00000000-0000-0000-0000-000000000001',
  sub.id,
  '1',
  'KAS IDR',
  true
FROM public.coa_sub_account sub
WHERE sub.tenant_id = '00000000-0000-0000-0000-000000000001' AND sub.coa_code = '01'
ON CONFLICT DO NOTHING;

INSERT INTO public.coa_general_ledger (tenant_id, parent_id, coa_code, name, is_active)
SELECT 
  '00000000-0000-0000-0000-000000000001',
  sub.id,
  '2',
  'KAS USD',
  true
FROM public.coa_sub_account sub
WHERE sub.tenant_id = '00000000-0000-0000-0000-000000000001' AND sub.coa_code = '01'
ON CONFLICT DO NOTHING;

-- Level 5: Detail Ledger
INSERT INTO public.coa_detail_ledger (tenant_id, parent_id, coa_code, name, is_active)
SELECT 
  '00000000-0000-0000-0000-000000000001',
  gl.id,
  '1000',
  'KAS BESAR',
  true
FROM public.coa_general_ledger gl
WHERE gl.tenant_id = '00000000-0000-0000-0000-000000000001' AND gl.coa_code = '1'
ON CONFLICT DO NOTHING;

INSERT INTO public.coa_detail_ledger (tenant_id, parent_id, coa_code, name, is_active)
SELECT 
  '00000000-0000-0000-0000-000000000001',
  gl.id,
  '2000',
  'KAS KECIL',
  true
FROM public.coa_general_ledger gl
WHERE gl.tenant_id = '00000000-0000-0000-0000-000000000001' AND gl.coa_code = '1'
ON CONFLICT DO NOTHING;
