-- =====================================================
-- FASE-4.0-D: Salary Components
-- =====================================================
-- Earnings, deductions, allowances, bonuses, etc.
-- Soft delete mandatory - never hard delete if used by employees
-- =====================================================

CREATE TABLE IF NOT EXISTS public.hr_salary_components (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  entity_id uuid REFERENCES public.entities(id) ON DELETE CASCADE,
  
  -- Component info
  name text NOT NULL, -- e.g., "Gaji Pokok", "Tunjangan Jabatan", "BPJS Kesehatan"
  code text NOT NULL, -- e.g., "GAPOK", "TUNJAB", "BPJSKESE"
  
  -- Type: earning or deduction
  component_type text NOT NULL CHECK (component_type IN ('earning', 'deduction')),
  
  -- Category for grouping and reporting
  category text NOT NULL CHECK (category IN (
    'basic', -- Gaji pokok
    'allowance', -- Tunjangan (transport, makan, komunikasi, dll)
    'overtime', -- Lembur
    'bonus', -- Bonus performance
    'thr', -- THR
    'bpjs_tk', -- BPJS Ketenagakerjaan
    'bpjs_kes', -- BPJS Kesehatan
    'pph21', -- PPh21
    'loan', -- Kasbon/pinjaman
    'other' -- Lainnya
  )),
  
  -- Amount configuration
  amount_type text NOT NULL DEFAULT 'fixed' CHECK (amount_type IN (
    'fixed', -- Fixed amount
    'percentage', -- Percentage of basic salary
    'formula', -- Custom formula
    'variable' -- Varies per employee
  )),
  
  fixed_amount numeric(20, 4) DEFAULT 0, -- For fixed type
  percentage numeric(5, 4) DEFAULT 0, -- For percentage type (e.g., 0.05 = 5%)
  formula text, -- For formula type (e.g., "basic_salary * 0.1")
  
  -- Tax and BPJS treatment
  is_taxable boolean DEFAULT false, -- Included in taxable income
  is_bpjs_base boolean DEFAULT false, -- Included in BPJS contribution base
  is_fixed boolean DEFAULT true, -- Fixed every month (vs variable)
  
  -- Display order in payslip
  display_order integer DEFAULT 0,
  
  -- Soft delete - HARD RULE: never hard delete if used by employees
  deleted_at timestamptz,
  deleted_by uuid REFERENCES auth.users(id),
  deleted_reason text,
  
  description text,
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  UNIQUE(tenant_id, entity_id, code)
);

CREATE INDEX IF NOT EXISTS idx_hr_salary_components_tenant ON public.hr_salary_components(tenant_id);
CREATE INDEX IF NOT EXISTS idx_hr_salary_components_entity ON public.hr_salary_components(entity_id);
CREATE INDEX IF NOT EXISTS idx_hr_salary_components_type ON public.hr_salary_components(component_type);
CREATE INDEX IF NOT EXISTS idx_hr_salary_components_category ON public.hr_salary_components(category);
CREATE INDEX IF NOT EXISTS idx_hr_salary_components_deleted ON public.hr_salary_components(deleted_at);

-- Enable RLS
ALTER TABLE public.hr_salary_components ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Users can view salary components in their tenant" ON public.hr_salary_components;
CREATE POLICY "Users can view salary components in their tenant"
  ON public.hr_salary_components FOR SELECT
  USING (tenant_id = (auth.jwt()->>'tenant_id')::uuid);

DROP POLICY IF EXISTS "HR admin can manage salary components" ON public.hr_salary_components;
CREATE POLICY "HR admin can manage salary components"
  ON public.hr_salary_components FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.role IN ('admin', 'hr_admin')
    )
  )
  WITH CHECK (tenant_id = (auth.jwt()->>'tenant_id')::uuid);

-- Trigger: Auto-update updated_at
DROP TRIGGER IF EXISTS hr_salary_components_updated_at ON public.hr_salary_components;
CREATE TRIGGER hr_salary_components_updated_at
  BEFORE UPDATE ON public.hr_salary_components
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- SETUP COMPLETE!
-- =====================================================
-- hr_salary_components ready for salary component configuration
-- Soft delete only - never hard delete!
-- Seed data will be inserted by 0018_seed_hc_data.sql
-- =====================================================
