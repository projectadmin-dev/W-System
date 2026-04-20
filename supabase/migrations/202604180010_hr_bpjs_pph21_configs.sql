-- =====================================================
-- FASE-4.0-C: BPJS & PPh21 Configurations
-- =====================================================
-- BPJS Kesehatan & Ketenagakerjaan rates
-- PPh21 TER (Tarif Efektif Rata-rata) 2025 config
-- =====================================================

-- 2.1 hr_bpjs_configs - BPJS rates configuration
CREATE TABLE IF NOT EXISTS public.hr_bpjs_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  entity_id uuid REFERENCES public.entities(id) ON DELETE CASCADE,
  branch_id uuid REFERENCES public.branches(id) ON DELETE CASCADE,
  
  -- BPJS Numbers
  bpjs_tk_number text, -- BPJS Ketenagakerjaan company number
  bpjs_kes_number text, -- BPJS Kesehatan company number
  
  -- BPJS Ketenagakerjaan Rates (percentage)
  -- Jaminan Kecelakaan Kerja (JKK) - company only, varies by risk level
  jkk_rate numeric(5, 4) NOT NULL DEFAULT 0.0024 CHECK (jkk_rate >= 0 AND jkk_rate <= 1), -- 0.24% default (risk level 1)
  
  -- Jaminan Kematian (JKM) - company only
  jkm_rate numeric(5, 4) NOT NULL DEFAULT 0.003 CHECK (jkm_rate >= 0 AND jkm_rate <= 1), -- 0.3%
  
  -- Jaminan Hari Tua (JHT) - company + employee
  jht_employee_rate numeric(5, 4) NOT NULL DEFAULT 0.02 CHECK (jht_employee_rate >= 0 AND jht_employee_rate <= 1), -- 2% employee
  jht_company_rate numeric(5, 4) NOT NULL DEFAULT 0.037 CHECK (jht_company_rate >= 0 AND jht_company_rate <= 1), -- 3.7% company
  
  -- Jaminan Pensiun (JP) - company + employee (salary cap applies)
  jp_employee_rate numeric(5, 4) NOT NULL DEFAULT 0.01 CHECK (jp_employee_rate >= 0 AND jp_employee_rate <= 1), -- 1% employee
  jp_company_rate numeric(5, 4) NOT NULL DEFAULT 0.02 CHECK (jp_company_rate >= 0 AND jp_company_rate <= 1), -- 2% company
  jp_salary_cap numeric(20, 4) DEFAULT 10800000.00, -- Salary cap for JP (2024: 10.8M)
  
  -- BPJS Kesehatan Rates (percentage)
  kes_employee_rate numeric(5, 4) NOT NULL DEFAULT 0.01 CHECK (kes_employee_rate >= 0 AND kes_employee_rate <= 1), -- 1% employee
  kes_company_rate numeric(5, 4) NOT NULL DEFAULT 0.04 CHECK (kes_company_rate >= 0 AND kes_company_rate <= 1), -- 4% company
  kes_salary_cap numeric(20, 4) DEFAULT 12000000.00, -- Salary cap for BPJS Kesehatan (2024: 12M)
  
  -- UMR override (for minimum contribution base)
  umr_override numeric(20, 4), -- If NULL, use hr_city_umr based on employee city
  
  -- Validity period
  effective_date date NOT NULL DEFAULT (CURRENT_DATE),
  end_date date, -- NULL = still active
  
  -- Inheritance pattern
  is_default boolean DEFAULT false,
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  UNIQUE(tenant_id, entity_id, branch_id, effective_date)
);

CREATE INDEX IF NOT EXISTS idx_hr_bpjs_configs_tenant ON public.hr_bpjs_configs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_hr_bpjs_configs_entity ON public.hr_bpjs_configs(entity_id);
CREATE INDEX IF NOT EXISTS idx_hr_bpjs_configs_branch ON public.hr_bpjs_configs(branch_id);
CREATE INDEX IF NOT EXISTS idx_hr_bpjs_configs_active ON public.hr_bpjs_configs(end_date);

-- Enable RLS
ALTER TABLE public.hr_bpjs_configs ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Users can view BPJS configs in their tenant" ON public.hr_bpjs_configs;
CREATE POLICY "Users can view BPJS configs in their tenant"
  ON public.hr_bpjs_configs FOR SELECT
  USING (tenant_id = (auth.jwt()->>'tenant_id')::uuid);

DROP POLICY IF EXISTS "HR admin can manage BPJS configs" ON public.hr_bpjs_configs;
CREATE POLICY "HR admin can manage BPJS configs"
  ON public.hr_bpjs_configs FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.role IN ('admin', 'hr_admin')
    )
  );

-- Trigger: Auto-update updated_at
DROP TRIGGER IF EXISTS hr_bpjs_configs_updated_at ON public.hr_bpjs_configs;
CREATE TRIGGER hr_bpjs_configs_updated_at
  BEFORE UPDATE ON public.hr_bpjs_configs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- 2.2 hr_pph21_configs - PPh21 TER configuration per year
-- =====================================================
CREATE TABLE IF NOT EXISTS public.hr_pph21_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  
  tax_year integer NOT NULL CHECK (tax_year >= 2020 AND tax_year <= 2100),
  
  -- PTKP (Penghasilan Tidak Kena Pajak) - per PMK 101/PMK.03/2016
  ptkp_tk0 numeric(20, 2) NOT NULL DEFAULT 54000000.00, -- TK/0 (Single, no dependents)
  ptkp_tk1 numeric(20, 2) NOT NULL DEFAULT 58500000.00, -- TK/1 (Single, 1 dependent)
  ptkp_tk2 numeric(20, 2) NOT NULL DEFAULT 63000000.00, -- TK/2 (Single, 2 dependents)
  ptkp_tk3 numeric(20, 2) NOT NULL DEFAULT 67500000.00, -- TK/3 (Single, 3 dependents)
  ptkp_k0 numeric(20, 2) NOT NULL DEFAULT 58500000.00, -- K/0 (Married, no dependents)
  ptkp_k1 numeric(20, 2) NOT NULL DEFAULT 63000000.00, -- K/1 (Married, 1 dependent)
  ptkp_k2 numeric(20, 2) NOT NULL DEFAULT 67500000.00, -- K/2 (Married, 2 dependents)
  ptkp_k3 numeric(20, 2) NOT NULL DEFAULT 72000000.00, -- K/3 (Married, 3 dependents)
  
  -- PPh21 TER Brackets (UU HPP 2021) - JSONB for flexibility
  -- Format: [{"min": 0, "max": 60000000, "rate": 0.05}, {"min": 60000000, "max": 500000000, "rate": 0.15}, ...]
  pph21_brackets jsonb NOT NULL DEFAULT '[
    {"min": 0, "max": 60000000, "rate": 0.05},
    {"min": 60000000, "max": 500000000, "rate": 0.15},
    {"min": 500000000, "max": 2500000000, "rate": 0.25},
    {"min": 2500000000, "max": 5000000000, "rate": 0.30},
    {"min": 5000000000, "max": null, "rate": 0.35}
  ]'::jsonb,
  
  -- TER (Tarif Efektif Rata-rata) method
  use_ter_method boolean DEFAULT true, -- true = TER, false = gross-up
  
  -- TER Brackets (for monthly calculation) - JSONB
  ter_brackets jsonb DEFAULT '[
    {"min": 0, "max": 5500000, "rate": 0.0},
    {"min": 5500000, "max": 8958333, "rate": 0.05},
    {"min": 8958333, "max": 20000000, "rate": 0.15},
    {"min": 20000000, "max": null, "rate": 0.25}
  ]'::jsonb,
  
  -- Biaya jabatan (5% of salary, max 600k/year = 50k/month)
  jabatan_rate numeric(5, 4) NOT NULL DEFAULT 0.05 CHECK (jabatan_rate >= 0 AND jabatan_rate <= 1),
  jabatan_max_annual numeric(20, 2) NOT NULL DEFAULT 6000000.00,
  jabatan_max_monthly numeric(20, 2) NOT NULL DEFAULT 500000.00,
  
  -- Non-NPWP surcharge (20% higher)
  non_npwp_surcharge numeric(5, 4) NOT NULL DEFAULT 0.20 CHECK (non_npwp_surcharge >= 0 AND non_npwp_surcharge <= 1),
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  UNIQUE(tenant_id, tax_year)
);

CREATE INDEX IF NOT EXISTS idx_hr_pph21_configs_tenant ON public.hr_pph21_configs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_hr_pph21_configs_year ON public.hr_pph21_configs(tax_year);

-- Enable RLS
ALTER TABLE public.hr_pph21_configs ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Users can view PPh21 configs in their tenant" ON public.hr_pph21_configs;
CREATE POLICY "Users can view PPh21 configs in their tenant"
  ON public.hr_pph21_configs FOR SELECT
  USING (tenant_id = (auth.jwt()->>'tenant_id')::uuid);

DROP POLICY IF EXISTS "HR admin can manage PPh21 configs" ON public.hr_pph21_configs;
CREATE POLICY "HR admin can manage PPh21 configs"
  ON public.hr_pph21_configs FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.role IN ('admin', 'hr_admin')
    )
  );

-- Trigger: Auto-update updated_at
DROP TRIGGER IF EXISTS hr_pph21_configs_updated_at ON public.hr_pph21_configs;
CREATE TRIGGER hr_pph21_configs_updated_at
  BEFORE UPDATE ON public.hr_pph21_configs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- Seed Data: Default PPh21 Config 2025
-- =====================================================

INSERT INTO public.hr_pph21_configs (tax_year, ptkp_tk0, ptkp_tk1, ptkp_tk2, ptkp_tk3, ptkp_k0, ptkp_k1, ptkp_k2, ptkp_k3)
VALUES (2025, 54000000.00, 58500000.00, 63000000.00, 67500000.00, 58500000.00, 63000000.00, 67500000.00, 72000000.00)
ON CONFLICT (tenant_id, tax_year) DO NOTHING;

-- Note: Above insert requires tenant_id. Run after creating tenant:
-- INSERT INTO public.hr_pph21_configs (tenant_id, tax_year, ...)
-- VALUES ('00000000-0000-0000-0000-000000000001', 2025, ...);

-- =====================================================
-- SETUP COMPLETE!
-- =====================================================
-- Tables created:
-- - hr_bpjs_configs (BPJS TK & Kesehatan rates)
-- - hr_pph21_configs (PPh21 TER brackets + PTKP)
-- =====================================================
