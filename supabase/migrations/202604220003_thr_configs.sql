-- =====================================================
-- Migration: THR Configuration & Eligibility
-- Date: 2026-04-22
-- Description: THR (Tunjangan Hari Raya) setup per UU Ketenagakerjaan
-- =====================================================

-- THR Configuration per Entity
CREATE TABLE IF NOT EXISTS public.thr_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id uuid REFERENCES public.entities(id) ON DELETE CASCADE NOT NULL,
  
  -- Payment timing
  payment_timing text NOT NULL DEFAULT 'with_payroll' CHECK (payment_timing IN (
    'with_payroll', -- Paid together with monthly salary
    'separate' -- Paid separately before religious holiday
  )),
  
  -- Calculation base
  calculation_base text NOT NULL DEFAULT 'basic_salary' CHECK (calculation_base IN (
    'basic_salary', -- Only basic salary
    'basic_plus_fixed_allowances' -- Basic + fixed allowances (transport, communication, etc)
  )),
  
  -- Status
  is_active boolean DEFAULT true,
  
  -- Audit
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  UNIQUE(entity_id)
);

CREATE INDEX IF NOT EXISTS idx_thr_configs_entity ON public.thr_configs(entity_id);

-- THR Settings per Year/Religion
CREATE TABLE IF NOT EXISTS public.hr_thr_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id uuid REFERENCES public.entities(id) ON DELETE CASCADE NOT NULL,
  
  -- THR year & religion
  year integer NOT NULL CHECK (year >= 2020 AND year <= 2100),
  religion text CHECK (religion IN (
    'islam', 'christian', 'catholic', 'hindu', 'buddha', 'confucianism', 'general'
  )),
  
  -- Holiday info
  holiday_name text NOT NULL, -- e.g., "Idul Fitri 1447 H", "Natal 2026"
  holiday_date date NOT NULL,
  
  -- Payment timeline
  payment_date date NOT NULL, -- Must be H-7 before holiday (per regulation)
  cut_off_date date NOT NULL, -- Cut-off for calculating service length
  
  -- Status
  status text NOT NULL DEFAULT 'draft' CHECK (status IN (
    'draft', 'active', 'paid', 'cancelled'
  )),
  
  -- Audit
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  UNIQUE(entity_id, year, religion)
);

CREATE INDEX IF NOT EXISTS idx_hr_thr_settings_entity ON public.hr_thr_settings(entity_id);
CREATE INDEX IF NOT EXISTS idx_hr_thr_settings_year ON public.hr_thr_settings(year);
CREATE INDEX IF NOT EXISTS idx_hr_thr_settings_status ON public.hr_thr_settings(status);

-- THR Eligibility per Employee
CREATE TABLE IF NOT EXISTS public.hr_thr_eligibilities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thr_setting_id uuid REFERENCES public.hr_thr_settings(id) ON DELETE CASCADE NOT NULL,
  employee_id uuid REFERENCES public.user_profiles(id) ON DELETE CASCADE NOT NULL,
  
  -- Service calculation
  months_worked integer NOT NULL CHECK (months_worked >= 0), -- Calculated from join date to cut_off_date
  
  -- Salary base
  basic_salary numeric(20, 4) NOT NULL, -- Salary at the time of calculation
  
  -- THR calculation
  thr_amount numeric(20, 4) NOT NULL, -- Auto-calculated: (months_worked / 12) * basic_salary
  override_amount numeric(20, 4), -- Manual override (nullable)
  override_reason text, -- Required if override_amount is set
  
  -- Status
  status text NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending', 'eligible', 'not_eligible', 'approved', 'rejected'
  )),
  
  -- Special cases
  is_resigned_eligible boolean DEFAULT false, -- TRUE if employee resigned but still eligible (worked >= 1 month)
  
  -- Audit
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  approved_by uuid REFERENCES auth.users(id),
  approved_at timestamptz,
  
  UNIQUE(thr_setting_id, employee_id)
);

CREATE INDEX IF NOT EXISTS idx_hr_thr_eligibilities_setting ON public.hr_thr_eligibilities(thr_setting_id);
CREATE INDEX IF NOT EXISTS idx_hr_thr_eligibilities_employee ON public.hr_thr_eligibilities(employee_id);
CREATE INDEX IF NOT EXISTS idx_hr_thr_eligibilities_status ON public.hr_thr_eligibilities(status);

-- Enable RLS
ALTER TABLE public.thr_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hr_thr_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hr_thr_eligibilities ENABLE ROW LEVEL SECURITY;

-- RLS Policies (simplified - same pattern as other HR tables)
DROP POLICY IF EXISTS "Users can view THR configs in their entity" ON public.thr_configs;
CREATE POLICY "Users can view THR configs in their entity"
  ON public.thr_configs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.entity_id = thr_configs.entity_id
      AND up.tenant_id = (auth.jwt()->>'tenant_id')::uuid
    )
  );

DROP POLICY IF EXISTS "HR admin can manage THR configs" ON public.thr_configs;
CREATE POLICY "HR admin can manage THR configs"
  ON public.thr_configs FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.role IN ('admin', 'hr_admin')
    )
  );

-- Similar policies for hr_thr_settings and hr_thr_eligibilities
DROP POLICY IF EXISTS "Users can view THR settings in their entity" ON public.hr_thr_settings;
CREATE POLICY "Users can view THR settings in their entity"
  ON public.hr_thr_settings FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.entity_id = hr_thr_settings.entity_id
      AND up.tenant_id = (auth.jwt()->>'tenant_id')::uuid
    )
  );

DROP POLICY IF EXISTS "HR admin can manage THR settings" ON public.hr_thr_settings;
CREATE POLICY "HR admin can manage THR settings"
  ON public.hr_thr_settings FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.role IN ('admin', 'hr_admin')
    )
  );

DROP POLICY IF EXISTS "Users can view their THR eligibility" ON public.hr_thr_eligibilities;
CREATE POLICY "Users can view their THR eligibility"
  ON public.hr_thr_eligibilities FOR SELECT
  USING (employee_id = auth.uid());

DROP POLICY IF EXISTS "HR admin can manage THR eligibilities" ON public.hr_thr_eligibilities;
CREATE POLICY "HR admin can manage THR eligibilities"
  ON public.hr_thr_eligibilities FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.role IN ('admin', 'hr_admin')
    )
  );

-- Triggers
DROP TRIGGER IF EXISTS thr_configs_updated_at ON public.thr_configs;
CREATE TRIGGER thr_configs_updated_at
  BEFORE UPDATE ON public.thr_configs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS hr_thr_settings_updated_at ON public.hr_thr_settings;
CREATE TRIGGER hr_thr_settings_updated_at
  BEFORE UPDATE ON public.hr_thr_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS hr_thr_eligibilities_updated_at ON public.hr_thr_eligibilities;
CREATE TRIGGER hr_thr_eligibilities_updated_at
  BEFORE UPDATE ON public.hr_thr_eligibilities
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

COMMENT ON TABLE public.hr_thr_eligibilities IS 'THR eligibility per employee per year/religion - auto-calculated based on service length';
COMMENT ON COLUMN public.hr_thr_eligibilities.thr_amount IS 'Auto-calculated: IF months_worked >= 12 THEN basic_salary ELSE (months_worked / 12) * basic_salary';
